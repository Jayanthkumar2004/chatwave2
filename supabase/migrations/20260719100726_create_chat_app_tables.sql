/*
# Chat Application Schema — Part 1: Tables

Creates all tables for the chat app: profiles, chats, chat_members, messages,
contacts, notifications. RLS is enabled on every table but policies are added
in part 2 so that the is_chat_member helper (which references chat_members) can
be defined after chat_members exists.

## Tables
- profiles: one row per authenticated user, keyed to auth.users id
- chats: private or group conversations
- chat_members: membership join table for chats
- messages: chat messages with media, replies, soft-delete, read receipts
- contacts: user-to-user contact list (owner-scoped)
- notifications: in-app notifications scoped to recipient

## Notes
1. gen_random_uuid() used for all surrogate ids.
2. All FKs use ON DELETE CASCADE to keep data consistent when users delete accounts.
3. message.deleted_for / message.read_by are uuid arrays for multi-user tracking.
4. Realtime publication includes all chat-related tables.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  email text,
  avatar_url text,
  bio text DEFAULT '',
  last_seen timestamptz DEFAULT now(),
  is_online boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ chats ============
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_type text NOT NULL CHECK (chat_type IN ('private','group')),
  name text,
  avatar_url text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- ============ chat_members ============
CREATE TABLE IF NOT EXISTS public.chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chat_id, user_id)
);
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- ============ messages ============
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text DEFAULT '',
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','image','video','audio','file')),
  attachment_url text,
  attachment_name text,
  attachment_size bigint,
  reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  edited boolean NOT NULL DEFAULT false,
  deleted boolean NOT NULL DEFAULT false,
  deleted_for uuid[] NOT NULL DEFAULT '{}',
  read_by uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============ contacts ============
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, contact_user_id)
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- ============ notifications ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============ helper: is current user a member of chat X? ============
DROP FUNCTION IF EXISTS public.is_chat_member(uuid, uuid);
CREATE OR REPLACE FUNCTION public.is_chat_member(p_chat_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = p_chat_id AND user_id = p_user_id
  );
$$;

-- ============ updated_at triggers ============
DROP FUNCTION IF EXISTS public.set_updated_at();
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chats_set_updated_at ON public.chats;
CREATE TRIGGER chats_set_updated_at
BEFORE UPDATE ON public.chats
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS messages_set_updated_at ON public.messages;
CREATE TRIGGER messages_set_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ touch chat on new message ============
DROP FUNCTION IF EXISTS public.touch_chat_on_message();
CREATE OR REPLACE FUNCTION public.touch_chat_on_message()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.chats SET updated_at = now() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_touch_chat ON public.messages;
CREATE TRIGGER messages_touch_chat
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_chat_on_message();

-- ============ auto-create profile on auth.users insert ============
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ realtime publication ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============ indexes ============
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON public.chats (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON public.chat_members (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id ON public.chat_members (chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON public.messages (chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON public.contacts (owner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id, is_read);

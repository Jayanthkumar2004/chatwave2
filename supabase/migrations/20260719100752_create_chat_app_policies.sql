/*
# Chat Application Schema — Part 2: RLS Policies

Adds row-level security policies to all chat-app tables. Tables were created and
RLS enabled in part 1; this migration defines who can read/insert/update/delete.

## Policy summary

- profiles: anyone authenticated can read (for search); only owner can mutate.
- chats: read by members; insert by creator; update/delete by creator.
- chat_members: read by members of same chat; insert by self or chat creator;
  delete by self (leave) or chat creator (remove member).
- messages: read by members; insert by members; update/delete by sender only.
- contacts: full CRUD scoped to owner_id.
- notifications: full CRUD scoped to user_id.

## Notes
1. Uses public.is_chat_member(chat_id, user_id) helper for membership checks.
2. Drop-if-exists before each CREATE POLICY so the migration is idempotent.
*/

-- ============ profiles ============
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
ON public.profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self"
ON public.profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
ON public.profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_self" ON public.profiles;
CREATE POLICY "profiles_delete_self"
ON public.profiles FOR DELETE
TO authenticated USING (auth.uid() = id);

-- ============ chats ============
DROP POLICY IF EXISTS "chats_select_member" ON public.chats;
CREATE POLICY "chats_select_member"
ON public.chats FOR SELECT
TO authenticated USING (public.is_chat_member(id, auth.uid()));

DROP POLICY IF EXISTS "chats_insert_creator" ON public.chats;
CREATE POLICY "chats_insert_creator"
ON public.chats FOR INSERT
TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "chats_update_creator" ON public.chats;
CREATE POLICY "chats_update_creator"
ON public.chats FOR UPDATE
TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "chats_delete_creator" ON public.chats;
CREATE POLICY "chats_delete_creator"
ON public.chats FOR DELETE
TO authenticated USING (created_by = auth.uid());

-- ============ chat_members ============
DROP POLICY IF EXISTS "members_select_member" ON public.chat_members;
CREATE POLICY "members_select_member"
ON public.chat_members FOR SELECT
TO authenticated USING (public.is_chat_member(chat_id, auth.uid()));

DROP POLICY IF EXISTS "members_insert_creator_or_self" ON public.chat_members;
CREATE POLICY "members_insert_creator_or_self"
ON public.chat_members FOR INSERT
TO authenticated WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_id AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "members_delete_self_or_creator" ON public.chat_members;
CREATE POLICY "members_delete_self_or_creator"
ON public.chat_members FOR DELETE
TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_id AND c.created_by = auth.uid()
  )
);

-- ============ messages ============
DROP POLICY IF EXISTS "messages_select_member" ON public.messages;
CREATE POLICY "messages_select_member"
ON public.messages FOR SELECT
TO authenticated USING (public.is_chat_member(chat_id, auth.uid()));

DROP POLICY IF EXISTS "messages_insert_member" ON public.messages;
CREATE POLICY "messages_insert_member"
ON public.messages FOR INSERT
TO authenticated WITH CHECK (public.is_chat_member(chat_id, auth.uid()));

DROP POLICY IF EXISTS "messages_update_sender" ON public.messages;
CREATE POLICY "messages_update_sender"
ON public.messages FOR UPDATE
TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "messages_delete_sender" ON public.messages;
CREATE POLICY "messages_delete_sender"
ON public.messages FOR DELETE
TO authenticated USING (sender_id = auth.uid());

-- ============ contacts ============
DROP POLICY IF EXISTS "contacts_select_owner" ON public.contacts;
CREATE POLICY "contacts_select_owner"
ON public.contacts FOR SELECT
TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "contacts_insert_owner" ON public.contacts;
CREATE POLICY "contacts_insert_owner"
ON public.contacts FOR INSERT
TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "contacts_delete_owner" ON public.contacts;
CREATE POLICY "contacts_delete_owner"
ON public.contacts FOR DELETE
TO authenticated USING (owner_id = auth.uid());

-- ============ notifications ============
DROP POLICY IF EXISTS "notifications_select_owner" ON public.notifications;
CREATE POLICY "notifications_select_owner"
ON public.notifications FOR SELECT
TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_owner" ON public.notifications;
CREATE POLICY "notifications_insert_owner"
ON public.notifications FOR INSERT
TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_owner" ON public.notifications;
CREATE POLICY "notifications_update_owner"
ON public.notifications FOR UPDATE
TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_owner" ON public.notifications;
CREATE POLICY "notifications_delete_owner"
ON public.notifications FOR DELETE
TO authenticated USING (user_id = auth.uid());

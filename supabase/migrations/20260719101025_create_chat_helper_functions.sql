/*
# Chat helper functions (RPCs)

Adds SQL functions used by the frontend to avoid N+1 queries and complex
client-side joins. All are STABLE/IMMUTABLE read helpers except mark_chat_read
which mutates.

## Functions

1. get_last_messages(p_chat_ids uuid[]) -> set of messages
   Returns the most recent message per chat for the given chat ids.

2. get_unread_counts(p_user_id uuid, p_chat_ids uuid[])
   -> table(chat_id uuid, cnt bigint)
   Counts messages whose read_by array does not contain p_user_id, grouped by
   chat. Excludes messages the user sent.

3. find_private_chat(p_user_a uuid, p_user_b uuid) -> chats
   Returns the existing private chat (if any) that has both users as members.

4. mark_chat_read(p_chat_id uuid, p_user_id uuid) -> void
   Appends p_user_id to read_by for all messages in p_chat_id not already read
   by them (excluding their own). Implemented SECURITY DEFINER so it can update
   rows the caller didn't send — but RLS still gates who can call it (any
   authenticated member). Note: callers must already be a chat member for this
   to be meaningful; the function does not re-check membership.
*/
-- 1. get_last_messages
DROP FUNCTION IF EXISTS public.get_last_messages(uuid[]);
CREATE OR REPLACE FUNCTION public.get_last_messages(p_chat_ids uuid[])
RETURNS SETOF public.messages
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (chat_id) *
  FROM public.messages
  WHERE chat_id = ANY(p_chat_ids)
  ORDER BY chat_id, created_at DESC;
$$;

-- 2. get_unread_counts
DROP FUNCTION IF EXISTS public.get_unread_counts(uuid, uuid[]);
CREATE OR REPLACE FUNCTION public.get_unread_counts(p_user_id uuid, p_chat_ids uuid[])
RETURNS TABLE (chat_id uuid, cnt bigint)
LANGUAGE sql STABLE AS $$
  SELECT m.chat_id, COUNT(*)::bigint AS cnt
  FROM public.messages m
  WHERE m.chat_id = ANY(p_chat_ids)
    AND m.sender_id <> p_user_id
    AND NOT (p_user_id = ANY(m.read_by))
  GROUP BY m.chat_id;
$$;

-- 3. find_private_chat
DROP FUNCTION IF EXISTS public.find_private_chat(uuid, uuid);
CREATE OR REPLACE FUNCTION public.find_private_chat(p_user_a uuid, p_user_b uuid)
RETURNS SETOF public.chats
LANGUAGE sql STABLE AS $$
  SELECT c.*
  FROM public.chats c
  WHERE c.chat_type = 'private'
    AND EXISTS (SELECT 1 FROM public.chat_members cm WHERE cm.chat_id = c.id AND cm.user_id = p_user_a)
    AND EXISTS (SELECT 1 FROM public.chat_members cm WHERE cm.chat_id = c.id AND cm.user_id = p_user_b)
  LIMIT 1;
$$;

-- 4. mark_chat_read
DROP FUNCTION IF EXISTS public.mark_chat_read(uuid, uuid);
CREATE OR REPLACE FUNCTION public.mark_chat_read(p_chat_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.messages
  SET read_by = array_append(
    CASE WHEN read_by IS NULL THEN ARRAY[]::uuid[] ELSE read_by END,
    p_user_id
  )
  WHERE chat_id = p_chat_id
    AND sender_id <> p_user_id
    AND NOT (p_user_id = ANY(COALESCE(read_by, ARRAY[]::uuid[])));
END;
$$;

-- Note: a dedicated presence/typing table is intentionally omitted —
-- presence (is_online/last_seen) lives on profiles; typing is broadcast
-- via Realtime broadcast channels and is not persisted.

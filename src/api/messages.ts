import { supabase } from '@/lib/supabase';
import type { Message, MessageWithSender, Profile } from '@/types';

const PAGE_SIZE = 30;

export async function fetchMessages(
  chatId: string,
  cursorIso: string | null,
  currentUserId: string
): Promise<{ messages: MessageWithSender[]; hasMore: boolean }> {
  let q = supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (cursorIso) q = q.lt('created_at', cursorIso);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data as Message[]) ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const slice = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  // Filter out messages deleted-for-me
  const visible = slice.filter((m) => !m.deleted_for?.includes(currentUserId));

  // Sender profiles
  const senderIds = Array.from(new Set(visible.map((m) => m.sender_id)));
  const { data: senders, error: sErr } = await supabase
    .from('profiles')
    .select('*')
    .in('id', senderIds);
  if (sErr) throw sErr;
  const senderMap = new Map<string, Profile>();
  (senders as Profile[]).forEach((p) => senderMap.set(p.id, p));

  // Reply-to messages
  const replyIds = Array.from(new Set(visible.map((m) => m.reply_to).filter(Boolean) as string[]));
  const replyMap = new Map<string, Message>();
  if (replyIds.length > 0) {
    const { data: replies } = await supabase.from('messages').select('*').in('id', replyIds);
    (replies as Message[] | null)?.forEach((r) => replyMap.set(r.id, r));
  }

  const withSender: MessageWithSender[] = visible
    .map((m) => ({
      ...m,
      sender: senderMap.get(m.sender_id),
      reply: m.reply_to ? replyMap.get(m.reply_to) || null : null,
    }))
    .reverse(); // ascending order for display

  return { messages: withSender, hasMore };
}

export async function searchMessages(chatId: string, query: string): Promise<MessageWithSender[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .ilike('message', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as Message[]) ?? [];
}

export async function sendMessage(input: {
  chat_id: string;
  sender_id: string;
  message?: string;
  message_type?: Message['message_type'];
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  reply_to?: string | null;
}): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: input.chat_id,
      sender_id: input.sender_id,
      message: input.message ?? '',
      message_type: input.message_type ?? 'text',
      attachment_url: input.attachment_url ?? null,
      attachment_name: input.attachment_name ?? null,
      attachment_size: input.attachment_size ?? null,
      reply_to: input.reply_to ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

export async function editMessage(messageId: string, newText: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .update({ message: newText, edited: true })
    .eq('id', messageId)
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

/** Soft delete for everyone: marks deleted=true and clears body + attachment. */
export async function deleteMessageForEveryone(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({
      deleted: true,
      message: '',
      attachment_url: null,
      edited: false,
    })
    .eq('id', messageId);
  if (error) throw error;
}

/** Delete-for-me: add current user id to deleted_for array. */
export async function deleteMessageForMe(messageId: string, userId: string): Promise<void> {
  const { data: msg, error: gErr } = await supabase
    .from('messages')
    .select('deleted_for')
    .eq('id', messageId)
    .maybeSingle();
  if (gErr) throw gErr;
  const arr = (msg?.deleted_for as string[]) ?? [];
  if (arr.includes(userId)) return;
  const { error } = await supabase
    .from('messages')
    .update({ deleted_for: [...arr, userId] })
    .eq('id', messageId);
  if (error) throw error;
}

/** Mark a message as read by current user (add to read_by array). */
export async function markMessageRead(messageId: string, userId: string): Promise<void> {
  const { data: msg, error: gErr } = await supabase
    .from('messages')
    .select('read_by')
    .eq('id', messageId)
    .maybeSingle();
  if (gErr) throw gErr;
  const arr = (msg?.read_by as string[]) ?? [];
  if (arr.includes(userId)) return;
  const { error } = await supabase.from('messages').update({ read_by: [...arr, userId] }).eq('id', messageId);
  if (error) throw error;
}

/** Bulk mark all messages in a chat as read by current user. */
export async function markChatRead(chatId: string, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc('mark_chat_read', { p_chat_id: chatId, p_user_id: userId });
  if (error) {
    // Fallback: fetch unread message ids, then update each
    const { data: msgs, error: mErr } = await supabase
      .from('messages')
      .select('id, read_by')
      .eq('chat_id', chatId)
      .neq('sender_id', userId);
    if (mErr) throw mErr;
    const toUpdate = (msgs as Message[] | null)?.filter((m) => !m.read_by?.includes(userId)) ?? [];
    await Promise.all(
      toUpdate.map((m) =>
        supabase
          .from('messages')
          .update({ read_by: [...(m.read_by ?? []), userId] })
          .eq('id', m.id)
      )
    );
    return;
  }
  void data;
}

export async function uploadAttachment(
  userId: string,
  file: File
): Promise<{ url: string; path: string; size: number }> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from('attachments').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('attachments').getPublicUrl(path);
  return { url: data.publicUrl, path, size: file.size };
}

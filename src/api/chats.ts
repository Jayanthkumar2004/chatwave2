import { supabase } from '@/lib/supabase';
import type { Chat, ChatMember, ChatWithDetails, Message, Profile } from '@/types';

/** Get all chats the current user is a member of, enriched with last message + peer profile. */
export async function fetchChats(currentUserId: string): Promise<ChatWithDetails[]> {
  // 1. Get my memberships
  const { data: memberships, error: mErr } = await supabase
    .from('chat_members')
    .select('chat_id')
    .eq('user_id', currentUserId);
  if (mErr) throw mErr;
  if (!memberships || memberships.length === 0) return [];

  const chatIds = memberships.map((m) => m.chat_id);
  const { data: chats, error: cErr } = await supabase
    .from('chats')
    .select('*')
    .in('id', chatIds)
    .order('updated_at', { ascending: false });
  if (cErr) throw cErr;
  if (!chats || chats.length === 0) return [];

  const chatList = chats as Chat[];

  // 2. Get all members of those chats
  const { data: allMembers, error: memErr } = await supabase
    .from('chat_members')
    .select('id, chat_id, user_id, role, joined_at')
    .in('chat_id', chatIds);
  if (memErr) throw memErr;

  const userIds = Array.from(new Set((allMembers as ChatMember[]).map((m) => m.user_id)));
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  if (pErr) throw pErr;
  const profileMap = new Map<string, Profile>();
  (profiles as Profile[]).forEach((p) => profileMap.set(p.id, p));

  // 3. Get the last message per chat
  const { data: lastMsgs, error: lErr } = await supabase.rpc('get_last_messages', { p_chat_ids: chatIds });
  // Fall back to manual query if rpc not available
  let lastMessageMap = new Map<string, Message>();
  if (!lErr && lastMsgs) {
    (lastMsgs as Message[]).forEach((m) => lastMessageMap.set(m.chat_id, m));
  } else {
    // fallback: query top 1 per chat (n+1 but small)
    await Promise.all(
      chatIds.map(async (cid) => {
        const { data: lm } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', cid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lm) lastMessageMap.set(cid, lm as Message);
      })
    );
  }

  // 4. Unread counts: messages where read_by does not contain me
  const { data: unreadRows, error: uErr } = await supabase.rpc('get_unread_counts', {
    p_user_id: currentUserId,
    p_chat_ids: chatIds,
  });
  const unreadMap = new Map<string, number>();
  if (!uErr && unreadRows) {
    (unreadRows as { chat_id: string; cnt: number }[]).forEach((r) => unreadMap.set(r.chat_id, Number(r.cnt)));
  }

  // 5. Assemble
  return chatList.map((c) => {
    const members = (allMembers as ChatMember[])
      .filter((m) => m.chat_id === c.id)
      .map((m) => profileMap.get(m.user_id))
      .filter(Boolean) as Profile[];
    const peer =
      c.chat_type === 'private'
        ? members.find((p) => p.id !== currentUserId) || members[0]
        : undefined;
    return {
      ...c,
      members,
      peer,
      last_message: lastMessageMap.get(c.id) || null,
      unread_count: unreadMap.get(c.id) || 0,
    };
  });
}

export async function createPrivateChat(currentUserId: string, otherUserId: string): Promise<Chat> {
  // Check if a private chat already exists between these two users
  const { data: existing } = await supabase.rpc('find_private_chat', {
    p_user_a: currentUserId,
    p_user_b: otherUserId,
  });
  if (existing && (existing as Chat[]).length > 0) {
    return (existing as Chat[])[0];
  }

  const { data: chat, error } = await supabase
    .from('chats')
    .insert({ chat_type: 'private', created_by: currentUserId })
    .select()
    .single();
  if (error) throw error;

  const members = [
    { chat_id: chat.id, user_id: currentUserId, role: 'member' as const },
    { chat_id: chat.id, user_id: otherUserId, role: 'member' as const },
  ];
  const { error: mErr } = await supabase.from('chat_members').insert(members);
  if (mErr) throw mErr;

  return chat as Chat;
}

export async function createGroupChat(
  currentUserId: string,
  name: string,
  memberIds: string[],
  avatarUrl?: string
): Promise<Chat> {
  const { data: chat, error } = await supabase
    .from('chats')
    .insert({
      chat_type: 'group',
      name,
      avatar_url: avatarUrl || null,
      created_by: currentUserId,
    })
    .select()
    .single();
  if (error) throw error;

  const members = [
    { chat_id: chat.id, user_id: currentUserId, role: 'owner' as const },
    ...memberIds.filter((id) => id !== currentUserId).map((id) => ({ chat_id: chat.id, user_id: id, role: 'member' as const })),
  ];
  const { error: mErr } = await supabase.from('chat_members').insert(members);
  if (mErr) throw mErr;

  return chat as Chat;
}

export async function renameGroup(chatId: string, name: string): Promise<Chat> {
  const { data, error } = await supabase.from('chats').update({ name }).eq('id', chatId).select().single();
  if (error) throw error;
  return data as Chat;
}

export async function updateGroupAvatar(chatId: string, avatarUrl: string): Promise<Chat> {
  const { data, error } = await supabase.from('chats').update({ avatar_url: avatarUrl }).eq('id', chatId).select().single();
  if (error) throw error;
  return data as Chat;
}

export async function addChatMembers(chatId: string, userIds: string[]): Promise<void> {
  const rows = userIds.map((id) => ({ chat_id: chatId, user_id: id, role: 'member' as const }));
  const { error } = await supabase.from('chat_members').insert(rows);
  if (error) throw error;
}

export async function removeChatMember(chatId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('chat_members').delete().eq('chat_id', chatId).eq('user_id', userId);
  if (error) throw error;
}

export async function leaveChat(chatId: string, userId: string): Promise<void> {
  await removeChatMember(chatId, userId);
}

export async function getChatMembers(chatId: string): Promise<ChatMember[]> {
  const { data, error } = await supabase.from('chat_members').select('*').eq('chat_id', chatId);
  if (error) throw error;
  return (data as ChatMember[]) ?? [];
}

export async function deleteChat(chatId: string): Promise<void> {
  const { error } = await supabase.from('chats').delete().eq('id', chatId);
  if (error) throw error;
}

export async function uploadGroupAvatar(chatId: string, file: File, ownerId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${ownerId}/group-${chatId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

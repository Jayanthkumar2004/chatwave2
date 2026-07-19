import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { fetchChats } from '@/api/chats';
import { useQuery } from '@tanstack/react-query';
import type { Chat, ChatWithDetails } from '@/types';

export const chatsKeys = {
  list: (userId: string) => ['chats', 'list', userId] as const,
};

export function useChatsList() {
  const { user } = useAuth();
  return useQuery<ChatWithDetails[]>({
    queryKey: chatsKeys.list(user?.id ?? ''),
    queryFn: () => fetchChats(user!.id),
    enabled: !!user,
  });
}

/**
 * Subscribes to realtime changes that affect the chat list:
 *  - new chat_members row for me -> refetch list
 *  - chat_members delete for me -> refetch list
 *  - messages insert -> refetch list (bumps updated_at + last message)
 *  - chats update (rename/avatar) -> refetch list
 */
export function useChatsRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  const refetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!userId) return;
    let debounced: number | null = null;
    const refetch = () => {
      if (debounced) window.clearTimeout(debounced);
      debounced = window.setTimeout(() => {
        qc.invalidateQueries({ queryKey: chatsKeys.list(userId) });
      }, 250);
    };
    refetchRef.current = refetch;

    const channel = supabase
      .channel('chats-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_members', filter: `user_id=eq.${userId}` },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chats' },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chats' },
        () => refetch()
      )
      .subscribe();

    return () => {
      if (debounced) window.clearTimeout(debounced);
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}

/** Searches the local chat list by peer display name / username / group name. */
export function useFilteredChats(
  chats: ChatWithDetails[] | undefined,
  currentUserId: string | undefined,
  query: string
): ChatWithDetails[] {
  const q = query.trim().toLowerCase();
  const [filtered, setFiltered] = useState<ChatWithDetails[]>([]);

  useEffect(() => {
    if (!chats) {
      setFiltered([]);
      return;
    }
    if (!q) {
      setFiltered(chats);
      return;
    }
    const result = chats.filter((c) => {
      if (c.chat_type === 'group') {
        return (c.name || 'group').toLowerCase().includes(q);
      }
      const peer = c.peer;
      const name = (peer?.display_name || peer?.username || '').toLowerCase();
      return name.includes(q);
    });
    setFiltered(result);
  }, [chats, q, currentUserId]);

  return filtered;
}

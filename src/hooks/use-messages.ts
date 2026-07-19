import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { fetchMessages, markChatRead } from '@/api/messages';
import type { MessageWithSender } from '@/types';

export const messagesKeys = {
  list: (chatId: string) => ['messages', 'list', chatId] as const,
};

interface UseMessagesResult {
  messages: MessageWithSender[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
  isFetching: boolean;
}

/**
 * Infinite-scrolling messages with realtime subscription.
 * Internally keeps pages of messages and prepends older pages on loadMore.
 */
export function useMessages(chatId: string | null): UseMessagesResult {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pages, setPages] = useState<MessageWithSender[][]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const enabled = !!chatId && !!user;

  const initial = useQuery<MessageWithSender[], Error, MessageWithSender[], readonly string[]>({
    queryKey: chatId ? messagesKeys.list(chatId) : ['messages', 'list', 'none'],
    queryFn: async () => {
      const res = await fetchMessages(chatId!, null, user!.id);
      setHasMore(res.hasMore);
      return res.messages;
    },
    enabled,
  });

  // Reset pages whenever chat changes
  useEffect(() => {
    setPages([]);
    setHasMore(true);
  }, [chatId]);

  // Track the latest initial page
  useEffect(() => {
    if (initial.data && initial.data.length > 0) setPages([initial.data]);
  }, [initial.data]);

  const allMessages = pages.flat();

  const loadMore = useCallback(async (): Promise<void> => {
    if (!chatId || !user || loadingMore || !hasMore || allMessages.length === 0) return;
    setLoadingMore(true);
    try {
      const cursor = allMessages[0]?.created_at;
      const res = await fetchMessages(chatId, cursor, user.id);
      setHasMore(res.hasMore);
      if (res.messages.length > 0) {
        setPages((prev) => [res.messages, ...prev]);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, user, loadingMore, hasMore, allMessages]);

  // Realtime: new messages, edits, deletes
  useEffect(() => {
    if (!chatId || !user) return;
    const refetch = () => qc.invalidateQueries({ queryKey: messagesKeys.list(chatId) });
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user, qc]);

  // Mark chat read whenever messages change (or chat opens)
  const markedRef = useRef<string>('');
  useEffect(() => {
    if (!chatId || !user || allMessages.length === 0) return;
    const sig = `${chatId}:${allMessages[allMessages.length - 1]?.id}`;
    if (markedRef.current === sig) return;
    markedRef.current = sig;
    markChatRead(chatId, user.id).catch(() => undefined);
  }, [chatId, user, allMessages]);

  return {
    messages: allMessages,
    hasMore,
    loadingMore,
    loadMore,
    isFetching: initial.isFetching,
  };
}

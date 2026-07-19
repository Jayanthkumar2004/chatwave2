import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { fetchNotifications, getUnreadNotificationCount } from '@/api/notifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';

let soundCache: HTMLAudioElement | null = null;
function playNotificationSound() {
  try {
    if (!soundCache) {
      // tiny inline notification beep (base64 WAV)
      soundCache = new Audio(
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
      );
      soundCache.volume = 0.4;
    }
    void soundCache.play().catch(() => undefined);
  } catch {
    // ignore
  }
}

export function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/pwa-192x192.png' });
    playNotificationSound();
  } catch {
    // ignore
  }
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve('denied');
  }
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  return Notification.requestPermission();
}

/** Hook: keeps unread notification count fresh and shows browser notifications on new rows. */
export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const knownIdsRef = useRef<Set<string>>(new Set());

  const countQuery = useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: () => getUnreadNotificationCount(user!.id),
    enabled: !!user,
    refetchInterval: 20_000,
  });

  const listQuery = useQuery({
    queryKey: ['notifications', 'list', user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user,
  });

  // Seed known ids from initial fetch so we don't fire notifications for old rows
  useEffect(() => {
    if (listQuery.data) {
      listQuery.data.forEach((n) => knownIdsRef.current.add(n.id));
    }
  }, [listQuery.data]);

  // Realtime: listen for new notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-insert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as { id: string; title: string; body: string | null };
          if (!knownIdsRef.current.has(n.id)) {
            knownIdsRef.current.add(n.id);
            showBrowserNotification(n.title, n.body || '');
            qc.invalidateQueries({ queryKey: ['notifications'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  return {
    unreadCount: countQuery.data ?? 0,
    notifications: listQuery.data ?? [],
    refetch: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  };
}

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { setPresence } from '@/api/profiles';
import { useAuth } from '@/providers/auth-provider';

/**
 * Heartbeat: updates is_online=true while the user is active, and flips to
 * is_online=false (with last_seen) on tab hide / unload. Re-runs heartbeat
 * every 25s while visible.
 */
export function usePresence() {
  const { user } = useAuth();
  const heartbeatRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    let stopped = false;

    const goOnline = () => {
      if (stopped) return;
      setPresence(user.id, true).catch(() => undefined);
    };
    const goOffline = () => {
      if (stopped) return;
      setPresence(user.id, false).catch(() => undefined);
    };

    goOnline();
    heartbeatRef.current = window.setInterval(goOnline, 25_000);

    const onVis = () => {
      if (document.visibilityState === 'visible') goOnline();
      else goOffline();
    };
    const onBeforeUnload = () => {
      // best-effort: navigator.sendBeacon style not possible for supabase-js.
      goOffline();
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      stopped = true;
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onBeforeUnload);
      goOffline();
    };
  }, [user]);
}

/** Subscribe to presence changes (is_online / last_seen) for a set of users. */
export function usePresenceSubscription(
  userIds: string[],
  onChange: () => void
) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (userIds.length === 0) return;
    const channel = supabase
      .channel('profiles-presence')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=in.(${userIds.join(',')})`,
        },
        () => cbRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIds.join(',')]);
}

/**
 * Broadcast typing status for the current user in a chat. Other clients
 * subscribe to the same channel to display the indicator.
 */
export function useTyping(chatId: string | null) {
  const { user } = useAuth();
  const typingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const setTyping = (isTyping: boolean) => {
    if (!user || !chatId) return;
    if (isTyping === typingRef.current) return;
    typingRef.current = isTyping;
    supabase.channel(`typing:${chatId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id, is_typing: isTyping },
    });
    if (isTyping) {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        typingRef.current = false;
        supabase.channel(`typing:${chatId}`).send({
          type: 'broadcast',
          event: 'typing',
          payload: { user_id: user.id, is_typing: false },
        });
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return { setTyping };
}

/** Listen for typing events from other users in a chat. */
export function useTypingSubscription(
  chatId: string | null,
  currentUserId: string,
  onTypingChange: (typingUserIds: string[]) => void
) {
  const cbRef = useRef(onTypingChange);
  cbRef.current = onTypingChange;
  const typingMapRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`typing:${chatId}`)
      .on('broadcast', { event: 'typing' }, (msg) => {
        const payload = msg.payload as { user_id: string; is_typing: boolean };
        if (!payload || payload.user_id === currentUserId) return;
        const map = typingMapRef.current;
        if (payload.is_typing) {
          map.set(payload.user_id, Date.now());
        } else {
          map.delete(payload.user_id);
        }
        cbRef.current(Array.from(map.keys()));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      typingMapRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, currentUserId]);
}

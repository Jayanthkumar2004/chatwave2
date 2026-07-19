import { useEffect, useRef } from 'react';
import type { MessageWithSender } from '@/types';
import { MessageBubble } from './message-bubble';
import { formatDateDivider } from '@/lib/utils';
import { Spinner } from '@/components/shared/loaders';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: MessageWithSender[];
  currentUserId: string;
  isGroup: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => Promise<void>;
  typingUserNames: string[];
  onReply: (m: MessageWithSender) => void;
  onEdit: (m: MessageWithSender) => void;
  onDeleteForMe: (m: MessageWithSender) => void;
  onDeleteForEveryone: (m: MessageWithSender) => void;
}

interface Group {
  date: string;
  items: MessageWithSender[];
}

function groupByDate(messages: MessageWithSender[]): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  for (const m of messages) {
    const date = new Date(m.created_at).toDateString();
    if (!current || current.date !== date) {
      current = { date, items: [m] };
      groups.push(current);
    } else {
      current.items.push(m);
    }
  }
  return groups;
}

export function MessageList({
  messages,
  currentUserId,
  isGroup,
  hasMore,
  loadingMore,
  onLoadMore,
  typingUserNames,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const atBottomRef = useRef(true);

  // Track whether the user is near the bottom (for autoscroll)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = 80;
      atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Autoscroll to bottom on new messages if user was already near bottom
  useEffect(() => {
    const grew = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;
    if (grew && atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  // Trigger loadMore when user scrolls to top
  const onScrollTop = () => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop < 60 && hasMore && !loadingMore) {
      const prevHeight = el.scrollHeight;
      onLoadMore().then(() => {
        // preserve scroll position after older messages prepended
        requestAnimationFrame(() => {
          if (containerRef.current) {
            const newHeight = containerRef.current.scrollHeight;
            containerRef.current.scrollTop = newHeight - prevHeight;
          }
        });
      });
    }
  };

  const groups = groupByDate(messages);

  return (
    <div
      ref={containerRef}
      onScroll={onScrollTop}
      className="chat-doodle flex-1 overflow-y-auto scrollbar-thin"
    >
      <div className="min-h-full px-1 py-4">
        {hasMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs text-muted-foreground">Say hello to start the conversation.</p>
          </div>
        )}

        {groups.map((g, gi) => (
          <div key={gi} className="space-y-1.5">
            <div className="sticky top-0 z-10 my-2 flex justify-center">
              <span className="rounded-full bg-background/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
                {formatDateDivider(g.items[0].created_at)}
              </span>
            </div>
            {g.items.map((m, i) => {
              const prev = g.items[i - 1];
              const showAvatar = !prev || prev.sender_id !== m.sender_id;
              const showSenderName = showAvatar;
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  currentUserId={currentUserId}
                  isGroup={isGroup}
                  showAvatar={showAvatar}
                  showSenderName={showSenderName}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDeleteForMe={onDeleteForMe}
                  onDeleteForEveryone={onDeleteForEveryone}
                />
              );
            })}
          </div>
        ))}

        {typingUserNames.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-2">
            <div className="flex items-center gap-1 rounded-full bg-chat-bubble-in px-3 py-2 shadow-sm">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">
              {typingUserNames.length === 1 ? `${typingUserNames[0]} is typing…` : 'several people are typing…'}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

void Spinner;

import { Avatar } from '@/components/shared/avatar';
import { cn, formatChatTime, getDisplayName } from '@/lib/utils';
import type { ChatWithDetails } from '@/types';
import { Check, CheckCheck, FileText, ImageIcon, Mic, Play, Video } from 'lucide-react';

interface ChatListItemProps {
  chat: ChatWithDetails;
  currentUserId: string;
  selected: boolean;
  onClick: () => void;
}

export function ChatListItem({ chat, currentUserId, selected, onClick }: ChatListItemProps) {
  const isGroup = chat.chat_type === 'group';
  const peer = chat.peer;
  const name = isGroup ? chat.name || 'Group' : getDisplayName(peer);
  const avatarId = isGroup ? chat.id : peer?.id || chat.id;
  const avatarSrc = isGroup ? chat.avatar_url : peer?.avatar_url;
  const isOnline = !isGroup && peer?.is_online;

  const last = chat.last_message;
  const isMine = last?.sender_id === currentUserId;
  const unread = chat.unread_count ?? 0;

  const renderPreview = () => {
    if (!last) return <span className="text-muted-foreground/70">No messages yet</span>;
    if (last.deleted) return <span className="italic text-muted-foreground/70">message deleted</span>;
    const prefix = isGroup && !isMine && last.sender_id
      ? `${getDisplayName({ display_name: '', username: '' })}: `
      : isMine ? 'You: ' : '';
    void prefix;
    switch (last.message_type) {
      case 'image':
        return (
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" /> Photo
            {last.message ? ` — ${last.message.slice(0, 20)}` : ''}
          </span>
        );
      case 'video':
        return (
          <span className="flex items-center gap-1">
            <Video className="h-3.5 w-3.5" /> Video
            {last.message ? ` — ${last.message.slice(0, 20)}` : ''}
          </span>
        );
      case 'audio':
        return (
          <span className="flex items-center gap-1">
            <Mic className="h-3.5 w-3.5" /> Audio
          </span>
        );
      case 'file':
        return (
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> {last.attachment_name || 'File'}
          </span>
        );
      default:
        return <span className="truncate">{last.message}</span>;
    }
  };

  const tickIcon = () => {
    if (!isMine || !last || last.deleted) return null;
    const read = last.read_by?.includes(currentUserId) || (last.read_by?.length ?? 0) >= 1;
    return read ? <CheckCheck className="h-3.5 w-3.5 text-sky-500" /> : <Check className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
        selected ? 'bg-accent' : 'hover:bg-accent/50'
      )}
    >
      <Avatar name={name} src={avatarSrc} id={avatarId} size="md" showStatus={isOnline !== undefined} isOnline={isOnline} />
      <div className="min-w-0 flex-1 border-b border-border/40 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('truncate font-semibold', selected ? 'text-accent-foreground' : 'text-foreground')}>{name}</p>
          <span className={cn('shrink-0 text-xs', unread > 0 ? 'font-semibold text-primary' : 'text-muted-foreground')}>
            {last ? formatChatTime(last.created_at) : formatChatTime(chat.updated_at)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            {isMine && !last?.deleted && last && <span className="shrink-0">{tickIcon()}</span>}
            <span className="truncate">{renderPreview()}</span>
          </div>
          {unread > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// keep Play imported for future use in audio preview
void Play;

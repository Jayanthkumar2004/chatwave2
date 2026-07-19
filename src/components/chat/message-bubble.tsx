import { cn, formatMessageTime, getDisplayName } from '@/lib/utils';
import type { MessageWithSender } from '@/types';
import { Avatar } from '@/components/shared/avatar';
import { Check, CheckCheck, Clock, FileText, ImageIcon, Mic, Pencil, Play, Trash2, Video } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

interface MessageBubbleProps {
  message: MessageWithSender;
  currentUserId: string;
  isGroup: boolean;
  showAvatar: boolean;
  showSenderName: boolean;
  onReply: (m: MessageWithSender) => void;
  onEdit: (m: MessageWithSender) => void;
  onDeleteForMe: (m: MessageWithSender) => void;
  onDeleteForEveryone: (m: MessageWithSender) => void;
}

export function MessageBubble({
  message,
  currentUserId,
  isGroup,
  showAvatar,
  showSenderName,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
}: MessageBubbleProps) {
  const isMine = message.sender_id === currentUserId;
  const [imgOpen, setImgOpen] = useState(false);
  const senderName = getDisplayName(message.sender);

  const ticks = () => {
    if (!isMine || message.deleted) return null;
    // delivered if any non-sender in read_by; read if any other member read it
    const others = message.read_by?.filter((id) => id !== currentUserId) ?? [];
    if (others.length > 0) return <CheckCheck className="h-3.5 w-3.5 text-sky-400" />;
    return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  if (message.deleted) {
    return (
      <div className={cn('flex px-3', isMine ? 'justify-end' : 'justify-start')}>
        <div className={cn('max-w-[75%] rounded-lg px-3 py-2 text-sm italic text-muted-foreground', isMine ? 'bg-chat-bubble-out text-primary-foreground' : 'bg-chat-bubble-in')}>
          <div className="flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            <span>This message was deleted</span>
          </div>
          <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted-foreground/80">
            {formatMessageTime(message.created_at)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('group flex items-end gap-2 px-3', isMine ? 'justify-end' : 'justify-start')}>
      {!isMine && (
        <div className="w-8 shrink-0">
          {showAvatar && <Avatar name={senderName} src={message.sender?.avatar_url} id={message.sender_id} size="xs" />}
        </div>
      )}
      <div className={cn('relative max-w-[78%] sm:max-w-[65%]')}>
        <DropdownMenu>
          <div
            className={cn(
              'animate-msg-in rounded-lg px-3 py-2 text-sm shadow-sm',
              isMine ? 'bg-chat-bubble-out text-primary-foreground' : 'bg-chat-bubble-in text-foreground'
            )}
          >
            {!isMine && isGroup && showSenderName && (
              <p className="mb-0.5 text-xs font-semibold text-primary">{senderName}</p>
            )}

            {message.reply && (
              <div
                className={cn(
                  'mb-1.5 border-l-2 pl-2 text-xs opacity-80',
                  isMine ? 'border-primary-foreground/40' : 'border-primary'
                )}
              >
                <p className="font-semibold">{getDisplayName({ display_name: '', username: '' })}</p>
                <p className="truncate">{message.reply.message || (message.reply.attachment_name || 'Attachment')}</p>
              </div>
            )}

            {message.message_type === 'image' && message.attachment_url && (
              <div className="mb-1 overflow-hidden rounded-md">
                <img
                  src={message.attachment_url}
                  alt={message.attachment_name || 'image'}
                  className="max-h-72 w-full cursor-zoom-in object-cover"
                  loading="lazy"
                  onClick={() => setImgOpen(true)}
                />
              </div>
            )}
            {message.message_type === 'video' && message.attachment_url && (
              <div className="mb-1 overflow-hidden rounded-md">
                <video src={message.attachment_url} controls className="max-h-72 w-full object-cover" />
              </div>
            )}
            {message.message_type === 'audio' && message.attachment_url && (
              <div className="mb-1 flex items-center gap-2">
                <audio src={message.attachment_url} controls className="h-8 w-full" />
              </div>
            )}
            {message.message_type === 'file' && message.attachment_url && (
              <a
                href={message.attachment_url}
                download={message.attachment_name || undefined}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'mb-1 flex items-center gap-2 rounded-md border p-2 text-xs transition-colors',
                  isMine ? 'border-primary-foreground/30 hover:bg-black/10' : 'border-border hover:bg-accent'
                )}
              >
                <FileText className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{message.attachment_name || 'File'}</span>
                <Download className="h-4 w-4 shrink-0" />
              </a>
            )}

            {message.message && (
              <p className="whitespace-pre-wrap break-words">{message.message}</p>
            )}

            <div className={cn('mt-0.5 flex items-center justify-end gap-1 text-[10px]', isMine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
              {message.edited && <span className="italic">edited</span>}
              <span>{formatMessageTime(message.created_at)}</span>
              {ticks()}
            </div>
          </div>

          {/* Long-press / right-click style menu trigger (invisible button) */}
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'absolute top-0 opacity-0 transition-opacity group-hover:opacity-100',
                isMine ? '-left-7' : '-right-7'
              )}
              aria-label="Message actions"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow backdrop-blur hover:text-foreground">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align={isMine ? 'end' : 'start'} className="w-44">
            <DropdownMenuItem onClick={() => onReply(message)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
              Reply
            </DropdownMenuItem>
            {message.message_type === 'image' && message.attachment_url && (
              <DropdownMenuItem asChild>
                <a href={message.attachment_url} download={message.attachment_name || undefined} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-3.5 w-3.5" /> Download
                </a>
              </DropdownMenuItem>
            )}
            {isMine && message.message_type === 'text' && (
              <DropdownMenuItem onClick={() => onEdit(message)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onDeleteForMe(message)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for me
            </DropdownMenuItem>
            {isMine && (
              <DropdownMenuItem onClick={() => onDeleteForEveryone(message)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for everyone
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {imgOpen && message.attachment_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          onClick={() => setImgOpen(false)}
        >
          <img src={message.attachment_url} alt="preview" className="max-h-full max-w-full rounded-lg object-contain" />
          <a
            href={message.attachment_url}
            download={message.attachment_name || undefined}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
          >
            <Download className="h-5 w-5" />
          </a>
        </div>
      )}
    </div>
  );
}

void Clock;
void Play;
void ImageIcon;
void Mic;
void Video;

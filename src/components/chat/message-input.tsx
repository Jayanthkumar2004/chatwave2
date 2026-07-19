import { useEffect, useRef, useState } from 'react';
import { Paperclip, Send, Smile, X, Mic, Image as ImageIcon, FileText, Film, CornerUpLeft, Pencil } from 'lucide-react';
import { EmojiPicker } from '@/components/shared/emoji-picker';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Message, MessageWithSender } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface MessageInputProps {
  onSend: (payload: {
    message: string;
    messageType?: Message['message_type'];
    file?: File;
    replyTo?: string | null;
  }) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  replyTo: MessageWithSender | null;
  editing: MessageWithSender | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSendEdit: (newText: string) => Promise<void>;
  uploading: boolean;
}

export function MessageInput({
  onSend,
  onTyping,
  replyTo,
  editing,
  onCancelReply,
  onCancelEdit,
  onSendEdit,
  uploading,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Autofocus and grow
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 140) + 'px';
    }
  }, [text]);

  useEffect(() => {
    if (editing) {
      setText(editing.message);
      taRef.current?.focus();
    }
  }, [editing]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || uploading) return;
    if (editing) {
      await onSendEdit(trimmed);
      setText('');
      return;
    }
    await onSend({ message: trimmed, replyTo: replyTo?.id ?? null });
    setText('');
    onTyping(false);
    taRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
    if (e.key === 'Escape') {
      if (editing) onCancelEdit();
      if (replyTo) onCancelReply();
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping(e.target.value.length > 0);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'video' | 'audio' | 'file') => {
    const f = e.target.files?.[0];
    if (!f) return;
    const max = 25 * 1024 * 1024;
    if (f.size > max) {
      toast({ title: 'File too large', description: 'Max 25 MB.', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    const messageType =
      kind === 'image' ? 'image' : kind === 'video' ? 'video' : kind === 'audio' ? 'audio' : 'file';
    void onSend({ message: '', messageType: messageType as Message['message_type'], file: f, replyTo: replyTo?.id ?? null });
    e.target.value = '';
  };

  const isEditing = !!editing;

  return (
    <div className={cn('border-t bg-background px-2 py-2 sm:px-4 safe-bottom', (replyTo || editing) && 'pt-0')}>
      {/* Reply banner */}
      {replyTo && !editing && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-2 py-1.5">
          <CornerUpLeft className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">Replying to message</p>
            <p className="truncate text-xs text-muted-foreground">{replyTo.message || replyTo.attachment_name || 'Attachment'}</p>
          </div>
          <button onClick={onCancelReply} className="rounded p-1 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Edit banner */}
      {editing && (
        <div className="flex items-center gap-2 border-b border-border bg-amber-500/10 px-2 py-1.5">
          <Pencil className="h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Editing message</p>
            <p className="truncate text-xs text-muted-foreground">{editing.message}</p>
          </div>
          <button onClick={onCancelEdit} className="rounded p-1 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <EmojiPicker onPick={(e) => setText((p) => p + e)} className="shrink-0" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Attach file"
            >
              <Paperclip className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={() => imageRef.current?.click()}>
              <ImageIcon className="mr-2 h-4 w-4 text-primary" /> Photo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => videoRef.current?.click()}>
              <Film className="mr-2 h-4 w-4 text-rose-500" /> Video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => audioRef.current?.click()}>
              <Mic className="mr-2 h-4 w-4 text-amber-500" /> Audio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileRef.current?.click()}>
              <FileText className="mr-2 h-4 w-4 text-sky-500" /> Document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile(e, 'image')} />
        <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => onPickFile(e, 'video')} />
        <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={(e) => onPickFile(e, 'audio')} />
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => onPickFile(e, 'file')} />

        <textarea
          ref={taRef}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={isEditing ? 'Edit your message…' : 'Type a message'}
          className="max-h-[140px] min-h-[40px] flex-1 resize-none rounded-2xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />

        <Button
          onClick={handleSend}
          disabled={(uploading || (!text.trim() && !isEditing))}
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          aria-label={isEditing ? 'Save edit' : 'Send'}
        >
          {isEditing ? <Pencil className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

void Smile;

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { useMessages } from '@/hooks/use-messages';
import { useTyping, useTypingSubscription, usePresenceSubscription } from '@/hooks/use-presence';
import { deleteMessageForEveryone, deleteMessageForMe, editMessage, markChatRead, searchMessages, sendMessage, uploadAttachment } from '@/api/messages';
import { deleteChat, leaveChat } from '@/api/chats';
import { messagesKeys } from '@/hooks/use-messages';
import { chatsKeys } from '@/hooks/use-chats';
import type { ChatWithDetails, MessageWithSender } from '@/types';
import { ChatHeader } from './chat-header';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { EmptyState } from '@/components/shared/empty-state';
import { MessageListSkeleton } from '@/components/shared/loaders';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDisplayName } from '@/lib/utils';

interface ChatWindowProps {
  chat: ChatWithDetails;
  onBack: () => void;
  onOpenInfo: () => void;
  onAddMembers: () => void;
  onRenameGroup: () => void;
  onChatDeleted: () => void;
}

export function ChatWindow({ chat, onBack, onOpenInfo, onAddMembers, onRenameGroup, onChatDeleted }: ChatWindowProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { messages, hasMore, loadingMore, loadMore, isFetching } = useMessages(chat.id);
  const { setTyping } = useTyping(chat.id);

  const [replyTo, setReplyTo] = useState<MessageWithSender | null>(null);
  const [editing, setEditing] = useState<MessageWithSender | null>(null);
  const [uploading, setUploading] = useState(false);
  const [typingIds, setTypingIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageWithSender[] | null>(null);

  // Typing subscription
  useTypingSubscription(chat.id, user!.id, (ids) => setTypingIds(ids));

  // Presence subscription — refresh chat list (for online status in sidebar)
  const memberIds = useMemo(() => (chat.members?.map((m) => m.id) ?? []), [chat.members]);
  usePresenceSubscription(memberIds, () => {
    qc.invalidateQueries({ queryKey: chatsKeys.list(user!.id) });
  });

  // Search in chat
  const searchQueryReq = useQuery({
    queryKey: ['messages', 'search', chat.id, searchQuery],
    queryFn: () => searchMessages(chat.id, searchQuery),
    enabled: !!searchQuery && searchQuery.length > 0,
    staleTime: 30_000,
  });

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q) {
      setSearchResults(null);
      return;
    }
    searchQueryReq.refetch().then((r) => setSearchResults(r.data ?? []));
  };

  const typingUserNames = typingIds
    .map((id) => chat.members?.find((m) => m.id === id))
    .filter(Boolean)
    .map((m) => (m!.id === user!.id ? 'You' : getDisplayName(m)))
    .filter((n) => n !== 'You');

  const handleSend = async (payload: { message: string; messageType?: 'text' | 'image' | 'video' | 'audio' | 'file'; file?: File; replyTo?: string | null }) => {
    if (!user) return;
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      let attachmentSize: number | null = null;
      let messageType = payload.messageType ?? 'text';

      if (payload.file) {
        setUploading(true);
        const up = await uploadAttachment(user.id, payload.file);
        attachmentUrl = up.url;
        attachmentName = payload.file.name;
        attachmentSize = up.size;
      }

      await sendMessage({
        chat_id: chat.id,
        sender_id: user.id,
        message: payload.message,
        message_type: messageType,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_size: attachmentSize,
        reply_to: payload.replyTo ?? null,
      });
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: chatsKeys.list(user.id) });
      qc.invalidateQueries({ queryKey: messagesKeys.list(chat.id) });
    } catch (e) {
      toast({ title: 'Could not send message', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSendEdit = async (newText: string) => {
    if (!editing) return;
    try {
      await editMessage(editing.id, newText);
      setEditing(null);
      qc.invalidateQueries({ queryKey: messagesKeys.list(chat.id) });
    } catch (e) {
      toast({ title: 'Could not edit message', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleDeleteForMe = async (m: MessageWithSender) => {
    try {
      await deleteMessageForMe(m.id, user!.id);
      qc.invalidateQueries({ queryKey: messagesKeys.list(chat.id) });
    } catch (e) {
      toast({ title: 'Could not delete', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleDeleteForEveryone = async (m: MessageWithSender) => {
    try {
      await deleteMessageForEveryone(m.id);
      qc.invalidateQueries({ queryKey: messagesKeys.list(chat.id) });
    } catch (e) {
      toast({ title: 'Could not delete', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await leaveChat(chat.id, user!.id);
      toast({ title: 'You left the group' });
      onChatDeleted();
    } catch (e) {
      toast({ title: 'Could not leave group', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleDeleteChat = async () => {
    if (chat.created_by !== user!.id) return;
    try {
      await deleteChat(chat.id);
      toast({ title: 'Chat deleted' });
      onChatDeleted();
    } catch (e) {
      toast({ title: 'Could not delete chat', description: (e as Error).message, variant: 'destructive' });
    }
  };

  // mark read on mount
  useMemo(() => {
    if (user) markChatRead(chat.id, user.id).catch(() => undefined);
  }, [chat.id, user]);

  return (
    <div className="relative flex h-full flex-col bg-chat-bg">
      <ChatHeader
        chat={chat}
        typingUserNames={typingUserNames}
        onBack={onBack}
        onOpenInfo={onOpenInfo}
        onSearch={handleSearch}
        onClearSearch={() => setSearchResults(null)}
        onLeaveGroup={handleLeaveGroup}
        onAddMembers={onAddMembers}
        onRenameGroup={onRenameGroup}
      />

      {/* Search results overlay */}
      {searchResults !== null && (
        <div className="absolute left-0 right-0 top-16 z-20 max-h-64 overflow-y-auto border-b bg-background shadow-lg scrollbar-thin">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-xs font-semibold text-muted-foreground">
              {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
            </p>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setSearchResults(null)}>
              <X className="mr-1 h-3 w-3" /> Close
            </Button>
          </div>
          {searchResults.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No messages match "{searchQuery}".</p>
          ) : (
            searchResults.map((m) => (
              <div key={m.id} className="border-b px-3 py-2 last:border-0 hover:bg-accent">
                <p className="truncate text-sm">{m.message || m.attachment_name || 'Attachment'}</p>
                <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      )}

      {isFetching && messages.length === 0 ? (
        <MessageListSkeleton />
      ) : (
        <MessageList
          messages={messages}
          currentUserId={user!.id}
          isGroup={chat.chat_type === 'group'}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          typingUserNames={typingUserNames}
          onReply={setReplyTo}
          onEdit={setEditing}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
        />
      )}

      <MessageInput
        onSend={handleSend}
        onTyping={setTyping}
        replyTo={replyTo}
        editing={editing}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditing(null)}
        onSendEdit={handleSendEdit}
        uploading={uploading}
      />
    </div>
  );
}

void EmptyState;
void MessageCircle;

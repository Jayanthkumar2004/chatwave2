import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';
import { useChatsList } from '@/hooks/use-chats';
import { usePresence } from '@/hooks/use-presence';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatWindow } from '@/components/chat/chat-window';
import { ChatInfoDrawer } from '@/components/chat/chat-info-drawer';
import { NewChatDialog } from '@/components/chat/dialogs/new-chat-dialog';
import { NewGroupDialog } from '@/components/chat/dialogs/new-group-dialog';
import { AddMembersDialog } from '@/components/chat/dialogs/add-members-dialog';
import { RenameGroupDialog } from '@/components/chat/dialogs/rename-group-dialog';
import { ContactsDialog } from '@/components/chat/dialogs/contacts-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { MessageCircle, MessageSquarePlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatWithDetails } from '@/types';

export function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: chats } = useChatsList();

  // Presence heartbeat — updates is_online / last_seen while the app is open
  usePresence();

  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showRename, setShowRename] = useState(false);

  const selectedChat = useMemo<ChatWithDetails | null>(() => {
    if (!chats || !chatId) return null;
    return chats.find((c) => c.id === chatId) ?? null;
  }, [chats, chatId]);

  const selectedId = chatId ?? null;
  const showSidebarOnly = !selectedId;

  const handleSelectChat = (id: string) => navigate(`/chats/${id}`, { replace: false });
  const handleBack = () => navigate('/chats', { replace: false });
  const handleChatCreated = (id: string) => navigate(`/chats/${id}`);

  const chatForWindow: ChatWithDetails | null = selectedChat
    ? selectedChat
    : selectedId
    ? {
        id: selectedId,
        chat_type: 'private',
        name: null,
        avatar_url: null,
        created_by: user?.id ?? '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        members: [],
      }
    : null;

  useEffect(() => {
    if (!selectedChat) setShowInfo(false);
  }, [selectedChat]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background safe-top safe-bottom">
      {/* Sidebar — full width on mobile if no chat selected, fixed width on desktop */}
      <div
        className={
          showSidebarOnly
            ? 'h-full w-full md:w-[380px] md:shrink-0 md:border-r'
            : 'hidden h-full w-[380px] shrink-0 border-r md:block'
        }
      >
        <ChatSidebar
          selectedChatId={selectedId}
          onSelectChat={handleSelectChat}
          onNewChat={() => setShowNewChat(true)}
          onNewGroup={() => setShowNewGroup(true)}
          onOpenContacts={() => setShowContacts(true)}
          onOpenProfile={() => navigate('/settings')}
        />
      </div>

      {/* Chat window — full width on mobile, flex-1 on desktop */}
      <div
        className={
          showSidebarOnly
            ? 'hidden h-full flex-1 md:block'
            : 'h-full w-full flex-1'
        }
      >
        {chatForWindow ? (
          <ChatWindow
            key={chatForWindow.id}
            chat={chatForWindow}
            onBack={handleBack} // shows back button on mobile
            onOpenInfo={() => setShowInfo(true)}
            onAddMembers={() => setShowAddMembers(true)}
            onRenameGroup={() => setShowRename(true)}
            onChatDeleted={handleBack}
          />
        ) : (
          <EmptyState
            icon={<MessageCircle className="h-8 w-8" />}
            title="Select a chat to start messaging"
            description="Pick a conversation from the left, or start a new one."
            action={
              <div className="flex gap-2">
                <Button onClick={() => setShowNewChat(true)}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" /> New chat
                </Button>
                <Button variant="outline" onClick={() => setShowNewGroup(true)}>
                  <Users className="mr-2 h-4 w-4" /> New group
                </Button>
              </div>
            }
            className="hidden md:flex"
          />
        )}
      </div>

      {/* Dialogs & drawers */}
      <NewChatDialog open={showNewChat} onOpenChange={setShowNewChat} onChatCreated={handleChatCreated} />
      <NewGroupDialog open={showNewGroup} onOpenChange={setShowNewGroup} onGroupCreated={handleChatCreated} />
      <ContactsDialog open={showContacts} onOpenChange={setShowContacts} onChatOpened={handleChatCreated} />

      {selectedChat && (
        <ChatInfoDrawer
          open={showInfo}
          onOpenChange={setShowInfo}
          chat={selectedChat}
          onAddMembers={() => setShowAddMembers(true)}
          onRenameGroup={() => setShowRename(true)}
          onChatDeleted={handleBack}
        />
      )}

      {selectedChat && (
        <AddMembersDialog
          open={showAddMembers}
          onOpenChange={setShowAddMembers}
          chat={{ ...selectedChat, memberIds: selectedChat.members?.map((m) => m.id) ?? [] }}
        />
      )}

      {selectedChat && (
        <RenameGroupDialog
          open={showRename}
          onOpenChange={setShowRename}
          chatId={selectedChat.id}
          currentName={selectedChat.name || ''}
          onDone={() => setShowInfo(false)}
        />
      )}
    </div>
  );
}

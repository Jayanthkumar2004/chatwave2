import { useMemo, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useChatsList, useChatsRealtime, useFilteredChats } from '@/hooks/use-chats';
import { useNotifications } from '@/hooks/use-notifications';
import { useContacts } from '@/hooks/use-contacts';
import { ChatListItem } from './chat-list-item';
import { ChatListSkeleton } from '@/components/shared/loaders';
import { Avatar } from '@/components/shared/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  MessageSquarePlus,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
  Bell,
  UserPlus,
  X,
  CheckCheck,
} from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import { useNavigate } from 'react-router-dom';
import { getDisplayName } from '@/lib/utils';
import { requestNotificationPermission } from '@/hooks/use-notifications';

interface SidebarProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onOpenContacts: () => void;
  onOpenProfile: () => void;
}

export function ChatSidebar({
  selectedChatId,
  onSelectChat,
  onNewChat,
  onNewGroup,
  onOpenContacts,
  onOpenProfile,
}: SidebarProps) {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { unreadCount, notifications } = useNotifications();
  const { data: contacts } = useContacts();
  const [query, setQuery] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);

  useChatsRealtime();
  const { data: chats, isLoading } = useChatsList();
  const filtered = useFilteredChats(chats, user?.id, query);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const at = a.last_message?.created_at || a.updated_at;
      const bt = b.last_message?.created_at || b.updated_at;
      return bt.localeCompare(at);
    });
  }, [filtered]);

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      // simple toast via dropdown close
      setShowNotifs(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-chat-sidebar">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 bg-chat-header px-4 safe-top">
        <div className="flex min-w-0 items-center gap-2.5">
          <button onClick={onOpenProfile} className="flex min-w-0 items-center gap-2.5 rounded-lg p-0.5 transition-colors hover:bg-accent">
            <Avatar name={getDisplayName(profile)} src={profile?.avatar_url} id={user?.id || 'me'} size="sm" showStatus />
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-semibold leading-tight">{getDisplayName(profile)}</p>
              <p className="truncate text-xs text-muted-foreground">@{profile?.username}</p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowNotifs((p) => !p)} aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            {showNotifs && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowNotifs(false)} />
                <div className="absolute right-0 top-12 z-40 w-80 rounded-xl border bg-popover shadow-xl animate-fade-in">
                  <div className="flex items-center justify-between border-b p-3">
                    <p className="text-sm font-semibold">Notifications</p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleEnableNotifications}>
                        Enable push
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNotifs(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="flex gap-3 border-b px-3 py-2.5 last:border-0">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{n.title}</p>
                            {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                          </div>
                          {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* New chat */}
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onNewChat} aria-label="New chat">
            <MessageSquarePlus className="h-5 w-5" />
          </Button>

          {/* Main menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Menu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onNewGroup}>
                <Users className="mr-2 h-4 w-4" /> New group
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenContacts}>
                <UserPlus className="mr-2 h-4 w-4" /> Contacts
                {contacts && contacts.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">{contacts.length}</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenProfile}>
                <Settings className="mr-2 h-4 w-4" /> Profile settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => signOut().then(() => navigate('/login'))}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="h-9 rounded-full bg-background pl-9 pr-9"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <ChatListSkeleton />
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            {query ? (
              <>
                <Search className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No chats match "{query}".</p>
              </>
            ) : (
              <>
                <MessageSquarePlus className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No chats yet</p>
                <p className="text-xs text-muted-foreground">Tap the new-chat icon to start a conversation.</p>
                <Button size="sm" className="mt-2" onClick={onNewChat}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" /> Start a chat
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="py-1">
            {sorted.map((c) => (
              <ChatListItem
                key={c.id}
                chat={c}
                currentUserId={user!.id}
                selected={c.id === selectedChatId}
                onClick={() => onSelectChat(c.id)}
              />
            ))}
            <div className="flex items-center justify-center gap-1.5 py-4 text-xs text-muted-foreground">
              <CheckCheck className="h-3.5 w-3.5" />
              Your chats are end-to-end secured with RLS
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

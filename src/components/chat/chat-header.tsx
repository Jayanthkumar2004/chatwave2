import { useState } from 'react';
import { Avatar } from '@/components/shared/avatar';
import { cn, formatLastSeen, getDisplayName } from '@/lib/utils';
import type { ChatWithDetails } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import { ArrowLeft, MoreVertical, Phone, Search, Video, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface ChatHeaderProps {
  chat: ChatWithDetails;
  typingUserNames: string[];
  onBack: () => void;
  onOpenInfo: () => void;
  onSearch: (q: string) => void;
  onClearSearch: () => void;
  onLeaveGroup: () => void;
  onAddMembers: () => void;
  onRenameGroup: () => void;
}

export function ChatHeader({
  chat,
  typingUserNames,
  onBack,
  onOpenInfo,
  onSearch,
  onClearSearch,
  onLeaveGroup,
  onAddMembers,
  onRenameGroup,
}: ChatHeaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showSearch, setShowSearch] = useState(false);
  const [q, setQ] = useState('');

  const isGroup = chat.chat_type === 'group';
  const peer = chat.peer;
  const name = isGroup ? chat.name || 'Group' : getDisplayName(peer);
  const isOnline = !isGroup && peer?.is_online;

  const subtitle = () => {
    if (typingUserNames.length > 0) {
      return typingUserNames.length === 1 ? `${typingUserNames[0]} is typing…` : 'several people typing…';
    }
    if (isGroup) {
      const count = chat.members?.length ?? 0;
      return `${count} member${count === 1 ? '' : 's'}`;
    }
    if (isOnline) return 'online';
    return formatLastSeen(peer?.last_seen ?? null);
  };

  const onSearchChange = (v: string) => {
    setQ(v);
    onSearch(v);
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-chat-header px-2 sm:px-4 safe-top">
      <button onClick={onBack} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent md:hidden" aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </button>

      <button onClick={onOpenInfo} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left hover:bg-accent/50">
        <Avatar
          name={name}
          src={isGroup ? chat.avatar_url : peer?.avatar_url}
          id={isGroup ? chat.id : peer?.id || chat.id}
          size="sm"
          showStatus={isOnline !== undefined}
          isOnline={isOnline}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{name}</p>
          <p className={cn('truncate text-xs', typingUserNames.length > 0 ? 'text-primary' : 'text-muted-foreground')}>
            {subtitle()}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setShowSearch((p) => !p); if (showSearch) { setQ(''); onClearSearch(); } }} aria-label="Search messages">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex" onClick={() => toast({ title: 'Voice & video calls coming soon' })} aria-label="Voice call">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex" onClick={() => toast({ title: 'Voice & video calls coming soon' })} aria-label="Video call">
          <Video className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="More">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onOpenInfo}>
              <Users className="mr-2 h-4 w-4" /> View info
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setShowSearch(true); }} >
              <Search className="mr-2 h-4 w-4" /> Search messages
            </DropdownMenuItem>
            {isGroup && (
              <>
                <DropdownMenuItem onClick={onAddMembers} disabled={chat.created_by !== user?.id}>
                  <Users className="mr-2 h-4 w-4" /> Add members
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onRenameGroup} disabled={chat.created_by !== user?.id}>
                  <span className="mr-2 h-4 w-4 text-center text-xs">A</span> Rename group
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onLeaveGroup}>
                  Leave group
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showSearch && (
        <div className="absolute left-0 right-0 top-16 z-20 flex items-center gap-2 border-b bg-background px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search in this chat"
            className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
          <button
            onClick={() => { setShowSearch(false); setQ(''); onClearSearch(); }}
            className="rounded p-1 text-muted-foreground hover:bg-accent"
          >
            <span className="text-xs">Cancel</span>
          </button>
        </div>
      )}
    </header>
  );
}

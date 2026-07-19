import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/shared/avatar';
import { Spinner } from '@/components/shared/loaders';
import { searchUsers } from '@/api/profiles';
import { useAuth } from '@/providers/auth-provider';
import { useContacts } from '@/hooks/use-contacts';
import type { Profile } from '@/types';
import { Search, MessageSquare, UserPlus, Check } from 'lucide-react';
import { createPrivateChat } from '@/api/chats';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { chatsKeys } from '@/hooks/use-chats';
import { Button } from '@/components/ui/button';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChatCreated: (chatId: string) => void;
}

export function NewChatDialog({ open, onOpenChange, onChatCreated }: NewChatDialogProps) {
  const { user } = useAuth();
  const { data: contacts } = useContacts();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchUsers(q, 15);
        setResults(r.filter((p) => p.id !== user?.id));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, user?.id]);

  const startChat = async (peerId: string) => {
    setCreating(peerId);
    try {
      const chat = await createPrivateChat(user!.id, peerId);
      qc.invalidateQueries({ queryKey: chatsKeys.list(user!.id) });
      onOpenChange(false);
      onChatCreated(chat.id);
    } catch (e) {
      toast({ title: 'Could not start chat', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setCreating(null);
    }
  };

  const contactProfiles = (contacts ?? []).map((c) => c.profile).filter(Boolean) as Profile[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start a new chat</DialogTitle>
          <DialogDescription>Search by username or display name, or pick from your contacts.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search username or name"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {searching && <div className="flex justify-center p-4"><Spinner /></div>}

          {!searching && query && results.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No users found for "{query}".</p>
          )}

          {!searching && !query && contactProfiles.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">You don't have any contacts yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">Search above to find people to chat with.</p>
            </div>
          )}

          {/* Contacts when no search query */}
          {!searching && !query && contactProfiles.length > 0 && (
            <div>
              <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your contacts</p>
              {contactProfiles.map((p) => (
                <UserRow key={p.id} profile={p} onPick={startChat} busy={creating === p.id} />
              ))}
            </div>
          )}

          {/* Search results */}
          {!searching && query && results.length > 0 && (
            <div>
              <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Results</p>
              {results.map((p) => (
                <UserRow key={p.id} profile={p} onPick={startChat} busy={creating === p.id} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserRow({ profile, onPick, busy }: { profile: Profile; onPick: (id: string) => void; busy: boolean }) {
  return (
    <button
      onClick={() => onPick(profile.id)}
      disabled={busy}
      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
    >
      <Avatar name={profile.display_name || profile.username} src={profile.avatar_url} id={profile.id} size="md" showStatus isOnline={profile.is_online} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{profile.display_name}</p>
        <p className="truncate text-xs text-muted-foreground">@{profile.username}{profile.is_online ? ' · online' : ''}</p>
      </div>
      {busy ? <Spinner /> : <MessageSquare className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

void UserPlus;
void Check;
void Button;

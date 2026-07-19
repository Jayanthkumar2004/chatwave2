import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/shared/avatar';
import { Spinner } from '@/components/shared/loaders';
import { EmptyState } from '@/components/shared/empty-state';
import { useContacts, useAddContact, useRemoveContact } from '@/hooks/use-contacts';
import { searchUsers } from '@/api/profiles';
import { createPrivateChat } from '@/api/chats';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { chatsKeys } from '@/hooks/use-chats';
import type { Profile } from '@/types';
import { Search, UserPlus, MessageSquare, Trash2, Contact as ContactIcon } from 'lucide-react';
import { formatLastSeen, getDisplayName } from '@/lib/utils';

interface ContactsDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChatOpened: (chatId: string) => void;
}

export function ContactsDialog({ open, onOpenChange, onChatOpened }: ContactsDialogProps) {
  const { user } = useAuth();
  const { data: contacts, isLoading } = useContacts();
  const addContact = useAddContact();
  const removeContact = useRemoveContact();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

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
    const h = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchUsers(q, 15);
        setResults(r.filter((p) => p.id !== user?.id));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(h);
  }, [query, user?.id]);

  const isContactAlready = (userId: string) => (contacts ?? []).some((c) => c.contact_user_id === userId);

  const handleAdd = async (p: Profile) => {
    setBusy(p.id);
    try {
      await addContact.mutateAsync({ contactUserId: p.id });
      setQuery('');
    } finally {
      setBusy(null);
    }
  };

  const handleStartChat = async (peerId: string) => {
    setBusy(peerId);
    try {
      const chat = await createPrivateChat(user!.id, peerId);
      qc.invalidateQueries({ queryKey: chatsKeys.list(user!.id) });
      onOpenChange(false);
      onChatOpened(chat.id);
    } catch (e) {
      toast({ title: 'Could not start chat', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (contactId: string) => {
    try {
      await removeContact.mutateAsync({ contactId });
    } catch {
      // toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contacts</DialogTitle>
          <DialogDescription>Find people to add or start a chat with.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by username or name" className="pl-9" autoFocus />
        </div>

        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {searching && <div className="flex justify-center p-4"><Spinner /></div>}

          {/* Search results */}
          {!searching && query && (
            <>
              {results.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No users found.</p>
              ) : (
                results.map((p) => {
                  const already = isContactAlready(p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent">
                      <Avatar name={getDisplayName(p)} src={p.avatar_url} id={p.id} size="sm" showStatus isOnline={p.is_online} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{getDisplayName(p)}</p>
                        <p className="truncate text-xs text-muted-foreground">@{p.username} · {p.is_online ? 'online' : formatLastSeen(p.last_seen)}</p>
                      </div>
                      {already ? (
                        <span className="text-xs text-muted-foreground">In contacts</span>
                      ) : (
                        <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => handleAdd(p)}>
                          {busy === p.id ? <Spinner className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                          <span className="ml-1.5">Add</span>
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* Contact list */}
          {!searching && !query && (
            <>
              {isLoading ? (
                <div className="flex justify-center p-4"><Spinner /></div>
              ) : (contacts ?? []).length === 0 ? (
                <EmptyState
                  icon={<ContactIcon className="h-7 w-7" />}
                  title="No contacts yet"
                  description="Search above to find people and add them to your contacts."
                />
              ) : (
                <div>
                  <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {contacts!.length} contact{contacts!.length === 1 ? '' : 's'}
                  </p>
                  {contacts!.map((c) => {
                    const p = c.profile;
                    if (!p) return null;
                    return (
                      <div key={c.id} className="group flex items-center gap-3 rounded-lg p-2 hover:bg-accent">
                        <Avatar name={getDisplayName(p)} src={p.avatar_url} id={p.id} size="sm" showStatus isOnline={p.is_online} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{getDisplayName(p)}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.is_online ? 'online' : formatLastSeen(p.last_seen)}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy === p.id} onClick={() => handleStartChat(p.id)} aria-label="Chat">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleRemove(c.id)} aria-label="Remove contact">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

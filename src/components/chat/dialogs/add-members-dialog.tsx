import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/shared/avatar';
import { Spinner } from '@/components/shared/loaders';
import { searchUsers } from '@/api/profiles';
import { addChatMembers } from '@/api/chats';
import { useAuth } from '@/providers/auth-provider';
import type { Chat, Profile } from '@/types';
import { Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { chatsKeys } from '@/hooks/use-chats';

interface AddMembersDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  chat: ChatWithMemberIds;
}

export interface ChatWithMemberIds extends Chat {
  memberIds: string[];
}

export function AddMembersDialog({ open, onOpenChange, chat }: AddMembersDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected(new Set());
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
        setResults(r.filter((p) => !chat.memberIds.includes(p.id)));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(h);
  }, [query, chat.memberIds]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    setAdding(true);
    try {
      await addChatMembers(chat.id, Array.from(selected));
      qc.invalidateQueries({ queryKey: ['chats'] });
      toast({ title: `Added ${selected.size} member${selected.size === 1 ? '' : 's'}` });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Could not add members', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
          <DialogDescription>Search for users to add to this group.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" className="pl-9" autoFocus />
        </div>

        <div className="max-h-72 overflow-y-auto scrollbar-thin">
          {searching && <div className="flex justify-center p-4"><Spinner /></div>}
          {!searching && query && results.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">No users found.</p>
          )}
          {!searching &&
            results.map((p) => {
              const isSel = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent"
                >
                  <Avatar name={p.display_name} src={p.avatar_url} id={p.id} size="sm" showStatus isOnline={p.is_online} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                  </div>
                  <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border', isSel ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30')}>
                    {isSel && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={adding || selected.size === 0}>
            {adding ? <Spinner className="mr-2" /> : null}
            Add ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

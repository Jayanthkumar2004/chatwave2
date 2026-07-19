import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/shared/avatar';
import { Spinner } from '@/components/shared/loaders';
import { searchUsers } from '@/api/profiles';
import { createGroupChat, uploadGroupAvatar } from '@/api/chats';
import { useAuth } from '@/providers/auth-provider';
import { useContacts } from '@/hooks/use-contacts';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { chatsKeys } from '@/hooks/use-chats';
import type { Profile } from '@/types';
import { Search, Check, Camera, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onGroupCreated: (chatId: string) => void;
}

export function NewGroupDialog({ open, onOpenChange, onGroupCreated }: NewGroupDialogProps) {
  const { user } = useAuth();
  const { data: contacts } = useContacts();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Map<string, Profile>>(new Map());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setSelected(new Map());
      setQuery('');
      setResults([]);
      setAvatarFile(null);
      setAvatarPreview(null);
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

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast({ title: 'Please pick an image', variant: 'destructive' });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large (max 5MB)', variant: 'destructive' });
      return;
    }
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const toggleSelect = (p: Profile) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.set(p.id, p);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!user) return;
    if (name.trim().length < 2) {
      toast({ title: 'Enter a group name', variant: 'destructive' });
      return;
    }
    if (selected.size === 0) {
      toast({ title: 'Select at least one member', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        avatarUrl = await uploadGroupAvatar('temp', avatarFile, user.id);
      }
      const chat = await createGroupChat(user.id, name.trim(), Array.from(selected.keys()), avatarUrl);
      qc.invalidateQueries({ queryKey: chatsKeys.list(user.id) });
      toast({ title: 'Group created' });
      onOpenChange(false);
      onGroupCreated(chat.id);
    } catch (e) {
      toast({ title: 'Could not create group', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const contactProfiles = (contacts ?? []).map((c) => c.profile).filter(Boolean) as Profile[];
  const list = query ? results : contactProfiles.filter((p) => !selected.has(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>Create a group chat with up to hundreds of members.</DialogDescription>
        </DialogHeader>

        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={name || 'G'} src={avatarPreview} id={name || 'group-new'} size="lg" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
              aria-label="Group avatar"
            >
              <Camera className="h-3 w-3" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="group-name">Group name</Label>
            <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Family, Work, Friends…" maxLength={60} autoFocus />
          </div>
        </div>

        {/* Selected chips */}
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selected.values()).map((p) => (
              <span key={p.id} className="flex items-center gap-1 rounded-full bg-accent py-1 pl-1 pr-2 text-xs">
                <Avatar name={p.display_name} src={p.avatar_url} id={p.id} size="xs" />
                <span className="max-w-24 truncate">{p.display_name}</span>
                <button onClick={() => toggleSelect(p)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users to add" className="pl-9" />
        </div>

        {/* Member list */}
        <div className="max-h-56 overflow-y-auto scrollbar-thin">
          {searching && <div className="flex justify-center p-4"><Spinner /></div>}
          {!searching && list.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {query ? 'No users found.' : 'No contacts available. Search above to add people.'}
            </p>
          )}
          {!searching &&
            list.map((p) => {
              const isSel = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleSelect(p)}
                  className={cn('flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent')}
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
          <Button onClick={handleCreate} disabled={creating || name.trim().length < 2 || selected.size === 0}>
            {creating ? <Spinner className="mr-2" /> : <Users className="mr-2 h-4 w-4" />}
            Create group ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

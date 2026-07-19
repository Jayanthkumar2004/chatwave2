import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar } from '@/components/shared/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import type { ChatWithDetails } from '@/types';
import { formatLastSeen, getDisplayName } from '@/lib/utils';
import { removeChatMember, leaveChat } from '@/api/chats';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { chatsKeys } from '@/hooks/use-chats';
import { Badge } from '@/components/ui/badge';
import { LogOut, Trash2, UserMinus, Crown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChatInfoDrawerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  chat: ChatWithDetails | null;
  onAddMembers: () => void;
  onRenameGroup: () => void;
  onChatDeleted: () => void;
}

export function ChatInfoDrawer({ open, onOpenChange, chat, onAddMembers, onRenameGroup, onChatDeleted }: ChatInfoDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  if (!chat || !user) return null;

  const isGroup = chat.chat_type === 'group';
  const peer = chat.peer;
  const title = isGroup ? chat.name || 'Group' : getDisplayName(peer);
  const isOwner = chat.created_by === user.id;
  const members = chat.members ?? [];

  const handleRemove = async (memberId: string) => {
    try {
      await removeChatMember(chat.id, memberId);
      qc.invalidateQueries({ queryKey: chatsKeys.list(user.id) });
      toast({ title: 'Member removed' });
      setRemoveTarget(null);
    } catch (e) {
      toast({ title: 'Could not remove member', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleLeave = async () => {
    try {
      await leaveChat(chat.id, user.id);
      qc.invalidateQueries({ queryKey: chatsKeys.list(user.id) });
      toast({ title: 'You left the group' });
      setConfirmLeave(false);
      onChatDeleted();
    } catch (e) {
      toast({ title: 'Could not leave group', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto scrollbar-thin sm:max-w-md">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">{isGroup ? 'Group info' : 'Contact info'}</SheetTitle>
          <SheetDescription className="sr-only">Details about this chat</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col items-center gap-2 pb-6">
          <Avatar
            name={title}
            src={isGroup ? chat.avatar_url : peer?.avatar_url}
            id={isGroup ? chat.id : peer?.id || chat.id}
            size="xl"
            showStatus={!isGroup}
            isOnline={peer?.is_online}
          />
          <h2 className="mt-2 text-xl font-bold">{title}</h2>
          {!isGroup && (
            <p className="text-sm text-muted-foreground">
              {peer?.is_online ? 'online' : formatLastSeen(peer?.last_seen ?? null)}
            </p>
          )}
          {!isGroup && peer?.username && (
            <p className="text-sm text-muted-foreground">@{peer.username}</p>
          )}
          {isGroup && (
            <p className="text-sm text-muted-foreground">{members.length} members</p>
          )}
        </div>

        {!isGroup && peer?.bio && (
          <div className="mb-4 rounded-lg border bg-muted/30 p-3">
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Bio</p>
            <p className="text-sm">{peer.bio}</p>
          </div>
        )}

        {isGroup && (
          <div className="space-y-3">
            {isOwner && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={onRenameGroup}>
                  Rename group
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={onAddMembers}>
                  Add members
                </Button>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {members.length} members
              </p>
              <div className="space-y-1">
                {members.map((m) => {
                  const isMe = m.id === user.id;
                  const isMemberOwner = m.id === chat.created_by;
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent">
                      <Avatar name={getDisplayName(m)} src={m.avatar_url} id={m.id} size="sm" showStatus isOnline={m.is_online} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {getDisplayName(m)}
                          {isMe && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.is_online ? 'online' : formatLastSeen(m.last_seen ?? null)}
                        </p>
                      </div>
                      {isMemberOwner && (
                        <Badge variant="secondary" className="gap-1">
                          <Crown className="h-3 w-3" /> owner
                        </Badge>
                      )}
                      {isOwner && !isMe && !isMemberOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setRemoveTarget(m.id)}
                          aria-label="Remove member"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10" onClick={() => setConfirmLeave(true)}>
              <LogOut className="mr-2 h-4 w-4" /> Leave group
            </Button>
            {isOwner && (
              <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10" onClick={onChatDeleted}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete group
              </Button>
            )}
          </div>
        )}
      </SheetContent>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave "{title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't receive new messages from this group. You can be added back later by a member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleLeave}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This person will no longer be able to send or receive messages in this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => removeTarget && handleRemove(removeTarget)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

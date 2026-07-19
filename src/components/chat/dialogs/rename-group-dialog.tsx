import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/shared/loaders';
import { renameGroup } from '@/api/chats';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface RenameGroupDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  chatId: string;
  currentName: string;
  onDone: () => void;
}

export function RenameGroupDialog({ open, onOpenChange, chatId, currentName, onDone }: RenameGroupDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const handleSave = async () => {
    if (name.trim().length < 2) {
      toast({ title: 'Name too short', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await renameGroup(chatId, name.trim());
      qc.invalidateQueries({ queryKey: ['chats'] });
      toast({ title: 'Group renamed' });
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast({ title: 'Could not rename group', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename group</DialogTitle>
          <DialogDescription>Change the group's display name.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="rename-input">Group name</Label>
          <Input id="rename-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || name.trim().length < 2}>
            {saving ? <Spinner className="mr-2" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

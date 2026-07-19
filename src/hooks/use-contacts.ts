import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { fetchContacts, addContact, removeContact } from '@/api/contacts';
import { useToast } from '@/hooks/use-toast';

export const contactsKeys = {
  list: (userId: string) => ['contacts', 'list', userId] as const,
};

export function useContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: contactsKeys.list(user?.id ?? ''),
    queryFn: () => fetchContacts(user!.id),
    enabled: !!user,
  });
}

export function useAddContact() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ contactUserId }: { contactUserId: string }) => addContact(user!.id, contactUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactsKeys.list(user!.id) });
      toast({ title: 'Contact added' });
    },
    onError: (e: Error) => toast({ title: 'Could not add contact', description: e.message, variant: 'destructive' }),
  });
}

export function useRemoveContact() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ contactId }: { contactId: string }) => removeContact(contactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactsKeys.list(user!.id) });
      toast({ title: 'Contact removed' });
    },
    onError: (e: Error) => toast({ title: 'Could not remove contact', description: e.message, variant: 'destructive' }),
  });
}

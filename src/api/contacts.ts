import { supabase } from '@/lib/supabase';
import type { Contact, ContactWithProfile, Profile } from '@/types';

export async function fetchContacts(ownerId: string): Promise<ContactWithProfile[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('id, owner_id, contact_user_id, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const contacts = (data as Contact[]) ?? [];
  if (contacts.length === 0) return [];
  const userIds = contacts.map((c) => c.contact_user_id);
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  if (pErr) throw pErr;
  const map = new Map<string, Profile>();
  (profiles as Profile[]).forEach((p) => map.set(p.id, p));
  return contacts.map((c) => ({ ...c, profile: map.get(c.contact_user_id) }));
}

export async function addContact(ownerId: string, contactUserId: string): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .insert({ owner_id: ownerId, contact_user_id: contactUserId })
    .select()
    .single();
  if (error) throw error;
  return data as Contact;
}

export async function removeContact(contactId: string): Promise<void> {
  const { error } = await supabase.from('contacts').delete().eq('id', contactId);
  if (error) throw error;
}

export async function isContact(ownerId: string, contactUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('contacts')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('contact_user_id', contactUserId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

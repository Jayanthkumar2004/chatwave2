import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  return getProfile(u.user.id);
}

export async function upsertProfileOnSignup(userId: string, username: string, displayName: string, email: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        username,
        display_name: displayName,
        email,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'avatar_url'>>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function checkUsernameTaken(username: string, exceptUserId?: string): Promise<boolean> {
  let q = supabase.from('profiles').select('id').eq('username', username);
  if (exceptUserId) q = q.neq('id', exceptUserId);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function searchUsers(query: string, limit = 10): Promise<Profile[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(limit);
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export async function deleteAccount(userId: string): Promise<void> {
  // RLS only lets the owner delete their profile row. auth.users entry remains
  // until they delete via Supabase auth admin (not exposed here). We clear the
  // profile and their contacts/notifications cascade automatically.
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) throw error;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

/** Update presence. lastSeen + is_online. */
export async function setPresence(userId: string, isOnline: boolean): Promise<void> {
  const patch: Partial<Profile> = { is_online: isOnline, last_seen: new Date().toISOString() };
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

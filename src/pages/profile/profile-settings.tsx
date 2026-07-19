import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Lock, LogOut, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { profileSchema, changePasswordSchema, type ProfileInput, type ChangePasswordInput } from '@/lib/validation';
import { updateProfile, uploadAvatar, checkUsernameTaken } from '@/api/profiles';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/shared/avatar';
import { Spinner } from '@/components/shared/loaders';
import { supabase } from '@/lib/supabase';
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
import { getDisplayName } from '@/lib/utils';

export function ProfileSettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile?.username ?? '',
      display_name: profile?.display_name ?? '',
      bio: profile?.bio ?? '',
    },
    values: profile ? { username: profile.username, display_name: profile.display_name, bio: profile.bio ?? '' } : undefined,
  });

  const pwForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });
  const [changingPw, setChangingPw] = useState(false);

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    if (!f.type.startsWith('image/')) {
      toast({ title: 'Please pick an image', variant: 'destructive' });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large (max 5MB)', variant: 'destructive' });
      return;
    }
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(user.id, f);
      await updateProfile(user.id, { avatar_url: url });
      await refreshProfile();
      toast({ title: 'Profile photo updated' });
    } catch (e) {
      toast({ title: 'Could not upload photo', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSubmitProfile = async (values: ProfileInput) => {
    if (!user) return;
    setSavingProfile(true);
    try {
      if (values.username !== profile?.username) {
        const taken = await checkUsernameTaken(values.username, user.id);
        if (taken) {
          toast({ title: 'Username already taken', variant: 'destructive' });
          setSavingProfile(false);
          return;
        }
      }
      await updateProfile(user.id, {
        username: values.username,
        display_name: values.display_name,
        bio: values.bio || '',
      });
      await refreshProfile();
      reset(values);
      toast({ title: 'Profile updated' });
    } catch (e) {
      toast({ title: 'Could not update profile', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (values: ChangePasswordInput) => {
    setChangingPw(true);
    try {
      // verify current password by re-signing in
      const { error: verr } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: values.currentPassword,
      });
      if (verr) throw new Error('Current password is incorrect');
      const { error } = await supabase.auth.updateUser({ password: values.newPassword });
      if (error) throw error;
      pwForm.reset();
      toast({ title: 'Password changed' });
    } catch (e) {
      toast({ title: 'Could not change password', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setChangingPw(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // delete profile row (cascades contacts/notifications/chat_members)
      const { error: pErr } = await supabase.from('profiles').delete().eq('id', user.id);
      if (pErr) throw pErr;
      await signOut();
      toast({ title: 'Account deleted' });
      navigate('/login', { replace: true });
    } catch (e) {
      toast({ title: 'Could not delete account', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!profile) {
    return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto scrollbar-thin bg-background px-4 py-6 sm:px-6 safe-top">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Profile settings</h1>
      </div>

      {/* Avatar + name */}
      <div className="mb-8 flex flex-col items-center gap-3 rounded-xl border bg-card p-6">
        <div className="relative">
          <Avatar name={getDisplayName(profile)} src={profile.avatar_url} id={user!.id} size="xl" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow disabled:opacity-50"
            aria-label="Change photo"
          >
            {uploadingAvatar ? <Spinner className="h-3.5 w-3.5" /> : <Camera className="h-4 w-4" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
        </div>
        <div className="text-center">
          <p className="font-semibold">{getDisplayName(profile)}</p>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSubmit(onSubmitProfile)} className="mb-8 space-y-4 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Edit profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" {...register('username')} placeholder="username" />
            {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Display name</Label>
            <Input id="display_name" {...register('display_name')} placeholder="Your name" />
            {errors.display_name && <p className="text-xs text-destructive">{errors.display_name.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" rows={3} {...register('bio')} placeholder="Tell people about yourself…" />
          {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={savingProfile || !isDirty}>
            {savingProfile ? <Spinner className="mr-2" /> : <Check className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="mb-8 space-y-4 rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Change password</h2>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" type="password" {...pwForm.register('currentPassword')} />
          {pwForm.formState.errors.currentPassword && <p className="text-xs text-destructive">{pwForm.formState.errors.currentPassword.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" {...pwForm.register('newPassword')} />
            {pwForm.formState.errors.newPassword && <p className="text-xs text-destructive">{pwForm.formState.errors.newPassword.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmNewPassword">Confirm new password</Label>
            <Input id="confirmNewPassword" type="password" {...pwForm.register('confirmNewPassword')} />
            {pwForm.formState.errors.confirmNewPassword && <p className="text-xs text-destructive">{pwForm.formState.errors.confirmNewPassword.message}</p>}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="outline" disabled={changingPw}>
            {changingPw ? <Spinner className="mr-2" /> : null}
            Update password
          </Button>
        </div>
      </form>

      {/* Appearance + account */}
      <div className="space-y-3 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Appearance & account</h2>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">Switch between light and dark mode.</p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </Button>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">End your current session on this device.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut().then(() => navigate('/login'))}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-3">
          <div>
            <p className="text-sm font-medium text-destructive">Delete account</p>
            <p className="text-xs text-muted-foreground">Permanently remove your profile, contacts, and chat memberships.</p>
          </div>
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove your profile, contacts, and chat memberships. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel><X className="mr-1 h-3 w-3" /> Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting} onClick={handleDeleteAccount}>
              {deleting ? <Spinner className="mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

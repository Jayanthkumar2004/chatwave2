import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AtSign, UserPlus, Camera, MessageCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { registerSchema, type RegisterInput } from '@/lib/validation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/shared/loaders';
import { Avatar } from '@/components/shared/avatar';
import { upsertProfileOnSignup, uploadAvatar } from '@/api/profiles';

export function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', display_name: '', email: '', password: '', confirmPassword: '' },
  });

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast({ title: 'Please pick an image file', variant: 'destructive' });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large (max 5MB)', variant: 'destructive' });
      return;
    }
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onSubmit = async (values: RegisterInput) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            username: values.username,
            display_name: values.display_name,
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed — no user returned');

      // Ensure the profile row exists with the chosen username/display_name
      await upsertProfileOnSignup(data.user.id, values.username, values.display_name, values.email);

      // Upload avatar if chosen
      if (avatarFile) {
        try {
          const url = await uploadAvatar(data.user.id, avatarFile);
          await supabase.from('profiles').update({ avatar_url: url }).eq('id', data.user.id);
        } catch {
          // non-fatal: profile is still created
        }
      }

      toast({ title: 'Account created', description: 'Welcome to ChatWave!' });
      navigate('/chats', { replace: true });
    } catch (e) {
      const msg = (e as Error).message;
      toast({
        title: 'Sign up failed',
        description: msg.includes('already registered') ? 'That email is already registered. Try signing in.' : msg,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary lg:hidden">
          <MessageCircle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Join ChatWave in seconds — no email confirmation needed.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Avatar picker */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar name={avatarPreview ? 'You' : '?'} src={avatarPreview} size="lg" id="new-user" />
            {avatarPreview && (
              <button
                type="button"
                onClick={clearAvatar}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                aria-label="Remove avatar"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Camera className="mr-2 h-4 w-4" /> Upload photo
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">Optional — you can add it later.</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="username" placeholder="johndoe" className="pl-9" {...register('username')} />
            </div>
            {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Display name</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="display_name" placeholder="John Doe" className="pl-9" {...register('display_name')} />
            </div>
            {errors.display_name && <p className="text-xs text-destructive">{errors.display_name.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" className="pl-9" {...register('email')} />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" className="pl-9" {...register('password')} />
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" className="pl-9" {...register('confirmPassword')} />
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? <Spinner className="mr-2" /> : <UserPlus className="mr-2 h-4 w-4" />}
          Create account
        </Button>
      </form>
    </div>
  );
}

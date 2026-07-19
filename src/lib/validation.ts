import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(24, 'Username must be at most 24 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
    display_name: z
      .string()
      .min(2, 'Display name must be at least 2 characters')
      .max(40, 'Display name is too long'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const profileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
  display_name: z.string().min(2).max(40),
  bio: z.string().max(200, 'Bio is too long').optional().or(z.literal('')),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Enter your current password'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createGroupSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters').max(60),
  memberIds: z.array(z.string()).min(1, 'Add at least one member'),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const renameGroupSchema = z.object({
  name: z.string().min(2).max(60),
});
export type RenameGroupInput = z.infer<typeof renameGroupSchema>;

export const searchUserSchema = z.object({
  query: z.string().min(1, 'Type a username or email'),
});
export type SearchUserInput = z.infer<typeof searchUserSchema>;

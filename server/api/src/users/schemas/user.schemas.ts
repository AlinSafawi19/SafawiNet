import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const RequestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;
export type RequestPasswordResetDto = z.infer<typeof RequestPasswordResetSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

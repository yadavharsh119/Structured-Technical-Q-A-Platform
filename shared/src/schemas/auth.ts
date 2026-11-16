import { z } from 'zod';

// ── Auth schemas (FR-AUTH-01, SEC-01) ───────────────────────────────────────

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters.')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Must contain at least one digit.')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character.');

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Full name is required.')
      .max(100, 'Full name must be 100 characters or fewer.'),
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters.')
      .max(30, 'Username must be at most 30 characters.')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
    email: z
      .string()
      .trim()
      .email('Invalid email address.')
      .toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(20, 'Verification token is invalid.'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().trim().email('Invalid email address.').toLowerCase(),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

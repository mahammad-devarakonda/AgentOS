import { z } from 'zod';

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters' })
      .max(255, { message: 'Full name is too long' }),
    email: z
      .string()
      .trim()
      .min(1, { message: 'Email address is required' })
      .email({ message: 'Please enter a valid email address' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .max(128, { message: 'Password must not exceed 128 characters' }),
    confirm_password: z
      .string()
      .min(1, { message: 'Please confirm your password' }),
    terms_accepted: z
      .boolean()
      .refine((val) => val === true, {
        message: 'You must accept the Terms and Conditions to register',
      }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'Email address is required' })
    .email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' }),
  remember_me: z.boolean(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'Email address is required' })
    .email({ message: 'Please enter a valid email address' }),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

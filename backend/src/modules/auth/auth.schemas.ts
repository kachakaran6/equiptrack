import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').transform((e) => e.trim().toLowerCase()),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform((e) => e.trim().toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

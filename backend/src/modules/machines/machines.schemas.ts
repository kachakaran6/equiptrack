import { z } from 'zod';

export const createMachineSchema = z.object({
  name: z.string().min(1, 'Machine name is required').max(255).transform((s) => s.trim()),
  description: z.string().max(1000).optional().nullable().transform((s) => s?.trim() || null),
});

export const updateMachineSchema = z.object({
  name: z.string().min(1, 'Machine name is required').max(255).transform((s) => s.trim()),
  description: z.string().max(1000).optional().nullable().transform((s) => s?.trim() || null),
});

export type CreateMachineInput = z.infer<typeof createMachineSchema>;
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;

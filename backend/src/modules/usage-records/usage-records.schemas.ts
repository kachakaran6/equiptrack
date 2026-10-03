import { z } from 'zod';

export const createUsageRecordSchema = z.object({
  name: z.string().min(1, 'Record name is required').max(255).transform((s) => s.trim()),
  usage_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'usage_date must be in YYYY-MM-DD format'),
});

export const updateUsageRecordSchema = z.object({
  name: z.string().min(1, 'Record name is required').max(255).transform((s) => s.trim()),
  usage_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'usage_date must be in YYYY-MM-DD format'),
});

export type CreateUsageRecordInput = z.infer<typeof createUsageRecordSchema>;
export type UpdateUsageRecordInput = z.infer<typeof updateUsageRecordSchema>;

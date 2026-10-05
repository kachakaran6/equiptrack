import { z } from 'zod';

export const createSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(255).transform((s) => s.trim()),
  category_id: z.string().max(255).nullable().optional(),
});

export const updateSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(255).transform((s) => s.trim()).optional(),
  category_id: z.string().max(255).nullable().optional(),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

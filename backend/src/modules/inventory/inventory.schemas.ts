import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  fields: z.array(z.string().min(1, 'Field label cannot be empty').max(255)).optional().default([]),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  fields: z.array(
    z.object({
      id: z.string().uuid().optional(),
      label: z.string().min(1).max(255),
    })
  ).optional(),
});

export const createSubProductSchema = z.object({
  values: z.record(z.string(), z.string()).default({}),
});

export const updateSubProductSchema = z.object({
  values: z.record(z.string(), z.string()).optional().default({}),
  product_id: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

export const createTransactionSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  remarks: z.string().max(1000).optional().nullable(),
});

export const updateTransactionSchema = z.object({
  type: z.enum(['IN', 'OUT']).optional(),
  quantity: z.number().int().positive('Quantity must be greater than 0').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  remarks: z.string().max(1000).optional().nullable(),
});

export const inventoryFilterSchema = z.object({
  productId: z.string().uuid().optional().nullable().or(z.literal('')),
  product_id: z.string().uuid().optional().nullable().or(z.literal('')),
  subProductId: z.string().uuid().optional().nullable().or(z.literal('')),
  sub_product_id: z.string().uuid().optional().nullable().or(z.literal('')),
  type: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  search: z.string().optional().nullable(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateSubProductInput = z.infer<typeof createSubProductSchema>;
export type UpdateSubProductInput = z.infer<typeof updateSubProductSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type InventoryFilterInput = z.infer<typeof inventoryFilterSchema>;

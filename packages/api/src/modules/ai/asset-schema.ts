import { z } from 'zod';

export const createAssetSchema = z.object({
  category: z.enum(['crop', 'visitor', 'status']),
  displayName: z.string().min(1).max(100),
  mappingKeywords: z.array(z.string().min(1)).min(1),
  isDefault: z.boolean().optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  mappingKeywords: z.array(z.string().min(1)).min(1).optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

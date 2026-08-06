import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(50),
  memberMin: z.number().int().min(0),
  memberMax: z.number().int().positive().nullable(),
  monthlyPrice: z.number().int().min(0),
  aiCallsIncluded: z.number().int().min(0),
  storageGbIncluded: z.number().int().min(0),
  aiCallOveragePrice: z.number().int().min(0),
  storageOveragePrice: z.number().int().min(0),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = createPlanSchema.partial();

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

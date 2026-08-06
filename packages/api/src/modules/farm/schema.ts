import { z } from 'zod';

export const farmApplicationSchema = z.object({
  name: z.string().min(1, 'Farm name is required').max(100),
  province: z.string().min(1, 'Province is required').max(50),
  city: z.string().min(1, 'City is required').max(50),
  district: z.string().min(1, 'District is required').max(50),
  address: z.string().max(200).optional(),
  areaSqm: z.number().positive().optional(),
  description: z.string().max(500).optional(),
});

export type FarmApplicationInput = z.infer<typeof farmApplicationSchema>;

export const farmPlanAssignSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
});

export type FarmPlanAssignInput = z.infer<typeof farmPlanAssignSchema>;

export const farmTimeWaveOverrideSchema = z.object({
  timeWaveConfig: z.array(
    z.object({
      timeRange: z.string().min(1),
      intervalSec: z.number().int().positive(),
    }),
  ),
});

export type FarmTimeWaveOverrideInput = z.infer<typeof farmTimeWaveOverrideSchema>;

export const farmListQuerySchema = z.object({
  status: z.enum(['pending', 'active', 'suspended', 'deleted']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type FarmListQuery = z.infer<typeof farmListQuerySchema>;

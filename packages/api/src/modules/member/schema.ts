import { z } from 'zod';

export const createMemberSchema = z.object({
  nickname: z.string().min(1).max(50),
  phone: z.string().max(20).optional(),
  subscriptionStart: z.string().min(1),
  subscriptionEnd: z.string().min(1),
  userId: z.string().min(1),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export const updateMemberSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).optional(),
  subscriptionStart: z.string().min(1).optional(),
  subscriptionEnd: z.string().min(1).optional(),
  status: z.enum(['active', 'expired', 'frozen']).optional(),
  notes: z.string().max(500).optional(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const bindPlotSchema = z.object({
  plotId: z.string().min(1),
});

export type BindPlotInput = z.infer<typeof bindPlotSchema>;

export const unbindPlotSchema = z.object({
  plotId: z.string().min(1),
});

export type UnbindPlotInput = z.infer<typeof unbindPlotSchema>;

export const memberScheduleSchema = z.object({
  timeWaveConfig: z.array(
    z.object({
      timeRange: z.string().min(1),
      intervalSec: z.number().int().positive(),
    }),
  ),
});

export type MemberScheduleInput = z.infer<typeof memberScheduleSchema>;

export const memberListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type MemberListQuery = z.infer<typeof memberListQuerySchema>;

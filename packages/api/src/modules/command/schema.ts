import { z } from 'zod';

export const submitCommandSchema = z.object({
  plotId: z.string().min(1),
  type: z.enum(['water', 'fertilize', 'harvest', 'inspect', 'custom']),
  description: z.string().max(500).optional(),
});

export type SubmitCommandInput = z.infer<typeof submitCommandSchema>;

export const rejectCommandSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type RejectCommandInput = z.infer<typeof rejectCommandSchema>;

export const completeCommandSchema = z.object({
  receiptPhotos: z.array(z.string().url()).min(1),
});

export type CompleteCommandInput = z.infer<typeof completeCommandSchema>;

export const commandListQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'executing', 'done', 'rejected']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CommandListQuery = z.infer<typeof commandListQuerySchema>;

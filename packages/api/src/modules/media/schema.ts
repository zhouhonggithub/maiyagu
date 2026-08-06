import { z } from 'zod';

export const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  plotId: z.string().min(1).optional(),
});

export type PresignInput = z.infer<typeof presignSchema>;

export const createMediaSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  type: z.enum(['photo', 'video', 'timelapse']),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  plotId: z.string().min(1).optional(),
  caption: z.string().max(500).optional(),
  source: z.string().min(1),
  takenAt: z.string().min(1),
});

export type CreateMediaInput = z.infer<typeof createMediaSchema>;

export const createGrowthLogSchema = z.object({
  plotId: z.string().min(1),
  date: z.string().min(1), // 'YYYY-MM-DD'
  title: z.string().min(1).max(200),
  content: z.string().max(2000).optional(),
  eventType: z.enum(['plant', 'care', 'harvest', 'observation']),
  mediaIds: z.array(z.string()).optional(),
});

export type CreateGrowthLogInput = z.infer<typeof createGrowthLogSchema>;

export const mediaListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;

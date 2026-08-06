import { z } from 'zod';

export const createCameraSchema = z.object({
  name: z.string().min(1).max(100),
  protocol: z.enum(['ezviz_cloud', 'rtsp', 'custom_stream']),
  streamUrl: z.string().url().optional(),
  deviceSerial: z.string().max(64).optional(),
  credentials: z.record(z.unknown()).optional(),
}).refine(
  (data) => {
    // streamUrl required for rtsp and custom_stream
    if (data.protocol !== 'ezviz_cloud' && !data.streamUrl) return false;
    return true;
  },
  { message: 'streamUrl is required for rtsp and custom_stream protocols', path: ['streamUrl'] },
);

export type CreateCameraInput = z.infer<typeof createCameraSchema>;

export const updateCameraSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  streamUrl: z.string().url().optional(),
  credentials: z.record(z.unknown()).optional(),
});

export type UpdateCameraInput = z.infer<typeof updateCameraSchema>;

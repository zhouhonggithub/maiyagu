import { z } from 'zod';

const pointTuple = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]);

export const createZoneSchema = z.object({
  cameraId: z.string().min(1),
  name: z.string().min(1).max(100),
  polygonPoints: z.array(pointTuple).min(3, 'Polygon must have at least 3 points'),
});

export type CreateZoneInput = z.infer<typeof createZoneSchema>;

export const updateZoneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  polygonPoints: z.array(pointTuple).min(3, 'Polygon must have at least 3 points').optional(),
});

export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;

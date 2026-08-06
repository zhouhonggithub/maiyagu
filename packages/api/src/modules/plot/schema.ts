import { z } from 'zod';

const pointTuple = z.tuple([z.number(), z.number()]);

export const createPlotSchema = z.object({
  coverageZoneId: z.string().min(1).optional(),
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10),
  polygonPoints: z.array(pointTuple).min(3, 'Polygon must have at least 3 points'),
  soilType: z.string().max(50).optional(),
  irrigationType: z.string().max(50).optional(),
});

export type CreatePlotInput = z.infer<typeof createPlotSchema>;

export const updatePlotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(10).optional(),
  polygonPoints: z.array(pointTuple).min(3).optional(),
  soilType: z.string().max(50).nullable().optional(),
  irrigationType: z.string().max(50).nullable().optional(),
});

export type UpdatePlotInput = z.infer<typeof updatePlotSchema>;

export const gridSplitSchema = z.object({
  coverageZoneId: z.string().min(1),
  rows: z.number().int().min(1).max(26),
  cols: z.number().int().min(1).max(99),
});

export type GridSplitInput = z.infer<typeof gridSplitSchema>;

import { z } from 'zod';

/**
 * TimeWave entry validation.
 */
const timeWaveEntrySchema = z.object({
  timeRange: z
    .string()
    .regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, 'Time range must be in format HH:MM-HH:MM'),
  intervalSec: z
    .number()
    .int('Interval must be an integer')
    .min(5, 'Interval must be at least 5 seconds')
    .max(86400, 'Interval must be at most 86400 seconds'),
});

/**
 * Update global TimeWave config.
 */
export const timeWaveConfigUpdateSchema = z.object({
  config: z
    .array(timeWaveEntrySchema)
    .min(1, 'Config must have at least one entry'),
});

export type TimeWaveConfigUpdateInput = z.infer<typeof timeWaveConfigUpdateSchema>;

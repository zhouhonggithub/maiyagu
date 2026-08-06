import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import { requireRole } from '../../middleware';
import * as configService from './service';

const timeWaveConfigSchema = z.object({
  timeWaveConfig: z.array(
    z.object({
      timeRange: z.string().min(1),
      intervalSec: z.number().int().positive(),
    }),
  ),
});

const configRoutes = new Hono<{ Bindings: Env }>();

// GET /config — get platform config (admin)
configRoutes.get('/config', requireRole('platform_admin'), async (c) => {
  const db = createDb(c.env.DB);
  const config = await configService.getConfig(db);
  return c.json({ success: true, data: config });
});

// PUT /config/time-wave — update global time wave config (admin)
configRoutes.put(
  '/config/time-wave',
  requireRole('platform_admin'),
  zValidator('json', timeWaveConfigSchema),
  async (c) => {
    const { timeWaveConfig } = c.req.valid('json');
    const db = createDb(c.env.DB);
    const result = await configService.updateTimeWaveConfig(db, timeWaveConfig);
    return c.json({ success: true, data: result });
  },
);

// GET /dashboard — admin dashboard metrics (admin)
configRoutes.get('/dashboard', requireRole('platform_admin'), async (c) => {
  const db = createDb(c.env.DB);
  const metrics = await configService.getDashboardMetrics(db);
  return c.json({ success: true, data: metrics });
});

export { configRoutes };

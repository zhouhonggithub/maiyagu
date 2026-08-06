import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ValidationError } from '@ai-farm/shared';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import { requireRole } from '../../middleware';
import {
  farmApplicationSchema,
  farmPlanAssignSchema,
  farmTimeWaveOverrideSchema,
  farmListQuerySchema,
} from './schema';
import * as farmService from './service';
import * as farmRepo from './repository';

const farmRoutes = new Hono<{ Bindings: Env }>();

// POST /apply — submit farm application (public, authenticated)
farmRoutes.post('/apply', zValidator('json', farmApplicationSchema), async (c) => {
  const data = c.req.valid('json');
  const userId = (c as any).get('userId') as string;
  const db = createDb(c.env.DB);
  const farm = await farmService.createFarmApplication(db, userId, data);
  return c.json({ success: true, data: farm }, 201);
});

// GET / — list farms (admin)
farmRoutes.get('/', requireRole('platform_admin'), async (c) => {
  const query = farmListQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    throw new ValidationError('Invalid query params', query.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const result = await farmRepo.listFarms(db, query.data);
  return c.json({ success: true, data: result.data, pagination: result.pagination });
});

// GET /:id — farm detail (admin)
farmRoutes.get('/:id', requireRole('platform_admin'), async (c) => {
  const farmId = c.req.param('id')!;
  const db = createDb(c.env.DB);
  const result = await farmService.getFarmDashboard(db, farmId);
  return c.json({ success: true, data: result });
});

// POST /:id/approve — approve farm (admin)
farmRoutes.post('/:id/approve', requireRole('platform_admin'), async (c) => {
  const farmId = c.req.param('id')!;
  const db = createDb(c.env.DB);
  const farm = await farmService.approveFarm(db, farmId);
  return c.json({ success: true, data: farm });
});

// POST /:id/suspend — suspend farm (admin)
farmRoutes.post('/:id/suspend', requireRole('platform_admin'), async (c) => {
  const farmId = c.req.param('id')!;
  const db = createDb(c.env.DB);
  const farm = await farmService.suspendFarm(db, farmId);
  return c.json({ success: true, data: farm });
});

// DELETE /:id — soft delete farm (admin)
farmRoutes.delete('/:id', requireRole('platform_admin'), async (c) => {
  const farmId = c.req.param('id')!;
  const db = createDb(c.env.DB);
  const farm = await farmService.deleteFarm(db, farmId);
  return c.json({ success: true, data: farm });
});

// PUT /:id/plan — assign plan (admin)
farmRoutes.put(
  '/:id/plan',
  requireRole('platform_admin'),
  zValidator('json', farmPlanAssignSchema),
  async (c) => {
    const farmId = c.req.param('id');
    const { planId } = c.req.valid('json');
    const db = createDb(c.env.DB);
    const farm = await farmService.assignPlan(db, farmId, planId);
    return c.json({ success: true, data: farm });
  },
);

// PUT /:id/time-wave-override — set time wave override (admin)
farmRoutes.put(
  '/:id/time-wave-override',
  requireRole('platform_admin'),
  zValidator('json', farmTimeWaveOverrideSchema),
  async (c) => {
    const farmId = c.req.param('id');
    const { timeWaveConfig } = c.req.valid('json');
    const db = createDb(c.env.DB);
    const farm = await farmService.setTimeWaveOverride(db, farmId, timeWaveConfig);
    return c.json({ success: true, data: farm });
  },
);

export { farmRoutes };

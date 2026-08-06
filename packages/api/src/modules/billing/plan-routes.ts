import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import { requireRole } from '../../middleware';
import { createPlanSchema, updatePlanSchema } from './plan-schema';
import * as planService from './plan-service';

const planRoutes = new Hono<{ Bindings: Env }>();

// GET /plans — list all active plans (admin)
planRoutes.get('/plans', requireRole('platform_admin'), async (c) => {
  const db = createDb(c.env.DB);
  const plans = await planService.listPlans(db);
  return c.json({ success: true, data: plans });
});

// POST /plans — create plan (admin)
planRoutes.post(
  '/plans',
  requireRole('platform_admin'),
  zValidator('json', createPlanSchema),
  async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env.DB);
    const plan = await planService.createPlan(db, data);
    return c.json({ success: true, data: plan }, 201);
  },
);

// PUT /plans/:id — update plan (admin)
planRoutes.put(
  '/plans/:id',
  requireRole('platform_admin'),
  zValidator('json', updatePlanSchema),
  async (c) => {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const db = createDb(c.env.DB);
    const plan = await planService.updatePlan(db, id, data);
    return c.json({ success: true, data: plan });
  },
);

export { planRoutes };

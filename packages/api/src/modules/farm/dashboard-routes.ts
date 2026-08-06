import { Hono } from 'hono';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import { ForbiddenError } from '@ai-farm/shared';
import * as farmService from './service';

export const dashboardRoutes = new Hono<{ Bindings: Env; Variables: { farmId: string } }>();

// GET / — farm dashboard summary for the currently authenticated farm
dashboardRoutes.get('/', async (c) => {
  const farmId = c.get('farmId');
  if (!farmId) throw new ForbiddenError('Farm context required');
  const db = createDb(c.env.DB);
  const dashboard = await farmService.getFarmDashboard(db, farmId);
  return c.json({ success: true, data: dashboard });
});

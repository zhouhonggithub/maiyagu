import { Hono } from 'hono';
import { ValidationError } from '@ai-farm/shared';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import { createPlotSchema, updatePlotSchema, gridSplitSchema } from './schema';
import * as plotService from './service';
import * as plotRepo from './repository';

const plotRoutes = new Hono<{ Bindings: Env }>();

/** GET /plots — List plots for the current farm */
plotRoutes.get('/', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const zoneId = c.req.query('coverageZoneId');
  const db = createDb(c.env.DB);
  const plots = zoneId
    ? await plotRepo.listByZone(db, farmId, zoneId)
    : await plotRepo.listByFarm(db, farmId);
  return c.json({ success: true, data: plots });
});

/** POST /plots — Create a single plot */
plotRoutes.post('/', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const body = await c.req.json();
  const result = createPlotSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid plot data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const plot = await plotService.createPlot(db, farmId, result.data);
  return c.json({ success: true, data: plot }, 201);
});

/** POST /plots/grid-split — Generate grid of plots within a zone */
plotRoutes.post('/grid-split', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const body = await c.req.json();
  const result = gridSplitSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid grid split params', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const plots = await plotService.gridSplit(db, farmId, result.data);
  return c.json({ success: true, data: plots }, 201);
});

/** PUT /plots/:id — Update a plot */
plotRoutes.put('/:id', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = updatePlotSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid plot data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const plot = await plotService.updatePlot(db, farmId, id, result.data);
  return c.json({ success: true, data: plot });
});

/** DELETE /plots/:id — Delete a plot */
plotRoutes.delete('/:id', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  await plotService.deletePlot(db, farmId, id);
  return c.json({ success: true, data: { message: 'Plot deleted' } });
});

export { plotRoutes };

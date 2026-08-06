import { Hono } from 'hono';
import { ValidationError } from '@ai-farm/shared';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import { createZoneSchema, updateZoneSchema } from './zone-schema';
import * as zoneService from './zone-service';
import * as zoneRepo from './zone-repository';

const zoneRoutes = new Hono<{ Bindings: Env }>();

/** GET /coverage-zones — List zones for the current farm */
zoneRoutes.get('/', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const cameraId = c.req.query('cameraId');
  const db = createDb(c.env.DB);
  const zones = cameraId
    ? await zoneRepo.listByCamera(db, cameraId)
    : await zoneRepo.listByFarm(db, farmId);
  return c.json({ success: true, data: zones });
});

/** POST /coverage-zones — Create a coverage zone */
zoneRoutes.post('/', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const body = await c.req.json();
  const result = createZoneSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid zone data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const zone = await zoneService.createZone(db, farmId, result.data);
  return c.json({ success: true, data: zone }, 201);
});

/** PUT /coverage-zones/:id — Update a coverage zone */
zoneRoutes.put('/:id', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = updateZoneSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid zone data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const zone = await zoneService.updateZone(db, farmId, id, result.data);
  return c.json({ success: true, data: zone });
});

/** DELETE /coverage-zones/:id — Delete a coverage zone */
zoneRoutes.delete('/:id', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  await zoneService.deleteZone(db, farmId, id);
  return c.json({ success: true, data: { message: 'Coverage zone deleted' } });
});

export { zoneRoutes };

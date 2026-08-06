import { Hono } from 'hono';
import { ValidationError } from '@ai-farm/shared';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import { createCameraSchema, updateCameraSchema } from './schema';
import * as cameraService from './service';

const cameraRoutes = new Hono<{ Bindings: Env }>();

/** GET /cameras — List cameras for the current farm */
cameraRoutes.get('/', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const db = createDb(c.env.DB);
  const cameras = await cameraService.listCameras(db, farmId);
  return c.json({ success: true, data: cameras });
});

/** POST /cameras — Add a new camera */
cameraRoutes.post('/', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const body = await c.req.json();
  const result = createCameraSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid camera data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const camera = await cameraService.addCamera(db, farmId, result.data);
  return c.json({ success: true, data: camera }, 201);
});

/** PUT /cameras/:id — Update camera */
cameraRoutes.put('/:id', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = updateCameraSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid camera data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const camera = await cameraService.updateCamera(db, farmId, id, result.data);
  return c.json({ success: true, data: camera });
});

/** DELETE /cameras/:id — Delete camera */
cameraRoutes.delete('/:id', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  await cameraService.deleteCamera(db, farmId, id);
  return c.json({ success: true, data: { message: 'Camera deleted' } });
});

/** POST /cameras/:id/test — Test camera connectivity */
cameraRoutes.post('/:id/test', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  const result = await cameraService.testConnectivity(db, farmId, id);
  return c.json({ success: true, data: result });
});

export { cameraRoutes };

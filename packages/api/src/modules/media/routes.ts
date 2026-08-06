import { Hono } from 'hono';
import { ValidationError } from '@ai-farm/shared';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import { presignSchema, createMediaSchema, createGrowthLogSchema } from './schema';
import * as mediaService from './service';

const mediaRoutes = new Hono<{ Bindings: Env }>();

/** POST /media/presign — Get a presigned upload URL */
mediaRoutes.post('/presign', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const body = await c.req.json();
  const result = presignSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid presign data', result.error.flatten().fieldErrors);
  }
  const presign = await mediaService.generatePresignedUrl(
    c.env.R2,
    farmId,
    result.data.plotId,
    result.data.filename,
    result.data.mimeType,
  );
  return c.json({ success: true, data: presign });
});

/** POST /media — Create a media record after upload */
mediaRoutes.post('/', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const body = await c.req.json();
  const result = createMediaSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid media data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const media = await mediaService.createMediaRecord(db, farmId, result.data);
  return c.json({ success: true, data: media }, 201);
});

/** POST /growth-logs — Create a growth log entry */
mediaRoutes.post('/growth-logs', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const body = await c.req.json();
  const result = createGrowthLogSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid growth log data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const log = await mediaService.createGrowthLog(db, farmId, result.data);
  return c.json({ success: true, data: log }, 201);
});

export { mediaRoutes };

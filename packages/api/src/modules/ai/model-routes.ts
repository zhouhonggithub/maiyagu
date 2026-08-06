import { Hono } from 'hono';
import { ValidationError } from '@ai-farm/shared';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import { registerModelSchema, setTestingSchema } from './model-schema';
import * as modelService from './model-service';
import * as modelRepo from './model-repository';

const modelRoutes = new Hono<{ Bindings: Env }>();

/** GET /models — List all model versions */
modelRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const models = await modelRepo.list(db);
  return c.json({ success: true, data: models });
});

/** POST /models — Register a new model version */
modelRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const result = registerModelSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid model registration', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const model = await modelService.register(db, result.data);
  return c.json({ success: true, data: model }, 201);
});

/** PUT /models/:id/activate — Activate a model version */
modelRoutes.put('/:id/activate', async (c) => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  const model = await modelService.activate(db, id);
  return c.json({ success: true, data: model });
});

/** PUT /models/:id/deprecate — Deprecate a model version */
modelRoutes.put('/:id/deprecate', async (c) => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  const model = await modelService.deprecate(db, id);
  return c.json({ success: true, data: model });
});

/** PUT /models/:id/testing — Set testing percentage */
modelRoutes.put('/:id/testing', async (c) => {
  const body = await c.req.json();
  const result = setTestingSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid testing config', result.error.flatten().fieldErrors);
  }
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  const model = await modelService.setTesting(db, id, result.data.testingPercentage);
  return c.json({ success: true, data: model });
});

export { modelRoutes };

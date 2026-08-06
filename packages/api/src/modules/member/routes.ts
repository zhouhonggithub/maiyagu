import { Hono } from 'hono';
import { ValidationError } from '@ai-farm/shared';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import {
  createMemberSchema,
  updateMemberSchema,
  bindPlotSchema,
  unbindPlotSchema,
  memberScheduleSchema,
  memberListQuerySchema,
} from './schema';
import * as memberService from './service';
import * as memberRepo from './repository';

const memberRoutes = new Hono<{ Bindings: Env }>();

/** GET /members — List members for the current farm */
memberRoutes.get('/', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const query = memberListQuerySchema.safeParse(c.req.query());
  const { page, pageSize } = query.success ? query.data : { page: 1, pageSize: 20 };
  const db = createDb(c.env.DB);
  const result = await memberRepo.listByFarm(db, farmId, page, pageSize);
  return c.json({ success: true, ...result });
});

/** POST /members — Create a member */
memberRoutes.post('/', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const body = await c.req.json();
  const result = createMemberSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid member data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const member = await memberService.addMember(db, farmId, result.data.userId, result.data);
  return c.json({ success: true, data: member }, 201);
});

/** PUT /members/:id — Update a member */
memberRoutes.put('/:id', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = updateMemberSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid member data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const member = await memberService.updateMember(db, farmId, id, result.data);
  return c.json({ success: true, data: member });
});

/** POST /members/:id/bind — Bind member to a plot */
memberRoutes.post('/:id/bind', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const memberId = c.req.param('id');
  const body = await c.req.json();
  const result = bindPlotSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid bind data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const binding = await memberService.bindToPlot(db, farmId, memberId, result.data.plotId);
  return c.json({ success: true, data: binding }, 201);
});

/** POST /members/:id/unbind — Unbind member from a plot */
memberRoutes.post('/:id/unbind', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const memberId = c.req.param('id');
  const body = await c.req.json();
  const result = unbindPlotSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid unbind data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const binding = await memberService.unbindFromPlot(db, farmId, memberId, result.data.plotId);
  return c.json({ success: true, data: binding });
});

/** PUT /members/:id/schedule — Set member's TimeWave config */
memberRoutes.put('/:id/schedule', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const memberId = c.req.param('id');
  const body = await c.req.json();
  const result = memberScheduleSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid schedule data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const member = await memberService.setSchedule(db, farmId, memberId, result.data.timeWaveConfig);
  return c.json({ success: true, data: member });
});

export { memberRoutes };

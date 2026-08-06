import { Hono } from 'hono';
import { ValidationError } from '@ai-farm/shared';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import {
  submitCommandSchema,
  rejectCommandSchema,
  completeCommandSchema,
  commandListQuerySchema,
} from './schema';
import * as commandService from './service';
import * as commandRepo from './repository';

// ─── Farm-side routes ────────────────────────────────────────────────────────

const commandRoutes = new Hono<{ Bindings: Env }>();

/** GET /commands — List commands for the current farm */
commandRoutes.get('/', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const query = commandListQuerySchema.safeParse(c.req.query());
  const { status, page, pageSize } = query.success
    ? query.data
    : { status: undefined, page: 1, pageSize: 20 };
  const db = createDb(c.env.DB);
  const result = await commandRepo.listByFarm(db, farmId, { status, page, pageSize });
  return c.json({ success: true, ...result });
});

/** PUT /commands/:id/accept — Accept a pending command */
commandRoutes.put('/:id/accept', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const commandId = c.req.param('id');
  const workerId = c.req.header('X-User-Id') ?? '';
  const db = createDb(c.env.DB);
  const cmd = await commandService.acceptCommand(db, farmId, commandId, workerId);
  return c.json({ success: true, data: cmd });
});

/** PUT /commands/:id/reject — Reject a pending command */
commandRoutes.put('/:id/reject', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const commandId = c.req.param('id');
  const body = await c.req.json();
  const result = rejectCommandSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid reject data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const cmd = await commandService.rejectCommand(db, farmId, commandId, result.data.reason);
  return c.json({ success: true, data: cmd });
});

/** PUT /commands/:id/complete — Complete a command with receipts */
commandRoutes.put('/:id/complete', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const commandId = c.req.param('id');
  const body = await c.req.json();
  const result = completeCommandSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid complete data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const cmd = await commandService.completeCommand(db, farmId, commandId, result.data.receiptPhotos);
  return c.json({ success: true, data: cmd });
});

// ─── Member-app-side routes ──────────────────────────────────────────────────

const commandAppRoutes = new Hono<{ Bindings: Env }>();

/** POST /commands — Member submits a command */
commandAppRoutes.post('/', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const memberId = c.req.header('X-Member-Id') ?? '';
  const body = await c.req.json();
  const result = submitCommandSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid command data', result.error.flatten().fieldErrors);
  }
  const db = createDb(c.env.DB);
  const cmd = await commandService.submitCommand(db, farmId, memberId, result.data);
  return c.json({ success: true, data: cmd }, 201);
});

/** GET /commands — Member's own commands */
commandAppRoutes.get('/', async (c) => {
  const memberId = c.req.header('X-Member-Id') ?? '';
  const query = commandListQuerySchema.safeParse(c.req.query());
  const { page, pageSize } = query.success ? query.data : { page: 1, pageSize: 20 };
  const db = createDb(c.env.DB);
  const result = await commandRepo.listByMember(db, memberId, page, pageSize);
  return c.json({ success: true, ...result });
});

export { commandRoutes, commandAppRoutes };

import { Hono } from 'hono';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import * as appService from './service';

const appRoutes = new Hono<{ Bindings: Env }>();

/** GET /my-plots — Member's bound plots with latest analysis */
appRoutes.get('/my-plots', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const memberId = c.req.header('X-Member-Id') ?? '';
  const db = createDb(c.env.DB);
  const plots = await appService.getMyPlots(db, memberId, farmId);
  return c.json({ success: true, data: plots });
});

/** GET /plots/:id/live — Latest analysis for a plot */
appRoutes.get('/plots/:id/live', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const plotId = c.req.param('id');
  const db = createDb(c.env.DB);
  const analysis = await appService.getPlotLive(db, plotId, farmId);
  return c.json({ success: true, data: analysis });
});

/** GET /plots/:id/timeline — Growth logs + media, paginated */
appRoutes.get('/plots/:id/timeline', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const plotId = c.req.param('id');
  const page = Number(c.req.query('page') || '1');
  const pageSize = Number(c.req.query('pageSize') || '20');
  const db = createDb(c.env.DB);
  const timeline = await appService.getPlotTimeline(db, plotId, farmId, page, pageSize);
  return c.json({ success: true, data: timeline });
});

/** GET /plots/:id/camera — Camera snapshot URL for plot */
appRoutes.get('/plots/:id/camera', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const plotId = c.req.param('id');
  const db = createDb(c.env.DB);
  const camera = await appService.getPlotCamera(db, plotId, farmId);
  return c.json({ success: true, data: camera });
});

/** GET /visitors — Visitor events for member's plots */
appRoutes.get('/visitors', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const memberId = c.req.header('X-Member-Id') ?? '';
  const db = createDb(c.env.DB);
  const visitors = await appService.getVisitorEvents(db, memberId, farmId);
  return c.json({ success: true, data: visitors });
});

/** GET /codex — All codex entries with unlock status */
appRoutes.get('/codex', async (c) => {
  const memberId = c.req.header('X-Member-Id') ?? '';
  const db = createDb(c.env.DB);
  const codex = await appService.getCodex(db, memberId);
  return c.json({ success: true, data: codex });
});

/** GET /notifications — Member's notifications */
appRoutes.get('/notifications', async (c) => {
  const farmId = c.req.header('X-Farm-Id') ?? '';
  const userId = c.req.header('X-User-Id') ?? '';
  const page = Number(c.req.query('page') || '1');
  const pageSize = Number(c.req.query('pageSize') || '20');
  const db = createDb(c.env.DB);
  const result = await appService.getNotifications(db, userId, farmId, page, pageSize);
  return c.json({ success: true, ...result });
});

/** PUT /notifications/:id/read — Mark notification as read */
appRoutes.put('/notifications/:id/read', async (c) => {
  const userId = c.req.header('X-User-Id') ?? '';
  const notificationId = c.req.param('id');
  const db = createDb(c.env.DB);
  const notification = await appService.markNotificationRead(db, notificationId, userId);
  return c.json({ success: true, data: notification });
});

export { appRoutes };

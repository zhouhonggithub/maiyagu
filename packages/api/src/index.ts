import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';

// Middleware
import { errorHandler, authMiddleware, tenantIsolationMiddleware } from './middleware';

// Module routes
import { authRoutes } from './modules/auth';
import { farmRoutes, dashboardRoutes } from './modules/farm';
import { configRoutes } from './modules/config';
import { planRoutes, billingRoutes } from './modules/billing';
import { cameraRoutes, zoneRoutes } from './modules/device';
import { plotRoutes } from './modules/plot';
import { memberRoutes } from './modules/member';
import { commandRoutes, commandAppRoutes } from './modules/command';
import { mediaRoutes } from './modules/media';
import { appRoutes } from './modules/app';
import { modelRoutes, assetRoutes } from './modules/ai';
import { notifyRoutes } from './modules/notify';

// Scheduler & Queue handlers
import { handleFrameCaptureCron } from './scheduler/frame-capture';
import { handleBillingCycleCron } from './scheduler/billing-cycle';
import { handleMemberExpiryCron } from './scheduler/member-expiry';
import { handleFrameCaptureQueue } from './queue/frame-capture';
import { handleLLMAnalysisQueue } from './queue/llm-analysis';
import { handleNotificationQueue } from './queue/notification';

// Durable Objects (re-export for worker binding)
export { PlotRealtimeDO } from './durable-objects/plot-realtime';
export { FarmSessionDO } from './durable-objects/farm-session';

const app = new Hono<{ Bindings: Env }>();

// ─── Global Error Handler ───────────────────────────────────────────
app.onError(errorHandler);

// ─── CORS ───────────────────────────────────────────────────────────
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Auth Middleware (skips /api/v1/public/* and /api/v1/health) ─────
app.use('*', authMiddleware());

// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Public Routes (no auth required) ──────────────────────────────
app.route('/api/v1/public/auth', authRoutes);

// ─── Admin Routes (platform_admin only) ─────────────────────────────
app.route('/api/v1/admin/farms', farmRoutes);
app.route('/api/v1/admin/config', configRoutes);
app.route('/api/v1/admin/plans', planRoutes);
app.route('/api/v1/admin/billing', billingRoutes);
app.route('/api/v1/admin/ai/models', modelRoutes);
app.route('/api/v1/admin/ai/assets', assetRoutes);

// ─── Farm Routes (farm_owner/farm_worker, tenant-isolated) ──────────
app.use('/api/v1/farm/*', tenantIsolationMiddleware());
app.route('/api/v1/farm/dashboard', dashboardRoutes);
app.route('/api/v1/farm/cameras', cameraRoutes);
app.route('/api/v1/farm/coverage-zones', zoneRoutes);
app.route('/api/v1/farm/plots', plotRoutes);
app.route('/api/v1/farm/members', memberRoutes);
app.route('/api/v1/farm/commands', commandRoutes);
app.route('/api/v1/farm/media', mediaRoutes);
app.route('/api/v1/farm/notifications', notifyRoutes);

// ─── App Routes (member-facing) ─────────────────────────────────────
app.route('/api/v1/app', appRoutes);
app.route('/api/v1/app/commands', commandAppRoutes);

// ─── WebSocket: Plot Realtime via Durable Object ────────────────────
app.get('/api/v1/app/ws/plot/:plotId', async (c) => {
  const plotId = c.req.param('plotId');
  const userId = (c as any).get('userId') as string;
  const memberId = c.req.query('memberId') ?? userId;
  const lastSeq = c.req.query('lastSeq') ?? '0';

  const id = c.env.PLOT_REALTIME.idFromName(plotId);
  const stub = c.env.PLOT_REALTIME.get(id);

  const url = new URL(c.req.url);
  url.searchParams.set('memberId', memberId);
  url.searchParams.set('lastSeq', lastSeq);

  return stub.fetch(new Request(url.toString(), {
    headers: c.req.raw.headers,
  }));
});

// ─── WebSocket: Farm Session via Durable Object ─────────────────────
app.get('/api/v1/app/ws/farm/:farmId', async (c) => {
  const farmId = c.req.param('farmId');
  const userId = (c as any).get('userId') as string;
  const lastSeq = c.req.query('lastSeq') ?? '0';

  const id = c.env.FARM_SESSION.idFromName(farmId);
  const stub = c.env.FARM_SESSION.get(id);

  const url = new URL(c.req.url);
  url.searchParams.set('userId', userId);
  url.searchParams.set('lastSeq', lastSeq);

  return stub.fetch(new Request(url.toString(), {
    headers: c.req.raw.headers,
  }));
});

// ─── Scheduled Handler (Cron Triggers) ──────────────────────────────
export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    switch (event.cron) {
      case '*/10 * * * *':
        ctx.waitUntil(handleFrameCaptureCron(env));
        break;
      case '0 0 1 * *':
        ctx.waitUntil(handleBillingCycleCron(env));
        break;
      case '0 2 * * *':
        ctx.waitUntil(handleMemberExpiryCron(env));
        break;
      default:
        console.log(`Unhandled cron: ${event.cron}`);
    }
  },

  async queue(batch: MessageBatch, env: Env, _ctx: ExecutionContext) {
    switch (batch.queue) {
      case 'frame-capture-dispatch':
        await handleFrameCaptureQueue(batch as MessageBatch<any>, env);
        break;
      case 'llm-analysis':
        await handleLLMAnalysisQueue(batch as MessageBatch<any>, env);
        break;
      case 'notification-delivery':
        await handleNotificationQueue(batch as MessageBatch<any>, env);
        break;
      default:
        console.log(`Unhandled queue: ${batch.queue}, messages: ${batch.messages.length}`);
    }
  },
};

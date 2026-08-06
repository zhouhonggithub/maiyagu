import type { Env } from '../env';
import type { TimeWaveConfig } from '@ai-farm/shared';
import { createDb } from '../shared/db';
import { schema } from '../shared/db';
import { eq, and } from 'drizzle-orm';
import { generateId, nowISO } from '@ai-farm/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TimeWaveResolution {
  intervalSec: number;
}

interface FrameCaptureJob {
  id: string;
  farmId: string;
  cameraId: string;
  plotId: string | null;
  scheduledAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve TimeWaveConfig with priority: farm override > member > global.
 */
export function resolveTimeWaveConfig(
  farmOverride: string | null,
  memberConfig: string | null,
  globalConfig: string,
): TimeWaveConfig {
  if (farmOverride) {
    try { return JSON.parse(farmOverride); } catch { /* fall through */ }
  }
  if (memberConfig) {
    try { return JSON.parse(memberConfig); } catch { /* fall through */ }
  }
  return JSON.parse(globalConfig);
}

/**
 * Determine if a capture should happen now based on the TimeWave config.
 * Checks the current time against configured time ranges and intervals.
 */
export function shouldCaptureNow(
  currentTime: Date,
  config: TimeWaveConfig,
  lastCaptureAt: string | null,
): boolean {
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  // Find matching time range
  for (const entry of config) {
    const parts = entry.timeRange.split('-');
    const startStr = parts[0] ?? '00:00';
    const endStr = parts[1] ?? '23:59';
    const startParts = startStr.split(':').map(Number);
    const endParts = endStr.split(':').map(Number);
    const startH = startParts[0] ?? 0;
    const startM = startParts[1] ?? 0;
    const endH = endParts[0] ?? 23;
    const endM = endParts[1] ?? 59;
    const rangeStart = startH * 60 + startM;
    const rangeEnd = endH * 60 + endM;

    if (currentMinutes >= rangeStart && currentMinutes < rangeEnd) {
      // We're in this time range, check interval
      if (!lastCaptureAt) return true;

      const lastTime = new Date(lastCaptureAt).getTime();
      const elapsed = (currentTime.getTime() - lastTime) / 1000;
      return elapsed >= entry.intervalSec;
    }
  }

  // Not in any configured time range — no capture needed
  return false;
}

// ─── Cron Handler ────────────────────────────────────────────────────────────

/**
 * Cron handler — runs every 10 seconds via cron trigger.
 * Loads active farms with cameras, checks capture schedules, enqueues jobs.
 */
export async function handleFrameCaptureCron(env: Env) {
  const db = createDb(env.DB);
  const now = new Date();

  // 1. Load global config
  const platformCfg = await db
    .select()
    .from(schema.platformConfig)
    .limit(1)
    .then((rows) => rows[0]);

  if (!platformCfg) return;

  const globalConfig = platformCfg.globalTimeWaveConfig;

  // 2. Load all cameras belonging to active farms
  const activeCameras = await db
    .select({
      cameraId: schema.cameras.id,
      farmId: schema.cameras.farmId,
      protocol: schema.cameras.protocol,
      streamUrl: schema.cameras.streamUrl,
      deviceSerial: schema.cameras.deviceSerial,
      farmTimeWaveOverride: schema.farms.timeWaveConfigOverride,
    })
    .from(schema.cameras)
    .innerJoin(schema.farms, eq(schema.cameras.farmId, schema.farms.id))
    .where(eq(schema.farms.status, 'active'));

  // 3. For each camera, check last capture and decide if capture needed
  const jobsToEnqueue: FrameCaptureJob[] = [];

  for (const cam of activeCameras) {
    // Get last capture for this camera
    const lastJob = await db
      .select({ capturedAt: schema.frameCaptureJobs.capturedAt })
      .from(schema.frameCaptureJobs)
      .where(
        and(
          eq(schema.frameCaptureJobs.cameraId, cam.cameraId),
          eq(schema.frameCaptureJobs.status, 'captured'),
        ),
      )
      .orderBy(schema.frameCaptureJobs.capturedAt)
      .limit(1)
      .then((rows) => rows[0]);

    const config = resolveTimeWaveConfig(
      cam.farmTimeWaveOverride,
      null, // member config resolved at plot-level if needed
      globalConfig,
    );

    if (shouldCaptureNow(now, config, lastJob?.capturedAt ?? null)) {
      const job: FrameCaptureJob = {
        id: generateId(),
        farmId: cam.farmId,
        cameraId: cam.cameraId,
        plotId: null, // resolved in queue consumer
        scheduledAt: nowISO(),
      };
      jobsToEnqueue.push(job);

      // Insert job record
      await db.insert(schema.frameCaptureJobs).values({
        id: job.id,
        farmId: job.farmId,
        cameraId: job.cameraId,
        plotId: job.plotId,
        status: 'pending',
        scheduledAt: job.scheduledAt,
        retryCount: 0,
      });
    }
  }

  // 4. Enqueue capture jobs in batches
  if (jobsToEnqueue.length > 0) {
    const messages = jobsToEnqueue.map((job) => ({ body: job }));
    // Cloudflare Queues sendBatch limit is 100
    for (let i = 0; i < messages.length; i += 100) {
      await env.FRAME_CAPTURE_QUEUE.sendBatch(messages.slice(i, i + 100));
    }
  }
}

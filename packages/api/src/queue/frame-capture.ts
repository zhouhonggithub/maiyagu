import type { Env } from '../env';
import { createDb } from '../shared/db';
import { schema } from '../shared/db';
import { eq } from 'drizzle-orm';
import { nowISO } from '@ai-farm/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FrameCaptureJob {
  id: string;
  farmId: string;
  cameraId: string;
  plotId: string | null;
  scheduledAt: string;
}

interface LLMAnalysisJob {
  jobId: string;
  farmId: string;
  plotId: string | null;
  cameraId: string;
  frameUrl: string;
  capturedAt: string;
}

// ─── Protocol Adapter ────────────────────────────────────────────────────────

interface CaptureResult {
  imageBuffer: ArrayBuffer;
  contentType: string;
}

/**
 * Protocol adapter factory — produces a capture function based on camera protocol.
 */
function createProtocolAdapter(protocol: string) {
  switch (protocol) {
    case 'ezviz_cloud':
      return captureEzviz;
    case 'custom_stream':
    case 'rtsp':
      return captureCustomUrl;
    default:
      return captureCustomUrl;
  }
}

/**
 * Placeholder for EZVIZ cloud capture.
 * In production, this calls the EZVIZ open API to get a snapshot.
 */
async function captureEzviz(
  camera: { deviceSerial: string | null; credentials: string | null },
  env: Env,
): Promise<CaptureResult> {
  // TODO: Implement EZVIZ API call
  // POST https://open.ys7.com/api/lapp/device/capture
  // Requires: appKey, appSecret, deviceSerial, channelNo
  throw new Error(`EZVIZ capture not yet implemented for device: ${camera.deviceSerial}`);
}

/**
 * Fetch snapshot from a custom stream URL (HTTP JPEG endpoint).
 */
async function captureCustomUrl(
  camera: { streamUrl: string | null; credentials: string | null },
  _env: Env,
): Promise<CaptureResult> {
  if (!camera.streamUrl) {
    throw new Error('Camera has no stream URL configured');
  }

  const headers: Record<string, string> = {};
  if (camera.credentials) {
    try {
      const creds = JSON.parse(camera.credentials);
      if (creds.authHeader) {
        headers['Authorization'] = creds.authHeader;
      }
    } catch { /* no credentials */ }
  }

  const response = await fetch(camera.streamUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to capture frame: HTTP ${response.status}`);
  }

  const imageBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';

  return { imageBuffer, contentType };
}

// ─── Queue Consumer ──────────────────────────────────────────────────────────

/**
 * Queue consumer for frame-capture-dispatch.
 * Captures frame, stores in R2, updates DB, enqueues LLM analysis.
 */
export async function handleFrameCaptureQueue(
  batch: MessageBatch<FrameCaptureJob>,
  env: Env,
) {
  const db = createDb(env.DB);

  for (const msg of batch.messages) {
    const job = msg.body;
    try {
      // 1. Load camera details
      const camera = await db
        .select()
        .from(schema.cameras)
        .where(eq(schema.cameras.id, job.cameraId))
        .then((rows) => rows[0]);

      if (!camera) {
        msg.ack(); // Camera deleted — discard job
        continue;
      }

      // 2. Capture frame via protocol adapter
      const adapter = createProtocolAdapter(camera.protocol);
      const { imageBuffer, contentType } = await adapter(camera, env);

      // 3. Store frame in R2: {farmId}/{cameraId}/{date}/{timestamp}.jpg
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timestamp = now.getTime();
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      const r2Key = `frames/${job.farmId}/${job.cameraId}/${dateStr}/${timestamp}.${ext}`;

      await env.R2.put(r2Key, imageBuffer, {
        httpMetadata: { contentType },
      });

      const capturedAt = nowISO();

      // 4. Update frameCaptureJobs record
      await db
        .update(schema.frameCaptureJobs)
        .set({
          status: 'captured',
          frameUrl: r2Key,
          capturedAt,
        })
        .where(eq(schema.frameCaptureJobs.id, job.id));

      // 5. Enqueue LLM analysis job
      const analysisJob: LLMAnalysisJob = {
        jobId: job.id,
        farmId: job.farmId,
        plotId: job.plotId,
        cameraId: job.cameraId,
        frameUrl: r2Key,
        capturedAt,
      };

      await env.LLM_ANALYSIS_QUEUE.send(analysisJob);

      msg.ack();
    } catch (err) {
      console.error(`Frame capture failed for job ${job.id}:`, err);

      // Update failure in DB
      await db
        .update(schema.frameCaptureJobs)
        .set({
          status: 'failed',
          failureReason: err instanceof Error ? err.message : 'Unknown error',
        })
        .where(eq(schema.frameCaptureJobs.id, job.id))
        .catch(() => {}); // Don't fail the retry on DB write error

      msg.retry();
    }
  }
}

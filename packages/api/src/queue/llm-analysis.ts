import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import type { Env } from '../env';
import { createDb } from '../shared/db';
import { schema } from '../shared/db';
import { eq, desc, and } from 'drizzle-orm';
import { generateId, nowISO } from '@ai-farm/shared';
import { matchAsset } from '../modules/ai/asset-service';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LLMAnalysisJob {
  jobId: string;
  farmId: string;
  plotId: string | null;
  cameraId: string;
  frameUrl: string;
  capturedAt: string;
}

interface NotificationJob {
  farmId: string;
  targetUserId: string;
  type: string;
  title: string;
  content: string;
  channel: string;
  data?: Record<string, unknown>;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const analysisResultSchema = z.object({
  cropStatus: z.string(),
  growthStage: z.string(),
  healthScore: z.number().min(0).max(100),
  visitors: z.array(
    z.object({
      type: z.enum(['insect', 'bird', 'animal', 'person']),
      species: z.string().optional(),
      confidence: z.number(),
    }),
  ),
  anomalies: z.array(
    z.object({
      type: z.enum(['pest', 'disease', 'drought', 'flood', 'unknown_person', 'other']),
      description: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    }),
  ),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

// ─── Queue Consumer ──────────────────────────────────────────────────────────

/**
 * Queue consumer for LLM analysis.
 * Uses Vercel AI SDK generateObject() for structured output.
 */
export async function handleLLMAnalysisQueue(
  batch: MessageBatch<LLMAnalysisJob>,
  env: Env,
) {
  const db = createDb(env.DB);

  for (const msg of batch.messages) {
    const job = msg.body;
    const startTime = Date.now();

    try {
      // 1. Select model version for inference
      const model = await selectModelForInference(db);
      if (!model) {
        console.error('No active AI model configured');
        msg.retry();
        continue;
      }

      // 2. Fetch recent analyses for context
      const recentAnalyses = job.plotId
        ? await db
            .select()
            .from(schema.plotAnalyses)
            .where(eq(schema.plotAnalyses.plotId, job.plotId))
            .orderBy(desc(schema.plotAnalyses.analyzedAt))
            .limit(5)
        : [];

      // 3. Fetch plot metadata
      const plot = job.plotId
        ? await db
            .select()
            .from(schema.plots)
            .where(eq(schema.plots.id, job.plotId))
            .then((rows) => rows[0])
        : null;

      // 4. Build prompt
      const prompt = buildAnalysisPrompt(job, plot, recentAnalyses);

      // 5. Create AI provider (supports Qwen via custom baseURL)
      const provider = createOpenAI({
        apiKey: env.LLM_API_KEY ?? '',
        baseURL: model.endpointUrl,
      });

      // 6. Call generateObject with structured schema
      const { object: result } = await generateObject({
        model: provider(model.versionIdentifier),
        schema: analysisResultSchema,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image', image: new URL(job.frameUrl) },
            ],
          },
        ],
      });

      const processingDurationMs = Date.now() - startTime;

      // 7. Store analysis result
      const analysisId = generateId();
      await db.insert(schema.plotAnalyses).values({
        id: analysisId,
        farmId: job.farmId,
        plotId: job.plotId ?? '',
        frameUrl: job.frameUrl,
        modelVersionId: model.id,
        cropStatus: result.cropStatus,
        growthStage: result.growthStage,
        healthScore: result.healthScore,
        visitorDetections: JSON.stringify(result.visitors),
        anomalyFlags: JSON.stringify(result.anomalies),
        confidenceScores: JSON.stringify({
          visitors: result.visitors.map((v) => v.confidence),
        }),
        processingDurationMs,
        contextFrameCount: recentAnalyses.length,
        analyzedAt: nowISO(),
      });

      // 8. Record usage for billing
      await db.insert(schema.usageRecords).values({
        id: generateId(),
        farmId: job.farmId,
        type: 'ai_call',
        quantity: 1,
        unit: 'count',
        billingPeriod: new Date().toISOString().slice(0, 7), // YYYY-MM
        recordedAt: nowISO(),
      });

      // 9. Match visitors to assets & store visitor events
      if (result.visitors.length > 0 && job.plotId) {
        const assets = await db.select().from(schema.assetLibrary);
        for (const visitor of result.visitors) {
          const assetId = matchAsset(assets, visitor.species ?? visitor.type);
          await db.insert(schema.visitorEvents).values({
            id: generateId(),
            farmId: job.farmId,
            plotId: job.plotId,
            analysisId,
            visitorType: visitor.type,
            species: visitor.species ?? null,
            confidence: visitor.confidence,
            assetId,
            detectedAt: nowISO(),
          });
        }
      }

      // 10. Check significance → enqueue notification if needed
      await checkAndNotify(db, env, job, result);

      // 11. Update frame capture job status
      await db
        .update(schema.frameCaptureJobs)
        .set({ status: 'complete', completedAt: nowISO() })
        .where(eq(schema.frameCaptureJobs.id, job.jobId));

      msg.ack();
    } catch (err) {
      console.error(`LLM analysis failed for job ${job.jobId}:`, err);

      await db
        .update(schema.frameCaptureJobs)
        .set({ status: 'failed', failureReason: err instanceof Error ? err.message : 'LLM error' })
        .where(eq(schema.frameCaptureJobs.id, job.jobId))
        .catch(() => {});

      msg.retry();
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function selectModelForInference(db: ReturnType<typeof createDb>) {
  const activeModels = await db
    .select()
    .from(schema.aiModelVersions)
    .where(eq(schema.aiModelVersions.status, 'active'));

  const testingModels = await db
    .select()
    .from(schema.aiModelVersions)
    .where(eq(schema.aiModelVersions.status, 'testing'));

  const testingModel = testingModels.find((m) => (m.testingPercentage ?? 0) > 0);

  if (testingModel && Math.random() * 100 < (testingModel.testingPercentage ?? 0)) {
    return testingModel;
  }

  return activeModels[0] ?? null;
}

function buildAnalysisPrompt(
  job: LLMAnalysisJob,
  plot: { currentCrop: string | null; soilType: string | null; name: string } | null | undefined,
  recentAnalyses: Array<{ cropStatus: string | null; healthScore: number | null; analyzedAt: string }>,
): string {
  let prompt = `Analyze this farm plot image and provide structured data about crop status, growth stage, health, visitor detections, and anomalies.\n\n`;

  if (plot) {
    prompt += `Plot: ${plot.name}\n`;
    if (plot.currentCrop) prompt += `Current crop: ${plot.currentCrop}\n`;
    if (plot.soilType) prompt += `Soil type: ${plot.soilType}\n`;
  }

  if (recentAnalyses.length > 0) {
    prompt += `\nRecent history (last ${recentAnalyses.length} analyses):\n`;
    for (const analysis of recentAnalyses) {
      prompt += `- ${analysis.analyzedAt}: status=${analysis.cropStatus}, health=${analysis.healthScore}\n`;
    }
  }

  prompt += `\nProvide your analysis in the structured format. Be specific about growth stage (seedling/vegetative/flowering/fruiting/harvest-ready). Score health 0-100. List any visitors (insects, birds, animals, people) with confidence. Flag anomalies with severity.`;

  return prompt;
}

/**
 * Check if analysis results are significant enough to notify farm owner/members.
 */
async function checkAndNotify(
  db: ReturnType<typeof createDb>,
  env: Env,
  job: LLMAnalysisJob,
  result: AnalysisResult,
) {
  const notifications: NotificationJob[] = [];

  // High-severity anomalies → critical notification
  const criticalAnomalies = result.anomalies.filter((a) => a.severity === 'high');
  if (criticalAnomalies.length > 0) {
    const farm = await db
      .select({ ownerId: schema.farms.ownerId })
      .from(schema.farms)
      .where(eq(schema.farms.id, job.farmId))
      .then((rows) => rows[0]);

    if (farm) {
      notifications.push({
        farmId: job.farmId,
        targetUserId: farm.ownerId,
        type: 'critical_alert',
        title: '⚠️ 农场异常告警',
        content: criticalAnomalies.map((a) => `${a.type}: ${a.description}`).join('; '),
        channel: 'sms',
      });
    }
  }

  // Health score dropped significantly → crop change notification
  if (result.healthScore < 40) {
    const farm = await db
      .select({ ownerId: schema.farms.ownerId })
      .from(schema.farms)
      .where(eq(schema.farms.id, job.farmId))
      .then((rows) => rows[0]);

    if (farm) {
      notifications.push({
        farmId: job.farmId,
        targetUserId: farm.ownerId,
        type: 'crop_change',
        title: '🌱 作物健康状况下降',
        content: `健康评分: ${result.healthScore}/100, 状态: ${result.cropStatus}`,
        channel: 'wechat',
      });
    }
  }

  // Send notifications to queue
  if (notifications.length > 0) {
    await env.NOTIFICATION_QUEUE.sendBatch(
      notifications.map((n) => ({ body: n })),
    );
  }
}

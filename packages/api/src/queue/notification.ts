import type { Env } from '../env';
import { createDb } from '../shared/db';
import { schema } from '../shared/db';
import { eq } from 'drizzle-orm';
import { generateId, nowISO } from '@ai-farm/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationJob {
  farmId: string;
  targetUserId: string;
  type: string;
  title: string;
  content: string;
  channel: string;
  data?: Record<string, unknown>;
}

// ─── Channel Adapters ────────────────────────────────────────────────────────

/**
 * In-app notification — writes directly to DB (always succeeds).
 */
async function deliverInApp(
  db: ReturnType<typeof createDb>,
  notificationId: string,
): Promise<boolean> {
  await db
    .update(schema.notifications)
    .set({ status: 'sent', sentAt: nowISO() })
    .where(eq(schema.notifications.id, notificationId));
  return true;
}

/**
 * WeChat template message — placeholder adapter.
 * In production, calls WeChat official API.
 */
async function deliverWechat(
  targetUserId: string,
  title: string,
  content: string,
  _env: Env,
): Promise<boolean> {
  // TODO: Implement WeChat template message delivery
  // POST https://api.weixin.qq.com/cgi-bin/message/template/send
  console.log(`[WeChat] Sending to user ${targetUserId}: ${title}`);
  // For now, return true to mark as sent (placeholder)
  return true;
}

/**
 * SMS notification — placeholder adapter.
 * In production, calls Aliyun SMS / Tencent Cloud SMS.
 */
async function deliverSms(
  targetUserId: string,
  content: string,
  _env: Env,
): Promise<boolean> {
  // TODO: Implement SMS delivery via cloud provider
  console.log(`[SMS] Sending to user ${targetUserId}: ${content}`);
  // For now, return true to mark as sent (placeholder)
  return true;
}

// ─── Queue Consumer ──────────────────────────────────────────────────────────

/**
 * Queue consumer for notification delivery.
 * Cloudflare Queues handles retries automatically (max_retries=3 in wrangler.toml).
 */
export async function handleNotificationQueue(
  batch: MessageBatch<NotificationJob>,
  env: Env,
) {
  const db = createDb(env.DB);

  for (const msg of batch.messages) {
    const job = msg.body;

    try {
      // 1. Create notification record in DB
      const notificationId = generateId();
      await db.insert(schema.notifications).values({
        id: notificationId,
        farmId: job.farmId,
        targetUserId: job.targetUserId,
        channel: job.channel,
        type: job.type,
        title: job.title,
        content: job.content,
        data: job.data ? JSON.stringify(job.data) : null,
        status: 'pending',
        retryCount: 0,
        createdAt: nowISO(),
      });

      // 2. Deliver via channel
      let delivered = false;

      switch (job.channel) {
        case 'wechat':
          delivered = await deliverWechat(job.targetUserId, job.title, job.content, env);
          break;
        case 'sms':
          delivered = await deliverSms(job.targetUserId, job.content, env);
          break;
        case 'in_app':
        default:
          delivered = await deliverInApp(db, notificationId);
          break;
      }

      // 3. Update delivery status
      if (delivered) {
        await db
          .update(schema.notifications)
          .set({ status: 'sent', sentAt: nowISO() })
          .where(eq(schema.notifications.id, notificationId));
      }

      msg.ack();
    } catch (err) {
      console.error(`Notification delivery failed:`, err);
      msg.retry(); // Cloudflare Queues handles retry count
    }
  }
}

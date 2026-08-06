import type { Env } from '../env';
import { createDb } from '../shared/db';
import { schema } from '../shared/db';
import { eq, and, lte } from 'drizzle-orm';
import { nowISO } from '@ai-farm/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationJob {
  farmId: string;
  targetUserId: string;
  type: string;
  title: string;
  content: string;
  channel: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Cron Handler ────────────────────────────────────────────────────────────

/**
 * Daily cron: checks member subscriptions approaching expiry.
 * - 7 days before: first reminder
 * - 3 days before: urgent reminder
 * - Expired today: transition status to 'expired'
 */
export async function handleMemberExpiryCron(env: Env) {
  const db = createDb(env.DB);
  const now = new Date();
  const today = formatDate(now);

  // Calculate date boundaries
  const in7Days = formatDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
  const in3Days = formatDate(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000));

  const notifications: NotificationJob[] = [];

  // 1. Find members expiring in exactly 7 days → send reminder
  const expiring7d = await db
    .select()
    .from(schema.members)
    .where(
      and(
        eq(schema.members.status, 'active'),
        eq(schema.members.subscriptionEnd, in7Days),
      ),
    );

  for (const member of expiring7d) {
    notifications.push({
      farmId: member.farmId,
      targetUserId: member.userId,
      type: 'expiry_reminder',
      title: '📅 会员即将到期',
      content: `您的会员将在7天后（${in7Days}）到期，请及时续费以继续享受农场服务。`,
      channel: 'in_app',
    });
  }

  // 2. Find members expiring in exactly 3 days → urgent reminder
  const expiring3d = await db
    .select()
    .from(schema.members)
    .where(
      and(
        eq(schema.members.status, 'active'),
        eq(schema.members.subscriptionEnd, in3Days),
      ),
    );

  for (const member of expiring3d) {
    notifications.push({
      farmId: member.farmId,
      targetUserId: member.userId,
      type: 'expiry_reminder',
      title: '⚠️ 会员即将到期',
      content: `您的会员将在3天后（${in3Days}）到期，请尽快续费！`,
      channel: 'wechat',
    });
  }

  // 3. Find members expired today → transition to 'expired'
  const expiredToday = await db
    .select()
    .from(schema.members)
    .where(
      and(
        eq(schema.members.status, 'active'),
        lte(schema.members.subscriptionEnd, today),
      ),
    );

  for (const member of expiredToday) {
    // Transition status to expired
    await db
      .update(schema.members)
      .set({ status: 'expired', updatedAt: nowISO() })
      .where(eq(schema.members.id, member.id));

    notifications.push({
      farmId: member.farmId,
      targetUserId: member.userId,
      type: 'expiry_reminder',
      title: '❌ 会员已到期',
      content: `您的会员已于 ${member.subscriptionEnd} 到期。如需继续使用农场服务，请续费。`,
      channel: 'wechat',
    });
  }

  // 4. Enqueue all notifications
  if (notifications.length > 0) {
    const messages = notifications.map((n) => ({ body: n }));
    for (let i = 0; i < messages.length; i += 100) {
      await env.NOTIFICATION_QUEUE.sendBatch(messages.slice(i, i + 100));
    }
  }

  console.log(
    `Member expiry check: ${expiring7d.length} (7d), ${expiring3d.length} (3d), ${expiredToday.length} (expired)`,
  );
}

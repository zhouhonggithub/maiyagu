import { generateId, nowISO } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';
import { eq, and, desc } from 'drizzle-orm';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateNotificationInput {
  farmId: string;
  targetUserId: string;
  type: string;
  title: string;
  content: string;
  data?: Record<string, unknown>;
}

type NotificationType = 'crop_change' | 'command_update' | 'expiry_reminder' | 'critical_alert';

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Resolve the notification delivery channel based on notification type.
 * - critical_alert → SMS (immediate delivery needed)
 * - crop_change, command_update → WeChat (standard delivery)
 * - expiry_reminder → in_app
 * - default → in_app
 */
export function resolveChannel(type: string): string {
  switch (type as NotificationType) {
    case 'critical_alert':
      return 'sms';
    case 'crop_change':
    case 'command_update':
      return 'wechat';
    case 'expiry_reminder':
      return 'in_app';
    default:
      return 'in_app';
  }
}

/**
 * Create a notification record and return it.
 * Does NOT deliver — use the notification queue for delivery.
 */
export async function createNotification(db: AppDb, input: CreateNotificationInput) {
  const channel = resolveChannel(input.type);
  const id = generateId();
  const now = nowISO();

  await db.insert(schema.notifications).values({
    id,
    farmId: input.farmId,
    targetUserId: input.targetUserId,
    channel,
    type: input.type,
    title: input.title,
    content: input.content,
    data: input.data ? JSON.stringify(input.data) : null,
    status: 'pending',
    retryCount: 0,
    createdAt: now,
  });

  return { id, channel, status: 'pending' as const, createdAt: now };
}

/**
 * List notifications for a member/user with pagination.
 */
export async function listNotifications(
  db: AppDb,
  userId: string,
  opts: { page: number; pageSize: number },
) {
  const offset = (opts.page - 1) * opts.pageSize;

  const notifications = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.targetUserId, userId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(opts.pageSize)
    .offset(offset);

  return notifications;
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(db: AppDb, notificationId: string, userId: string) {
  const result = await db
    .update(schema.notifications)
    .set({ status: 'read', readAt: nowISO() })
    .where(
      and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.targetUserId, userId),
      ),
    );

  return result;
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(db: AppDb, userId: string) {
  const results = await db
    .select()
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.targetUserId, userId),
        eq(schema.notifications.status, 'sent'),
      ),
    );

  return results.length;
}

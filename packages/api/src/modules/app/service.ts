import { eq, and, desc, isNull, count } from 'drizzle-orm';
import { NotFoundError } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const {
  memberPlotBindings,
  plots,
  plotAnalyses,
  growthLogs,
  mediaItems,
  coverageZones,
  cameras,
  visitorEvents,
  visitorCodex,
  memberCodexUnlocks,
  notifications,
} = schema;

/** List member's bound plots with latest analysis data */
export async function getMyPlots(db: AppDb, memberId: string, farmId: string) {
  const bindings = await db
    .select()
    .from(memberPlotBindings)
    .where(
      and(
        eq(memberPlotBindings.memberId, memberId),
        eq(memberPlotBindings.farmId, farmId),
        isNull(memberPlotBindings.unboundAt),
      ),
    );

  const results = [];
  for (const binding of bindings) {
    const plot = await db
      .select()
      .from(plots)
      .where(eq(plots.id, binding.plotId))
      .limit(1);

    const latestAnalysis = await db
      .select()
      .from(plotAnalyses)
      .where(eq(plotAnalyses.plotId, binding.plotId))
      .orderBy(desc(plotAnalyses.analyzedAt))
      .limit(1);

    results.push({
      plot: plot[0] ?? null,
      binding,
      latestAnalysis: latestAnalysis[0] ?? null,
    });
  }
  return results;
}

/** Latest plotAnalysis for a specific plot */
export async function getPlotLive(db: AppDb, plotId: string, farmId: string) {
  const results = await db
    .select()
    .from(plotAnalyses)
    .where(and(eq(plotAnalyses.plotId, plotId), eq(plotAnalyses.farmId, farmId)))
    .orderBy(desc(plotAnalyses.analyzedAt))
    .limit(1);
  return results[0] ?? null;
}

/** Growth logs + media for a plot, ordered by date desc, paginated */
export async function getPlotTimeline(
  db: AppDb,
  plotId: string,
  farmId: string,
  page: number,
  pageSize: number,
) {
  const offset = (page - 1) * pageSize;

  const logs = await db
    .select()
    .from(growthLogs)
    .where(and(eq(growthLogs.plotId, plotId), eq(growthLogs.farmId, farmId)))
    .orderBy(desc(growthLogs.date))
    .limit(pageSize)
    .offset(offset);

  const media = await db
    .select()
    .from(mediaItems)
    .where(and(eq(mediaItems.plotId, plotId), eq(mediaItems.farmId, farmId)))
    .orderBy(desc(mediaItems.takenAt))
    .limit(pageSize)
    .offset(offset);

  const [logCount] = await db
    .select({ total: count() })
    .from(growthLogs)
    .where(and(eq(growthLogs.plotId, plotId), eq(growthLogs.farmId, farmId)));

  return {
    logs,
    media,
    pagination: {
      page,
      pageSize,
      total: logCount?.total ?? 0,
    },
  };
}

/** Get camera snapshot URL for a plot's coverage zone camera */
export async function getPlotCamera(db: AppDb, plotId: string, farmId: string) {
  const plot = await db.select().from(plots).where(eq(plots.id, plotId)).limit(1);
  if (!plot[0]) throw new NotFoundError('Plot not found');

  if (!plot[0].coverageZoneId) return null;

  const zone = await db
    .select()
    .from(coverageZones)
    .where(eq(coverageZones.id, plot[0].coverageZoneId))
    .limit(1);

  if (!zone[0]) return null;

  const camera = await db
    .select()
    .from(cameras)
    .where(and(eq(cameras.id, zone[0].cameraId), eq(cameras.farmId, farmId)))
    .limit(1);

  return camera[0] ?? null;
}

/** Visitor events for member's plots, grouped by date */
export async function getVisitorEvents(db: AppDb, memberId: string, farmId: string) {
  // Get member's active plot IDs
  const bindings = await db
    .select()
    .from(memberPlotBindings)
    .where(
      and(
        eq(memberPlotBindings.memberId, memberId),
        eq(memberPlotBindings.farmId, farmId),
        isNull(memberPlotBindings.unboundAt),
      ),
    );

  const plotIds = bindings.map((b) => b.plotId);
  if (plotIds.length === 0) return [];

  const events = [];
  for (const plotId of plotIds) {
    const plotEvents = await db
      .select()
      .from(visitorEvents)
      .where(and(eq(visitorEvents.plotId, plotId), eq(visitorEvents.farmId, farmId)))
      .orderBy(desc(visitorEvents.detectedAt))
      .limit(50);
    events.push(...plotEvents);
  }

  // Group by date
  const grouped: Record<string, typeof events> = {};
  for (const event of events) {
    const date = event.detectedAt.split('T')[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(event);
  }

  return grouped;
}

/** All codex entries with member's unlock status */
export async function getCodex(db: AppDb, memberId: string) {
  const allEntries = await db.select().from(visitorCodex);
  const unlocks = await db
    .select()
    .from(memberCodexUnlocks)
    .where(eq(memberCodexUnlocks.memberId, memberId));

  const unlockMap = new Map(unlocks.map((u) => [u.codexEntryId, u]));

  return allEntries.map((entry) => ({
    ...entry,
    unlocked: unlockMap.has(entry.id),
    unlock: unlockMap.get(entry.id) ?? null,
  }));
}

/** Member's notifications */
export async function getNotifications(
  db: AppDb,
  userId: string,
  farmId: string,
  page: number,
  pageSize: number,
) {
  const offset = (page - 1) * pageSize;
  const conditions = and(
    eq(notifications.targetUserId, userId),
    eq(notifications.farmId, farmId),
  );

  const [items, totalResult] = await Promise.all([
    db.select().from(notifications).where(conditions).orderBy(desc(notifications.createdAt)).limit(pageSize).offset(offset),
    db.select({ total: count() }).from(notifications).where(conditions),
  ]);

  return {
    data: items,
    pagination: {
      page,
      pageSize,
      total: totalResult[0]?.total ?? 0,
      totalPages: Math.ceil((totalResult[0]?.total ?? 0) / pageSize),
    },
  };
}

/** Mark a notification as read */
export async function markNotificationRead(db: AppDb, notificationId: string, userId: string) {
  const results = await db
    .update(notifications)
    .set({ status: 'read', readAt: new Date().toISOString() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.targetUserId, userId)))
    .returning();
  if (!results[0]) throw new NotFoundError('Notification not found');
  return results[0];
}

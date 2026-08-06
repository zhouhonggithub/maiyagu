import { eq, and, count, desc } from 'drizzle-orm';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const { mediaItems, growthLogs } = schema;

export async function listMediaByPlot(
  db: AppDb,
  farmId: string,
  plotId: string,
  page: number,
  pageSize: number,
) {
  const offset = (page - 1) * pageSize;
  const conditions = and(eq(mediaItems.farmId, farmId), eq(mediaItems.plotId, plotId));

  const [items, totalResult] = await Promise.all([
    db.select().from(mediaItems).where(conditions).orderBy(desc(mediaItems.takenAt)).limit(pageSize).offset(offset),
    db.select({ total: count() }).from(mediaItems).where(conditions),
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

export async function listGrowthLogs(db: AppDb, farmId: string, plotId: string) {
  return db
    .select()
    .from(growthLogs)
    .where(and(eq(growthLogs.farmId, farmId), eq(growthLogs.plotId, plotId)))
    .orderBy(desc(growthLogs.date));
}

export async function createMedia(db: AppDb, data: typeof mediaItems.$inferInsert) {
  const results = await db.insert(mediaItems).values(data).returning();
  return results[0];
}

export async function createGrowthLog(db: AppDb, data: typeof growthLogs.$inferInsert) {
  const results = await db.insert(growthLogs).values(data).returning();
  return results[0];
}

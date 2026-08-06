import { eq, and } from 'drizzle-orm';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const { plots } = schema;

export async function listByFarm(db: AppDb, farmId: string) {
  return db.select().from(plots).where(eq(plots.farmId, farmId)).orderBy(plots.code);
}

export async function listByZone(db: AppDb, farmId: string, coverageZoneId: string) {
  return db
    .select()
    .from(plots)
    .where(and(eq(plots.farmId, farmId), eq(plots.coverageZoneId, coverageZoneId)))
    .orderBy(plots.code);
}

export async function getById(db: AppDb, id: string, farmId: string) {
  const results = await db
    .select()
    .from(plots)
    .where(and(eq(plots.id, id), eq(plots.farmId, farmId)))
    .limit(1);
  return results[0] ?? null;
}

export interface CreatePlotData {
  id: string;
  farmId: string;
  coverageZoneId?: string | null;
  name: string;
  code: string;
  polygonPoints: string; // JSON
  areaSqm?: number | null;
  soilType?: string | null;
  irrigationType?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function create(db: AppDb, data: CreatePlotData) {
  const results = await db.insert(plots).values(data).returning();
  return results[0];
}

export async function batchInsert(db: AppDb, items: CreatePlotData[]) {
  const results = await db.insert(plots).values(items).returning();
  return results;
}

export async function update(db: AppDb, id: string, farmId: string, data: Partial<{
  name: string;
  code: string;
  polygonPoints: string;
  areaSqm: number | null;
  soilType: string | null;
  irrigationType: string | null;
  updatedAt: string;
}>) {
  const results = await db
    .update(plots)
    .set(data)
    .where(and(eq(plots.id, id), eq(plots.farmId, farmId)))
    .returning();
  return results[0];
}

export async function remove(db: AppDb, id: string, farmId: string) {
  await db.delete(plots).where(and(eq(plots.id, id), eq(plots.farmId, farmId)));
}

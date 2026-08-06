import { eq, and } from 'drizzle-orm';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const { coverageZones } = schema;

export async function listByFarm(db: AppDb, farmId: string) {
  return db.select().from(coverageZones).where(eq(coverageZones.farmId, farmId));
}

export async function listByCamera(db: AppDb, cameraId: string) {
  return db.select().from(coverageZones).where(eq(coverageZones.cameraId, cameraId));
}

export async function getById(db: AppDb, id: string, farmId: string) {
  const results = await db
    .select()
    .from(coverageZones)
    .where(and(eq(coverageZones.id, id), eq(coverageZones.farmId, farmId)))
    .limit(1);
  return results[0] ?? null;
}

export interface CreateZoneData {
  id: string;
  farmId: string;
  cameraId: string;
  name: string;
  polygonPoints: string; // JSON
  areaSqm?: number | null;
  createdAt: string;
  updatedAt: string;
}

export async function create(db: AppDb, data: CreateZoneData) {
  const results = await db.insert(coverageZones).values(data).returning();
  return results[0];
}

export async function update(db: AppDb, id: string, farmId: string, data: Partial<{
  name: string;
  polygonPoints: string;
  areaSqm: number | null;
  updatedAt: string;
}>) {
  const results = await db
    .update(coverageZones)
    .set(data)
    .where(and(eq(coverageZones.id, id), eq(coverageZones.farmId, farmId)))
    .returning();
  return results[0];
}

export async function remove(db: AppDb, id: string, farmId: string) {
  await db.delete(coverageZones).where(and(eq(coverageZones.id, id), eq(coverageZones.farmId, farmId)));
}

import { eq, and } from 'drizzle-orm';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const { cameras } = schema;

export async function listByFarm(db: AppDb, farmId: string) {
  return db.select().from(cameras).where(eq(cameras.farmId, farmId));
}

export async function getById(db: AppDb, id: string, farmId: string) {
  const results = await db
    .select()
    .from(cameras)
    .where(and(eq(cameras.id, id), eq(cameras.farmId, farmId)))
    .limit(1);
  return results[0] ?? null;
}

export interface CreateCameraData {
  id: string;
  farmId: string;
  name: string;
  protocol: string;
  streamUrl?: string | null;
  deviceSerial?: string | null;
  credentials?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function create(db: AppDb, data: CreateCameraData) {
  const results = await db.insert(cameras).values(data).returning();
  return results[0];
}

export async function update(db: AppDb, id: string, farmId: string, data: Partial<{
  name: string;
  streamUrl: string | null;
  credentials: string | null;
  status: string;
  lastHeartbeat: string;
  updatedAt: string;
}>) {
  const results = await db
    .update(cameras)
    .set(data)
    .where(and(eq(cameras.id, id), eq(cameras.farmId, farmId)))
    .returning();
  return results[0];
}

export async function remove(db: AppDb, id: string, farmId: string) {
  await db.delete(cameras).where(and(eq(cameras.id, id), eq(cameras.farmId, farmId)));
}

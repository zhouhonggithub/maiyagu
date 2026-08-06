import { eq, and, desc, count } from 'drizzle-orm';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const { farms, members } = schema;

export interface FarmListFilters {
  status?: string;
  page: number;
  pageSize: number;
}

export async function listFarms(db: AppDb, filters: FarmListFilters) {
  const { status, page, pageSize } = filters;
  const offset = (page - 1) * pageSize;

  const conditions = status ? eq(farms.status, status) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(farms)
      .where(conditions)
      .orderBy(desc(farms.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(farms)
      .where(conditions),
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

export async function getFarmById(db: AppDb, id: string) {
  const results = await db.select().from(farms).where(eq(farms.id, id)).limit(1);
  return results[0] ?? null;
}

export interface CreateFarmData {
  id: string;
  name: string;
  ownerId: string;
  province: string;
  city: string;
  district: string;
  address?: string | null;
  areaSqm?: number | null;
  description?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function createFarm(db: AppDb, data: CreateFarmData) {
  const results = await db.insert(farms).values(data).returning();
  return results[0];
}

export async function updateFarmStatus(db: AppDb, id: string, status: string, updatedAt: string) {
  const results = await db
    .update(farms)
    .set({ status, updatedAt })
    .where(eq(farms.id, id))
    .returning();
  return results[0];
}

export async function updateFarmPlan(db: AppDb, id: string, planId: string, updatedAt: string) {
  const results = await db
    .update(farms)
    .set({ planId, updatedAt })
    .where(eq(farms.id, id))
    .returning();
  return results[0];
}

export async function updateFarmTimeWaveOverride(
  db: AppDb,
  id: string,
  config: string,
  updatedAt: string,
) {
  const results = await db
    .update(farms)
    .set({ timeWaveConfigOverride: config, updatedAt })
    .where(eq(farms.id, id))
    .returning();
  return results[0];
}

export async function softDeleteFarm(db: AppDb, id: string, updatedAt: string) {
  const results = await db
    .update(farms)
    .set({ status: 'deleted', updatedAt })
    .where(eq(farms.id, id))
    .returning();
  return results[0];
}

export async function countFarmMembers(db: AppDb, farmId: string): Promise<number> {
  const results = await db
    .select({ total: count() })
    .from(members)
    .where(and(eq(members.farmId, farmId), eq(members.status, 'active')));
  return results[0]?.total ?? 0;
}

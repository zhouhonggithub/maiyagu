import { eq } from 'drizzle-orm';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const { farmPlans } = schema;

export async function listPlans(db: AppDb) {
  return db.select().from(farmPlans).where(eq(farmPlans.isActive, true));
}

export async function getPlanById(db: AppDb, id: string) {
  const results = await db.select().from(farmPlans).where(eq(farmPlans.id, id)).limit(1);
  return results[0] ?? null;
}

export interface CreatePlanData {
  id: string;
  name: string;
  memberMin: number;
  memberMax: number | null;
  monthlyPrice: number;
  aiCallsIncluded: number;
  storageGbIncluded: number;
  aiCallOveragePrice: number;
  storageOveragePrice: number;
  createdAt: string;
  updatedAt: string;
}

export async function createPlan(db: AppDb, data: CreatePlanData) {
  const results = await db.insert(farmPlans).values(data).returning();
  return results[0];
}

export async function updatePlan(db: AppDb, id: string, data: Partial<CreatePlanData>) {
  const results = await db
    .update(farmPlans)
    .set(data)
    .where(eq(farmPlans.id, id))
    .returning();
  return results[0];
}

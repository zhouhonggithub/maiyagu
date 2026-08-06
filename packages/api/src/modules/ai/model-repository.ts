import { eq } from 'drizzle-orm';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const { aiModelVersions } = schema;

export async function list(db: AppDb) {
  return db.select().from(aiModelVersions).orderBy(aiModelVersions.createdAt);
}

export async function getById(db: AppDb, id: string) {
  const results = await db.select().from(aiModelVersions).where(eq(aiModelVersions.id, id)).limit(1);
  return results[0] ?? null;
}

export async function getByStatus(db: AppDb, status: string) {
  return db.select().from(aiModelVersions).where(eq(aiModelVersions.status, status));
}

export interface CreateModelData {
  id: string;
  modelName: string;
  versionIdentifier: string;
  adapterType: string;
  endpointUrl: string;
  status: string;
  testingPercentage?: number;
  config?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function create(db: AppDb, data: CreateModelData) {
  const results = await db.insert(aiModelVersions).values(data).returning();
  return results[0];
}

export async function updateStatus(db: AppDb, id: string, status: string, updatedAt: string) {
  const results = await db
    .update(aiModelVersions)
    .set({ status, updatedAt })
    .where(eq(aiModelVersions.id, id))
    .returning();
  return results[0];
}

export async function updateTestingPercentage(db: AppDb, id: string, percentage: number, updatedAt: string) {
  const results = await db
    .update(aiModelVersions)
    .set({ testingPercentage: percentage, updatedAt })
    .where(eq(aiModelVersions.id, id))
    .returning();
  return results[0];
}

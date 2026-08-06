import { eq, and } from 'drizzle-orm';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const { assetLibrary } = schema;

export async function listByCategory(db: AppDb, category: string) {
  return db.select().from(assetLibrary).where(eq(assetLibrary.category, category));
}

export async function listAll(db: AppDb) {
  return db.select().from(assetLibrary).orderBy(assetLibrary.category, assetLibrary.displayName);
}

export async function getById(db: AppDb, id: string) {
  const results = await db.select().from(assetLibrary).where(eq(assetLibrary.id, id)).limit(1);
  return results[0] ?? null;
}

export async function findDefaults(db: AppDb, category: string) {
  return db
    .select()
    .from(assetLibrary)
    .where(and(eq(assetLibrary.category, category), eq(assetLibrary.isDefault, true)));
}

export interface CreateAssetData {
  id: string;
  category: string;
  displayName: string;
  imageUrl: string;
  mappingKeywords: string; // JSON
  isDefault?: boolean;
  createdAt: string;
}

export async function create(db: AppDb, data: CreateAssetData) {
  const results = await db.insert(assetLibrary).values(data).returning();
  return results[0];
}

export async function update(db: AppDb, id: string, data: Partial<Pick<CreateAssetData, 'displayName' | 'mappingKeywords' | 'isDefault'>>) {
  const results = await db
    .update(assetLibrary)
    .set(data)
    .where(eq(assetLibrary.id, id))
    .returning();
  return results[0];
}

export async function remove(db: AppDb, id: string) {
  await db.delete(assetLibrary).where(eq(assetLibrary.id, id));
}

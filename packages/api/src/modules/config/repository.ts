import { eq, count } from 'drizzle-orm';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const { platformConfig, farms, members, subscriptions } = schema;

export async function getPlatformConfig(db: AppDb) {
  const results = await db.select().from(platformConfig).limit(1);
  return results[0] ?? null;
}

export async function updateGlobalTimeWaveConfig(
  db: AppDb,
  config: string,
  updatedAt: string,
) {
  const existing = await getPlatformConfig(db);
  if (!existing) {
    // Create initial config record
    const results = await db
      .insert(platformConfig)
      .values({
        id: 'default',
        globalTimeWaveConfig: config,
        updatedAt,
      })
      .returning();
    return results[0];
  }
  const results = await db
    .update(platformConfig)
    .set({ globalTimeWaveConfig: config, updatedAt })
    .where(eq(platformConfig.id, existing.id))
    .returning();
  return results[0];
}

export async function countTotalFarms(db: AppDb): Promise<number> {
  const results = await db
    .select({ total: count() })
    .from(farms)
    .where(eq(farms.status, 'active'));
  return results[0]?.total ?? 0;
}

export async function countTotalMembers(db: AppDb): Promise<number> {
  const results = await db
    .select({ total: count() })
    .from(members)
    .where(eq(members.status, 'active'));
  return results[0]?.total ?? 0;
}

export async function countActiveSubscriptions(db: AppDb): Promise<number> {
  const results = await db
    .select({ total: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'));
  return results[0]?.total ?? 0;
}

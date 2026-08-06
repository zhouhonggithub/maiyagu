import { eq, and, count, desc, isNull } from 'drizzle-orm';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const { members, memberPlotBindings } = schema;

export async function listByFarm(db: AppDb, farmId: string, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(members)
      .where(eq(members.farmId, farmId))
      .orderBy(desc(members.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(members)
      .where(eq(members.farmId, farmId)),
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

export async function getById(db: AppDb, farmId: string, id: string) {
  const results = await db
    .select()
    .from(members)
    .where(and(eq(members.farmId, farmId), eq(members.id, id)))
    .limit(1);
  return results[0] ?? null;
}

export async function create(db: AppDb, data: typeof members.$inferInsert) {
  const results = await db.insert(members).values(data).returning();
  return results[0];
}

export async function update(
  db: AppDb,
  farmId: string,
  id: string,
  data: Partial<typeof members.$inferInsert>,
) {
  const results = await db
    .update(members)
    .set(data)
    .where(and(eq(members.farmId, farmId), eq(members.id, id)))
    .returning();
  return results[0] ?? null;
}

export async function listBindings(db: AppDb, memberId: string) {
  return db
    .select()
    .from(memberPlotBindings)
    .where(and(eq(memberPlotBindings.memberId, memberId), isNull(memberPlotBindings.unboundAt)));
}

export async function createBinding(db: AppDb, data: typeof memberPlotBindings.$inferInsert) {
  const results = await db.insert(memberPlotBindings).values(data).returning();
  return results[0];
}

export async function unbind(db: AppDb, bindingId: string, unboundAt: string) {
  const results = await db
    .update(memberPlotBindings)
    .set({ unboundAt })
    .where(eq(memberPlotBindings.id, bindingId))
    .returning();
  return results[0] ?? null;
}

export async function findActiveBinding(db: AppDb, memberId: string, plotId: string) {
  const results = await db
    .select()
    .from(memberPlotBindings)
    .where(
      and(
        eq(memberPlotBindings.memberId, memberId),
        eq(memberPlotBindings.plotId, plotId),
        isNull(memberPlotBindings.unboundAt),
      ),
    )
    .limit(1);
  return results[0] ?? null;
}

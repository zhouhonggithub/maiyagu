import { eq, and, count, desc } from 'drizzle-orm';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const { commands, commandReceipts } = schema;

export async function listByFarm(
  db: AppDb,
  farmId: string,
  filters: { status?: string; page: number; pageSize: number },
) {
  const { status, page, pageSize } = filters;
  const offset = (page - 1) * pageSize;

  const conditions = status
    ? and(eq(commands.farmId, farmId), eq(commands.status, status))
    : eq(commands.farmId, farmId);

  const [items, totalResult] = await Promise.all([
    db.select().from(commands).where(conditions).orderBy(desc(commands.createdAt)).limit(pageSize).offset(offset),
    db.select({ total: count() }).from(commands).where(conditions),
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

export async function listByMember(db: AppDb, memberId: string, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;

  const [items, totalResult] = await Promise.all([
    db.select().from(commands).where(eq(commands.memberId, memberId)).orderBy(desc(commands.createdAt)).limit(pageSize).offset(offset),
    db.select({ total: count() }).from(commands).where(eq(commands.memberId, memberId)),
  ]);

  return {
    data: items,
    pagination: { page, pageSize, total: totalResult[0]?.total ?? 0, totalPages: Math.ceil((totalResult[0]?.total ?? 0) / pageSize) },
  };
}

export async function getById(db: AppDb, id: string, farmId: string) {
  const results = await db
    .select()
    .from(commands)
    .where(and(eq(commands.id, id), eq(commands.farmId, farmId)))
    .limit(1);
  return results[0] ?? null;
}

export async function create(db: AppDb, data: typeof commands.$inferInsert) {
  const results = await db.insert(commands).values(data).returning();
  return results[0];
}

export async function updateStatus(
  db: AppDb,
  id: string,
  farmId: string,
  data: Partial<typeof commands.$inferInsert>,
) {
  const results = await db
    .update(commands)
    .set(data)
    .where(and(eq(commands.id, id), eq(commands.farmId, farmId)))
    .returning();
  return results[0] ?? null;
}

export async function addReceipt(db: AppDb, data: typeof commandReceipts.$inferInsert) {
  const results = await db.insert(commandReceipts).values(data).returning();
  return results[0];
}

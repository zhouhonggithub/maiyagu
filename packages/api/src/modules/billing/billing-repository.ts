import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';
import { eq, and, desc, lt, lte } from 'drizzle-orm';

// ─── Subscriptions ───────────────────────────────────────────────────────────

export async function getActiveSubscription(db: AppDb, farmId: string) {
  return db
    .select()
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.farmId, farmId),
        eq(schema.subscriptions.status, 'active'),
      ),
    )
    .then((rows) => rows[0] ?? null);
}

export async function getSubscriptionById(db: AppDb, id: string) {
  return db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.id, id))
    .then((rows) => rows[0] ?? null);
}

export async function getAllActiveSubscriptions(db: AppDb) {
  return db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.status, 'active'));
}

export async function updateSubscriptionStatus(
  db: AppDb,
  id: string,
  status: string,
  pastDueSince?: string,
) {
  const updateData: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
  if (pastDueSince) updateData.pastDueSince = pastDueSince;
  return db.update(schema.subscriptions).set(updateData).where(eq(schema.subscriptions.id, id));
}

// ─── Usage Records ───────────────────────────────────────────────────────────

export async function getUsageRecords(db: AppDb, farmId: string, billingPeriod: string) {
  return db
    .select()
    .from(schema.usageRecords)
    .where(
      and(
        eq(schema.usageRecords.farmId, farmId),
        eq(schema.usageRecords.billingPeriod, billingPeriod),
      ),
    );
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export async function createInvoice(db: AppDb, data: typeof schema.invoices.$inferInsert) {
  return db.insert(schema.invoices).values(data).returning().then((rows) => rows[0]);
}

export async function getInvoicesByFarm(db: AppDb, farmId: string) {
  return db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.farmId, farmId))
    .orderBy(desc(schema.invoices.createdAt));
}

export async function getOverdueInvoices(db: AppDb, before: string) {
  return db
    .select()
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.status, 'pending'),
        lt(schema.invoices.dueDate, before),
      ),
    );
}

export async function updateInvoiceStatus(db: AppDb, id: string, status: string) {
  return db
    .update(schema.invoices)
    .set({ status })
    .where(eq(schema.invoices.id, id));
}

export async function listAllInvoices(db: AppDb, opts: { page: number; pageSize: number }) {
  const offset = (opts.page - 1) * opts.pageSize;
  return db
    .select()
    .from(schema.invoices)
    .orderBy(desc(schema.invoices.createdAt))
    .limit(opts.pageSize)
    .offset(offset);
}

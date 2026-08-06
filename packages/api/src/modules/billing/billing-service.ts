import { generateId, nowISO } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';
import { eq } from 'drizzle-orm';
import * as billingRepo from './billing-repository';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlanInfo {
  monthlyPrice: number; // cents
  aiCallsIncluded: number;
  storageGbIncluded: number;
  aiCallOveragePrice: number; // cents per call
  storageOveragePrice: number; // cents per GB
}

interface UsageRecord {
  type: string; // 'ai_call' | 'storage' | 'bandwidth'
  quantity: number;
  unit: string;
}

interface InvoiceCalculation {
  baseFee: number; // cents
  overageCharges: number; // cents
  totalAmount: number; // cents
  breakdown: {
    aiCallsUsed: number;
    aiCallsIncluded: number;
    aiCallOverage: number;
    storageUsedGb: number;
    storageIncludedGb: number;
    storageOverage: number;
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Calculate invoice charges based on plan and usage records.
 */
export function calculateInvoice(plan: PlanInfo, usageRecords: UsageRecord[]): InvoiceCalculation {
  let aiCallsUsed = 0;
  let storageUsedGb = 0;

  for (const record of usageRecords) {
    switch (record.type) {
      case 'ai_call':
        aiCallsUsed += record.quantity;
        break;
      case 'storage':
        storageUsedGb += record.quantity;
        break;
    }
  }

  // Calculate overages
  const aiCallOverage = Math.max(0, aiCallsUsed - plan.aiCallsIncluded);
  const storageOverage = Math.max(0, storageUsedGb - plan.storageGbIncluded);

  const aiOverageCharge = Math.round(aiCallOverage * plan.aiCallOveragePrice);
  const storageOverageCharge = Math.round(storageOverage * plan.storageOveragePrice);
  const overageCharges = aiOverageCharge + storageOverageCharge;
  const totalAmount = plan.monthlyPrice + overageCharges;

  return {
    baseFee: plan.monthlyPrice,
    overageCharges,
    totalAmount,
    breakdown: {
      aiCallsUsed,
      aiCallsIncluded: plan.aiCallsIncluded,
      aiCallOverage,
      storageUsedGb,
      storageIncludedGb: plan.storageGbIncluded,
      storageOverage,
    },
  };
}

/**
 * Generate an invoice for a farm based on its subscription and usage.
 */
export async function generateInvoice(db: AppDb, farmId: string) {
  // 1. Get active subscription
  const subscription = await billingRepo.getActiveSubscription(db, farmId);
  if (!subscription) return null;

  // 2. Get plan details
  const plan = await db
    .select()
    .from(schema.farmPlans)
    .where(eq(schema.farmPlans.id, subscription.planId))
    .then((rows) => rows[0]);

  if (!plan) return null;

  // 3. Determine billing period (previous month)
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const billingPeriod = prevMonth.toISOString().slice(0, 7); // YYYY-MM

  // 4. Get usage records for the period
  const usage = await billingRepo.getUsageRecords(db, farmId, billingPeriod);

  // 5. Calculate invoice
  const calculation = calculateInvoice(plan, usage);

  // 6. Due date: 15 days from now
  const dueDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();

  // 7. Create invoice record
  const invoice = await billingRepo.createInvoice(db, {
    id: generateId(),
    farmId,
    subscriptionId: subscription.id,
    billingPeriod,
    baseFee: calculation.baseFee,
    overageCharges: calculation.overageCharges,
    totalAmount: calculation.totalAmount,
    status: 'pending',
    dueDate,
    createdAt: nowISO(),
  });

  return invoice;
}

/**
 * Check overdue invoices and update subscription status.
 * - >7 days overdue → mark subscription as 'past_due'
 * - >30 days overdue → suspend farm
 */
export async function checkOverdue(db: AppDb) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Get all pending invoices past due date
  const overdueInvoices = await billingRepo.getOverdueInvoices(db, now.toISOString());

  for (const invoice of overdueInvoices) {
    const dueDate = new Date(invoice.dueDate);
    const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));

    if (daysPastDue > 30) {
      // Suspend farm
      await db
        .update(schema.farms)
        .set({ status: 'suspended', updatedAt: nowISO() })
        .where(eq(schema.farms.id, invoice.farmId));

      await billingRepo.updateInvoiceStatus(db, invoice.id, 'overdue');
      await billingRepo.updateSubscriptionStatus(
        db,
        invoice.subscriptionId,
        'past_due',
        invoice.dueDate,
      );
    } else if (daysPastDue > 7) {
      // Mark subscription as past_due
      await billingRepo.updateSubscriptionStatus(
        db,
        invoice.subscriptionId,
        'past_due',
        invoice.dueDate,
      );

      await billingRepo.updateInvoiceStatus(db, invoice.id, 'overdue');
    }
  }
}

import type { Env } from '../env';
import { createDb } from '../shared/db';
import * as billingService from '../modules/billing/billing-service';
import * as billingRepo from '../modules/billing/billing-repository';

/**
 * Monthly billing cycle cron handler.
 * - Generates invoices for all active farm subscriptions
 * - Checks overdue invoices and applies consequences
 */
export async function handleBillingCycleCron(env: Env) {
  const db = createDb(env.DB);

  // 1. Generate invoices for all active subscriptions
  const activeSubscriptions = await billingRepo.getAllActiveSubscriptions(db);

  let generated = 0;
  let failed = 0;

  for (const subscription of activeSubscriptions) {
    try {
      const invoice = await billingService.generateInvoice(db, subscription.farmId);
      if (invoice) generated++;
    } catch (err) {
      console.error(`Invoice generation failed for farm ${subscription.farmId}:`, err);
      failed++;
    }
  }

  console.log(`Billing cycle: generated ${generated} invoices, ${failed} failures`);

  // 2. Check overdue invoices
  await billingService.checkOverdue(db);
}

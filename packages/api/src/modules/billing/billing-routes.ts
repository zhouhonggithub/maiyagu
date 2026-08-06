import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import * as billingRepo from './billing-repository';

export const billingRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// GET /billing/invoices — list all invoices (admin)
billingRoutes.get(
  '/invoices',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(20),
    }),
  ),
  async (c) => {
    const db = createDb(c.env.DB);
    const { page, pageSize } = c.req.valid('query');

    const invoices = await billingRepo.listAllInvoices(db, { page, pageSize });

    return c.json({ success: true, data: invoices });
  },
);

// GET /billing/invoices/:farmId — get invoices for a specific farm
billingRoutes.get('/invoices/:farmId', async (c) => {
  const db = createDb(c.env.DB);
  const farmId = c.req.param('farmId');

  const invoices = await billingRepo.getInvoicesByFarm(db, farmId);

  return c.json({ success: true, data: invoices });
});

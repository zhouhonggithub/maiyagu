import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import * as notifyService from './service';

export const notifyRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// GET /notifications — list notifications for the authenticated member
notifyRoutes.get(
  '/',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(20),
    }),
  ),
  async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.get('userId');
    const { page, pageSize } = c.req.valid('query');

    const notifications = await notifyService.listNotifications(db, userId, { page, pageSize });
    const unreadCount = await notifyService.getUnreadCount(db, userId);

    return c.json({
      success: true,
      data: { notifications, unreadCount },
    });
  },
);

// PUT /notifications/:id/read — mark a notification as read
notifyRoutes.put('/:id/read', async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get('userId');
  const notificationId = c.req.param('id');

  await notifyService.markAsRead(db, notificationId, userId);

  return c.json({ success: true, data: { id: notificationId, status: 'read' } });
});

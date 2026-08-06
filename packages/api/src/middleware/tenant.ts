import { Context, Next } from 'hono';
import { ForbiddenError } from '@ai-farm/shared';

/**
 * Tenant isolation middleware.
 * Extracts farmId from JWT context and makes it available for downstream queries.
 * Platform admins bypass tenant filter (they can access all farms).
 */
export function tenantIsolation() {
  return async (c: Context, next: Next) => {
    const userRole = c.get('userRole') as string | undefined;

    // Platform admins can access all farms — no tenant filter needed
    // They may optionally specify a farm via query param for admin operations
    if (userRole === 'platform_admin') {
      const farmIdParam = c.req.param('farmId') || c.req.query('farmId');
      if (farmIdParam) {
        c.set('farmId', farmIdParam);
      }
      await next();
      return;
    }

    // All other roles must have a farmId in their JWT
    const farmId = c.get('farmId') as string | undefined;
    if (!farmId) {
      throw new ForbiddenError('Farm context required for this operation');
    }

    // farmId is already set in context by authMiddleware
    await next();
  };
}

// Keep backward-compatible alias
export const tenantIsolationMiddleware = tenantIsolation;

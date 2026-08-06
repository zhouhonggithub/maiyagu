import { Context, Next } from 'hono';
import { ForbiddenError } from '@ai-farm/shared';
import type { Role } from '@ai-farm/shared';

/**
 * RBAC middleware factory.
 * Creates a middleware that checks if the user's role is in the allowed list.
 */
export function requireRole(...allowedRoles: Role[]) {
  return async (c: Context, next: Next) => {
    const userRole = c.get('userRole') as Role | undefined;

    if (!userRole) {
      throw new ForbiddenError('No role found in authentication context');
    }

    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenError('Insufficient permissions for this resource');
    }

    await next();
  };
}

/**
 * Route-group level RBAC middleware.
 * Automatically determines required roles based on URL prefix.
 */
export function rbacMiddleware() {
  return async (c: Context, next: Next) => {
    const path = c.req.path;
    const userRole = c.get('userRole') as Role | undefined;

    // Skip for public endpoints (auth middleware already skipped these)
    if (path.startsWith('/api/v1/public') || path === '/api/v1/health') {
      await next();
      return;
    }

    if (!userRole) {
      throw new ForbiddenError('Authentication required');
    }

    // Admin endpoints: platform_admin only
    if (path.startsWith('/api/v1/admin')) {
      if (userRole !== 'platform_admin') {
        throw new ForbiddenError('Admin access required');
      }
    }
    // Farm endpoints: farm_owner and farm_worker
    else if (path.startsWith('/api/v1/farm')) {
      if (userRole !== 'farm_owner' && userRole !== 'farm_worker') {
        throw new ForbiddenError('Farm access required');
      }
    }
    // App endpoints: member
    else if (path.startsWith('/api/v1/app')) {
      if (userRole !== 'member') {
        throw new ForbiddenError('Member access required');
      }
    }

    await next();
  };
}

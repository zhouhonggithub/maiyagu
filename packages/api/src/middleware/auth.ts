import { Context, Next } from 'hono';
import { verify, sign } from 'hono/jwt';
import { UnauthorizedError } from '@ai-farm/shared';
import type { Env } from '../env';

export interface JwtPayload {
  sub: string;       // user ID
  role: 'platform_admin' | 'farm_owner' | 'farm_worker' | 'member';
  farmId?: string;   // present for farm roles and members
  iat: number;
  exp: number;
}

/**
 * JWT Authentication middleware.
 * Verifies the Bearer token using hono/jwt and injects the decoded payload into context.
 * Skips verification for paths matching /api/v1/public/*.
 */
export function authMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const path = c.req.path;

    // Skip auth for public endpoints and health check
    if (path.startsWith('/api/v1/public') || path === '/api/v1/health') {
      await next();
      return;
    }

    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const payload = await verify(token, c.env.JWT_SECRET) as unknown as JwtPayload;

      // Check expiration explicitly (hono/jwt also checks, belt-and-suspenders)
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new UnauthorizedError('Token expired');
      }

      c.set('jwtPayload', payload);
      c.set('userId', payload.sub);
      c.set('userRole', payload.role);
      if (payload.farmId) {
        c.set('farmId', payload.farmId);
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired token');
    }

    await next();
  };
}

/**
 * Sign a JWT token using hono/jwt with HMAC SHA-256.
 */
export async function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSec: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSec,
  };

  return await sign(fullPayload, secret);
}

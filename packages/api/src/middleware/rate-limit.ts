import { Context, Next } from 'hono';
import type { Env } from '../env';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  admin: { maxRequests: 100, windowMs: 60_000 },
  farm: { maxRequests: 200, windowMs: 60_000 },
  app: { maxRequests: 60, windowMs: 60_000 },
  public: { maxRequests: 30, windowMs: 60_000 },
};

// Simple in-memory rate limiter (per-isolate, resets on cold start)
// For production, use Cloudflare Rate Limiting or D1-backed counters
const counters = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const path = c.req.path;
    const farmId = c.get('farmId') as string | undefined;
    const clientId = farmId || c.req.header('cf-connecting-ip') || 'anonymous';

    // Determine rate limit config based on path prefix
    let config = RATE_LIMIT_CONFIGS.app;
    if (path.startsWith('/api/v1/admin')) config = RATE_LIMIT_CONFIGS.admin;
    else if (path.startsWith('/api/v1/farm')) config = RATE_LIMIT_CONFIGS.farm;
    else if (path.startsWith('/api/v1/public')) config = RATE_LIMIT_CONFIGS.public;

    const key = `${clientId}:${path.split('/').slice(0, 4).join('/')}`;
    const now = Date.now();
    const entry = counters.get(key);

    if (!entry || now > entry.resetAt) {
      counters.set(key, { count: 1, resetAt: now + config.windowMs });
    } else {
      entry.count++;
      if (entry.count > config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        c.header('Retry-After', retryAfter.toString());
        return c.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests. Please try again later.',
            },
          },
          429,
        );
      }
    }

    await next();
  };
}

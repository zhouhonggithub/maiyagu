import { cors } from 'hono/cors';

export function createCorsMiddleware() {
  return cors({
    origin: (origin) => {
      // In production, validate against allowed origins
      // For development, allow localhost origins
      const allowedPatterns = [
        /^http:\/\/localhost:\d+$/,
        /^https:\/\/.*\.pages\.dev$/,
        /^https:\/\/.*\.workers\.dev$/,
      ];
      if (origin && allowedPatterns.some(p => p.test(origin))) {
        return origin;
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposeHeaders: ['X-Total-Count', 'X-Request-Id'],
    maxAge: 3600,
    credentials: true,
  });
}

import { Hono } from 'hono';
import { ValidationError } from '@ai-farm/shared';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import { loginSchema, passwordLoginSchema, wechatLoginSchema, refreshSchema } from './schema';
import * as authService from './service';

const authRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /login — SMS code login
 * Public endpoint. Verifies SMS code and returns token pair.
 */
authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const result = loginSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid login request', result.error.flatten().fieldErrors);
  }

  const { phone, code } = result.data;
  const db = createDb(c.env.DB);
  const authResult = await authService.login(db, c.env.JWT_SECRET, phone, code);

  return c.json({
    success: true,
    data: authResult,
  });
});

/**
 * POST /login/password — Email + password login
 * Public endpoint for admin/owner accounts.
 */
authRoutes.post('/login/password', async (c) => {
  const body = await c.req.json();
  const result = passwordLoginSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid login request', result.error.flatten().fieldErrors);
  }

  const { email, password } = result.data;
  const db = createDb(c.env.DB);
  const authResult = await authService.loginWithPassword(db, c.env.JWT_SECRET, email, password);

  return c.json({
    success: true,
    data: authResult,
  });
});

/**
 * POST /wechat — WeChat OAuth login
 * Public endpoint. Exchanges WeChat code for user session.
 */
authRoutes.post('/wechat', async (c) => {
  const body = await c.req.json();
  const result = wechatLoginSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid WeChat login request', result.error.flatten().fieldErrors);
  }

  const { code } = result.data;
  const db = createDb(c.env.DB);
  const authResult = await authService.loginWithWechat(
    db,
    c.env.JWT_SECRET,
    code,
    c.env.WECHAT_APP_ID,
    c.env.WECHAT_APP_SECRET,
  );

  return c.json({
    success: true,
    data: authResult,
  });
});

/**
 * POST /refresh — Refresh access token
 * Public endpoint. Validates refresh token, rotates it, issues new pair.
 */
authRoutes.post('/refresh', async (c) => {
  const body = await c.req.json();
  const result = refreshSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid refresh request', result.error.flatten().fieldErrors);
  }

  const { refreshToken } = result.data;
  const db = createDb(c.env.DB);
  const tokens = await authService.refreshToken(db, c.env.JWT_SECRET, refreshToken);

  return c.json({
    success: true,
    data: tokens,
  });
});

/**
 * POST /logout — Revoke refresh token
 * Public endpoint. Invalidates the provided refresh token.
 */
authRoutes.post('/logout', async (c) => {
  const body = await c.req.json();
  const result = refreshSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid logout request', result.error.flatten().fieldErrors);
  }

  const { refreshToken } = result.data;
  const db = createDb(c.env.DB);
  await authService.logout(db, refreshToken);

  return c.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
});

export { authRoutes };

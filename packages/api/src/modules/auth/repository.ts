import { eq } from 'drizzle-orm';
import type { AppDb } from '../../shared/db';
import { schema } from '../../shared/db';

const { users, refreshTokens } = schema;

// ─── User Queries ────────────────────────────────────────────────────────────

export async function findUserByPhone(db: AppDb, phone: string) {
  const results = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  return results[0] ?? null;
}

export async function findUserByEmail(db: AppDb, email: string) {
  const results = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return results[0] ?? null;
}

export async function findUserByWechatOpenId(db: AppDb, openId: string) {
  const results = await db
    .select()
    .from(users)
    .where(eq(users.wechatOpenId, openId))
    .limit(1);
  return results[0] ?? null;
}

export async function findUserById(db: AppDb, id: string) {
  const results = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return results[0] ?? null;
}

export interface CreateUserData {
  id: string;
  phone?: string;
  email?: string;
  wechatOpenId?: string;
  wechatUnionId?: string;
  nickname?: string;
  avatarUrl?: string;
  passwordHash?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export async function createUser(db: AppDb, userData: CreateUserData) {
  const results = await db
    .insert(users)
    .values({
      id: userData.id,
      phone: userData.phone ?? null,
      email: userData.email ?? null,
      wechatOpenId: userData.wechatOpenId ?? null,
      wechatUnionId: userData.wechatUnionId ?? null,
      nickname: userData.nickname ?? null,
      avatarUrl: userData.avatarUrl ?? null,
      passwordHash: userData.passwordHash ?? null,
      role: userData.role,
      status: 'active',
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    })
    .returning();
  return results[0];
}

// ─── Refresh Token Queries ───────────────────────────────────────────────────

export async function createRefreshToken(
  db: AppDb,
  id: string,
  userId: string,
  tokenHash: string,
  expiresAt: string,
  createdAt: string,
) {
  const results = await db
    .insert(refreshTokens)
    .values({
      id,
      userId,
      tokenHash,
      expiresAt,
      createdAt,
    })
    .returning();
  return results[0];
}

export async function findRefreshToken(db: AppDb, tokenHash: string) {
  const results = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);
  return results[0] ?? null;
}

export async function deleteRefreshToken(db: AppDb, id: string) {
  await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.id, id));
}

export async function deleteAllRefreshTokens(db: AppDb, userId: string) {
  await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.userId, userId));
}

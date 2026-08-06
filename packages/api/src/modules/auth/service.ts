import { generateId, nowISO, UnauthorizedError } from '@ai-farm/shared';
import { signJwt } from '../../middleware/auth';
import type { JwtPayload } from '../../middleware/auth';
import type { AppDb } from '../../shared/db';
import * as authRepo from './repository';

// ─── Constants ───────────────────────────────────────────────────────────────

const ACCESS_TOKEN_EXPIRY_SEC = 2 * 60 * 60;       // 2 hours
const REFRESH_TOKEN_EXPIRY_SEC = 7 * 24 * 60 * 60; // 7 days

// ─── Token Pair Response ─────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: {
    id: string;
    phone?: string | null;
    email?: string | null;
    nickname?: string | null;
    avatarUrl?: string | null;
    role: string;
  };
  tokens: TokenPair;
}

// ─── SMS Login ───────────────────────────────────────────────────────────────

/**
 * Login with phone number + SMS verification code.
 * If the user does not exist, creates a new account with 'member' role.
 */
export async function login(
  db: AppDb,
  jwtSecret: string,
  phone: string,
  code: string,
): Promise<AuthResult> {
  // TODO: Replace with actual SMS verification service (e.g., Aliyun SMS)
  // For development, accept code "888888" as valid
  const isValidCode = await verifySmsCode(phone, code);
  if (!isValidCode) {
    throw new UnauthorizedError('Invalid verification code');
  }

  // Find or create user
  let user = await authRepo.findUserByPhone(db, phone);
  if (!user) {
    const now = nowISO();
    user = await authRepo.createUser(db, {
      id: generateId(),
      phone,
      role: 'member',
      createdAt: now,
      updatedAt: now,
    }) ?? null;
  }

  if (!user) {
    throw new UnauthorizedError('Failed to authenticate user');
  }

  const tokens = await issueTokenPair(db, jwtSecret, user.id, user.role as JwtPayload['role']);

  return {
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
    tokens,
  };
}

// ─── Password Login (Admin) ──────────────────────────────────────────────────

/**
 * Login with email + password. Intended for admin/owner accounts.
 */
export async function loginWithPassword(
  db: AppDb,
  jwtSecret: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const user = await authRepo.findUserByEmail(db, email);
  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokens = await issueTokenPair(db, jwtSecret, user.id, user.role as JwtPayload['role']);

  return {
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
    tokens,
  };
}

// ─── WeChat Login ────────────────────────────────────────────────────────────

/**
 * Login with WeChat OAuth authorization code.
 * Exchanges code for openId, then finds or creates the user.
 */
export async function loginWithWechat(
  db: AppDb,
  jwtSecret: string,
  code: string,
  wechatAppId?: string,
  wechatAppSecret?: string,
): Promise<AuthResult> {
  // Exchange code for WeChat user info
  const wechatUser = await exchangeWechatCode(code, wechatAppId, wechatAppSecret);

  // Find or create user
  let user = await authRepo.findUserByWechatOpenId(db, wechatUser.openId);
  if (!user) {
    const now = nowISO();
    user = await authRepo.createUser(db, {
      id: generateId(),
      wechatOpenId: wechatUser.openId,
      wechatUnionId: wechatUser.unionId,
      nickname: wechatUser.nickname,
      avatarUrl: wechatUser.avatarUrl,
      role: 'member',
      createdAt: now,
      updatedAt: now,
    }) ?? null;
  }

  if (!user) {
    throw new UnauthorizedError('Failed to authenticate via WeChat');
  }

  const tokens = await issueTokenPair(db, jwtSecret, user.id, user.role as JwtPayload['role']);

  return {
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
    tokens,
  };
}

// ─── Refresh Token ───────────────────────────────────────────────────────────

/**
 * Validate a refresh token, rotate it, and issue a new token pair.
 */
export async function refreshToken(
  db: AppDb,
  jwtSecret: string,
  token: string,
): Promise<TokenPair> {
  const tokenHash = await hashToken(token);
  const stored = await authRepo.findRefreshToken(db, tokenHash);

  if (!stored) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Check expiration
  if (new Date(stored.expiresAt) < new Date()) {
    await authRepo.deleteRefreshToken(db, stored.id);
    throw new UnauthorizedError('Refresh token expired');
  }

  // Revoke old token (rotation)
  await authRepo.deleteRefreshToken(db, stored.id);

  // Find user to get current role
  const user = await authRepo.findUserById(db, stored.userId);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Issue new pair
  return await issueTokenPair(db, jwtSecret, user.id, user.role as JwtPayload['role']);
}

// ─── Logout ──────────────────────────────────────────────────────────────────

/**
 * Revoke a specific refresh token (logout from a single session).
 */
export async function logout(
  db: AppDb,
  refreshTokenStr: string,
): Promise<void> {
  const tokenHash = await hashToken(refreshTokenStr);
  const stored = await authRepo.findRefreshToken(db, tokenHash);
  if (stored) {
    await authRepo.deleteRefreshToken(db, stored.id);
  }
}

/**
 * Revoke all refresh tokens for a user (logout from all sessions).
 */
export async function logoutAll(
  db: AppDb,
  userId: string,
): Promise<void> {
  await authRepo.deleteAllRefreshTokens(db, userId);
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Issue an access/refresh token pair and persist the refresh token hash.
 */
async function issueTokenPair(
  db: AppDb,
  jwtSecret: string,
  userId: string,
  role: JwtPayload['role'],
  farmId?: string,
): Promise<TokenPair> {
  // Sign access token
  const accessToken = await signJwt(
    { sub: userId, role, ...(farmId ? { farmId } : {}) },
    jwtSecret,
    ACCESS_TOKEN_EXPIRY_SEC,
  );

  // Generate opaque refresh token
  const rawRefreshToken = generateId() + generateId(); // 42 chars
  const tokenHash = await hashToken(rawRefreshToken);
  const now = nowISO();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SEC * 1000).toISOString();

  await authRepo.createRefreshToken(db, generateId(), userId, tokenHash, expiresAt, now);

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
  };
}

/**
 * Hash a token using SHA-256 for secure storage.
 */
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify SMS code. Placeholder — replace with actual SMS provider integration.
 */
async function verifySmsCode(_phone: string, code: string): Promise<boolean> {
  // TODO: Integrate with Aliyun SMS / Tencent Cloud SMS verification
  // For development, accept "888888" as a valid code
  if (code === '888888') return true;
  return false;
}

/**
 * Verify password against stored hash using Web Crypto PBKDF2.
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // storedHash format: salt:hash (both hex-encoded)
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = hexToBytes(saltHex);
  const expectedHash = hexToBytes(hashHex);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  );

  const derived = new Uint8Array(derivedBits);

  // Constant-time comparison
  if (derived.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) {
    diff |= derived[i]! ^ expectedHash[i]!;
  }
  return diff === 0;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Exchange WeChat authorization code for user info.
 * Placeholder — replace with actual WeChat API integration.
 */
interface WechatUserInfo {
  openId: string;
  unionId?: string;
  nickname?: string;
  avatarUrl?: string;
}

async function exchangeWechatCode(
  _code: string,
  _appId?: string,
  _appSecret?: string,
): Promise<WechatUserInfo> {
  // TODO: Implement WeChat OAuth code exchange
  // 1. POST https://api.weixin.qq.com/sns/jscode2session (Mini Program)
  //    or GET https://api.weixin.qq.com/sns/oauth2/access_token (H5/App)
  // 2. Use returned session_key / access_token to get user info
  throw new UnauthorizedError('WeChat login is not yet configured');
}

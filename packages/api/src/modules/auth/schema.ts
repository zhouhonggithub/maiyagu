import { z } from 'zod';

/**
 * Login with phone number + SMS verification code.
 */
export const loginSchema = z.object({
  phone: z
    .string()
    .min(11, 'Phone number must be at least 11 digits')
    .max(15, 'Phone number too long')
    .regex(/^\d+$/, 'Phone number must contain only digits'),
  code: z
    .string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must be 6 digits'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Login with email + password (for admin accounts).
 */
export const passwordLoginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;

/**
 * Login with WeChat OAuth authorization code.
 */
export const wechatLoginSchema = z.object({
  code: z
    .string()
    .min(1, 'WeChat authorization code is required')
    .max(512, 'Authorization code too long'),
});

export type WechatLoginInput = z.infer<typeof wechatLoginSchema>;

/**
 * Refresh token to get a new access token.
 */
export const refreshSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

export type RefreshInput = z.infer<typeof refreshSchema>;

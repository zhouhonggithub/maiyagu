import type { FarmStatus, CommandStatus, Role } from './types.js';

// ─── Farm Status Transitions ─────────────────────────────────────────────────

export const FARM_STATUS_TRANSITIONS: Record<FarmStatus, FarmStatus[]> = {
  pending: ['active'],
  active: ['suspended'],
  suspended: ['active', 'deleted'],
  deleted: [],
};

// ─── Command Status Transitions ──────────────────────────────────────────────

export const COMMAND_STATUS_TRANSITIONS: Record<CommandStatus, CommandStatus[]> = {
  pending: ['accepted', 'rejected'],
  accepted: ['executing'],
  executing: ['done'],
  done: [],
  rejected: [],
};

// ─── Role Permissions ────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  platform_admin: ['/**'],
  farm_owner: [
    '/farms/:farmId/**',
    '/farms/:farmId/members/**',
    '/farms/:farmId/commands/**',
    '/farms/:farmId/cameras/**',
    '/farms/:farmId/plots/**',
    '/subscriptions/**',
  ],
  farm_worker: [
    '/farms/:farmId/commands/**',
    '/farms/:farmId/cameras/**',
    '/farms/:farmId/plots/**',
  ],
  member: [
    '/farms/:farmId/commands/create',
    '/farms/:farmId/cameras/view',
    '/farms/:farmId/plots/view',
    '/notifications/**',
  ],
};

// ─── Command Types ───────────────────────────────────────────────────────────

export const COMMAND_TYPES = [
  'water',
  'fertilize',
  'harvest',
  'inspect',
  'custom',
] as const;

export type CommandType = (typeof COMMAND_TYPES)[number];

// ─── Media Limits ────────────────────────────────────────────────────────────

export const MEDIA_LIMITS = {
  imageMaxBytes: 10 * 1024 * 1024, // 10 MB
  videoMaxBytes: 100 * 1024 * 1024, // 100 MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ],
} as const;

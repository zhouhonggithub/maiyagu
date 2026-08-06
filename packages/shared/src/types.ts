// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ─── TimeWave ────────────────────────────────────────────────────────────────

export interface TimeWaveEntry {
  timeRange: string;
  intervalSec: number;
}

export type TimeWaveConfig = TimeWaveEntry[];

// ─── Role Types ──────────────────────────────────────────────────────────────

export type Role = 'platform_admin' | 'farm_owner' | 'farm_worker' | 'member';

// ─── Status Types ────────────────────────────────────────────────────────────

export type FarmStatus = 'pending' | 'active' | 'suspended' | 'deleted';

export type CommandStatus = 'pending' | 'accepted' | 'rejected' | 'executing' | 'done';

export type MemberStatus = 'active' | 'inactive' | 'banned';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';

export type CameraStatus = 'online' | 'offline' | 'error';

export type PlotStatus = 'idle' | 'planted' | 'growing' | 'harvestable';

export type NotificationStatus = 'unread' | 'read' | 'archived';

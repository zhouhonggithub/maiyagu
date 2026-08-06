# Design Document: AI Farm SaaS Platform

## Overview

This document details the technical architecture for the AI Farm SaaS Platform — a multi-tenant system serving CSA/shared farms in China. The platform follows a three-tier model (Platform → Farm → Member) deployed on Cloudflare's edge infrastructure using a modular monolith pattern with Hono as the API framework.

## Architecture

### System Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                         Client Layer                              │
├────────────────┬──────────────────┬──────────────────────────────┤
│  Admin Portal  │   Farm Portal    │     Member App (vinext)      │
│  (Next.js)     │   (Next.js)      │   (React 19 + Three.js)     │
└───────┬────────┴────────┬─────────┴──────────────┬───────────────┘
        │                 │                        │
        ▼                 ▼                        ▼
┌──────────────────────────────────────────────────────────────────┐
│              Cloudflare Workers (Hono API Gateway)                │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────────────┐ │
│   │  Auth   │ │  RBAC   │ │ Tenant  │ │  Rate Limit / CORS   │ │
│   │Middleware│ │Middleware│ │Isolation│ │     Middleware        │ │
│   └─────────┘ └─────────┘ └─────────┘ └──────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────────────────────────────────────────────┐
│                    Modular Monolith Service Layer                 │
├────────┬────────┬────────┬─────────┬─────────┬─────────┬────────┤
│  Auth  │  Farm  │ Device │  Plot   │ Member  │ Command │ Media  │
├────────┼────────┼────────┼─────────┼─────────┼─────────┼────────┤
│   AI   │ Notify │Billing │Scheduler│  Queue  │  D.O.   │ Shared │
└────────┴────────┴────────┴─────────┴─────────┴─────────┴────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                      Data & Infrastructure                        │
├──────────────┬──────────────┬──────────────┬─────────────────────┤
│  D1 (SQLite) │   R2 (Files) │   Queues     │  Durable Objects    │
└──────────────┴──────────────┴──────────────┴─────────────────────┘
```

### Module Architecture (per module)

Each module follows a three-layer pattern:

```
packages/api/src/modules/{module}/
├── routes.ts        # Hono route definitions
├── service.ts       # Business logic
├── repository.ts    # Data access (Drizzle queries)
├── schema.ts        # Zod validation schemas
└── types.ts         # Module-specific types
```

### Full Project Structure

```
packages/api/src/
├── modules/
│   ├── auth/
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   ├── schema.ts
│   │   └── types.ts
│   ├── farm/
│   ├── device/
│   ├── plot/
│   ├── member/
│   ├── command/
│   ├── media/
│   ├── ai/
│   ├── notify/
│   └── billing/
├── middleware/
│   ├── auth.ts           # JWT verification
│   ├── rbac.ts           # Role-based access control
│   ├── tenant.ts         # farm_id injection
│   ├── error-handler.ts  # Standardized error responses
│   └── rate-limit.ts     # Per-tenant rate limiting
├── shared/
│   ├── db/
│   │   ├── schema.ts     # All Drizzle table definitions
│   │   ├── index.ts      # DB connection factory
│   │   └── migrations/
│   ├── types.ts          # Shared types (ApiResponse, Pagination)
│   ├── errors.ts         # Custom error classes
│   └── utils.ts          # Common utilities
├── scheduler/
│   ├── frame-capture.ts  # Cron: frame capture orchestration
│   ├── member-expiry.ts  # Cron: subscription expiry check
│   └── billing-cycle.ts  # Cron: billing period end processing
├── queue/
│   ├── llm-analysis.ts   # Queue consumer: AI analysis
│   ├── notification.ts   # Queue consumer: notification delivery
│   └── media-process.ts  # Queue consumer: thumbnail generation
├── durable-objects/
│   ├── plot-realtime.ts  # WebSocket per-plot real-time updates
│   └── farm-session.ts   # Farm session state management
└── index.ts              # Hono app entry with module registration
```

## Data Models

All tables use Cloudflare D1 (SQLite) via Drizzle ORM. Multi-tenant isolation enforced via `farm_id` on all business tables.

```typescript
import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================================
// Platform Layer
// ============================================================

export const platformConfig = sqliteTable('platform_config', {
  id: text('id').primaryKey(),
  globalTimeWaveConfig: text('global_time_wave_config').notNull(), // JSON
  defaultModelVersionId: text('default_model_version_id'),
  updatedAt: text('updated_at').notNull(),
});

export const aiModelVersions = sqliteTable('ai_model_versions', {
  id: text('id').primaryKey(),
  modelName: text('model_name').notNull(),
  versionIdentifier: text('version_identifier').notNull(),
  adapterType: text('adapter_type').notNull(), // 'qwen_vl' | 'gpt4v' | 'custom'
  endpointUrl: text('endpoint_url').notNull(),
  status: text('status').notNull(), // 'active' | 'deprecated' | 'testing'
  testingPercentage: integer('testing_percentage').default(0),
  config: text('config'), // JSON adapter-specific config
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const farmPlans = sqliteTable('farm_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  memberMin: integer('member_min').notNull(),
  memberMax: integer('member_max'), // null = unlimited
  monthlyPrice: integer('monthly_price').notNull(), // cents
  aiCallsIncluded: integer('ai_calls_included').notNull(),
  storageGbIncluded: integer('storage_gb_included').notNull(),
  aiCallOveragePrice: integer('ai_call_overage_price').notNull(), // cents per call
  storageOveragePrice: integer('storage_overage_price').notNull(), // cents per GB
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const assetLibrary = sqliteTable('asset_library', {
  id: text('id').primaryKey(),
  category: text('category').notNull(), // 'crop' | 'visitor' | 'status'
  displayName: text('display_name').notNull(),
  imageUrl: text('image_url').notNull(),
  mappingKeywords: text('mapping_keywords').notNull(), // JSON array of strings
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

// ============================================================
// Auth & Users Layer
// ============================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  phone: text('phone'),
  email: text('email'),
  wechatOpenId: text('wechat_open_id'),
  wechatUnionId: text('wechat_union_id'),
  nickname: text('nickname'),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'), // only for admin accounts
  totpSecret: text('totp_secret'), // only for admin accounts
  role: text('role').notNull(), // 'platform_admin' | 'farm_owner' | 'farm_worker' | 'member'
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

// ============================================================
// Farm Layer
// ============================================================

export const farms = sqliteTable('farms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  province: text('province').notNull(),
  city: text('city').notNull(),
  district: text('district').notNull(),
  address: text('address'),
  areaSqm: real('area_sqm'),
  description: text('description'),
  logoUrl: text('logo_url'),
  status: text('status').notNull().default('pending'), // 'pending'|'active'|'suspended'|'deleted'
  planId: text('plan_id').references(() => farmPlans.id),
  timeWaveConfigOverride: text('time_wave_config_override'), // JSON, null = use global
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const farmStaff = sqliteTable('farm_staff', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').notNull(), // 'farm_owner' | 'farm_worker'
  nickname: text('nickname'),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  planId: text('plan_id').notNull().references(() => farmPlans.id),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  status: text('status').notNull().default('active'), // 'active'|'past_due'|'canceled'
  autoRenew: integer('auto_renew', { mode: 'boolean' }).default(true),
  pastDueSince: text('past_due_since'), // timestamp when became past_due
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const usageRecords = sqliteTable('usage_records', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  type: text('type').notNull(), // 'ai_call' | 'storage' | 'bandwidth'
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(), // 'count' | 'gb' | 'gb_transfer'
  billingPeriod: text('billing_period').notNull(), // 'YYYY-MM'
  recordedAt: text('recorded_at').notNull(),
});

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  subscriptionId: text('subscription_id').notNull().references(() => subscriptions.id),
  billingPeriod: text('billing_period').notNull(),
  baseFee: integer('base_fee').notNull(), // cents
  overageCharges: integer('overage_charges').notNull().default(0),
  totalAmount: integer('total_amount').notNull(),
  status: text('status').notNull().default('pending'), // 'pending'|'paid'|'overdue'
  dueDate: text('due_date').notNull(),
  paidAt: text('paid_at'),
  createdAt: text('created_at').notNull(),
});

// ============================================================
// Device Layer
// ============================================================

export const cameras = sqliteTable('cameras', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  name: text('name').notNull(),
  protocol: text('protocol').notNull(), // 'ezviz_cloud' | 'rtsp' | 'custom_stream'
  streamUrl: text('stream_url'),
  deviceSerial: text('device_serial'),
  credentials: text('credentials'), // encrypted JSON
  status: text('status').notNull().default('offline'), // 'online'|'weak'|'offline'
  lastHeartbeat: text('last_heartbeat'),
  frameWidth: integer('frame_width'),
  frameHeight: integer('frame_height'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const coverageZones = sqliteTable('coverage_zones', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  cameraId: text('camera_id').notNull().references(() => cameras.id),
  name: text('name').notNull(),
  polygonPoints: text('polygon_points').notNull(), // JSON [[x,y], ...]
  areaSqm: real('area_sqm'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ============================================================
// Plot Layer
// ============================================================

export const plots = sqliteTable('plots', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  coverageZoneId: text('coverage_zone_id').references(() => coverageZones.id), // nullable for no-camera mode
  name: text('name').notNull(),
  code: text('code').notNull(), // 'A1', 'B2', etc.
  polygonPoints: text('polygon_points').notNull(), // JSON [[x,y], ...]
  areaSqm: real('area_sqm'),
  soilType: text('soil_type'),
  irrigationType: text('irrigation_type'),
  currentCrop: text('current_crop'),
  cropPlantedAt: text('crop_planted_at'),
  status: text('status').notNull().default('vacant'), // 'vacant'|'occupied'|'maintenance'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const plotAnalyses = sqliteTable('plot_analyses', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  plotId: text('plot_id').notNull().references(() => plots.id),
  frameUrl: text('frame_url').notNull(),
  modelVersionId: text('model_version_id').notNull().references(() => aiModelVersions.id),
  cropStatus: text('crop_status'), // JSON
  growthStage: text('growth_stage'),
  healthScore: integer('health_score'), // 0-100
  visitorDetections: text('visitor_detections'), // JSON array
  anomalyFlags: text('anomaly_flags'), // JSON array
  confidenceScores: text('confidence_scores'), // JSON
  processingDurationMs: integer('processing_duration_ms'),
  contextFrameCount: integer('context_frame_count'),
  analyzedAt: text('analyzed_at').notNull(),
});

// ============================================================
// Member Layer
// ============================================================

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  userId: text('user_id').notNull().references(() => users.id),
  nickname: text('nickname').notNull(),
  phone: text('phone'),
  subscriptionStart: text('subscription_start').notNull(),
  subscriptionEnd: text('subscription_end').notNull(),
  status: text('status').notNull().default('active'), // 'active'|'expired'|'frozen'
  timeWaveConfig: text('time_wave_config'), // JSON, null = use farm/global default
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const memberPlotBindings = sqliteTable('member_plot_bindings', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  plotId: text('plot_id').notNull().references(() => plots.id),
  farmId: text('farm_id').notNull().references(() => farms.id),
  boundAt: text('bound_at').notNull(),
  unboundAt: text('unbound_at'), // null = currently active
});

// ============================================================
// Command Layer
// ============================================================

export const commands = sqliteTable('commands', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  memberId: text('member_id').notNull().references(() => members.id),
  plotId: text('plot_id').notNull().references(() => plots.id),
  type: text('type').notNull(), // 'water'|'fertilize'|'harvest'|'inspect'|'custom'
  description: text('description'),
  status: text('status').notNull().default('pending'),
    // 'pending'|'accepted'|'executing'|'done'|'rejected'
  workerId: text('worker_id').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  acceptedAt: text('accepted_at'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const commandReceipts = sqliteTable('command_receipts', {
  id: text('id').primaryKey(),
  commandId: text('command_id').notNull().references(() => commands.id),
  farmId: text('farm_id').notNull().references(() => farms.id),
  photoUrl: text('photo_url').notNull(),
  text: text('text'),
  createdAt: text('created_at').notNull(),
});

// ============================================================
// Media Layer
// ============================================================

export const mediaItems = sqliteTable('media_items', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  plotId: text('plot_id').references(() => plots.id),
  type: text('type').notNull(), // 'photo'|'video'|'timelapse'
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  caption: text('caption'),
  source: text('source').notNull(), // 'camera_auto'|'worker_upload'|'ai_snapshot'
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes'),
  takenAt: text('taken_at').notNull(),
  createdAt: text('created_at').notNull(),
});

export const growthLogs = sqliteTable('growth_logs', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  plotId: text('plot_id').notNull().references(() => plots.id),
  date: text('date').notNull(), // 'YYYY-MM-DD'
  title: text('title').notNull(),
  content: text('content'),
  eventType: text('event_type').notNull(), // 'plant'|'care'|'harvest'|'observation'
  mediaIds: text('media_ids'), // JSON array of media item IDs
  createdAt: text('created_at').notNull(),
});

export const visitorEvents = sqliteTable('visitor_events', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  plotId: text('plot_id').notNull().references(() => plots.id),
  analysisId: text('analysis_id').notNull().references(() => plotAnalyses.id),
  visitorType: text('visitor_type').notNull(), // 'insect'|'bird'|'animal'|'person'
  species: text('species'), // specific identification
  confidence: real('confidence').notNull(),
  assetId: text('asset_id').references(() => assetLibrary.id),
  detectedAt: text('detected_at').notNull(),
});

export const visitorCodex = sqliteTable('visitor_codex', {
  id: text('id').primaryKey(),
  category: text('category').notNull(), // 'insect'|'bird'|'animal'
  species: text('species').notNull(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  assetId: text('asset_id').references(() => assetLibrary.id),
  rarity: text('rarity').notNull().default('common'), // 'common'|'uncommon'|'rare'
});

export const memberCodexUnlocks = sqliteTable('member_codex_unlocks', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  codexEntryId: text('codex_entry_id').notNull().references(() => visitorCodex.id),
  firstDetectedAt: text('first_detected_at').notNull(),
  detectionCount: integer('detection_count').notNull().default(1),
});

// ============================================================
// Notification Layer
// ============================================================

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  targetUserId: text('target_user_id').notNull().references(() => users.id),
  channel: text('channel').notNull(), // 'wechat'|'in_app'|'sms'
  type: text('type').notNull(), // 'crop_change'|'command_update'|'expiry_reminder'|'critical_alert'
  title: text('title').notNull(),
  content: text('content').notNull(),
  data: text('data'), // JSON payload
  status: text('status').notNull().default('pending'), // 'pending'|'sent'|'read'|'failed'
  retryCount: integer('retry_count').notNull().default(0),
  sentAt: text('sent_at'),
  readAt: text('read_at'),
  createdAt: text('created_at').notNull(),
});

export const notificationPreferences = sqliteTable('notification_preferences', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  channel: text('channel').notNull(),
  notificationType: text('notification_type').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
});

// ============================================================
// Frame Capture Layer
// ============================================================

export const frameCaptureJobs = sqliteTable('frame_capture_jobs', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id),
  cameraId: text('camera_id').notNull().references(() => cameras.id),
  plotId: text('plot_id').references(() => plots.id),
  status: text('status').notNull().default('pending'),
    // 'pending'|'captured'|'analyzing'|'complete'|'failed'
  frameUrl: text('frame_url'),
  failureReason: text('failure_reason'),
  retryCount: integer('retry_count').notNull().default(0),
  scheduledAt: text('scheduled_at').notNull(),
  capturedAt: text('captured_at'),
  completedAt: text('completed_at'),
});
```

## Components and Interfaces

### API Endpoint Design

### URL Convention

```
/api/v1/admin/...    → Platform admin endpoints (role: platform_admin)
/api/v1/farm/...     → Farm portal endpoints (roles: farm_owner, farm_worker)
/api/v1/app/...      → Member app endpoints (role: member)
/api/v1/public/...   → Public endpoints (no auth)
```

### Auth Module

| Method | Path | Description | Role |
|--------|------|-------------|------|
| POST | /api/v1/public/auth/login | Login (phone+code / email+password) | public |
| POST | /api/v1/public/auth/wechat | WeChat OAuth login | public |
| POST | /api/v1/public/auth/refresh | Refresh access token | public |
| POST | /api/v1/public/auth/logout | Revoke refresh token | authenticated |

### Farm Management (Admin)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/admin/farms | List all farms (paginated, filterable by status) | platform_admin |
| GET | /api/v1/admin/farms/:id | Get farm details | platform_admin |
| POST | /api/v1/admin/farms/:id/approve | Approve pending farm | platform_admin |
| POST | /api/v1/admin/farms/:id/suspend | Suspend active farm | platform_admin |
| DELETE | /api/v1/admin/farms/:id | Soft-delete suspended farm | platform_admin |
| PUT | /api/v1/admin/farms/:id/plan | Assign plan to farm | platform_admin |
| PUT | /api/v1/admin/farms/:id/time-wave-override | Set farm-level time wave override | platform_admin |

### Plan Management (Admin)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/admin/plans | List all plans | platform_admin |
| POST | /api/v1/admin/plans | Create plan | platform_admin |
| PUT | /api/v1/admin/plans/:id | Update plan | platform_admin |

### AI Model Management (Admin)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/admin/models | List model versions | platform_admin |
| POST | /api/v1/admin/models | Register model version | platform_admin |
| PUT | /api/v1/admin/models/:id/activate | Activate model | platform_admin |
| PUT | /api/v1/admin/models/:id/deprecate | Deprecate model | platform_admin |
| PUT | /api/v1/admin/models/:id/testing | Set testing percentage | platform_admin |

### Asset Library (Admin)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/admin/assets | List assets (filterable by category) | platform_admin |
| POST | /api/v1/admin/assets | Upload asset (multipart) | platform_admin |
| PUT | /api/v1/admin/assets/:id | Update asset metadata | platform_admin |
| DELETE | /api/v1/admin/assets/:id | Remove asset | platform_admin |

### Platform Config (Admin)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/admin/config | Get platform config (global time wave, etc.) | platform_admin |
| PUT | /api/v1/admin/config/time-wave | Update global time wave config | platform_admin |
| GET | /api/v1/admin/dashboard | Get dashboard metrics | platform_admin |
| GET | /api/v1/admin/billing/invoices | List all invoices | platform_admin |

### Camera & Device (Farm)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/farm/cameras | List farm cameras | farm_owner, farm_worker |
| POST | /api/v1/farm/cameras | Add camera | farm_owner |
| PUT | /api/v1/farm/cameras/:id | Update camera | farm_owner |
| DELETE | /api/v1/farm/cameras/:id | Remove camera | farm_owner |
| POST | /api/v1/farm/cameras/:id/test | Test camera connectivity | farm_owner |

### Coverage Zones (Farm)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/farm/coverage-zones | List coverage zones | farm_owner, farm_worker |
| POST | /api/v1/farm/coverage-zones | Create coverage zone | farm_owner |
| PUT | /api/v1/farm/coverage-zones/:id | Update coverage zone | farm_owner |
| DELETE | /api/v1/farm/coverage-zones/:id | Delete coverage zone | farm_owner |

### Plots (Farm)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/farm/plots | List plots | farm_owner, farm_worker |
| POST | /api/v1/farm/plots | Create plot (freeform) | farm_owner |
| POST | /api/v1/farm/plots/grid-split | Create plots via grid split | farm_owner |
| PUT | /api/v1/farm/plots/:id | Update plot | farm_owner |
| DELETE | /api/v1/farm/plots/:id | Remove plot | farm_owner |

### Members (Farm)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/farm/members | List members | farm_owner |
| POST | /api/v1/farm/members | Add member | farm_owner |
| PUT | /api/v1/farm/members/:id | Update member | farm_owner |
| POST | /api/v1/farm/members/:id/bind | Bind member to plot | farm_owner |
| POST | /api/v1/farm/members/:id/unbind | Unbind member from plot | farm_owner |
| PUT | /api/v1/farm/members/:id/schedule | Set member capture schedule | farm_owner |

### Commands (Farm)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/farm/commands | List commands (filterable by status) | farm_owner, farm_worker |
| PUT | /api/v1/farm/commands/:id/accept | Accept command | farm_worker |
| PUT | /api/v1/farm/commands/:id/reject | Reject command (requires reason) | farm_worker |
| PUT | /api/v1/farm/commands/:id/complete | Complete command (requires receipt) | farm_worker |

### Media & Content (Farm)

| Method | Path | Description | Role |
|--------|------|-------------|------|
| POST | /api/v1/farm/media/presign | Get presigned upload URL | farm_owner, farm_worker |
| POST | /api/v1/farm/media | Create media record after upload | farm_owner, farm_worker |
| POST | /api/v1/farm/growth-logs | Create growth log | farm_owner, farm_worker |
| GET | /api/v1/farm/dashboard | Farm dashboard metrics | farm_owner |

### Member App Endpoints

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/app/my-plots | List my bound plots | member |
| GET | /api/v1/app/plots/:id/live | Get live plot data (latest analysis) | member |
| GET | /api/v1/app/plots/:id/timeline | Get plot growth timeline | member |
| GET | /api/v1/app/plots/:id/camera | Get plot camera snapshot URL | member |
| POST | /api/v1/app/commands | Submit command | member |
| GET | /api/v1/app/commands | List my commands | member |
| GET | /api/v1/app/visitors | Visitor calendar | member |
| GET | /api/v1/app/codex | Visitor codex with unlock status | member |
| GET | /api/v1/app/notifications | List my notifications | member |
| PUT | /api/v1/app/notifications/:id/read | Mark notification as read | member |

### Real-Time WebSocket

| Path | Description |
|------|-------------|
| /api/v1/app/ws/plot/:plotId | WebSocket connection for plot real-time updates |

## Authentication and Authorization Flow

### JWT Token Flow

```
┌─────────┐          ┌───────────┐          ┌────────────┐
│  Client  │          │   Auth    │          │    D1      │
│          │          │  Service  │          │            │
└────┬─────┘          └─────┬─────┘          └─────┬──────┘
     │  POST /auth/login     │                      │
     │  {phone, code}        │                      │
     │──────────────────────>│  verify credentials  │
     │                       │─────────────────────>│
     │                       │   user record        │
     │                       │<─────────────────────│
     │                       │                      │
     │                       │  sign JWT (2h)       │
     │                       │  sign refresh (7d)   │
     │                       │  store refresh hash  │
     │                       │─────────────────────>│
     │  {accessToken,        │                      │
     │   refreshToken}       │                      │
     │<──────────────────────│                      │
     │                       │                      │
     │  GET /api/v1/farm/... │                      │
     │  Authorization: Bearer│                      │
     │──────────────────────>│  verify JWT          │
     │                       │  extract: userId,    │
     │                       │    role, farmId      │
     │                       │  inject into context │
     │  response             │                      │
     │<──────────────────────│                      │
```

### JWT Payload Structure

```typescript
interface JwtPayload {
  sub: string;       // user ID
  role: 'platform_admin' | 'farm_owner' | 'farm_worker' | 'member';
  farmId?: string;   // present for farm_owner, farm_worker, member
  iat: number;
  exp: number;       // 2 hours from issue
}
```

### Role-Based Access Control Matrix

```typescript
const ROLE_PERMISSIONS = {
  platform_admin: ['/api/v1/admin/**'],
  farm_owner: ['/api/v1/farm/**'],
  farm_worker: [
    '/api/v1/farm/commands/**',
    '/api/v1/farm/media/**',
    '/api/v1/farm/growth-logs/**',
    '/api/v1/farm/cameras:read',
    '/api/v1/farm/plots:read',
  ],
  member: ['/api/v1/app/**'],
} as const;
```

### Multi-Tenant Isolation Middleware

```typescript
import { createMiddleware } from 'hono/factory';

export const tenantIsolation = createMiddleware(async (c, next) => {
  const payload = c.get('jwtPayload');

  if (payload.role === 'platform_admin') {
    // Admin can access all farms (no tenant filter)
    await next();
    return;
  }

  const farmId = payload.farmId;
  if (!farmId) {
    return c.json({ code: 'TENANT_REQUIRED', message: 'Farm context required' }, 403);
  }

  // Inject farm_id into context for all downstream queries
  c.set('farmId', farmId);
  await next();
});
```

## Video Frame Capture Scheduler Design

### Architecture

The scheduler uses Cloudflare Cron Triggers to fire every 10 seconds (minimum granularity). Each trigger evaluates which cameras need a capture at the current time based on resolved Time_Wave_Config.

```
┌─────────────────┐     ┌──────────────────────────────┐
│  Cron Trigger   │────>│  Frame Capture Scheduler     │
│  (*/10 sec)     │     │                              │
└─────────────────┘     │  1. Load active farms        │
                        │  2. Resolve Time_Wave_Config  │
                        │  3. Determine due captures    │
                        │  4. Dispatch capture jobs     │
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │     Cloudflare Queue         │
                        │  (frame-capture-dispatch)    │
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │   Queue Consumer (parallel)  │
                        │                              │
                        │  1. Request frame via        │
                        │     protocol adapter         │
                        │  2. Store in R2              │
                        │  3. Enqueue LLM analysis     │
                        └──────────────────────────────┘
```

### Time_Wave_Config Resolution Priority

```typescript
function resolveTimeWaveConfig(
  member: Member,
  farm: Farm,
  globalConfig: PlatformConfig
): TimeWaveConfig[] {
  // Priority: platform override > member config > farm config > global default
  if (farm.timeWaveConfigOverride) {
    return JSON.parse(farm.timeWaveConfigOverride);
  }
  if (member.timeWaveConfig) {
    return JSON.parse(member.timeWaveConfig);
  }
  return JSON.parse(globalConfig.globalTimeWaveConfig);
}
```

### Time_Wave_Config Validation

```typescript
import { z } from 'zod';

const timeRangePattern = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

const timeWaveEntrySchema = z.object({
  timeRange: z.string().regex(timeRangePattern),
  intervalSec: z.number().int().positive().min(5).max(3600),
});

const timeWaveConfigSchema = z.array(timeWaveEntrySchema).refine(
  (entries) => {
    // Validate: non-overlapping, covers full 24h
    const minutes = coverageMinutes(entries);
    return minutes === 1440 && !hasOverlap(entries);
  },
  { message: 'Time ranges must cover full 24h without overlap' }
);
```

### Capture Scheduling Algorithm

```typescript
function shouldCaptureNow(
  currentTime: Date,
  config: TimeWaveConfig[],
  lastCaptureAt: Date | null
): boolean {
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  for (const entry of config) {
    const [start, end] = parseTimeRange(entry.timeRange);
    if (currentMinutes >= start && currentMinutes < end) {
      if (!lastCaptureAt) return true;
      const elapsed = (currentTime.getTime() - lastCaptureAt.getTime()) / 1000;
      return elapsed >= entry.intervalSec;
    }
  }
  return false;
}
```

## LLM Analysis Pipeline Architecture

### Pipeline Flow

```
┌───────────────────┐     ┌────────────────────────┐
│  Cloudflare Queue │────>│  LLM Analysis Consumer │
│  (llm-analysis)   │     │                        │
└───────────────────┘     │  1. Dequeue job        │
                          │  2. Fetch context (5)   │
                          │  3. Build prompt        │
                          │  4. Route to model      │
                          │  5. Parse response      │
                          │  6. Store results       │
                          │  7. Match assets        │
                          │  8. Check significance  │
                          │  9. Notify if needed    │
                          └────────────────────────┘
```

### LLM Adapter Pattern

```typescript
interface LLMAdapter {
  analyze(request: AnalysisRequest): Promise<AnalysisResult>;
  healthCheck(): Promise<boolean>;
}

interface AnalysisRequest {
  frameUrl: string;
  context: PreviousAnalysis[]; // up to 5 previous results
  plotMetadata: {
    currentCrop: string;
    soilType: string;
    season: string;
  };
}

interface AnalysisResult {
  cropStatus: CropStatus;
  growthStage: string;
  healthScore: number; // 0-100
  visitors: VisitorDetection[];
  anomalies: AnomalyFlag[];
  confidence: Record<string, number>;
  rawResponse: string;
}

// Adapter implementations
class QwenVLAdapter implements LLMAdapter { /* ... */ }
class GPT4VAdapter implements LLMAdapter { /* ... */ }
class CustomAdapter implements LLMAdapter { /* ... */ }
```

### Model Routing Logic

```typescript
function selectModel(
  activeModels: ModelVersion[],
  testingModels: ModelVersion[]
): ModelVersion {
  // If testing model exists, route based on configured percentage
  if (testingModels.length > 0) {
    const testingModel = testingModels[0];
    const roll = Math.random() * 100;
    if (roll < testingModel.testingPercentage) {
      return testingModel;
    }
  }
  // Default to active model
  return activeModels.find(m => m.status === 'active')!;
}
```

### Asset Matching Algorithm

```typescript
function matchAsset(
  detection: VisitorDetection,
  assetLibrary: AssetEntry[]
): AssetEntry {
  const categoryAssets = assetLibrary.filter(
    a => a.category === detection.category
  );

  if (categoryAssets.length === 0) {
    return getDefaultAsset(detection.category);
  }

  // Score each asset by keyword overlap with detection labels
  const scored = categoryAssets.map(asset => {
    const keywords = JSON.parse(asset.mappingKeywords) as string[];
    const detectionTerms = [
      detection.species,
      detection.type,
      ...detection.labels,
    ].filter(Boolean).map(t => t.toLowerCase());

    const score = keywords.reduce((sum, kw) => {
      return sum + (detectionTerms.some(t => t.includes(kw.toLowerCase())) ? 1 : 0);
    }, 0);

    return { asset, score };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];

  // If no keywords match, use category default
  if (best.score === 0) {
    return categoryAssets.find(a => a.isDefault) ?? categoryAssets[0];
  }

  return best.asset;
}
```

### Significance Detection

```typescript
interface SignificanceCheck {
  isSignificant: boolean;
  reason?: string;
  notificationType?: string;
}

function checkSignificance(
  current: AnalysisResult,
  previous: AnalysisResult | null
): SignificanceCheck {
  // Ripeness state change
  if (previous && current.growthStage !== previous.growthStage) {
    return {
      isSignificant: true,
      reason: `Growth stage changed: ${previous.growthStage} → ${current.growthStage}`,
      notificationType: 'crop_change',
    };
  }

  // Pest/disease detection
  if (current.anomalies.some(a => a.type === 'pest' || a.type === 'disease')) {
    return {
      isSignificant: true,
      reason: 'Pest or disease detected',
      notificationType: 'critical_alert',
    };
  }

  // Unknown visitor with high confidence
  const highConfVisitor = current.visitors.find(
    v => v.type === 'person' && v.confidence > 0.8
  );
  if (highConfVisitor) {
    return {
      isSignificant: true,
      reason: 'Unknown person detected with high confidence',
      notificationType: 'critical_alert',
    };
  }

  return { isSignificant: false };
}
```

## Notification System Design

### Architecture

```
┌──────────────────┐     ┌─────────────────────────┐
│ Notification     │────>│  Cloudflare Queue        │
│ Triggers         │     │  (notification-delivery) │
│ (various sources)│     └───────────┬─────────────┘
└──────────────────┘                 │
                        ┌────────────▼─────────────┐
                        │  Notification Consumer   │
                        │                          │
                        │  1. Resolve channel      │
                        │  2. Format message       │
                        │  3. Deliver via channel  │
                        │  4. Update status        │
                        │  5. Retry on failure     │
                        └──────────────────────────┘
```

### Channel Router

```typescript
function resolveChannel(
  notificationType: string,
  preferences: NotificationPreference[],
  isCritical: boolean
): string {
  // Critical alerts always go to SMS + in_app
  if (isCritical) return 'sms';

  // Check user preferences
  const pref = preferences.find(p => p.notificationType === notificationType && p.enabled);
  if (pref) return pref.channel;

  // Defaults by type
  const defaults: Record<string, string> = {
    crop_change: 'wechat',
    command_update: 'wechat',
    expiry_reminder: 'wechat',
    content_published: 'in_app',
  };
  return defaults[notificationType] ?? 'in_app';
}
```

### Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  backoffMultiplier: 2, // 1s, 2s, 4s
};

async function deliverWithRetry(notification: Notification): Promise<void> {
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      await deliver(notification);
      await updateStatus(notification.id, 'sent');
      return;
    } catch (error) {
      if (attempt === RETRY_CONFIG.maxRetries) {
        await updateStatus(notification.id, 'failed');
        return;
      }
      const delay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
      await sleep(delay);
      await incrementRetryCount(notification.id);
    }
  }
}
```

## Durable Objects Sharding Strategy

### Sharding by Plot Entity

Each plot gets its own Durable Object instance for WebSocket management. This provides:
- Natural isolation (members of different plots don't interfere)
- Bounded connection count per DO (typically 1-10 members per plot)
- Automatic scaling via Cloudflare's DO infrastructure

```typescript
export class PlotRealtimeDO implements DurableObject {
  private sessions: Map<string, WebSocket> = new Map();
  private sequenceNumber = 0;
  private eventBuffer: RealtimeEvent[] = []; // last 100 events for replay

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      return this.handleWebSocket(request);
    }
    // HTTP POST for push events from backend
    return this.handlePushEvent(request);
  }

  private handleWebSocket(request: Request): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const url = new URL(request.url);
    const memberId = url.searchParams.get('memberId');
    const lastSeq = parseInt(url.searchParams.get('lastSeq') ?? '0');

    server.accept();
    this.sessions.set(memberId!, server);

    // Replay missed events
    if (lastSeq > 0) {
      const missed = this.eventBuffer.filter(e => e.seq > lastSeq);
      for (const event of missed) {
        server.send(JSON.stringify(event));
      }
    }

    server.addEventListener('close', () => {
      this.sessions.delete(memberId!);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handlePushEvent(request: Request): Promise<Response> {
    const event = await request.json() as RealtimeEvent;
    this.sequenceNumber++;
    event.seq = this.sequenceNumber;

    // Buffer for replay (keep last 100)
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > 100) {
      this.eventBuffer.shift();
    }

    // Broadcast to all connected sessions
    for (const [, ws] of this.sessions) {
      ws.send(JSON.stringify(event));
    }

    return new Response('OK');
  }
}
```

### DO Naming Convention

```typescript
// Plot real-time: sharded by plot ID
const plotDoId = env.PLOT_REALTIME.idFromName(`plot:${plotId}`);

// Farm session: sharded by farm ID (for farm-wide broadcasts)
const farmDoId = env.FARM_SESSION.idFromName(`farm:${farmId}`);
```

## Admin Frontend Page Structure (apps/admin/)

```
apps/admin/
├── app/
│   ├── layout.tsx              # Admin shell with sidebar navigation
│   ├── page.tsx                # Dashboard (redirect to /dashboard)
│   ├── dashboard/
│   │   └── page.tsx            # Platform metrics dashboard
│   ├── farms/
│   │   ├── page.tsx            # Farm list with status filters
│   │   └── [id]/
│   │       └── page.tsx        # Farm detail (approve/suspend/plan)
│   ├── plans/
│   │   └── page.tsx            # Plan tier management
│   ├── models/
│   │   └── page.tsx            # AI model version management
│   ├── assets/
│   │   └── page.tsx            # Asset library CRUD
│   ├── config/
│   │   └── page.tsx            # Global config (time wave, etc.)
│   └── billing/
│       ├── page.tsx            # Invoice list
│       └── [farmId]/
│           └── page.tsx        # Farm billing detail
```

## Farm Frontend Page Structure (apps/farm/)

```
apps/farm/
├── app/
│   ├── layout.tsx              # Farm shell with navigation
│   ├── page.tsx                # Farm dashboard
│   ├── dashboard/
│   │   └── page.tsx            # Farm metrics overview
│   ├── devices/
│   │   ├── page.tsx            # Camera list with status
│   │   ├── [id]/
│   │   │   └── page.tsx        # Camera detail + coverage zone editor
│   │   └── add/
│   │       └── page.tsx        # Add camera wizard
│   ├── plots/
│   │   ├── page.tsx            # Plot grid/list view
│   │   ├── [id]/
│   │   │   └── page.tsx        # Plot detail + analysis history
│   │   └── create/
│   │       └── page.tsx        # Grid split or freeform draw
│   ├── members/
│   │   ├── page.tsx            # Member list
│   │   ├── [id]/
│   │   │   └── page.tsx        # Member detail + plot bindings
│   │   └── add/
│   │       └── page.tsx        # Add member form
│   ├── commands/
│   │   ├── page.tsx            # Command queue (pending/active)
│   │   └── [id]/
│   │       └── page.tsx        # Command detail + receipt upload
│   ├── content/
│   │   ├── page.tsx            # Media gallery + growth logs
│   │   └── publish/
│   │       └── page.tsx        # Upload content form
│   └── settings/
│       └── page.tsx            # Farm settings + capture schedules
```

## Error Handling

### Standardized Error Response

```typescript
interface ApiError {
  code: string;      // Machine-readable error code
  message: string;   // Human-readable message
  details?: Record<string, unknown>;
}

// HTTP Status mapping
const ERROR_STATUS: Record<string, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};
```

### Error Handler Middleware

```typescript
import { HTTPException } from 'hono/http-exception';

export const errorHandler = (err: Error, c: Context) => {
  if (err instanceof AppError) {
    return c.json(
      { code: err.code, message: err.message, details: err.details },
      err.statusCode
    );
  }

  if (err instanceof HTTPException) {
    return c.json(
      { code: 'HTTP_ERROR', message: err.message },
      err.status
    );
  }

  // Unexpected error - log and return generic
  console.error('Unhandled error:', err);
  return c.json(
    { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    500
  );
};
```

## Data Models and Interfaces

### Common Types

```typescript
// Pagination
interface PaginationParams {
  page: number;      // 1-indexed
  pageSize: number;  // default 20, max 100
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Time Wave Config
interface TimeWaveEntry {
  timeRange: string; // "HH:MM-HH:MM"
  intervalSec: number;
}

type TimeWaveConfig = TimeWaveEntry[];

// Farm Status Transitions
type FarmStatus = 'pending' | 'active' | 'suspended' | 'deleted';
const VALID_TRANSITIONS: Record<FarmStatus, FarmStatus[]> = {
  pending: ['active'],
  active: ['suspended'],
  suspended: ['active', 'deleted'],
  deleted: [],
};

// Command Status Transitions
type CommandStatus = 'pending' | 'accepted' | 'executing' | 'done' | 'rejected';
const COMMAND_TRANSITIONS: Record<CommandStatus, CommandStatus[]> = {
  pending: ['accepted', 'rejected'],
  accepted: ['executing'],
  executing: ['done'],
  done: [],
  rejected: [],
};
```

### Billing Calculation

```typescript
interface InvoiceCalculation {
  baseFee: number;
  overages: {
    aiCalls: { quantity: number; charge: number };
    storage: { quantity: number; charge: number };
  };
  total: number;
}

function calculateInvoice(
  plan: FarmPlan,
  usage: UsageRecord[]
): InvoiceCalculation {
  const aiCallUsage = usage
    .filter(u => u.type === 'ai_call')
    .reduce((sum, u) => sum + u.quantity, 0);

  const storageUsage = usage
    .filter(u => u.type === 'storage')
    .reduce((sum, u) => sum + u.quantity, 0);

  const aiOverage = Math.max(0, aiCallUsage - plan.aiCallsIncluded);
  const storageOverage = Math.max(0, storageUsage - plan.storageGbIncluded);

  const aiCharge = aiOverage * plan.aiCallOveragePrice;
  const storageCharge = storageOverage * plan.storageOveragePrice;

  return {
    baseFee: plan.monthlyPrice,
    overages: {
      aiCalls: { quantity: aiOverage, charge: aiCharge },
      storage: { quantity: storageOverage, charge: storageCharge },
    },
    total: plan.monthlyPrice + aiCharge + storageCharge,
  };
}
```

### R2 File Path Convention

```typescript
function buildR2Path(params: {
  farmId: string;
  plotId?: string;
  type: 'frame' | 'media' | 'receipt' | 'asset';
  filename: string;
}): string {
  const { farmId, plotId, type, filename } = params;

  switch (type) {
    case 'frame':
      const date = new Date().toISOString().split('T')[0];
      return `${farmId}/${plotId}/${date}/${filename}`;
    case 'media':
      return `${farmId}/${plotId ?? '_general'}/${Date.now()}_${filename}`;
    case 'receipt':
      return `${farmId}/_receipts/${Date.now()}_${filename}`;
    case 'asset':
      return `_platform/assets/${filename}`;
  }
}
```

## Testing Strategy

### Unit Tests
- Validation logic (Time_Wave_Config, polygon bounds, media type/size)
- State machine transitions (farm status, command status)
- Invoice calculation
- Asset matching algorithm
- Capture scheduling decision logic

### Property-Based Tests
- All 28 correctness properties defined below
- Minimum 100 iterations per property
- Focus on pure business logic functions

### Integration Tests
- Camera connectivity verification
- R2 file upload/download
- WeChat notification delivery
- D1 query correctness with tenant isolation
- WebSocket connection lifecycle

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Farm State Machine Valid Transitions

*For any* farm in a given status, only the defined valid transitions (pending→active, active→suspended, suspended→active|deleted) should succeed; all other transition attempts should be rejected and leave the farm status unchanged.

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 2: Farm Application Validation Completeness

*For any* farm application payload with a random subset of required fields missing, the system should reject the submission and the returned error should list exactly the set of missing fields (no more, no fewer).

**Validates: Requirements 1.5**

### Property 3: Time_Wave_Config Validation Correctness

*For any* array of TimeWaveEntry objects, the validator should accept if and only if: all time ranges are non-overlapping, they collectively cover exactly 24 hours (1440 minutes), and all intervalSec values are positive integers.

**Validates: Requirements 3.4, 12.2**

### Property 4: Time_Wave_Config Resolution Priority Chain

*For any* member/farm/global configuration combination, the resolved Time_Wave_Config should follow priority: platform override > member config > farm default > global default. When a higher-priority config exists, lower-priority configs should never be returned.

**Validates: Requirements 3.3, 12.3, 12.4**

### Property 5: Plan Tier Threshold Notification

*For any* farm with active member count and assigned plan, a plan upgrade notification should be triggered if and only if the member count exceeds the plan's memberMax value.

**Validates: Requirements 2.3**

### Property 6: AI Model Routing Correctness

*For any* set of model versions with exactly one "active" and optionally one "testing" (with configured percentage), new analysis jobs should never route to "deprecated" models, and the proportion routed to "testing" should approximate the configured percentage within statistical tolerance.

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 7: Asset Matching Algorithm Determinism

*For any* visitor detection with associated labels and any asset library, the matching algorithm should return the asset with the highest keyword overlap score. When no keywords match, the category's default placeholder asset should be returned.

**Validates: Requirements 5.3, 5.4**

### Property 8: Multi-Tenant Data Isolation

*For any* authenticated request with a farm_id context, all data returned by any endpoint should belong exclusively to that farm_id. No records with a different farm_id should ever appear in the response.

**Validates: Requirements 18.4, 8.4, 22.1**

### Property 9: Command Authorization via Active Binding

*For any* member and plot combination, a command submission should succeed if and only if the member has an active (non-expired, non-unbound) binding to that plot. Commands for unbound plots should always be rejected with an authorization error.

**Validates: Requirements 21.3, 21.4**

### Property 10: Command State Machine Valid Transitions

*For any* command in a given status, only defined transitions should succeed (pending→accepted|rejected, accepted→executing, executing→done). Additionally, completion must include at least one receipt photo, and rejection must include a reason string.

**Validates: Requirements 13.2, 13.3, 13.4**

### Property 11: Invoice Calculation Correctness

*For any* farm plan and usage record set, the calculated invoice total should equal: base monthly fee + (max(0, aiCalls - included) × aiOveragePrice) + (max(0, storageGB - included) × storageOveragePrice). The total should never be negative.

**Validates: Requirements 7.1**

### Property 12: Plot Grid Split Code Generation

*For any* grid split with R rows and C columns within a coverage zone, the system should generate exactly R×C plots with unique codes following the pattern (A1..A_C, B1..B_C, ... up to row R), and no generated plot polygon should overlap with any other.

**Validates: Requirements 10.2**

### Property 13: Plot Polygon Non-Overlap Validation

*For any* two plots within the same coverage zone, their polygon boundaries should not overlap. The validator should reject a new plot if and only if its polygon intersects with any existing plot polygon in the same zone.

**Validates: Requirements 10.4**

### Property 14: Coverage Zone Boundary Validation

*For any* polygon annotation on a camera frame, all polygon points must have x coordinates in [0, frameWidth] and y coordinates in [0, frameHeight]. Polygons with any point outside these bounds should be rejected.

**Validates: Requirements 9.4**

### Property 15: Member Subscription Expiry Transition

*For any* member whose subscription end date has passed relative to the current time, the member's status should be "expired". Members whose subscription end date is in the future should remain "active" (unless explicitly frozen).

**Validates: Requirements 11.4**

### Property 16: Capture Scheduling Correctness

*For any* time point and Time_Wave_Config, the scheduler should trigger a capture if and only if the elapsed time since the last capture for that camera equals or exceeds the intervalSec for the time range containing the current time.

**Validates: Requirements 16.1**

### Property 17: LLM Context Window Assembly

*For any* plot with N previous analyses (where N ≥ 0), the context sent to the LLM should contain exactly min(N, 5) previous analysis results, ordered by most recent first.

**Validates: Requirements 17.1**

### Property 18: Significance Detection Triggers Notification

*For any* analysis result, a notification should be enqueued if and only if one of the significance conditions is met: growth stage change from previous analysis, pest/disease anomaly detected, or unknown person detected with confidence > 80%.

**Validates: Requirements 17.4**

### Property 19: Notification Retry Exhaustion

*For any* notification that fails delivery, the system should retry up to 3 times with exponential backoff (delays doubling each attempt). After 3 failed retries, the notification status should be "failed" and no further delivery attempts should be made.

**Validates: Requirements 23.5**

### Property 20: Notification Channel Routing

*For any* notification type and member preference set, the resolved channel should be: SMS for critical alerts (regardless of preference), the user's preferred channel if configured, or the system default for that notification type otherwise.

**Validates: Requirements 23.1, 23.3**

### Property 21: JWT Authentication Enforcement

*For any* non-public API endpoint, requests without a valid JWT token (missing, expired, malformed, or wrong signature) should be rejected with a 401 status. The response body should never contain protected data.

**Validates: Requirements 18.2**

### Property 22: Role-Based Access Control

*For any* authenticated request, the endpoint should be accessible if and only if the user's role is in the allowed roles list for that endpoint. Requests from unauthorized roles should receive a 403 status.

**Validates: Requirements 18.3**

### Property 23: Plot Timeline Ordering

*For any* plot timeline query result, the returned items (growth logs + media) should be strictly ordered by date descending. No item should appear before a later-dated item in the response array.

**Validates: Requirements 22.3**

### Property 24: Visitor Codex Unlock Consistency

*For any* member, a codex entry's unlock status should be true if and only if there exists at least one visitor event in that member's plots matching the codex entry's species. The detection count should equal the actual number of matching visitor events.

**Validates: Requirements 22.5**

### Property 25: Billing Overdue Escalation

*For any* farm subscription, the status should transition to "past_due" if and only if payment is overdue by more than 7 days. The status should escalate to farm suspension if and only if the subscription has been in "past_due" status for more than 30 days.

**Validates: Requirements 7.3, 7.4**

### Property 26: Media File Type and Size Validation

*For any* media upload attempt, the system should accept files if and only if: the MIME type is in {image/jpeg, image/png, video/mp4} AND the file size is ≤ 10MB for images or ≤ 100MB for videos. All other uploads should be rejected.

**Validates: Requirements 14.4**

### Property 27: R2 Path Format Correctness

*For any* frame capture, the stored R2 path should match the format `{farm_id}/{plot_id}/{YYYY-MM-DD}/{timestamp}.jpg` where farm_id and plot_id are valid UUIDs, the date is a valid ISO date, and the timestamp is a valid Unix timestamp.

**Validates: Requirements 16.3**

### Property 28: WebSocket Event Replay on Reconnection

*For any* WebSocket reconnection with a lastSeq parameter, the client should receive exactly those events with sequence numbers greater than lastSeq, in ascending order. No events with seq ≤ lastSeq should be sent.

**Validates: Requirements 19.3**

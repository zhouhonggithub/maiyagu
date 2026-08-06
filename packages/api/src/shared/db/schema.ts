import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

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
  passwordHash: text('password_hash'),
  totpSecret: text('totp_secret'),
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
  pastDueSince: text('past_due_since'),
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
  coverageZoneId: text('coverage_zone_id').references(() => coverageZones.id),
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
  receiptText: text('receipt_text'),
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
  species: text('species'),
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

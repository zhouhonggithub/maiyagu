# Implementation Plan: AI Farm SaaS Platform

## Overview

This plan implements the AI Farm SaaS Platform as a modular monolith on Cloudflare's edge infrastructure. The approach starts with monorepo foundation and shared types, builds the authentication layer, then implements core business modules progressively, followed by AI/video pipelines, notification system, billing, admin and farm frontends, and finally real-time capabilities. Each task produces working, testable code.

## Tasks

- [ ] 1. Monorepo Foundation and Shared Infrastructure
  - Set up turborepo/pnpm workspace, shared packages, and API skeleton

  - [ ] 1.1 Initialize monorepo workspace with pnpm and turbo
    - Create root `pnpm-workspace.yaml` with packages: `packages/api`, `packages/shared`, `apps/admin`, `apps/farm`
    - Add root `turbo.json` with build/dev/test pipelines
    - Add root `package.json` with workspace scripts
    - Add root `tsconfig.base.json` with shared compiler options (strict, ESNext, moduleResolution bundler)
    - _Requirements: 18.1_

  - [ ] 1.2 Create `packages/shared` with common types and utilities
    - Create `packages/shared/src/types.ts`: `ApiResponse`, `PaginationParams`, `PaginatedResponse`, `TimeWaveEntry`, `TimeWaveConfig`
    - Create `packages/shared/src/errors.ts`: `AppError` class hierarchy (`ValidationError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ConflictError`)
    - Create `packages/shared/src/constants.ts`: `FARM_STATUS_TRANSITIONS`, `COMMAND_STATUS_TRANSITIONS`, `ROLE_PERMISSIONS`, command types, media limits
    - Create `packages/shared/src/utils.ts`: `generateId()` (nanoid), `nowISO()`, date helpers
    - Create `packages/shared/package.json` and `tsconfig.json`
    - _Requirements: 18.5_


  - [ ] 1.3 Create `packages/api` with Hono app skeleton and Cloudflare Workers config
    - Create `packages/api/package.json` with deps: hono, drizzle-orm, zod, @cloudflare/workers-types, nanoid
    - Create `packages/api/wrangler.toml` with D1 binding, R2 binding, Queue bindings, DO bindings, cron triggers
    - Create `packages/api/src/index.ts`: Hono app entry point with module registration placeholder and error handler
    - Create `packages/api/src/env.ts`: typed `Env` interface with all Cloudflare bindings (D1, R2, Queues, DOs)
    - Create `packages/api/tsconfig.json` referencing shared package
    - _Requirements: 18.1, 18.6_

  - [ ] 1.4 Define full database schema with Drizzle ORM
    - Create `packages/api/src/shared/db/schema.ts` with all 22 tables from design: platformConfig, aiModelVersions, farmPlans, assetLibrary, users, refreshTokens, farms, farmStaff, subscriptions, usageRecords, invoices, cameras, coverageZones, plots, plotAnalyses, members, memberPlotBindings, commands, commandReceipts, mediaItems, growthLogs, visitorEvents, visitorCodex, memberCodexUnlocks, notifications, notificationPreferences, frameCaptureJobs
    - Create `packages/api/src/shared/db/index.ts`: DB connection factory using drizzle with D1
    - Create `packages/api/drizzle.config.ts` for migrations
    - Generate initial migration with `drizzle-kit generate`
    - _Requirements: 18.6_


  - [ ] 1.5 Create middleware stack (error handler, CORS, rate limit)
    - Create `packages/api/src/middleware/error-handler.ts`: catch `AppError`, `HTTPException`, and unhandled errors; return standardized `{code, message, details}` JSON
    - Create `packages/api/src/middleware/cors.ts`: configure CORS for admin/farm/client origins
    - Create `packages/api/src/middleware/rate-limit.ts`: per-tenant rate limiting using D1 counter
    - Wire all middleware into the Hono app in `index.ts`
    - _Requirements: 18.5_

- [ ] 2. Checkpoint - Foundation verification
  - Ensure all packages compile, workspace links resolve, and wrangler dev starts without errors. Ask the user if questions arise.

- [ ] 3. Authentication Module
  - Implement JWT auth, refresh tokens, RBAC, and tenant isolation middleware

  - [ ] 3.1 Implement auth middleware (JWT verification + context injection)
    - Create `packages/api/src/middleware/auth.ts`: verify JWT Bearer token, extract payload (sub, role, farmId), set context variables
    - Use `hono/jwt` or manual verification with `crypto.subtle` for Cloudflare Workers compatibility
    - Reject with 401 for missing/expired/malformed tokens
    - _Requirements: 18.2_

  - [ ] 3.2 Implement RBAC middleware
    - Create `packages/api/src/middleware/rbac.ts`: check user role against allowed roles for the current route pattern
    - Use the `ROLE_PERMISSIONS` map from shared constants
    - Reject with 403 for unauthorized roles
    - _Requirements: 18.3_


  - [ ] 3.3 Implement tenant isolation middleware
    - Create `packages/api/src/middleware/tenant.ts`: extract farmId from JWT payload, inject into context for downstream queries
    - Platform admins bypass tenant filter; all other roles require a valid farmId
    - Reject with 403 if farmId is missing for non-admin roles
    - _Requirements: 18.4_

  - [ ] 3.4 Implement auth module routes and service
    - Create `packages/api/src/modules/auth/schema.ts`: Zod schemas for login (phone+code, email+password), WeChat OAuth, refresh token
    - Create `packages/api/src/modules/auth/service.ts`: login logic (verify phone SMS or email/password), issue JWT (2h access, 7d refresh), store refresh token hash, WeChat OAuth flow, refresh token rotation, logout (revoke refresh)
    - Create `packages/api/src/modules/auth/repository.ts`: CRUD for users and refreshTokens tables
    - Create `packages/api/src/modules/auth/routes.ts`: POST /public/auth/login, /public/auth/wechat, /public/auth/refresh, /public/auth/logout
    - _Requirements: 18.2_

  - [ ]* 3.5 Write property tests for auth module
    - **Property 21: JWT Authentication Enforcement** - Verify all non-public endpoints reject invalid tokens with 401
    - **Property 22: Role-Based Access Control** - Verify endpoint access matches ROLE_PERMISSIONS matrix
    - **Validates: Requirements 18.2, 18.3**


- [ ] 4. Farm Lifecycle Module
  - Implement farm CRUD, status transitions, and plan assignment

  - [ ] 4.1 Implement farm module repository and service
    - Create `packages/api/src/modules/farm/repository.ts`: queries for farms table (list paginated, get by ID, update status, soft delete)
    - Create `packages/api/src/modules/farm/service.ts`: farm application creation (status="pending"), approval (pending→active), suspension (active→suspended), deletion (suspended→deleted), plan assignment, time-wave override
    - Implement state machine validation using `FARM_STATUS_TRANSITIONS`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 4.2 Implement farm module routes and validation schemas
    - Create `packages/api/src/modules/farm/schema.ts`: Zod schemas for farm application (validate required fields: name, province, city, district, ownerId), approve/suspend actions
    - Create `packages/api/src/modules/farm/routes.ts`: admin endpoints (GET /admin/farms, GET /admin/farms/:id, POST /admin/farms/:id/approve, POST /admin/farms/:id/suspend, DELETE /admin/farms/:id, PUT /admin/farms/:id/plan, PUT /admin/farms/:id/time-wave-override)
    - Add farm application submission route POST /public/farms/apply
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 4.3 Write property tests for farm state machine
    - **Property 1: Farm State Machine Valid Transitions** - Verify only valid transitions succeed; invalid transitions are rejected
    - **Property 2: Farm Application Validation Completeness** - Verify missing fields are exactly reported
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**


- [ ] 5. Plan and Platform Config Module
  - Implement plan tier management and global configuration

  - [ ] 5.1 Implement plan management module
    - Create `packages/api/src/modules/billing/plan-repository.ts`: CRUD for farmPlans table
    - Create `packages/api/src/modules/billing/plan-service.ts`: create plan, update plan, list plans, validate tier ranges don't overlap
    - Create `packages/api/src/modules/billing/plan-routes.ts`: GET/POST/PUT /admin/plans
    - _Requirements: 2.1, 2.2_

  - [ ] 5.2 Implement platform config module
    - Create `packages/api/src/modules/config/repository.ts`: get/update platformConfig record
    - Create `packages/api/src/modules/config/service.ts`: update global Time_Wave_Config (with validation), get dashboard metrics
    - Create `packages/api/src/modules/config/routes.ts`: GET /admin/config, PUT /admin/config/time-wave, GET /admin/dashboard
    - _Requirements: 3.1, 3.2, 6.1, 6.2, 6.3_

  - [ ]* 5.3 Write property tests for Time_Wave_Config validation
    - **Property 3: Time_Wave_Config Validation Correctness** - Verify acceptance iff non-overlapping, 24h coverage, positive intervals
    - **Property 5: Plan Tier Threshold Notification** - Verify notification trigger iff member count exceeds plan max
    - **Validates: Requirements 3.4, 12.2, 2.3**


- [ ] 6. AI Model Management Module
  - Implement AI model versioning, activation, deprecation, and testing routing

  - [ ] 6.1 Implement AI model module
    - Create `packages/api/src/modules/ai/model-repository.ts`: CRUD for aiModelVersions table
    - Create `packages/api/src/modules/ai/model-service.ts`: register model, activate (set status=active, deactivate previous), deprecate, set testing percentage, model routing logic (selectModel function)
    - Create `packages/api/src/modules/ai/model-routes.ts`: GET/POST /admin/models, PUT /admin/models/:id/activate, PUT /admin/models/:id/deprecate, PUT /admin/models/:id/testing
    - Create `packages/api/src/modules/ai/schema.ts`: Zod schemas for model registration, activation, testing config
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 6.2 Write property test for AI model routing
    - **Property 6: AI Model Routing Correctness** - Verify deprecated models never receive jobs; testing percentage approximated correctly
    - **Validates: Requirements 4.2, 4.3, 4.4**

- [ ] 7. Asset Library Module
  - Implement asset CRUD with R2 storage and keyword matching

  - [ ] 7.1 Implement asset library module
    - Create `packages/api/src/modules/ai/asset-repository.ts`: CRUD for assetLibrary table, query by category
    - Create `packages/api/src/modules/ai/asset-service.ts`: upload asset (store in R2, create metadata), update metadata, delete, matching algorithm (matchAsset function with keyword scoring)
    - Create `packages/api/src/modules/ai/asset-routes.ts`: GET/POST/PUT/DELETE /admin/assets
    - _Requirements: 5.1, 5.2, 5.3, 5.4_


  - [ ]* 7.2 Write property test for asset matching
    - **Property 7: Asset Matching Algorithm Determinism** - Verify highest keyword overlap score wins; default placeholder on no match
    - **Validates: Requirements 5.3, 5.4**

- [ ] 8. Checkpoint - Core platform modules verification
  - Ensure auth, farm, plan, AI model, and asset modules compile and unit tests pass. Ask the user if questions arise.

- [ ] 9. Device (Camera) Module
  - Implement camera onboarding, connectivity testing, and status tracking

  - [ ] 9.1 Implement camera module
    - Create `packages/api/src/modules/device/repository.ts`: CRUD for cameras table scoped by farmId
    - Create `packages/api/src/modules/device/service.ts`: add camera (validate protocol), test connectivity (request test frame within 30s timeout), update heartbeat, status tracking (online/weak/offline)
    - Create `packages/api/src/modules/device/schema.ts`: Zod schemas for camera creation (protocol enum, stream URL conditional on protocol type), connectivity test
    - Create `packages/api/src/modules/device/routes.ts`: GET/POST/PUT/DELETE /farm/cameras, POST /farm/cameras/:id/test
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 10. Coverage Zone Module
  - Implement coverage zone annotation with polygon validation

  - [ ] 10.1 Implement coverage zone module
    - Create `packages/api/src/modules/device/zone-repository.ts`: CRUD for coverageZones scoped by farmId
    - Create `packages/api/src/modules/device/zone-service.ts`: create zone (validate polygon within frame bounds), update zone, delete zone, calculate area from polygon
    - Create `packages/api/src/modules/device/zone-schema.ts`: Zod schemas for polygon points array validation
    - Create `packages/api/src/modules/device/zone-routes.ts`: GET/POST/PUT/DELETE /farm/coverage-zones
    - _Requirements: 9.1, 9.2, 9.3, 9.4_


  - [ ]* 10.2 Write property test for coverage zone boundary validation
    - **Property 14: Coverage Zone Boundary Validation** - Verify polygon points must be within [0, frameWidth] × [0, frameHeight]
    - **Validates: Requirements 9.4**

- [ ] 11. Plot Module
  - Implement plot creation (grid split + freeform), polygon overlap validation

  - [ ] 11.1 Implement plot module core
    - Create `packages/api/src/modules/plot/repository.ts`: CRUD for plots table scoped by farmId, query by coverageZoneId
    - Create `packages/api/src/modules/plot/service.ts`: create freeform plot (validate polygon non-overlap), grid split (generate R×C plots with A1..Z99 codes), update plot, delete plot
    - Create `packages/api/src/modules/plot/schema.ts`: Zod schemas for freeform creation (polygon, code, name), grid split params (rows, cols, coverageZoneId)
    - Create `packages/api/src/modules/plot/routes.ts`: GET/POST/PUT/DELETE /farm/plots, POST /farm/plots/grid-split
    - Implement polygon intersection detection utility in `packages/shared/src/geometry.ts`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 11.2 Write property tests for plot creation
    - **Property 12: Plot Grid Split Code Generation** - Verify R×C plots generated with unique codes, no overlap
    - **Property 13: Plot Polygon Non-Overlap Validation** - Verify rejection iff new polygon intersects existing
    - **Validates: Requirements 10.2, 10.4**

- [ ] 12. Member Module
  - Implement member management, plot bindings, subscription expiry

  - [ ] 12.1 Implement member module
    - Create `packages/api/src/modules/member/repository.ts`: CRUD for members and memberPlotBindings tables scoped by farmId
    - Create `packages/api/src/modules/member/service.ts`: add member, bind to plot (with binding config validation: exclusive/shared/multi-plot), unbind from plot (record unboundAt timestamp), update member, expiry check logic
    - Create `packages/api/src/modules/member/schema.ts`: Zod schemas for member creation, bind/unbind operations, capture schedule config
    - Create `packages/api/src/modules/member/routes.ts`: GET/POST/PUT /farm/members, POST /farm/members/:id/bind, POST /farm/members/:id/unbind, PUT /farm/members/:id/schedule
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 12.1_


  - [ ]* 12.2 Write property tests for member module
    - **Property 15: Member Subscription Expiry Transition** - Verify status="expired" iff subscription end date has passed
    - **Property 8: Multi-Tenant Data Isolation** - Verify all member queries only return data for the current farmId
    - **Validates: Requirements 11.4, 18.4**

- [ ] 13. Command Module
  - Implement command submission, state machine transitions, receipt upload

  - [ ] 13.1 Implement command module (farm side)
    - Create `packages/api/src/modules/command/repository.ts`: CRUD for commands and commandReceipts tables scoped by farmId
    - Create `packages/api/src/modules/command/service.ts`: list commands (filterable by status), accept command (pending→accepted, record workerId), reject command (pending→rejected, require reason), complete command (executing→done, require receipt), trigger notification on status change
    - Create `packages/api/src/modules/command/schema.ts`: Zod schemas for accept, reject (reason required), complete (receipt photos required)
    - Create `packages/api/src/modules/command/routes.ts`: GET /farm/commands, PUT /farm/commands/:id/accept, PUT /farm/commands/:id/reject, PUT /farm/commands/:id/complete
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ] 13.2 Implement command submission (member app side)
    - Add member command service logic: validate active binding to plot, restrict command types to water/fertilize/harvest/inspect/custom, create command record with status="pending"
    - Create member app command routes: POST /app/commands, GET /app/commands
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

  - [ ]* 13.3 Write property tests for command module
    - **Property 10: Command State Machine Valid Transitions** - Verify only valid transitions succeed; completion requires receipt; rejection requires reason
    - **Property 9: Command Authorization via Active Binding** - Verify command accepted iff member has active binding to plot
    - **Validates: Requirements 13.2, 13.3, 13.4, 21.3, 21.4**


- [ ] 14. Media and Content Module
  - Implement media upload (R2 presigned URLs), growth logs, and plot timeline

  - [ ] 14.1 Implement media module
    - Create `packages/api/src/modules/media/repository.ts`: CRUD for mediaItems and growthLogs tables scoped by farmId
    - Create `packages/api/src/modules/media/service.ts`: generate presigned R2 upload URL (with path convention), create media record after upload (validate MIME type and size: JPEG/PNG ≤10MB, MP4 ≤100MB), create growth log with media attachments
    - Create `packages/api/src/modules/media/schema.ts`: Zod schemas for presign request, media record creation, growth log creation
    - Create `packages/api/src/modules/media/routes.ts`: POST /farm/media/presign, POST /farm/media, POST /farm/growth-logs
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ] 14.2 Implement member app plot experience endpoints
    - Create member app service: get bound plots, get live data (latest analysis), get timeline (paginated, date desc), get visitor calendar (grouped by date), get visitor codex (with unlock status)
    - Create member app routes: GET /app/my-plots, GET /app/plots/:id/live, GET /app/plots/:id/timeline, GET /app/plots/:id/camera, GET /app/visitors, GET /app/codex
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

  - [ ]* 14.3 Write property tests for media and timeline
    - **Property 26: Media File Type and Size Validation** - Verify acceptance iff valid MIME + valid size
    - **Property 23: Plot Timeline Ordering** - Verify items returned in strict date descending order
    - **Property 24: Visitor Codex Unlock Consistency** - Verify unlock status matches actual visitor event existence
    - **Validates: Requirements 14.4, 22.3, 22.5**

- [ ] 15. Checkpoint - Core business modules verification
  - Ensure device, plot, member, command, and media modules compile and pass tests. Ask the user if questions arise.


- [ ] 16. Frame Capture Scheduler
  - Implement cron-based frame capture orchestration with Time_Wave_Config resolution

  - [ ] 16.1 Implement frame capture scheduler
    - Create `packages/api/src/scheduler/frame-capture.ts`: cron handler that loads active farms, resolves Time_Wave_Config (priority: platform override > member > farm > global), determines which cameras need capture at current time, enqueues capture jobs to Cloudflare Queue
    - Implement `shouldCaptureNow()` logic: compare elapsed time since last capture against intervalSec for current time range
    - Implement `resolveTimeWaveConfig()` priority chain
    - Create `packages/api/src/modules/ai/capture-repository.ts`: CRUD for frameCaptureJobs table
    - _Requirements: 16.1, 12.3, 12.4, 3.1, 3.2, 3.3_

  - [ ] 16.2 Implement frame capture queue consumer
    - Create `packages/api/src/queue/frame-capture.ts`: queue consumer that processes capture jobs - request snapshot via protocol adapter (Ezviz API / RTSP), store frame in R2 with path `{farm_id}/{plot_id}/{YYYY-MM-DD}/{timestamp}.jpg`, enqueue LLM analysis job, handle failures with single retry after 30s
    - Create `packages/api/src/modules/device/adapters/ezviz.ts`: Ezviz cloud snapshot adapter
    - Create `packages/api/src/modules/device/adapters/rtsp.ts`: RTSP frame grab adapter (placeholder)
    - Create `packages/api/src/modules/device/adapters/index.ts`: adapter factory by protocol type
    - _Requirements: 16.2, 16.3, 16.4, 16.5_

  - [ ]* 16.3 Write property tests for frame capture scheduling
    - **Property 16: Capture Scheduling Correctness** - Verify capture triggered iff elapsed >= intervalSec for current time range
    - **Property 4: Time_Wave_Config Resolution Priority Chain** - Verify priority chain: platform override > member > farm > global
    - **Property 27: R2 Path Format Correctness** - Verify stored path matches `{farm_id}/{plot_id}/{YYYY-MM-DD}/{timestamp}.jpg`
    - **Validates: Requirements 16.1, 16.3, 3.3, 12.3, 12.4**


- [ ] 17. LLM Analysis Pipeline
  - Implement queue consumer for AI analysis with adapter pattern, context assembly, significance detection

  - [ ] 17.1 Implement LLM adapter interface and implementations
    - Create `packages/api/src/modules/ai/adapters/types.ts`: `LLMAdapter` interface, `AnalysisRequest`, `AnalysisResult` types
    - Create `packages/api/src/modules/ai/adapters/qwen-vl.ts`: Qwen VL adapter implementation
    - Create `packages/api/src/modules/ai/adapters/gpt4v.ts`: GPT-4V adapter implementation
    - Create `packages/api/src/modules/ai/adapters/custom.ts`: custom endpoint adapter
    - Create `packages/api/src/modules/ai/adapters/index.ts`: adapter factory by adapter type
    - _Requirements: 4.1_

  - [ ] 17.2 Implement LLM analysis queue consumer
    - Create `packages/api/src/queue/llm-analysis.ts`: dequeue job, fetch context (last 5 analyses for the plot), build prompt with plot metadata, route to active model (selectModel), parse response, store plotAnalyses record, match visitors to assets (matchAsset), check significance (checkSignificance), enqueue notification if significant
    - Create `packages/api/src/modules/ai/analysis-service.ts`: context assembly (min(N,5) previous results), significance detection logic, asset matching integration
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ]* 17.3 Write property tests for LLM analysis pipeline
    - **Property 17: LLM Context Window Assembly** - Verify exactly min(N,5) previous results, most recent first
    - **Property 18: Significance Detection Triggers Notification** - Verify notification iff growth stage change OR pest/disease OR person confidence > 80%
    - **Validates: Requirements 17.1, 17.4**

- [ ] 18. Notification System
  - Implement notification queue consumer with channel routing, retry logic, and delivery

  - [ ] 18.1 Implement notification module
    - Create `packages/api/src/modules/notify/repository.ts`: CRUD for notifications and notificationPreferences tables
    - Create `packages/api/src/modules/notify/service.ts`: create notification, resolve channel (SMS for critical, user preference, then system default), format message by type, trigger notification delivery via queue
    - Create `packages/api/src/modules/notify/schema.ts`: Zod schemas for notification creation, preference management
    - Create `packages/api/src/modules/notify/routes.ts`: GET /app/notifications, PUT /app/notifications/:id/read
    - _Requirements: 23.1, 23.4_


  - [ ] 18.2 Implement notification delivery queue consumer
    - Create `packages/api/src/queue/notification.ts`: dequeue notification job, resolve channel (resolveChannel function), deliver via channel adapter (WeChat template / SMS / in-app push), update delivery status, implement retry with exponential backoff (3 retries, 1s/2s/4s), mark as "failed" after exhaustion
    - Create `packages/api/src/modules/notify/channels/wechat.ts`: WeChat subscription message adapter
    - Create `packages/api/src/modules/notify/channels/sms.ts`: SMS delivery adapter
    - Create `packages/api/src/modules/notify/channels/in-app.ts`: in-app notification (persist only)
    - _Requirements: 23.2, 23.3, 23.5_

  - [ ]* 18.3 Write property tests for notification system
    - **Property 19: Notification Retry Exhaustion** - Verify 3 retries with exponential backoff, then status="failed"
    - **Property 20: Notification Channel Routing** - Verify SMS for critical; user preference; then system default
    - **Validates: Requirements 23.1, 23.3, 23.5**

- [ ] 19. Billing Module
  - Implement invoice generation, usage tracking, overdue escalation

  - [ ] 19.1 Implement billing module
    - Create `packages/api/src/modules/billing/repository.ts`: CRUD for subscriptions, usageRecords, invoices tables
    - Create `packages/api/src/modules/billing/service.ts`: calculate invoice (baseFee + overages), generate invoice at period end, record usage, track overdue status, escalation logic (7d→past_due, 30d→suspend farm)
    - Create `packages/api/src/modules/billing/routes.ts`: GET /admin/billing/invoices
    - Create `packages/api/src/scheduler/billing-cycle.ts`: cron handler for period-end invoice generation and overdue checks
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 19.2 Write property tests for billing
    - **Property 11: Invoice Calculation Correctness** - Verify total = baseFee + max(0, aiCalls-included)×overagePrice + max(0, storage-included)×overagePrice; never negative
    - **Property 25: Billing Overdue Escalation** - Verify past_due iff overdue > 7 days; suspension iff past_due > 30 days
    - **Validates: Requirements 7.1, 7.3, 7.4**


- [ ] 20. Member Expiry Scheduler
  - Implement subscription expiry cron and notification triggers

  - [ ] 20.1 Implement member expiry scheduler
    - Create `packages/api/src/scheduler/member-expiry.ts`: cron handler that checks all active members, transitions expired members to status="expired", sends notifications at 7d/3d/day-of before expiry
    - Wire into the Hono app scheduled handler alongside frame-capture and billing-cycle
    - _Requirements: 11.4_

- [ ] 21. Checkpoint - Backend API complete
  - Ensure all API modules compile, all scheduled handlers are wired, queue consumers registered, and existing tests pass. Ask the user if questions arise.

- [ ] 22. Farm Dashboard Endpoint
  - Implement farm-side dashboard metrics

  - [ ] 22.1 Implement farm dashboard
    - Add to `packages/api/src/modules/farm/service.ts`: dashboard metrics query (total plots by status, active members, pending commands, device status summary, per-plot health scores from latest analysis, offline devices > 10min, last 24h command activity)
    - Add route GET /farm/dashboard to farm routes
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 23. Real-Time WebSocket (Durable Objects)
  - Implement plot-level real-time updates via Durable Objects

  - [ ] 23.1 Implement PlotRealtimeDO Durable Object
    - Create `packages/api/src/durable-objects/plot-realtime.ts`: WebSocket handling, session management, event broadcast, event buffer (last 100 events with sequence numbers), reconnection replay from lastSeq
    - Export DO class from `packages/api/src/index.ts`
    - Update `wrangler.toml` with DO binding configuration
    - _Requirements: 19.1, 19.2, 19.3_


  - [ ] 23.2 Implement WebSocket route and event push integration
    - Add WebSocket upgrade route: GET /app/ws/plot/:plotId (authenticate via query token, connect to PlotRealtimeDO)
    - Add event push helper: when plot status changes (new analysis, command update, new media), POST event to the plot's DO for broadcast
    - Wire event push into command service, analysis consumer, and media service
    - _Requirements: 19.1, 19.2_

  - [ ]* 23.3 Write property test for WebSocket replay
    - **Property 28: WebSocket Event Replay on Reconnection** - Verify events with seq > lastSeq sent in ascending order; no events with seq ≤ lastSeq
    - **Validates: Requirements 19.3**

- [ ] 24. Checkpoint - Backend fully wired
  - Ensure all modules, schedulers, queues, and Durable Objects are integrated. Run full test suite. Ask the user if questions arise.

- [ ] 25. Admin Frontend - Project Setup and Layout
  - Initialize Next.js admin app with shared components

  - [ ] 25.1 Initialize admin frontend project
    - Create `apps/admin/package.json` with deps: next, react, react-dom, tailwindcss, @tanstack/react-query, zod
    - Create `apps/admin/next.config.ts` with Cloudflare Pages adapter (@opennextjs/cloudflare or static export)
    - Create `apps/admin/tsconfig.json` referencing shared package
    - Create `apps/admin/tailwind.config.ts` and `app/globals.css`
    - Create `apps/admin/app/layout.tsx`: admin shell with sidebar navigation (Dashboard, Farms, Plans, Models, Assets, Config, Billing)
    - Create shared UI components: `components/ui/table.tsx`, `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/form.tsx`, `components/ui/pagination.tsx`
    - Create API client utility: `lib/api.ts` with typed fetch wrapper, auth token management
    - _Requirements: 6.1_


- [ ] 26. Admin Frontend - Dashboard and Farm Management Pages
  - Implement platform dashboard and farm lifecycle management UI

  - [ ] 26.1 Implement admin dashboard page
    - Create `apps/admin/app/dashboard/page.tsx`: display total farms by status, total members, active sessions, monthly revenue; time-range filter (today/7d/30d/custom); auto-refresh every 5 min
    - Create dashboard data hooks using @tanstack/react-query
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 26.2 Implement farm management pages
    - Create `apps/admin/app/farms/page.tsx`: paginated farm list with status filter tabs (all/pending/active/suspended), search by name
    - Create `apps/admin/app/farms/[id]/page.tsx`: farm detail view with action buttons (Approve, Suspend, Delete), plan assignment dropdown, time-wave override editor
    - Implement farm actions (approve/suspend/delete) with confirmation dialogs
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.4, 3.3_

- [ ] 27. Admin Frontend - Plan, Model, Asset, Config Pages
  - Implement remaining admin CRUD pages

  - [ ] 27.1 Implement plan management page
    - Create `apps/admin/app/plans/page.tsx`: plan list table with inline editing; create plan dialog with fields (name, member range, pricing); plan tier visualization
    - _Requirements: 2.1, 2.2_

  - [ ] 27.2 Implement AI model management page
    - Create `apps/admin/app/models/page.tsx`: model version list with status badges; action buttons (Activate, Deprecate, Set Testing %); register new model dialog
    - _Requirements: 4.1, 4.2, 4.3, 4.4_


  - [ ] 27.3 Implement asset library page
    - Create `apps/admin/app/assets/page.tsx`: asset grid view with category filter tabs; upload asset dialog (image file + metadata); edit metadata; delete with confirmation
    - _Requirements: 5.1, 5.2_

  - [ ] 27.4 Implement config and billing pages
    - Create `apps/admin/app/config/page.tsx`: global Time_Wave_Config editor (JSON visual editor with time range inputs), platform settings
    - Create `apps/admin/app/billing/page.tsx`: invoice list table with farm name, period, amount, status; filter by status
    - Create `apps/admin/app/billing/[farmId]/page.tsx`: farm billing detail with usage breakdown, invoice history
    - _Requirements: 3.1, 3.2, 7.1, 7.3_

- [ ] 28. Checkpoint - Admin frontend complete
  - Ensure admin app builds, all pages render, and API calls are correctly wired. Ask the user if questions arise.

- [ ] 29. Farm Frontend - Project Setup and Layout
  - Initialize Next.js farm app with shared components

  - [ ] 29.1 Initialize farm frontend project
    - Create `apps/farm/package.json` with deps: next, react, react-dom, tailwindcss, @tanstack/react-query, zod
    - Create `apps/farm/next.config.ts` with Cloudflare Pages adapter
    - Create `apps/farm/tsconfig.json` referencing shared package
    - Create `apps/farm/tailwind.config.ts` and `app/globals.css`
    - Create `apps/farm/app/layout.tsx`: farm shell with navigation (Dashboard, Devices, Plots, Members, Commands, Content, Settings)
    - Create API client utility: `lib/api.ts` with typed fetch wrapper and farm auth token management
    - _Requirements: 15.1_


- [ ] 30. Farm Frontend - Dashboard and Device Pages
  - Implement farm dashboard and camera management UI

  - [ ] 30.1 Implement farm dashboard page
    - Create `apps/farm/app/dashboard/page.tsx`: total plots by status, active members, pending commands, device status; per-plot health scores from latest analysis; offline device alerts (>10 min); 24h command activity chart
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ] 30.2 Implement device management pages
    - Create `apps/farm/app/devices/page.tsx`: camera list with status indicators (online/weak/offline badge), last heartbeat
    - Create `apps/farm/app/devices/add/page.tsx`: add camera wizard (protocol selection, credentials input, connectivity test)
    - Create `apps/farm/app/devices/[id]/page.tsx`: camera detail with live snapshot display, coverage zone polygon editor (canvas-based drawing tool), zone list
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4_

- [ ] 31. Farm Frontend - Plot and Member Pages
  - Implement plot management and member binding UI

  - [ ] 31.1 Implement plot management pages
    - Create `apps/farm/app/plots/page.tsx`: plot grid/list view with status badges, occupancy info
    - Create `apps/farm/app/plots/create/page.tsx`: dual-mode creation (grid split with row×col inputs over coverage zone, OR freeform polygon drawing on canvas); live overlap validation feedback
    - Create `apps/farm/app/plots/[id]/page.tsx`: plot detail with analysis history, current crop info, bound members list
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_


  - [ ] 31.2 Implement member management pages
    - Create `apps/farm/app/members/page.tsx`: member list with status, subscription dates, bound plot count
    - Create `apps/farm/app/members/add/page.tsx`: add member form (contact info, nickname, subscription dates)
    - Create `apps/farm/app/members/[id]/page.tsx`: member detail with plot bindings list, bind/unbind actions, capture schedule editor (Time_Wave_Config visual editor)
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 12.1_

- [ ] 32. Farm Frontend - Command and Content Pages
  - Implement command queue and content publishing UI

  - [ ] 32.1 Implement command management pages
    - Create `apps/farm/app/commands/page.tsx`: command queue with status tabs (pending/accepted/done/rejected), member name, plot code, command type
    - Create `apps/farm/app/commands/[id]/page.tsx`: command detail with action buttons (Accept/Reject/Complete); reject requires reason textarea; complete requires photo upload (receipt); receipt photo preview
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ] 32.2 Implement content publishing pages
    - Create `apps/farm/app/content/page.tsx`: media gallery grid with growth log timeline view
    - Create `apps/farm/app/content/publish/page.tsx`: upload form with plot selector, media type picker (photo/video), caption, growth log creation (date, event type, content, media attachments)
    - Implement R2 presigned upload flow: request presign → upload direct to R2 → create media record
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ] 32.3 Implement farm settings page
    - Create `apps/farm/app/settings/page.tsx`: farm profile editing, default capture schedule config, farm-level Time_Wave_Config editor
    - _Requirements: 12.1_


- [ ] 33. Checkpoint - Farm frontend complete
  - Ensure farm app builds, all pages render, and API calls are correctly wired. Ask the user if questions arise.

- [ ] 34. API Integration Wiring and Module Registration
  - Wire all modules together in the Hono app entry point

  - [ ] 34.1 Complete API entry point with all module routes
    - Update `packages/api/src/index.ts`: register all module routes (auth, farm, device, plot, member, command, media, ai, notify, billing, config), mount middleware stack (cors, rate-limit, auth, rbac, tenant-isolation, error-handler), register scheduled handlers (frame-capture, member-expiry, billing-cycle), register queue consumers (frame-capture, llm-analysis, notification, media-process), export DO classes
    - Ensure all routes follow URL convention: /api/v1/admin/..., /api/v1/farm/..., /api/v1/app/..., /api/v1/public/...
    - _Requirements: 18.1, 18.5, 20.1_

  - [ ] 34.2 Implement horizontal scaling configuration
    - Configure D1 read replicas usage for read-heavy queries (dashboard, listings, timelines) in repository layer
    - Configure multi-consumer parallel processing for queue consumers in wrangler.toml
    - Configure R2 CDN distribution for static assets
    - Document DO sharding strategy in code comments
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 35. Final Checkpoint - Full platform integration
  - Ensure entire platform compiles end-to-end: API with all modules, admin frontend, farm frontend. Run full test suite. Ask the user if questions arise.


## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key integration points
- Property tests validate universal correctness properties from the design document
- The `apps/client` directory (member frontend) already exists and is NOT part of this implementation plan
- All API endpoints follow RESTful conventions with JSON bodies, pagination, and standardized error responses
- TypeScript is used throughout: Hono + Cloudflare Workers for API, Next.js for admin/farm frontends
- Multi-tenant isolation is enforced at middleware level — every query scoped by farm_id
- The platform supports three deployment targets: Cloudflare Workers (API), Cloudflare Pages (admin, farm frontends)

## Framework Decisions (Prefer Mature Over Custom)

| Domain | Framework | Rationale |
|--------|-----------|-----------|
| API Validation | `@hono/zod-validator` | Built-in middleware-level validation, less boilerplate |
| Admin Frontend | `Refine` + `Ant Design` | Auto-generates CRUD pages from REST API data provider |
| Farm Frontend | `Next.js` + `shadcn/ui` + `TanStack Table/Query` | Standard component library with data table support |
| LLM Integration | `Vercel AI SDK` (`ai` package) | Unified interface for OpenAI/Qwen/Anthropic, `generateObject()` for structured output |
| File Upload | `@aws-sdk/s3-request-presigner` | Standard S3-compatible presigned URLs for R2 |
| Notifications | Cloudflare Queues native retry + `wechat-api-next` | Queue retries are built-in; WeChat SDK handles template messages |
| Time Parsing | `cron-parser` | Mature cron expression parser for schedule evaluation |
| ID Generation | `nanoid` | Already in use |
| Date Handling | Native `Date` + `Intl` | No heavy date libs needed for ISO timestamps |

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 4, "tasks": ["3.4", "3.5"] },
    { "id": 5, "tasks": ["4.1", "5.1", "5.2"] },
    { "id": 6, "tasks": ["4.2", "4.3", "5.3", "6.1"] },
    { "id": 7, "tasks": ["6.2", "7.1"] },
    { "id": 8, "tasks": ["7.2", "9.1"] },
    { "id": 9, "tasks": ["10.1", "11.1"] },
    { "id": 10, "tasks": ["10.2", "11.2", "12.1"] },
    { "id": 11, "tasks": ["12.2", "13.1"] },
    { "id": 12, "tasks": ["13.2", "13.3", "14.1"] },
    { "id": 13, "tasks": ["14.2", "14.3"] },
    { "id": 14, "tasks": ["16.1", "18.1"] },
    { "id": 15, "tasks": ["16.2", "16.3", "17.1"] },
    { "id": 16, "tasks": ["17.2", "18.2"] },
    { "id": 17, "tasks": ["17.3", "18.3", "19.1"] },
    { "id": 18, "tasks": ["19.2", "20.1"] },
    { "id": 19, "tasks": ["22.1", "23.1"] },
    { "id": 20, "tasks": ["23.2", "23.3"] },
    { "id": 21, "tasks": ["25.1", "29.1"] },
    { "id": 22, "tasks": ["26.1", "26.2", "30.1", "30.2"] },
    { "id": 23, "tasks": ["27.1", "27.2", "27.3", "27.4", "31.1", "31.2"] },
    { "id": 24, "tasks": ["32.1", "32.2", "32.3"] },
    { "id": 25, "tasks": ["34.1"] },
    { "id": 26, "tasks": ["34.2"] }
  ]
}
```

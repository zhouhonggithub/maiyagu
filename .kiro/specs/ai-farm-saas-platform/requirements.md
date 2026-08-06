# Requirements Document

## Introduction

The AI Farm SaaS Platform is a multi-tenant digital experience platform designed for CSA (Community Supported Agriculture) and shared farms in China. The platform follows a three-tier model: Platform (manages farms) → Farm (manages plots and members) → User (land renters who experience their plots). The business model charges farms based on account activation and tiered pricing by user count. The platform leverages Cloudflare's edge infrastructure (Workers, D1, R2, Queues, Durable Objects) with Hono as the API framework and Next.js for admin/farm frontends.

## Glossary

- **Platform**: The top-level SaaS system operated by the platform owner, responsible for onboarding farms, managing AI models, billing, and global configuration
- **Farm**: A registered agricultural entity (CSA/shared farm) that uses the platform to manage plots, devices, and members
- **Member**: A user (land renter) who has subscribed to a plot within a farm
- **Plot**: A defined area of farmland assigned to one or more members for cultivation
- **Coverage_Zone**: A polygon-annotated region on a camera feed that defines the observable area of the camera
- **Camera**: A video capture device (Ezviz cloud, RTSP, or custom stream) connected to a farm for monitoring plots
- **Command**: A farm task instruction issued by a member (e.g., water, fertilize, harvest) that farm workers execute
- **Frame_Capture**: A scheduled snapshot taken from a camera stream for AI analysis
- **Time_Wave_Config**: A JSON configuration defining time ranges and capture intervals for frame scheduling (e.g., [{timeRange: "06:00-18:00", intervalSec: 10}])
- **LLM_Analysis**: AI-powered analysis of captured frames to detect crop status, growth stage, visitors, and anomalies
- **Asset_Library**: A collection of cartoon images used to map detected elements (crops, visitors) to visual representations
- **Farm_Plan**: A tiered subscription plan assigned to a farm based on the number of members (0-50, 50-200, 200+)
- **Receipt**: Photo and text evidence uploaded by farm workers upon completing a command
- **Durable_Object**: A Cloudflare stateful compute primitive used for real-time WebSocket communication, sharded by farm or plot entity
- **Modular_Monolith**: The backend architecture pattern where all modules (auth, farm, device, plot, member, command, media, ai, notify, billing) coexist in a single deployment but maintain clear boundaries
- **Multi_Tenant_Isolation**: The security pattern ensuring all data queries are scoped by farm_id to prevent cross-farm data access

## Requirements

### Requirement 1: Farm Lifecycle Management

**User Story:** As a platform administrator, I want to manage the full lifecycle of farms (onboarding review, activation, suspension, deletion), so that I can control which farms operate on the platform.

#### Acceptance Criteria

1. WHEN a farm submits an onboarding application, THE Platform SHALL create a farm record with status "pending" and notify the platform administrator.
2. WHEN the platform administrator approves a pending farm, THE Platform SHALL change the farm status to "active" and enable API access for the farm owner.
3. WHEN the platform administrator suspends an active farm, THE Platform SHALL change the farm status to "suspended" and disable all API access for the farm and its members.
4. WHEN the platform administrator deletes a suspended farm, THE Platform SHALL mark the farm record as deleted and archive all associated data (plots, members, media, commands).
5. IF a farm application contains incomplete required fields, THEN THE Platform SHALL reject the submission with a list of missing fields.

### Requirement 2: Farm Plan Management

**User Story:** As a platform administrator, I want to manage tiered subscription plans based on member count, so that farms are billed appropriately for their usage.

#### Acceptance Criteria

1. THE Platform SHALL support at least three plan tiers: basic (0-50 members), pro (50-200 members), and flagship (200+ members).
2. WHEN the platform administrator creates or updates a plan tier, THE Platform SHALL persist the plan name, member count range, and pricing details.
3. WHEN a farm's active member count exceeds the current plan tier limit, THE Platform SHALL notify the farm owner that a plan upgrade is required.
4. WHEN the platform administrator assigns a plan to a farm, THE Platform SHALL update the farm's subscription record and adjust billing accordingly.

### Requirement 3: Global Video Frame Capture Strategy Configuration

**User Story:** As a platform administrator, I want to configure global frame capture strategies with optional per-farm overrides, so that video analysis runs efficiently across all farms.

#### Acceptance Criteria

1. THE Platform SHALL store a global default Time_Wave_Config applicable to all farms that have no farm-specific override.
2. WHEN the platform administrator updates the global Time_Wave_Config, THE Platform SHALL apply the new configuration to all farms without a farm-specific override within 60 seconds.
3. WHERE a farm has a platform-level override configured, THE Platform SHALL use the override Time_Wave_Config instead of the global default for that farm.
4. THE Platform SHALL validate that Time_Wave_Config entries contain non-overlapping time ranges covering a full 24-hour period and positive integer interval values.

### Requirement 4: AI Model Versioning and Management

**User Story:** As a platform administrator, I want to manage AI model versions (Qwen VL, GPT-4V, or custom adapters), so that I can upgrade or roll back models used for frame analysis.

#### Acceptance Criteria

1. THE Platform SHALL maintain a registry of AI model versions with fields: model name, version identifier, adapter type, endpoint URL, and status (active/deprecated/testing).
2. WHEN the platform administrator activates a new model version, THE Platform SHALL route all new LLM_Analysis jobs to the activated model version.
3. WHEN the platform administrator deprecates a model version, THE Platform SHALL prevent new analysis jobs from using the deprecated version while allowing in-progress jobs to complete.
4. THE Platform SHALL support a "testing" status that routes a configurable percentage of analysis jobs to the testing model for validation.

### Requirement 5: Asset Library Management

**User Story:** As a platform administrator, I want to manage the cartoon asset library (crop icons, visitor icons), so that AI-detected elements can be visually mapped to friendly representations.

#### Acceptance Criteria

1. THE Platform SHALL store asset entries with fields: asset ID, category (crop/visitor/status), display name, image URL, and mapping keywords.
2. WHEN the platform administrator uploads a new asset, THE Platform SHALL store the image in R2 and create the asset metadata record.
3. WHEN an LLM_Analysis detects an element, THE Platform SHALL match the detection result to the most relevant asset entry using mapping keywords.
4. IF no matching asset exists for a detected element, THEN THE Platform SHALL use a default placeholder asset for the corresponding category.

### Requirement 6: Platform Dashboard

**User Story:** As a platform administrator, I want to view a dashboard showing farms count, total members, active sessions, and revenue, so that I can monitor platform health.

#### Acceptance Criteria

1. WHEN the platform administrator opens the dashboard, THE Platform SHALL display: total farm count (by status), total member count, active session count, and monthly revenue.
2. THE Platform SHALL update dashboard metrics at intervals no longer than 5 minutes.
3. THE Platform SHALL display metrics with time-range filtering (today, last 7 days, last 30 days, custom range).

### Requirement 7: Billing and Invoice Management

**User Story:** As a platform administrator, I want to manage billing and generate invoices for farms, so that the platform generates revenue from farm subscriptions.

#### Acceptance Criteria

1. WHEN a farm's billing period ends, THE Platform SHALL generate an invoice containing the base subscription fee plus any overage charges (AI calls, storage).
2. THE Platform SHALL record usage quantities (AI calls, storage in GB, bandwidth) per farm per billing period.
3. WHEN a farm payment is overdue by more than 7 days, THE Platform SHALL change the farm subscription status to "past_due" and send a reminder notification.
4. IF a farm subscription remains in "past_due" status for more than 30 days, THEN THE Platform SHALL suspend the farm automatically.

### Requirement 8: Camera Onboarding

**User Story:** As a farm owner, I want to onboard cameras (Ezviz cloud, RTSP, or custom stream URL), so that I can capture video of my farm plots.

#### Acceptance Criteria

1. WHEN a farm owner adds a camera, THE Farm_Portal SHALL accept the protocol type (ezviz_cloud, rtsp, custom_stream), stream URL or device credentials, and a descriptive name.
2. WHEN a camera is successfully registered, THE Farm_Portal SHALL verify connectivity by requesting a test frame within 30 seconds.
3. IF a camera connectivity test fails, THEN THE Farm_Portal SHALL display the error reason and retain the camera record with status "offline".
4. THE Farm_Portal SHALL display all cameras for the current farm with their current status (online, weak, offline) and last heartbeat timestamp.

### Requirement 9: Coverage Zone Annotation

**User Story:** As a farm owner, I want to annotate coverage zones on camera feeds using polygon drawing, so that I can define which areas each camera monitors.

#### Acceptance Criteria

1. WHEN a farm owner selects a camera with "online" status, THE Farm_Portal SHALL display a live or recent snapshot and provide polygon drawing tools.
2. WHEN a farm owner completes a polygon annotation, THE Farm_Portal SHALL save the coverage zone with: camera ID, polygon coordinates (array of [x,y] points), zone name, and calculated area.
3. THE Farm_Portal SHALL allow a farm owner to edit or delete existing coverage zones for any camera owned by the farm.
4. THE Farm_Portal SHALL prevent coverage zone polygons from extending beyond the camera frame boundaries.

### Requirement 10: Plot Creation and Management

**User Story:** As a farm owner, I want to create plots within coverage zones using grid split or freeform drawing, so that I can define rentable land units.

#### Acceptance Criteria

1. WHEN a farm owner selects a coverage zone, THE Farm_Portal SHALL offer two plot creation modes: grid split (rows × columns) and freeform polygon drawing.
2. WHEN a farm owner creates a plot via grid split, THE Farm_Portal SHALL generate plot records with auto-assigned codes (A1, A2, B1, B2...) within the selected coverage zone.
3. WHEN a farm owner creates a plot via freeform mode, THE Farm_Portal SHALL save the custom polygon coordinates and allow manual code/name assignment.
4. THE Farm_Portal SHALL validate that new plot polygons do not overlap with existing plots within the same coverage zone.
5. THE Farm_Portal SHALL allow plot creation without a coverage zone for farms operating without cameras (simplified mode with manual coordinates).

### Requirement 11: Member Management

**User Story:** As a farm owner, I want to add members, bind them to plots, and manage their subscription expiry, so that I can operate a shared farming business.

#### Acceptance Criteria

1. WHEN a farm owner adds a member, THE Farm_Portal SHALL create a member record with: user contact info, nickname, subscription start date, subscription end date, and status "active".
2. WHEN a farm owner binds a member to a plot, THE Farm_Portal SHALL create a member-plot binding record with the binding timestamp.
3. THE Farm_Portal SHALL support three binding configurations: one plot to one member (exclusive), one plot to many members (shared), and one member to many plots.
4. WHEN a member's subscription end date is reached, THE Farm_Portal SHALL change the member status to "expired" and send notifications at 7 days, 3 days, and day-of expiry.
5. WHEN a farm owner unbinds a member from a plot, THE Farm_Portal SHALL record the unbind timestamp and update the member's available plots.

### Requirement 12: Video Frame Capture Scheduling

**User Story:** As a farm owner, I want to configure per-member frame capture schedules with time-wave configurations, so that frame captures are optimized for each member's viewing needs.

#### Acceptance Criteria

1. WHEN a farm owner configures a member's capture schedule, THE Farm_Portal SHALL accept a Time_Wave_Config array with timeRange (HH:MM-HH:MM format) and intervalSec (positive integer) entries.
2. THE Farm_Portal SHALL validate that the Time_Wave_Config entries cover a full 24-hour period without gaps or overlaps.
3. WHILE a platform-level override exists for the farm, THE Frame_Capture_Scheduler SHALL use the platform override instead of the farm-configured Time_Wave_Config.
4. WHEN no per-member configuration exists, THE Frame_Capture_Scheduler SHALL fall back to the farm default, then to the global platform default Time_Wave_Config.

### Requirement 13: Command and Task Management (Farm Side)

**User Story:** As a farm worker, I want to receive, accept, execute, and complete commands with photo receipt proof, so that members can see their farming tasks fulfilled.

#### Acceptance Criteria

1. WHEN a new command is submitted by a member, THE Farm_Portal SHALL display the command in the pending commands list with: member name, plot code, command type, and description.
2. WHEN a farm worker accepts a command, THE Farm_Portal SHALL update the command status to "accepted" and record the accepting worker ID and timestamp.
3. WHEN a farm worker completes a command, THE Farm_Portal SHALL require at least one receipt photo and update the command status to "done".
4. WHEN a farm worker rejects a command, THE Farm_Portal SHALL require a rejection reason and update the command status to "rejected".
5. WHEN a command status changes, THE Farm_Portal SHALL trigger a notification to the corresponding member.

### Requirement 14: Content Publishing

**User Story:** As a farm owner or worker, I want to publish photos, videos, and growth logs to members, so that members can track their plot's progress.

#### Acceptance Criteria

1. WHEN a farm worker uploads media content, THE Farm_Portal SHALL store the file in R2 with structured naming ({farm_id}/{plot_id}/{timestamp}_{type}) and create a media record.
2. WHEN a farm worker creates a growth log, THE Farm_Portal SHALL associate the log with a plot, date, event type (plant/care/harvest/observation), and optional media attachments.
3. WHEN content is published, THE Farm_Portal SHALL make the content visible in the corresponding member's plot timeline within 10 seconds.
4. THE Farm_Portal SHALL support media types: JPEG/PNG images (max 10MB), MP4 videos (max 100MB).

### Requirement 15: Farm Dashboard

**User Story:** As a farm owner, I want to view a dashboard showing plot health, member activity, and device status, so that I can monitor overall farm operations.

#### Acceptance Criteria

1. WHEN a farm owner opens the farm dashboard, THE Farm_Portal SHALL display: total plots (by status), active member count, pending commands count, and device status summary.
2. THE Farm_Portal SHALL display per-plot health scores derived from the most recent LLM_Analysis results.
3. THE Farm_Portal SHALL highlight devices with "offline" status for more than 10 minutes.
4. THE Farm_Portal SHALL display the last 24 hours of command activity (submitted, completed, rejected counts).

### Requirement 16: Frame Capture Pipeline

**User Story:** As a platform operator, I want an automated pipeline that captures frames from cameras based on Time_Wave_Config schedules, so that AI analysis can run continuously.

#### Acceptance Criteria

1. WHEN a cron trigger fires, THE Frame_Capture_Scheduler SHALL read all active Time_Wave_Config entries and determine which cameras require a frame capture at the current time.
2. WHEN a frame capture is triggered, THE Frame_Capture_Scheduler SHALL request a snapshot via the appropriate protocol (Ezviz API snapshot or RTSP frame grab).
3. WHEN a frame is successfully captured, THE Frame_Capture_Scheduler SHALL store the frame in R2 with path format: {farm_id}/{plot_id}/{YYYY-MM-DD}/{timestamp}.jpg.
4. WHEN a frame is stored, THE Frame_Capture_Scheduler SHALL enqueue an LLM analysis job to Cloudflare Queues with the frame URL and context metadata.
5. IF a frame capture fails (camera offline, timeout), THEN THE Frame_Capture_Scheduler SHALL log the failure and retry once after 30 seconds before marking the capture as failed.

### Requirement 17: LLM Analysis Pipeline

**User Story:** As a platform operator, I want AI analysis of captured frames to detect crop status, growth stage, visitors, and anomalies, so that members receive intelligent insights.

#### Acceptance Criteria

1. WHEN an LLM analysis job is dequeued, THE LLM_Analysis_Service SHALL send the frame to the active AI model along with context from the previous 5 frames' analysis results for trend detection.
2. WHEN the AI model returns a result, THE LLM_Analysis_Service SHALL extract and store: crop status, growth stage estimate, visitor detections (with type and confidence), and anomaly flags.
3. WHEN a visitor is detected, THE LLM_Analysis_Service SHALL map the detected entity to the corresponding Asset_Library entry using category and keyword matching.
4. WHEN a significant change is detected (ripeness state change, pest detection, unknown visitor with confidence > 80%), THE LLM_Analysis_Service SHALL enqueue a notification job for the affected member.
5. THE LLM_Analysis_Service SHALL log every analysis result with: frame URL, model version used, processing duration, result payload, and confidence scores.

### Requirement 18: Backend API Architecture

**User Story:** As a developer, I want a modular monolith API on Hono + Cloudflare Workers with proper authentication, multi-tenant isolation, and RESTful conventions, so that all portals have a consistent and secure backend.

#### Acceptance Criteria

1. THE Backend_API SHALL organize code into modules: auth, farm, device, plot, member, command, media, ai, notify, and billing, each with independent routes, services, and repository layers.
2. THE Backend_API SHALL authenticate all non-public endpoints using JWT Bearer tokens with access token validity of 2 hours and refresh token validity of 7 days.
3. THE Backend_API SHALL enforce role-based access control with roles: platform_admin, farm_owner, farm_worker, and member.
4. THE Backend_API SHALL inject the current farm_id into all data queries via middleware to enforce Multi_Tenant_Isolation, preventing cross-farm data access.
5. THE Backend_API SHALL follow RESTful conventions with JSON request/response bodies, pagination (page/pageSize parameters), sorting, filtering, and standardized error responses ({code, message, details}).
6. THE Backend_API SHALL use Drizzle ORM with Cloudflare D1 for structured data persistence.
7. THE Backend_API SHALL use Cloudflare R2 for file storage with presigned URLs for client uploads.

### Requirement 19: Real-Time Communication

**User Story:** As a member, I want to receive real-time updates about my plot status and command progress, so that I stay informed without manual refreshing.

#### Acceptance Criteria

1. WHEN a member connects to the real-time endpoint, THE Backend_API SHALL establish a WebSocket connection via a Durable_Object sharded by plot entity.
2. WHEN a plot's status changes (new analysis result, command status update, new media published), THE Backend_API SHALL push an event message to all connected members bound to that plot.
3. IF a WebSocket connection is interrupted, THEN THE Backend_API SHALL allow the client to reconnect and receive any missed events from the last known sequence number.

### Requirement 20: Horizontal Scaling

**User Story:** As a platform operator, I want the system to scale horizontally to handle increasing load from multiple farms, so that performance remains stable as the platform grows.

#### Acceptance Criteria

1. THE Backend_API SHALL deploy as stateless Cloudflare Workers that auto-scale based on request volume.
2. THE Backend_API SHALL use D1 read replicas for read-heavy queries (dashboard metrics, plot listings, timeline views).
3. THE Backend_API SHALL process queue jobs using multi-consumer parallel processing for frame capture and LLM analysis workloads.
4. THE Backend_API SHALL shard Durable_Objects by farm and plot entity to distribute WebSocket connection load.
5. THE Backend_API SHALL serve static assets (media files, thumbnails) via R2 with CDN distribution.

### Requirement 21: Member Command Submission (User Side)

**User Story:** As a member, I want to submit farming commands (water, fertilize, harvest, inspect) for my plots, so that I can direct farm activities remotely.

#### Acceptance Criteria

1. WHEN a member submits a command, THE Backend_API SHALL create a command record with: farm_id, member_id, plot_id, command type, description, and status "pending".
2. THE Backend_API SHALL restrict command types to: water, fertilize, harvest, inspect, and custom.
3. THE Backend_API SHALL validate that the member has an active binding to the specified plot before accepting the command.
4. IF a member submits a command for a plot the member is not bound to, THEN THE Backend_API SHALL reject the command with an authorization error.

### Requirement 22: Member Plot Experience (User Side)

**User Story:** As a member, I want to view my plots' real-time data, camera feeds, growth timelines, and visitor events, so that I can experience my farm remotely.

#### Acceptance Criteria

1. WHEN a member requests their plot list, THE Backend_API SHALL return only plots bound to that member within their active farm membership.
2. WHEN a member requests plot live data, THE Backend_API SHALL return the most recent LLM_Analysis result including health score, moisture, crop status, and last update timestamp.
3. WHEN a member requests the plot timeline, THE Backend_API SHALL return growth logs and media items ordered by date descending with pagination.
4. WHEN a member requests the visitor calendar, THE Backend_API SHALL return visitor detection events for the member's plots grouped by date.
5. WHEN a member requests the visitor codex, THE Backend_API SHALL return all codex entries with unlock status based on the member's historical visitor detections.

### Requirement 23: Notification Delivery

**User Story:** As a member, I want to receive timely notifications about significant events (crop changes, command updates, subscription reminders), so that I stay engaged with my farm.

#### Acceptance Criteria

1. WHEN a notification is triggered, THE Notify_Service SHALL determine the appropriate channel based on notification type and member preferences (WeChat template message, in-app, SMS).
2. WHEN a notification targets a member via WeChat, THE Notify_Service SHALL send a WeChat subscription message using the configured template.
3. WHEN a critical alert is triggered (device offline > 30 minutes, unknown person detected), THE Notify_Service SHALL send an SMS notification to the farm owner.
4. THE Notify_Service SHALL persist all notification records with delivery status (pending, sent, read) and timestamps.
5. IF a notification delivery fails, THEN THE Notify_Service SHALL retry delivery up to 3 times with exponential backoff before marking the notification as failed.

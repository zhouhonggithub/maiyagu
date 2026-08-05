# AI农场 SaaS 平台架构设计文档

## 1. 产品定位

面向江浙沪CSA/认养农场的数字化体验平台，为农场主提供智慧管理工具，为会员提供"我的农场"沉浸式体验。

**平台角色：**
- 平台方（管理端）：负责农场入驻审核、套餐管理、AI模型维护、运营支撑
- 农场方（农场端）：负责硬件接入、地块配置、会员管理、农事执行
- 用户方（用户端）：体验"我的地块"、查看实时状态、下达指令、接收通知

---

## 2. 系统架构

### 2.1 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                               │
├─────────────┬───────────────────┬───────────────────────────┤
│  管理端 Web  │  农场端 Web+小程序  │     用户端 微信小程序      │
│  (内部运营)  │   (农场主+工作人员)  │      (C端会员)           │
└──────┬──────┴────────┬──────────┴────────────┬──────────────┘
       │               │                       │
       ▼               ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway / Router                       │
│              (Cloudflare Workers - 统一入口)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   模块化单体服务层                              │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  Auth    │  Farm    │  Member  │ Command  │    Media        │
│  模块    │  模块     │  模块    │  模块     │    模块         │
├──────────┼──────────┼──────────┼──────────┼─────────────────┤
│  Plot    │  Device  │  AI      │  Notify  │   Billing       │
│  模块    │  模块     │  模块    │  模块     │    模块         │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                       数据与存储层                             │
├────────────────┬────────────────┬───────────────────────────┤
│   D1 / MySQL   │  R2 / OSS     │   第三方服务               │
│   (结构化数据)   │  (文件存储)    │  (视频云/AI推理/支付)      │
└────────────────┴────────────────┴───────────────────────────┘
```

### 2.2 架构决策：模块化单体

**选择模块化单体而非微服务，理由：**

1. 团队规模小，微服务运维成本过高（K8s、服务网格、分布式事务）
2. 业务域间数据关联紧密（地块↔摄像头↔会员↔指令），单体内直接调用更高效
3. Cloudflare Workers 的函数式部署天然支持模块化组织
4. 保留未来拆分能力：模块间通过明确接口通信，必要时可独立部署

**模块划分原则：** 按业务域划分，每个模块拥有独立的路由、Service、Repository 层。

---

## 3. 业务模块设计

### 3.1 Auth 模块（认证与权限）

```
职责：统一身份认证、多租户隔离、角色权限

角色体系：
- platform_admin  → 平台管理员（管理端）
- farm_owner      → 农场主（农场端 - 全权限）
- farm_worker     → 农场工作人员（农场端 - 执行权限）
- member          → 会员用户（用户端）

认证方式：
- 管理端：账号密码 + TOTP
- 农场端：手机号 + 验证码
- 用户端：微信授权登录

多租户隔离：
- 每个农场一个 tenant_id
- 所有业务数据带 farm_id 字段
- API 层自动注入当前 farm_id，禁止跨农场访问
```

### 3.2 Farm 模块（农场管理）

```
职责：农场生命周期管理

核心实体：Farm
字段：id, name, location, province, city, district,
      area_sqm, status(pending/active/suspended),
      plan(basic/pro/flagship), created_at

管理端操作：创建、审核、变更套餐、冻结
农场端操作：编辑基本信息、查看配额使用情况
```

### 3.3 Device 模块（设备管理）

```
职责：摄像头和传感器的接入管理

核心实体：Camera
字段：id, farm_id, name, protocol(rtsp/onvif/gb28181/cloud),
      stream_url, status(online/weak/offline),
      position_desc, last_heartbeat

核心实体：Sensor
字段：id, farm_id, name, type(soil_moisture/soil_ph/temperature/humidity),
      plot_id(nullable), last_value, last_report_at

接入方案：
- 优先对接萤石云/乐橙等消费级摄像头平台（降低硬件门槛）
- 支持 RTSP 直连（专业级农场）
- 传感器走 MQTT 上报
```

### 3.4 Plot 模块（地块管理）

```
职责：地块的创建、绘制、分配

核心实体：CoverageZone（摄像头覆盖区）
字段：id, farm_id, camera_id, polygon_points(JSON),
      name, area_sqm

核心实体：Plot（地块）
字段：id, farm_id, coverage_zone_id(nullable),
      name, code(A1/B2...), polygon_points(JSON),
      area_sqm, soil_type, irrigation_type,
      current_crop, crop_planted_at, status

地块创建流程：
1. 摄像头就绪 → 在画面上标注覆盖区（多边形坐标）
2. 在覆盖区内绘制地块（网格切分 or 自由绘制）
3. 无摄像头时：直接在地图/示意图上绘制（简化模式）
4. 多摄像头场景：多个覆盖区合并，地块可跨覆盖区

地块分配：
- 1地块 → 1会员（独占）
- 1地块 → N会员（共享，适合大面积果园）
- 1会员 → N地块（高客单价用户）
```

### 3.5 Member 模块（会员管理）

```
职责：会员的全生命周期

核心实体：Member
字段：id, farm_id, user_id(关联Auth), nickname,
      phone_masked, plan_start, plan_end,
      status(active/expired/frozen), notes

核心实体：MemberPlotBinding
字段：id, member_id, plot_id, bindAt, unbindAt

业务逻辑：
- 农场端：创建会员、绑定地块、续期
- 用户端：查看自己绑定的地块、到期时间
- 自动到期提醒（前7天、前3天、当天）
```

### 3.6 Command 模块（农事指令）

```
职责：用户下达指令 → 农场接收 → 工作人员执行 → 回执

核心实体：Command
字段：id, farm_id, member_id, plot_id,
      type(water/fertilize/harvest/inspect/custom),
      description, status(pending/accepted/executing/done/rejected),
      created_at, accepted_at, done_at,
      worker_id, receipt_text, receipt_photos[]

流程：
  用户下达 → pending
  农场确认 → accepted（可拒绝 → rejected + 原因）
  工作人员执行 → executing
  上传回执 → done
  推送通知给用户
```

### 3.7 Media 模块（内容与存储）

```
职责：照片、视频、成长日志的存储与关联

核心实体：MediaItem
字段：id, farm_id, plot_id, type(photo/video/timelapse),
      url, thumbnail_url, caption,
      source(camera_auto/worker_upload/ai_snapshot),
      taken_at, uploaded_at

核心实体：GrowthLog
字段：id, farm_id, plot_id, date, title, content,
      media_ids[], event_type(plant/care/harvest/observation)

存储：Cloudflare R2（或阿里云 OSS）
缩略图：Workers 端生成（或用 Cloudflare Images）
```

### 3.8 AI 模块（智能分析）

```
职责：作物识别、健康诊断、病虫害检测、种植建议

能力清单：
- 作物健康评估（基于摄像头截图）
- 病虫害识别（基于近景照片）
- 成熟度判断（是否可收获）
- 节气种植建议（基于地理位置+土壤数据+历史数据）
- 访客识别（生物分类：昆虫/鸟/动物/人）

调用方式：
- 定时任务：每日固定时间截图分析
- 事件触发：用户请求诊断、传感器异常
- 后台批处理：夜间生成日报

技术方案：
- 调用第三方视觉AI API（阿里云/百度/自训练模型）
- 结果存入 PlotAnalysis 表
- 置信度 < 阈值时标记为"待人工确认"
```

### 3.9 Notify 模块（消息通知）

```
职责：多渠道消息推送

渠道：
- 微信模板消息（用户端主要渠道）
- 小程序订阅消息
- 站内消息（App内消息中心）
- 短信（紧急告警：设备离线、异常入侵）

消息类型：
- 作物状态变化（成熟、异常、需要关注）
- 指令状态变化（已接受、已完成）
- 系统通知（续费提醒、新功能上线）
- 农场推送（农场主主动发送内容）

核心实体：Notification
字段：id, farm_id, target_user_id, channel,
      template_id, title, content, data(JSON),
      status(pending/sent/read), sent_at, read_at
```

### 3.10 Billing 模块（计费）

```
职责：农场订阅管理、用量计费

核心实体：Subscription
字段：id, farm_id, plan, price, period_start, period_end,
      status(active/past_due/canceled), auto_renew

核心实体：UsageRecord
字段：id, farm_id, type(ai_call/storage/bandwidth),
      quantity, unit, recorded_at

计费规则：
- 基础费：按套餐年付
- 超额费：AI调用超出套餐额度后按次计费
- 存储费：超出基础存储后按 GB 计费
```

---

## 4. 数据库设计概览

### 4.1 多租户策略

采用"共享数据库 + farm_id 隔离"方案：
- 所有业务表带 farm_id 字段
- API 层中间件自动注入 farm_id
- 索引策略：所有查询都以 farm_id 为首列

### 4.2 核心表清单

```
-- 平台层
platforms              -- 平台配置（单条记录）
admins                 -- 平台管理员

-- 农场层
farms                  -- 农场主体
farm_staffs            -- 农场工作人员
subscriptions          -- 订阅记录
usage_records          -- 用量记录

-- 设备层
cameras                -- 摄像头
sensors                -- 传感器
coverage_zones         -- 摄像头覆盖区

-- 地块层
plots                  -- 地块
plot_crops             -- 地块种植记录（历史）
plot_analyses          -- AI分析结果

-- 会员层
users                  -- 统一用户表
members                -- 会员（用户在某个农场的身份）
member_plot_binddings  -- 会员-地块绑定

-- 指令层
commands               -- 农事指令
command_receipts       -- 指令回执

-- 内容层
media_items            -- 媒体文件
growth_logs            -- 成长日志
visitor_events         -- 访客事件
visitor_codex          -- 访客图鉴

-- 通知层
notifications          -- 消息记录
notification_templates -- 消息模板

-- 知识层
solar_terms            -- 节气数据
planting_knowledge     -- 种植知识库
```

---

## 5. API 设计规范

### 5.1 URL 结构

```
/api/v1/admin/...      → 管理端接口（需 platform_admin 角色）
/api/v1/farm/...       → 农场端接口（需 farm_owner/farm_worker 角色）
/api/v1/app/...        → 用户端接口（需 member 角色）
/api/v1/public/...     → 公开接口（登录、注册、健康检查）
```

### 5.2 通用规范

```
- RESTful 风格
- 请求体/响应体：JSON
- 认证：Bearer Token (JWT)
- 分页：?page=1&pageSize=20
- 排序：?sort=created_at&order=desc
- 过滤：?status=active&plot_id=xxx
- 错误格式：{ code: "FARM_NOT_FOUND", message: "...", details: {} }
- 时间格式：ISO 8601 (UTC)
```

### 5.3 核心接口概览

```
-- 农场端
POST   /api/v1/farm/cameras              添加摄像头
PUT    /api/v1/farm/cameras/:id          更新摄像头
POST   /api/v1/farm/coverage-zones       创建覆盖区
POST   /api/v1/farm/plots                创建地块
PUT    /api/v1/farm/plots/:id/bindMember 给地块分配会员
GET    /api/v1/farm/commands             获取待处理指令
PUT    /api/v1/farm/commands/:id/accept  接受指令
PUT    /api/v1/farm/commands/:id/done    完成指令（含回执）
POST   /api/v1/farm/media                上传照片/视频
POST   /api/v1/farm/notifications/push   推送消息给会员

-- 用户端
GET    /api/v1/app/my-plots              我的地块列表
GET    /api/v1/app/plots/:id/live        地块实时数据
GET    /api/v1/app/plots/:id/camera      地块摄像头画面
GET    /api/v1/app/plots/:id/timeline    地块成长时间线
POST   /api/v1/app/commands              下达农事指令
GET    /api/v1/app/commands              我的指令列表
GET    /api/v1/app/visitors              访客日历
GET    /api/v1/app/codex                 访客图鉴
GET    /api/v1/app/seasons/advice        节气种植建议
GET    /api/v1/app/notifications         我的消息

-- 管理端
GET    /api/v1/admin/farms               农场列表
POST   /api/v1/admin/farms/:id/approve   审核通过
PUT    /api/v1/admin/farms/:id/plan      变更套餐
GET    /api/v1/admin/dashboard           平台数据看板
```

---

## 6. 技术选型

| 层级 | 选型 | 理由 |
|------|------|------|
| 用户端前端 | 微信小程序 (Taro/原生) | C端主要入口，微信生态 |
| 农场端前端 | Next.js Web + 微信小程序 | Web做配置管理，小程序做移动执行 |
| 管理端前端 | Next.js Web | 内部工具，Web够用 |
| 后端 API | Node.js (Hono/Cloudflare Workers) | 复用现有技术栈，Hono适合模块化 |
| 数据库 | Cloudflare D1 (早期) → PlanetScale/Neon (规模化) | D1免运维启动快，后期按需迁移 |
| ORM | Drizzle ORM | 项目已在用，类型安全 |
| 文件存储 | Cloudflare R2 | 同生态，免出流量费 |
| 视频接入 | 萤石云开放平台 / 乐橙云 | 消费级摄像头生态最成熟 |
| AI推理 | 阿里云视觉智能 / 通义千问 | 国内延迟低，农业模型可微调 |
| 消息推送 | 微信订阅消息 + 云函数定时触发 | |
| 实时通信 | Cloudflare Durable Objects (WebSocket) | 实时状态更新 |

---

## 7. 项目目录结构

```
ai-farm-platform/
├── apps/
│   ├── client/          → 用户端（微信小程序 / 现有前端迁移至此）
│   ├── farm/            → 农场端 Web
│   ├── farm-mobile/     → 农场端小程序（工作人员用）
│   └── admin/           → 管理端 Web
├── packages/
│   ├── api/             → 后端 API 服务（模块化单体）
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── farm/
│   │   │   │   ├── device/
│   │   │   │   ├── plot/
│   │   │   │   ├── member/
│   │   │   │   ├── command/
│   │   │   │   ├── media/
│   │   │   │   ├── ai/
│   │   │   │   ├── notify/
│   │   │   │   └── billing/
│   │   │   ├── middleware/
│   │   │   ├── shared/
│   │   │   └── index.ts
│   │   └── drizzle/     → 数据库迁移
│   ├── shared/          → 三端共享类型定义、工具函数
│   └── ui/              → 共享UI组件（如果多端都用Web）
├── docs/                → 文档
│   └── architecture.md  → 本文件
├── tools/               → 脚本工具
└── package.json         → monorepo 根配置 (pnpm workspace)
```

---

## 8. 部署架构

```
┌─────────────────────────────────────────┐
│           Cloudflare 边缘网络             │
├──────────┬──────────────┬───────────────┤
│  Pages   │   Workers    │      R2       │
│ (前端托管) │  (API服务)   │  (文件存储)   │
└──────────┴──────────────┴───────────────┘
          │
          ▼
┌──────────────────────┐
│        D1            │
│   (SQLite 数据库)     │
└──────────────────────┘
          │
          ▼ (外部服务)
┌──────────┬───────────┬──────────┐
│ 萤石云    │ 阿里云AI  │  微信开放  │
│(摄像头)   │ (推理)    │  (登录/推送)│
└──────────┴───────────┴──────────┘
```

---

## 9. 开发阶段规划

### Phase 1：基础框架 + 用户端迁移
- 搭建 monorepo 结构
- 迁移现有用户端代码至 apps/client
- 搭建 API 服务骨架（auth + farm + plot 模块）
- 数据库 Schema 初版

### Phase 2：农场端核心流程
- 摄像头接入 + 覆盖区标注
- 地块绘制（画面标注模式）
- 会员管理 + 地块分配
- 农事指令流程（下达→执行→回执）

### Phase 3：AI + 内容
- 对接视觉AI（作物识别、健康诊断）
- 定时分析任务
- 内容上传 + 成长时间线
- 访客识别 + 图鉴系统

### Phase 4：管理端 + 商业化
- 管理端后台
- 多租户完整流程
- 计费系统
- 套餐限制与超额处理

---

## 10. 安全设计

- JWT Token 有效期：访问令牌 2h，刷新令牌 7d
- API 限流：按 farm_id 限流，防止单一租户过载
- 数据隔离：中间件层强制注入 farm_id，SQL 查询必须包含
- 摄像头流：不直接暴露 RTSP 地址给客户端，通过代理/签名URL
- 文件上传：上传前校验文件类型和大小，R2 presigned URL
- 敏感操作审计日志：删除地块、解绑会员、变更套餐等

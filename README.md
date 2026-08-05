# AI农场 SaaS 平台

面向江浙沪CSA/认养农场的数字化体验平台。

## 项目结构

```
ai-farm-platform/
├── apps/
│   ├── client/       → 用户端（会员小程序/Web）- vinext + Cloudflare Workers
│   ├── farm/         → 农场端（农场主管理后台）- TODO
│   └── admin/        → 管理端（平台运营后台）- TODO
├── packages/
│   ├── api/          → 后端 API 服务（模块化单体）- TODO
│   └── shared/       → 三端共享类型和工具 - TODO
└── docs/             → 架构文档
```

## 快速开始

### 用户端开发

```bash
cd apps/client
npm install
npm run dev
```

### 部署

用户端部署在 Cloudflare Pages，Root directory 设置为 `apps/client`。

## 文档

- [架构设计文档](./docs/architecture.md)

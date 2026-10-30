# Proposal

## Why

目前 AI Free Radar 的个人状态（收藏、已领取、笔记等）纯粹依赖单一浏览器的 `localStorage` 存储，无法在多设备、手机与电脑间同步，且清空浏览器缓存容易导致个人标记意外丢失。

为了升级为现代化、多端一致的个人资产雷达，本次改造将引入基于 **Supabase BaaS** 的用户系统，**仅支持 GitHub OAuth 登录**，并且**全站设为登录后使用（不再支持未登录匿名使用）**。未登录用户访问站点任意页面时统一重定向或引导至 GitHub 授权登录页；登录后，用户的收藏列表、领取状态、私密备忘录及个人配置通过 Supabase 云端 PostgreSQL 数据库实时持久化与双向同步，并受到行级安全（Row-Level Security, RLS）的严格保护。

## What Changes

- **BREAKING: 强制登录访问守卫（Auth Wall）**：移除所有未登录匿名使用功能。未登录访客访问任何功能页面（总览、资源中心、平台详情、变更日志、监控等）均被全局拦截，展示极客科技风格的 GitHub 一键登录入口。
- **BREAKING: 个人状态持久化从客户端 localStorage 切换为 Supabase 云端数据库**：废弃纯本地存储机制，所有收藏、已领取状态、备注与个人操作全部读写 Supabase `user_favorites`、`user_claims` 等数据表。支持跨设备无缝同步。
- **集成 Supabase 客户端与 GitHub OAuth 鉴权体系**：
  - 在前端接入 `@supabase/supabase-js` SDK。
  - 配置 Supabase 实例连接凭证（`PUBLIC_SUPABASE_URL`、`PUBLIC_SUPABASE_ANON_KEY`）。
  - 实现标准的 GitHub OAuth 授权跳转与回调（`auth/callback`）处理逻辑。
  - 用户登出（Sign out）、会话刷新（Token refresh）与会话生命周期监听。
- **全局用户界面与状态指示**：
  - 在全局顶栏/导航栏展示当前登录的 GitHub 头像、用户名及退出登录按钮。
  - 登录加载中的骨架屏与鉴权中转状态呈现。
- **数据库 Schema 与行级安全（RLS）**：
  - 设计清晰的 Postgres 表结构（`profiles`, `user_favorites`, `user_claims`）。
  - 严格开启 RLS 策略，确保每个 GitHub 登录用户仅能检索与修改属于自己的数据记录。

## Capabilities

### New Capabilities
- `user-auth`: 涵盖 GitHub OAuth 单一登录验证体系、全局强制登录守卫（Auth Wall）、用户会话管理（Session）、登出操作以及基于 Supabase 的身份生命周期。

### Modified Capabilities
- `personal-state`: 改变个人状态存储契约——不再是“仅存本浏览器 localStorage”，而是必须在登录状态下持久化至 Supabase 云端数据库，通过用户专属 UID 与活动 ID 关联，支持跨设备实时同步；未登录用户无法操作个人状态。

## Impact

- **运行时依赖**: 新增 `@supabase/supabase-js` 依赖。
- **环境变量配置**: 引入 `PUBLIC_SUPABASE_URL` 与 `PUBLIC_SUPABASE_ANON_KEY` 环境变量。
- **代码重构**:
  - `src/lib/personal.ts` 与 `src/lib/usePersonal.ts`: 核心状态管理迁移为异步云端驱动与乐观更新模式。
  - `src/components/AppShell.tsx`: 嵌入全局鉴权守卫，未登录状态拦截渲染，登录状态呈现用户信息与登出入口。
  - 页面入口（`src/pages/*`）: 统一接入客户端水合鉴权检查。
- **安全与合规**: 用户数据物理隔离在 Supabase Postgres 表，仅依赖 Supabase Auth JWT，零密钥泄漏风险。

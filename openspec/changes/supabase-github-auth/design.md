# Design: Supabase BaaS + GitHub OAuth 用户系统架构与全站守卫

## Context

项目当前为 Astro 静态站点架构（部署在 GitHub Pages 或类似纯静态托管），公共雷达数据由 ChatGPT 定时任务通过 Git 提交写入 `radar.json`。
用户个人操作（收藏、已领取状态、备注）原先保存在单个浏览器的 `localStorage` 中。
参见 [proposal.md](proposal.md) 了解业务动机：实现多设备云同步，仅支持 GitHub OAuth 登录，全站未登录禁止使用。

## Goals / Non-Goals

**Goals:**
- **零额外常驻后端运维**：保持 Astro 纯静态生成（SSG）和前端直连 Supabase SDK 架构，不破坏现有的 GitHub Pages / 静态托管模式。
- **全站强制登录守卫（Auth Wall）**：在前端根布局层（`AppShell` / `SiteLayout`）统一拦截未登录状态，未登录时渲染高质感 GitHub 登录中转卡片。
- **云端个人数据持久化与行级安全（RLS）**：用户收藏与领取状态直接落库 Supabase Postgres，数据库层面开启严格 RLS，仅允许凭 JWT 检索与写入当前用户自身数据。
- **平滑的用户会话体验**：登录态自动刷新（Auto-refresh Token），页面刷新无明显鉴权抖动，支持一键登出。

**Non-Goals:**
- 不支持邮箱密码、Google、手机验证码等多厂商混合登录，**仅支持 GitHub OAuth**。
- 不支持未登录匿名试用模式（全站功能严格登录后可用）。
- 不自建独立 Node.js/Python 后端服务器，鉴权与持久化完全托管给 Supabase。

## Decisions

### 1. 架构选型：前端直接集成 Supabase JS SDK + Astro 静态客户端水合
- **选择**: 在前端引入 `@supabase/supabase-js`，在全局单例中初始化客户端实例。Astro 页面继续使用静态编译，组件通过 `client:load` 在客户端水合时获取 Supabase Session。
- **理由**: 保留纯静态站点的极高访问性能和零服务器托管费用，不需要改动现有的静态导出（`output: "static"`）。
- **备选方案**:
  - *Astro SSR + 自建数据库 API*: 需要自建并长期维护 Node.js/Docker 容器与数据库连接池，运维复杂度大增。
  - *Next.js / Remix 框架重构*: 工程成本过高，违背轻量改造原则。

### 2. 鉴权流程：GitHub OAuth Code / Implicit Flow + Supabase 托管回调
- **选择**:
  - 调用 `supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } })`。
  - Supabase 自动处理 OAuth 2.0 握手并将携带 `#access_token` 或 `code` 重定向回本站。
  - `supabase.auth.onAuthStateChange` 自动检测并写入会话（Session），随后触发 React 全局鉴权上下文重新渲染。
- **理由**: 零后端代码即可完成与 GitHub 的安全 OAuth 流程对接。

### 3. 全局访问守卫（AuthGuard 组件）
- **选择**: 在 `AppShell` 内层包裹 `AuthGuard`：
  - 会话处于 `loading` 时：渲染全屏柔和骨架屏，防止未登录闪烁。
  - 会话判定为 `unauthenticated` 时：阻断当前页面的 `children` 内容，渲染极客深色风格的 `LoginCard`，包含雷达品牌标识、安全声明与 `GitHub 授权登录` 按钮。
  - 会话判定为 `authenticated` 时：正常渲染页面内容，顶栏右侧展示用户 GitHub 头像与 Sign Out 菜单。
- **理由**: 集中化控制，无论用户直接访问 `/`、`/resources`、`/discoveries` 还是任何平台子路由，均被坚固拦截。

### 4. 数据库设计与行级安全（RLS）策略

设计 2 张核心表存储个人数据（外加 Supabase 内置的 `auth.users`）：

```sql
-- 1. 用户收藏表 (user_favorites)
create table public.user_favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  offer_id text not null,
  created_at timestamp with time zone default now() not null,
  unique (user_id, offer_id)
);

-- 开启 RLS 并配置策略
alter table public.user_favorites enable row level security;
create policy "Users can view their own favorites" on public.user_favorites
  for select using (auth.uid() = user_id);
create policy "Users can insert their own favorites" on public.user_favorites
  for insert with check (auth.uid() = user_id);
create policy "Users can delete their own favorites" on public.user_favorites
  for delete using (auth.uid() = user_id);

-- 2. 用户领取状态与备注表 (user_claims)
create table public.user_claims (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  offer_id text not null,
  status text not null check (status in ('claimed', 'ignored')),
  claimed_at timestamp with time zone default now() not null,
  notes text default '',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique (user_id, offer_id)
);

-- 开启 RLS 并配置策略
alter table public.user_claims enable row level security;
create policy "Users can view their own claims" on public.user_claims
  for select using (auth.uid() = user_id);
create policy "Users can insert/update their own claims" on public.user_claims
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own claims" on public.user_claims
  for delete using (auth.uid() = user_id);
```

### 5. `usePersonal` 改造与云端同步策略
- **本地乐观更新 (Optimistic UI)**：用户点击收藏或左滑/右滑王权卡片时，内存状态瞬时翻转，后台异步向 Supabase 发起 `upsert` 或 `delete` 请求；
- **错误回滚与网络重试**：如遇网络异常，回滚状态并弹出 Toast 提示；
- **会话绑定加载**：当用户鉴权状态确定后，`usePersonal` 自动一次性批量拉取云端的 `favorites` 与 `claims` 并在内存中建立索引。

## Risks / Trade-offs

- **[环境变量与配置缺失风险]**：
  - *Risk*: 如果没有配置 `PUBLIC_SUPABASE_URL` 或 `PUBLIC_SUPABASE_ANON_KEY`，前端初始化可能崩溃或报错。
  - *Mitigation*: 封装健壮的 `supabase` 客户端单例，若检测到未配置环境变量，页面展示友好的“未完成 Supabase 服务配置”提示卡片，引导站长配置 `.env`，避免白屏崩溃。
- **[首屏 SSR 与客户端鉴权水合时间差]**：
  - *Risk*: 纯静态页面构建后，浏览器端读取本地 session 需几十毫秒，可能引起界面跳变。
  - *Mitigation*: `AuthGuard` 引入 `isInitializing` 状态，初始阶段展示轻量毛玻璃占位骨架，会话读取完毕后无缝转入内容或登录卡片。

## Migration Plan

1. 部署 SQL 迁移脚本在 Supabase 控制台或本地 CLI 执行，建立表结构与 RLS 策略；
2. 在 GitHub Developer Settings 创建 OAuth App，将回调 URL 填入 Supabase Auth 设置；
3. 将现有 `personal.ts` 中基于 `localStorage` 的逻辑重构为基于 Supabase 的数据服务层；
4. 部署生效后，原有纯本地用户初次打开将提示 GitHub 登录，登录后开启全新的云端同步。

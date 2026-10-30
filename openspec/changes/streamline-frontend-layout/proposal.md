# Proposal

## Why

当前前端界面受传统后台管理系统结构影响，左侧侧边栏占据了大量水平视野，导航层级深且信息割裂；主页堆砌了大量重复卡片列表与时间线文案，视觉噪声严重；资源库提供了卡片、列表、刷卡三套视图切换，分散了核心体验。此外，用户在刷卡时 pass（跳过）的活动缺乏云端持久化记录，且已处理（已收藏/已 pass）的条目仍会出现在默认卡组中造成重复干扰。为打造极致轻量、聚焦与现代化的 AI 额度情报平台，需要重构页面结构与交互流程：移除左侧边栏、将辅助功能收纳为顶栏弹窗、主页纯化为可视化大屏加单一主行动入口、资源库聚焦于“王权刷卡”单一视图，并将 pass 状态保存至云端数据库，默认仅呈现未处理卡片（Inbox Zero）。

## What Changes

- **移除全局左侧边栏**：彻底废弃 `DesktopSidebar` 及多层 `SidebarProvider` / `SidebarInset` 布局，采用全宽流式布局（Header + Main + Footer），大幅提升界面通透度与空间利用率。
- **顶栏（Header）集约化交互**：
  - 放置品牌 Logo、主页与资源库快速导航链接。
  - 将「新平台发现」、「变更记录」、「监控状态」三大辅助功能改造成 Header 中的快速操作按钮，点击后弹出统一规范的模态对话框（Modal Dialog）呈现详情，无需离开当前页面。
  - 保留并优雅收纳 GitHub 用户认证状态 (`UserNav`)、个人数据云端同步入口与暗黑模式切换。
- **主页（Overview）重构为纯粹可视化大屏**：
  - 保留核心统计指标卡片（有效免费资源、24h 新发现、即将过期数、最近成功监控时间）与专业可视化图表（30 天新增趋势柱状图、API/客户端占比甜甜圈图、额度恢复周期分布条形图、活动状态分布徽章）。
  - 彻底移除主页原有的“值得立即领取”、“最新发现”、“值得长期使用”等长篇卡片堆叠与长列表时间线。
  - 突出呈现唯一的全局主行动入口（CTA）按钮——「进入资源库（探索全部权益）」，点击一键跳转至 `/resources/`。
- **资源库极简化为沉浸式“王权刷卡”单一视图**：
  - 资源库页面移除网格卡片 (`card`) 与表格列表 (`list`) 视图以及切换控件，专一承载触感式王权刷卡（`OfferSwipeDeck`）体验。
  - **Pass 状态云端持久化**：左滑或点击 Pass 动作时，调用个人状态机制将 `ignored` 状态实时持久化同步至 Supabase `user_claims` 表，支持跨设备漫游与乐观更新。
  - **收件箱归零（Inbox Zero）默认流**：资源库王权卡组默认自动剔除所有已收藏及已 Pass（`ignored`/`claimed`）的活动，仅呈现“未处理”候选卡牌。
  - **状态过滤器**：在顶部筛选组件中新增处理状态过滤（`未处理（默认）` / `已收藏` / `已跳过` / `全部`），方便随时检索或回捞已 Pass 的活动。
  - 清理所有无意义的说明性占位文案与视觉冗余，保持页面极致干净利落。

## Capabilities

### New Capabilities
（无全新独立能力，本次变更聚焦于前端界面与交互布局演进）

### Modified Capabilities
- `web-app`: 修改页面集与导航架构，由传统多页面侧边栏改为顶栏加模态对话框（Dialog）呈现辅助功能；主页规范调整为纯可视化总览加资源库跳转；资源库视图规范废弃卡片与表格视图切换，统一为单一沉浸式刷卡视图，支持 Pass 状态云端持久化并默认过滤已处理卡牌。

## Impact

- **前端架构与组件**：
  - 重构 `src/components/AppShell.tsx` 与 `src/layouts/SiteLayout.astro`，移除 `src/components/DesktopSidebar.tsx` 及 sidebar 级联组件。
  - 重构 `src/features/DashboardApp.tsx`，精简非图表卡片列表，增加显目的主行动 CTA 引导。
  - 重构 `src/features/ResourcesApp.tsx`，废弃 `OfferTableView` 与网格视图分支，默认且唯一呈现 `OfferSwipeDeck`，增加处理状态过滤芯片。
  - 升级 `src/features/OfferSwipeDeck.tsx`，左滑 Pass 操作直接调用云端 `toggleClaim(offer.id, 'ignored')` 实现持久化。
  - 新建或封装顶栏弹窗组件：用于弹窗呈现 Discoveries、Changelog、Monitor 数据。
- **自动化测试**：
  - 更新 Playwright E2E 测试选择器与测试断言（验证无侧边栏、Header 弹窗呼出、资源库纯刷卡交互、Pass 动作持久化与未处理卡牌默认过滤）。

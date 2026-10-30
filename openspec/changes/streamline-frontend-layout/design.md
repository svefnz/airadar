# Design

## Context

见 `proposal.md`。当前应用界面依赖 `DesktopSidebar` 与多层 shadcn Sidebar 原语，水平可视区域受限；`DashboardApp` 在图表之外内嵌了 4 个冗长的活动列表与时间线卡片；`ResourcesApp` 同时维护卡片网格、紧凑列表与王权刷卡三种视图分支及 URL 切换状态；左滑 Pass 操作尚未连接云端持久化存储，且已处理条目在卡组中重复堆叠。

## Goals / Non-Goals

**Goals:**
- **去除全局左侧侧边栏**：将整体框架简化为顶栏 Header + 主内容 Main + 极简 Footer。
- **顶栏承载模态弹窗**：在 Header 中放置「新平台发现」、「变更记录」、「监控状态」三大功能入口，以 shadcn `Dialog` 方式在当前页面弹出，无需跳转。
- **主页纯化为可视化大屏**：仅保留核心指标与 4 个关键可视化图表，移除冗余卡片列表；提供唯一显眼的主行动按钮（CTA）引流至资源库。
- **资源库专一刷卡交互**：完全废弃卡片与表格视图，默认且唯一呈现沉浸式王权卡牌堆叠（`OfferSwipeDeck`），清理页面干扰性文案与控件。
- **Pass 状态云端持久化**：左滑或点击 Pass 动作时，调用 `toggleClaim(offerId, 'ignored')` 实时写入 Supabase `user_claims` 表。
- **卡组收件箱归零 (Inbox Zero)**：默认过滤掉已收藏及已 Pass（`ignored`/`claimed`）的活动，仅呈现未处理条目；顶部筛选控件组添加处理状态芯片（`未处理（默认）` / `已收藏` / `已跳过` / `全部`）。

**Non-Goals:**
- 不修改 Supabase 后端已有的数据库表结构（`user_claims.status` 已原生支持 `'ignored'` 枚举）。
- 不破坏王权刷卡手势的核心物理手感、撤回（Undo）与 Web Audio 8-bit 合成音效。

## Decisions

### 1. 顶栏 (Header) 结构与组件收纳
- **决策**：在 `AppShell.tsx` 中移除 `SidebarProvider`、`Sidebar`、`SidebarInset`、`SidebarTrigger`，建立全宽响应式 Header：
  - 左侧：品牌 Logo、标题 `AI Free Radar`、主页链接、资源库直达按钮。
  - 中间/右侧：弹窗操作区（「新平台发现」、「变更记录」、「监控状态」操作按钮，移动端收纳为下拉或图标按钮）。
  - 右侧：个人数据面板（`PersonalDataPanel`）、GitHub 认证导航（`UserNav`）、主题切换（`ThemeToggle`）。

### 2. 辅助功能弹窗化 (Modal Dialogs)
- **决策**：创建通用的对话框包装器，将平台发现、变更事件、监控状态整合为统一样式的 `Dialog` 组件：
  - 点击顶栏对应按钮即展开，支持最大宽度响应式约束与内部滚动。
  - 允许通过 URL 查询参数（如 `?modal=changelog`）自动唤起，便于外部直接定位。

### 3. 主页 DashboardApp 纯化
- **决策**：保留 StatCard 指标行（有效资源数、24h 新发现、即将过期数、最近成功时间）与图表大屏（30 天新增趋势、API/客户端占比、额度恢复周期分布、活动状态分布）。
  - 移除 `immediate`（值得立即领取）、`latest`（最新发现）、`longTerm`（值得长期使用）三个卡片网格以及 `recentEvents` 时间线。
  - 页面顶部或图表下方配置大号渐变视觉 CTA 按钮：「进入资源库探索全部权益 →」，直接跳转 `/resources/`。

### 4. 资源库 ResourcesApp 极简化
- **决策**：
  - 废弃 `view` 状态，移除 `view === 'card'` 与 `view === 'list'` 的渲染逻辑及对应切换按钮。
  - 直接挂载 `OfferSwipeDeck`，由其接管筛选后的所有活动。
  - 精简筛选栏：仅保留搜索输入框、处理状态过滤芯片及核心属性快捷芯片，去除说明性噪声文案。

### 5. Pass 动作云端持久化与收件箱过滤管道
- **决策**：
  - 在 `OfferSwipeDeck` 中，当触发 Pass（左滑或点击关闭/跳过按钮）时，调用 `toggleClaim(offer.id, 'ignored')`，同步更新前端 `$personal` store 并持久化到 Supabase `user_claims` 表。
  - 在 `ResourcesApp` 的卡片筛选管道中，引入处理状态过滤：
    - `unprocessed`（默认）：过滤条件为 `!isFavorite && claimStatus !== 'ignored' && claimStatus !== 'claimed'`。
    - `favorited`：过滤条件为 `isFavorite`。
    - `passed`：过滤条件为 `claimStatus === 'ignored'`。
    - `all`：不进行处理状态过滤。
  - 顶部增加一目了然的状态过滤芯片组，支持一键切换。

## Risks / Trade-offs

- **[Risk]** 既有 Playwright E2E 测试强依赖侧边栏触发器（`SidebarTrigger`）与视图切换按钮（`紧凑列表表格视图`）。
  - **Mitigation**：同步重构 E2E 测试用例，断言 Header 导航、弹窗开启/关闭行为、Pass 动作云端持久化以及未处理过滤逻辑。
- **[Risk]** 用户若直接访问旧路径 `/changelog/`、`/discoveries/`、`/monitor/` 可能迷失。
  - **Mitigation**：在对应页面保留友好重定向或挂载带有特定弹窗开启状态的首页，保障存量外链体验。

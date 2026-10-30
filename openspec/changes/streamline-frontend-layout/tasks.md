# Tasks

## 1. 布局框架与集约化顶栏（移除侧边栏）

- [x] 1.1 重构 `src/components/AppShell.tsx` 与 `src/layouts/SiteLayout.astro`，移除 `DesktopSidebar` 及 `SidebarProvider` 等多层侧边栏原语，建立全宽流式响应式架构并验证 `pnpm build` 通过
- [x] 1.2 创建辅助功能模态弹窗组件（新平台发现、变更记录、监控状态），使用 shadcn/ui Dialog 封装高质量弹窗视图
- [x] 1.3 在 Header 统一集成品牌 Logo、主页与资源库链接、三个模态弹窗触发按钮、个人数据入口、`UserNav` 与 `ThemeToggle`，并适配移动端响应式显示

## 2. 主页总览重构（纯数据可视化大屏）

- [x] 2.1 重构 `src/features/DashboardApp.tsx`，彻底移除“值得立即领取”、“最新发现”、“值得长期使用”等长篇卡片列表和内嵌变更时间线
- [x] 2.2 精修保留 StatCard 指标卡与 4 大可视化图表大屏（新增趋势、API/客户端占比、恢复周期、状态分布），确保无数据时优雅空态
- [x] 2.3 在总览页突出配置唯一的“进入资源库（探索全部权益）”全局主行动按钮（CTA），点击直接导航至 `/resources/`

## 3. 资源库极简化与收件箱流（王权刷卡、Pass持久化与默认过滤）

- [x] 3.1 重构 `src/features/ResourcesApp.tsx`，废弃 `view` 切换分支，移除网格卡片和表格列表渲染分支及切换控件，默认且唯一挂载 `OfferSwipeDeck`
- [x] 3.2 在 `src/features/OfferSwipeDeck.tsx` 中实现左滑 Pass 时调用 `toggleClaim(offer.id, 'ignored')` 持久化保存至 Supabase 云端
- [x] 3.3 在资源库实现处理状态过滤流：默认仅呈现未处理（未收藏且未 pass/领取的卡片），并在顶部筛选栏增加“未处理（默认）/ 已收藏 / 已跳过 / 全部”状态过滤芯片，精简多余噪声文案
- [x] 3.4 确保从卡牌点击平台名称跳转独立详情页（`/platforms/[slug]/`）正常可用，并对历史辅助路由（`/discoveries/`、`/changelog/`、`/monitor/`）提供平滑兼容

## 4. 测试更新与全量验证

- [x] 4.1 更新 Playwright 端到端测试（`tests/e2e/home.spec.ts`、`resources.spec.ts`、`mobile.spec.ts`、`personal.spec.ts`），断言 Header 导航、弹窗交互、资源库纯刷卡、Pass 状态云端持久化及默认排除已处理卡牌逻辑
- [x] 4.2 执行全量静态检查与测试套件（`pnpm check`、`vitest run`、`pnpm validate`、`pnpm test:e2e`），确保所有测试与构建全绿通过

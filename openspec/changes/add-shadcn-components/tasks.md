# Tasks

## 1. shadcn 脚手架

^- [x] 1.1 运行 shadcn init（Tailwind v4）生成 components.json、src/lib/utils.ts 与 CSS 变量主题；`pnpm check` 通过且构建不破
^- [x] 1.2 将全局主题迁移为 shadcn 变量（含浅/深映射与 --radius），`@theme inline` 对齐；运行 `pnpm build` 确认无编译错误

## 2. 基础组件替换

^- [x] 2.1 替换 `Input/Select/Toggle` → `input/select/switch/label`，更新受影响页面与测试；`pnpm test` 与 E2E 通过
^- [x] 2.2 替换 `Button` → `button`，更新全部调用方；`pnpm check && pnpm test` 通过
^- [x] 2.3 替换 `Badge/Card` → `badge/card`，更新 OfferBadges、Dashboard 等引用；E2E 桌面+移动通过
^- [x] 2.4 删除自研旧组件文件，grep 确认无残留 `@/components/ui/fields` 等引用；`pnpm check` 通过

## 3. 新增组件接入

^- [x] 3.1 接入 `dialog`：个人记录清除确认流程（确认后执行）；E2E 覆盖确认/取消两分支
^- [x] 3.2 接入 `sheet`：移动端导航（焦点陷阱/Esc/遮罩/焦点回归）；E2E 移动端断言通过
^- [x] 3.3 接入 `dropdown-menu`：卡片操作与排序菜单（至少替换原有按钮堆叠之一）；E2E 操作可达
^- [x] 3.4 接入 `tooltip` 与 `sonner`：字段说明与导入/导出反馈；视觉与交互检查通过

## 4. 业务组件适配与视觉回归

^- [x] 4.1 更新 EmptyState/SafeLink/PersonalActions/OfferBadges 内部引用 shadcn 原语，保持行为不变；`pnpm test` 全绿
^- [x] 4.2 Playwright 截图对比关键页（首页/资源库/平台详情/移动端）确认语义色与排版无退化
^- [x] 4.3 全量 `pnpm check && pnpm test && pnpm e2e && pnpm build` 通过

## 5. 文档与发布

^- [x] 5.1 在 README/技术栈说明中补充 shadcn/ui 组件基线说明；`pnpm build` 通过
^- [x] 5.2 推送 main，CI 通过并线上抽查移动端导航与深色主题

## Workflow follow-up

- Archive 本 change（`openspec archive`）并验证主规格
- 如后续新增交互组件，按同一基线继续以 shadcn 为准

# Proposal

## Why

当前 UI 由自研轻量组件支撑，随着交互需求增长（移动端导航、确认弹窗、下拉菜单、Toast 反馈等），自研方案的维护成本与可访问性（键盘、焦点陷阱、Esc 关闭）缺口开始明显。项目决定统一引入 shadcn/ui 作为组件基线：冲突的自研组件一律以 shadcn/ui 版本为准，全局主题变量迁移为 shadcn/ui 变量体系，使全站视觉、状态语义与无障碍行为一致。

## What Changes

- 引入 shadcn/ui 工具链（Tailwind v4 兼容）：components.json、utils（cn/clsx/tailwind-merge）、CSS 变量主题。
- **替换冲突自研组件**为 shadcn/ui 版本：
  - `Button.tsx` → `ui/button`
  - `Badge.tsx` → `ui/badge`
  - `Card.tsx` → `ui/card`
  - `fields.tsx`（Input/Select/Toggle）→ `ui/input`、`ui/select`、`ui/switch`、`ui/label`
- **新增组件**：`dialog`（确认层）、`sheet`（移动端侧滑导航）、`dropdown-menu`（操作/排序菜单）、`tooltip`（字段说明）、`sonner`（Toast 反馈）。
- **保留自研自定义组件**：`EmptyState`、`SafeLink`（安全外链）、`charts/*`（纯 SVG）、`OfferBadges` 等业务组件——它们改为消费 shadcn 基础组件，不重复提供 UI 原语。
- **全局主题变量迁移**：将现有 `--color-*` 语义变量映射/迁移到 shadcn CSS 变量体系（`--background/--foreground/--card/--primary/--secondary/--muted/--accent/--destructive/--border/--input/--ring/--radius`），暗色 `.dark` 变量同步改写，Tailwind `@theme` 对齐 shadcn 约定。
- 更新现有 `features/*` 与页面代码的组件引用，保持全站行为与可访问性不退化。

## Capabilities

### New Capabilities

- （无：本 change 不引入新能力域）

### Modified Capabilities

- `web-app`: 变更 UI 组件基线（统一使用 shadcn/ui 语义与变量），新增确认弹窗、移动端侧滑导航、下拉菜单、Tooltip 与 Toast 反馈；主题变量迁移后语义与暗色模式保持一致。

## Impact

- **依赖**: 新增 shadcn/ui 所需包（radix-ui 相关、sonner、clsx、tailwind-merge、class-variance-authority）；`package.json`/`pnpm-lock.yaml` 变更。
- **样式**: `src/styles/global.css` 主题令牌重写；`tailwind` 配置适配（v4 `@theme inline`）。
- **代码**: `src/components/ui/*` 重写/新增；`src/features/*` 与 `src/pages/*` 引用路径更新。
- **行为**: 移动端汉堡菜单替换为 `sheet`（获得焦点陷阱/Esc/遮罩语义）；清除个人数据等破坏性操作增加确认 `dialog`；导入/导出与主题切换等增加 Toast 反馈。
- **测试**: E2E 断言（role/aria）保持或增强；新增引导回归检查。
- **兼容**: 不改变 URL、数据文件与个人状态协议。

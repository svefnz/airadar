# Design

## Context

站点当前使用自研轻量组件（`src/components/ui/`）与自定义语义颜色变量。探索决定：统一引入 shadcn/ui（Tailwind v4 兼容），冲突自研组件全部替换，全局主题变量迁移为 shadcn 变量体系。动机与范围见 proposal.md。

## Goals / Non-Goals

**Goals:**
- 组件基线唯一化：同功能不许两套实现。
- 补齐关键交互与可访问性：确认弹窗、移动端侧滑导航（焦点/Esc/遮罩）、Toast、Tooltip、下拉菜单。
- 主题变量迁移后全站（含图表）语义一致，浅/深/系统均可用。

**Non-Goals:**
- 不引入完整图表库（现有纯 SVG 保留）。
- 不改变数据协议、URL 结构、个人状态 schema。
- 不做设计语言大改版：仅迁移组件与令牌，视觉风格延续当前极简情报风。

## Decisions

### D1: shadcn CLI 脚手架 + Tailwind v4
- 使用 `pnpm dlx shadcn@latest init`（Tailwind v4 感知）生成 `components.json`、`src/lib/utils.ts`（cn），并写入 shadcn CSS 变量与 `@theme inline`。
- 组件通过 `pnpm dlx shadcn@latest add <name>` 按需复制源码。
- 备选：手写全部原语 → 与统一基线目标相悖，否决。

### D2: 冲突组件替换清单（自研 → shadcn）
- `Button.tsx` → `button`
- `Badge.tsx` → `badge`
- `Card.tsx` → `card`
- `fields.tsx` 拆分 → `input` / `select` / `switch` / `label`
- `Toggle.tsx` → `switch`
- 替换后删除旧文件；`features/*` 与页面 import 同步更新（`@/components/ui/...`）。
- 迁移顺序：先迁移仅被少数页面使用的组件（Input/Select），再迁移被广泛使用的（Button/Badge/Card），降低单次改动面。

### D3: 主题变量映射（旧 → shadcn）
| 旧（自定义 `--color-*`） | 新（shadcn） | 语义 |
| --- | --- | --- |
| `bg` / `surface` / `elevated` | `--background` / `--card` / `--accent`（配合 `--accent-foreground`） | 背景层 |
| `ink` / `muted` / `faint` | `--foreground` / `--muted-foreground` / `--muted-foreground`(弱化) | 文字 |
| `edge` / `edge-strong` | `--border` / `--input` | 边框 |
| `accent` / `accent-ink` | `--primary` / `--primary-foreground` | 主操作 |
| `ok` / `bad` / `warn` / `info`（语义） | `--destructive` + 扩展语义变量（`--ok/--warn/--info` 映射保留） | 状态色 |
| `--radius` | shadcn `--radius` | 圆角 |
- 实现约束：保持语义变量（ok/warn/bad/info）供 Badge/图表引用；别名到 shadcn 变量的派生值。
- 暗色：`.dark` 段同步覆盖 shadcn 变量（机制兼容现有）。

### D4: 新增组件与用途
- `dialog`：个人记录清除确认、导入错误展示。
- `sheet`：移动端导航（替代手写 `mobile-nav`；获得 Radix 焦点陷阱/Esc/遮罩）。
- `dropdown-menu`：卡片操作收纳、排序菜单（可选替换原生 select 之外的入口）。
- `tooltip`：额度单位不可比较、来源字段解释。
- `sonner`：导入/导出、主题切换反馈；Provider 挂载到布局根。
- `select`：替换原生 select（排序/平台筛选）。

### D5: 保留与边界
- 保留：`EmptyState`、`SafeLink`（安全外链逻辑）、`charts/*`（纯 SVG）、`OfferBadges`、`PersonalActions` 等业务组件——它们内部改消费 shadcn 原语。
- `lucide-react` 图标沿用（与 shadcn 生态一致）。

### D6: 验收策略
- 单元/E2E 断言基于 role/aria，不随样式改动失效；视觉回归用 Playwright 截图对比关键页（首页/资源库/移动端）。
- CI 保持 `pnpm check/test/e2e/build` 全链通过。

## Risks / Trade-offs

- [主题变量迁移引起全站颜色偏移] → 以语义映射表对齐；通过截图回归人工核对语义色。
- [shadcn 版本与 Tailwind v4 兼容细节] → 按官方 v4 指引初始化；遇未知版本差异以随仓库锁定版本稳定。
- [替换面广导致一次性大 diff] → 分批替换+每批跑测试。
- [Radix 组件客户端水合] → 仅交互岛内使用；SSG 输出不变。

## Migration Plan

1. 初始化 shadcn CLI + 依赖 + CSS 变量（引入最小定制）。
2. 依次替换 Input/Select/Toggle → Button/Badge/Card。
3. 新增 Dialog/Sheet/DropdownMenu/Tooltip/Sonner 并接入现有交互点。
4. 更新业务组件引用；删除自研旧组件。
5. 全量测试 + 视觉回归（桌面/移动）。
6. 推送后 CI 部署并线上抽查。

## Open Questions

- 语义色在 shadcn 变量中的最终表达（扩展变量 vs 映射）取决于 `--ok/--warn` 等使用面，实现时确定，不影响本设计走向。
- Select 是否完全替换原生（涉及移动端 UX），实现时可保留原生在移动端、桌面用 shadcn select（平台差异由实现验证后收口）。

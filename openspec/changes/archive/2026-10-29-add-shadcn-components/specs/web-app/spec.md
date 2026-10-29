# Spec Delta

## ADDED Requirements

### Requirement: UI 组件基线

站点必须使用 shadcn/ui 作为统一组件基线。与 shadcn/ui 对应存在的自研基础组件必须迁移为 shadcn/ui 版本；业务自定义组件（安全外链、空态、图表等）可以保留，但必须消费 shadcn/ui 基础原语，不得另行提供重复的 UI 原语。同一交互元素不得混用两套等价组件。

#### Scenario: 同功能组件唯一化

- **WHEN** 页面需要按钮、徽章或输入等基础元素
- **THEN** 统一使用 shadcn/ui 组件实现，页面内不存在等价的自研副本

#### Scenario: 业务组件复用基础原语

- **WHEN** 自定义业务组件渲染基础控件
- **THEN** 其底层使用 shadcn/ui 组件，而不复制样式与行为

### Requirement: 交互反馈与确认

破坏性操作（如清除个人记录）必须提供明确确认弹窗，确认前不得执行。反馈类操作（导入/导出、主题切换等）必须给出轻量 Toast 提示。涉及多项操作的入口（过滤、排序、卡片操作）应支持下拉菜单收纳，避免按钮堆叠。

#### Scenario: 清除个人记录需确认

- **WHEN** 用户触发清除个人记录
- **THEN** 显示确认弹窗，仅在用户确认后执行清除

#### Scenario: 操作反馈可见

- **WHEN** 导入或导出个人记录成功/失败
- **THEN** 页面给出对应 Toast 提示，告知结果

### Requirement: 移动端导航语义

移动端导航必须使用可聚焦、可关闭、支持 Esc 与背景遮罩交互的侧滑导航，替代手写开关逻辑；导航关闭后焦点恢复到触发入口，且关闭时焦点获得正确管理。

#### Scenario: 移动端导航键盘可达

- **WHEN** 在移动端打开导航并使用键盘
- **THEN** 焦点被限制在导航内，Esc 可关闭，关闭后焦点回归入口

### Requirement: 主题变量一致性

主题必须基于 shadcn/ui 变量体系（`--background/--foreground/--card/--primary/--secondary/--muted/--accent/--destructive/--border/--input/--ring/--radius`）定义；浅色与深色 `.dark` 变量必须成对存在；页面加载早期应用主题避免闪烁，且偏好持久化。

#### Scenario: 主题切换保持语义

- **WHEN** 用户在浅色与深色之间切换
- **THEN** 全部组件与图表颜色随变量变化，语义色（成功/警告/危险/信息）不混淆

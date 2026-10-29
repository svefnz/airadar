# Proposal: 前端产品 UI/UX 全面重构与体验优化

## Why

AI Free Radar 作为对接 ChatGPT 定时任务为信源的情报雷达，原先的前端界面缺乏高科技感、信息层级不够清晰，并且无法同时兼顾“快速扫视浏览”与“高密度横向对比”的诉求。
通过根据业务视图设计图进行整体产品重构，结合卡片网格视图、紧凑数据表格视图、场景快捷预设、代码一键复制、移动端适配以及微光动效，全方位提升大模型免费额度雷达的视觉质感与开发者使用效率。

## What Changes

- **双视图深度重构**：
  - **卡片网格视图（Card View）**：引入厂商 Logo Squircle、官方活动与 NEW 徽章、属性胶囊排、特色品牌展台（Brand Banner）、4 项结构化元数据（可用地区、包含内容、领取条件、领取方式）与操作底栏。
  - **紧凑数据表格视图（Table View）**：支持单选/全选与批量操作、两行高亮核心权益（大字指标+次级说明）、条件胶囊、临期高亮与发现/核验时效信息。
- **场景化快捷预设（Quick Presets）**：
  - 在搜索栏下方提供常用组合场景快速筛选（如：新手无门槛、开发者 Coding API、1M 超长文本、即将截止捡漏），降低高频筛选交互成本。
- **活动详情抽屉与开发者代码集成**：
  - 点击“查看详情 →”呼出模态弹窗，展示信源完整核验证据链、技术参数（上下文窗口、Tool Calling、API 兼容性、调用频次限制）。
  - 为原生 API 提供一键复制 cURL 请求与 OpenAI/Anthropic SDK 快速接入示例代码。
- **移动端与响应式自适应体验**：
  - 优化移动设备视口表现，长表格在窄屏下自适应折叠为紧凑卡片条，避免横向无感滚动；移动端侧边抽屉与顶部导航优化。
- **时效感知与视觉微交互**：
  - 对 3 天内即将过期的活动增加柔和琥珀光晕（Urgency Glow），增强紧迫感。
  - 全局统一使用太空深夜蓝（#090D16）高科技质感暗色主题。

## Capabilities

### New Capabilities

无（沿用现有业务体系）。

### Modified Capabilities

- `web-app`: 扩展资源库视图模式（新增紧凑表格视图与批量操作）、新增场景快捷预设、强化 API 开发者代码片段与技术参数呈现、优化移动端响应式布局与临期视觉微动效。

## Impact

- **Affected code**:
  - `src/features/OfferCard.tsx`
  - `src/features/OfferTableView.tsx`
  - `src/features/OfferDetailDialog.tsx`
  - `src/features/brand/BrandLogo.tsx`
  - `src/features/brand/BrandBanner.tsx`
  - `src/features/ResourcesApp.tsx`
  - `src/features/DashboardApp.tsx`
  - `src/components/AppShell.tsx`
  - `src/components/DesktopSidebar.tsx`
  - `src/styles/global.css`
- **APIs & Dependencies**: 无新增外部重量级依赖，复用现有 shadcn / radix-ui / lucide-react 与 tailwindcss。
- **Data Protocol**: 完全兼容 `schemaVersion: 1`，无需更改数据存储结构。

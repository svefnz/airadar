# Design: 前端产品 UI/UX 重构与工程实现

## Context

详见 `proposal.md`。本项目基于 Astro 7.4 + React 19 + Tailwind CSS v4，数据源由 ChatGPT 自动化定时任务推送到 `data/radar.json`，纯前端静态构建发布至 GitHub Pages。
在不破坏数据契约（维持 schemaVersion 1）的前提下，需要为用户提供极富科技感、易于横向对比与高效操作的界面。

## Goals / Non-Goals

**Goals:**
- 提供还原两套设计图的双视图系统（卡片网格与紧凑数据表格），支持平滑切换并保持 URL 状态。
- 为开发者提供直观的品牌视觉展示（Squircle 矢量徽标、品牌特制展台条）。
- 引入场景化快捷预设过滤系统，一键激活特定用户画像的组合筛选。
- 在详情模态框中整合信源时间轴与开发者接入所需的 cURL 请求示例代码。
- 保证移动端到桌面端（375px ~ 1920px）的良好响应式适配与交互无横向溢出。

**Non-Goals:**
- 不变更 `data/radar.json` 的存储 Schema（无需升级协议版本）。
- 不引入外部在线后端数据库，所有收藏、已领取状态与本地备忘继续持久化于 localStorage。

## Decisions

### 1. 组件分层与双视图解耦
- **决策**：将卡片展示抽象为 `OfferCard`，将高密度对比表格抽象为独立的 `OfferTableView`，由 `ResourcesApp` 统一管理搜索、筛选、排序与激活视图状态。
- **考量对比**：之前在单个 `OfferCard` 内通过 `list` boolean 属性分支渲染，导致行与卡片的 DOM 结构耦合混乱。将其分拆为标准 HTML table 结构后，更易实现表头固定、单选全选、列宽精确控制与批量操作工具条。

### 2. 品牌标识与视觉展台的纯前端动态派生（Brand System）
- **决策**：封装 `BrandLogo` 与 `BrandBanner` 组件。内置主流模型厂商（OpenAI、Google Gemini、Anthropic Claude、DeepSeek、Qoder 等）的高清矢量标识与专属氛围艺术卡片。其他非预置平台根据名称哈希动态计算美观渐变色与首字母 Squircle 降级。
- **考量对比**：若要求上游 ChatGPT 在 JSON 中生成图片 URL，不仅增加网络脆弱性与图床维护成本，还会受外链防盗链影响。纯前端 SVG 与 CSS 渐变渲染兼具体积微小（零网络请求）与永不失效的优势。

### 3. 场景化快捷预设设计（Quick Presets）
- **决策**：在资源库搜索区提供预设胶囊数组，每个预设映射为一组确定的 `Filters` 状态字段：
  - `新手无门槛`：`billing: ['none']`, `amountType: ['one-time']`
  - `开发专用 API`：`access: ['api']`, `toolCalling: true`
  - `1M 超长上下文`：`context: '1m'`
  - `临期捡漏`：`expiringOnly: true`
- **考量对比**：预设状态无缝与现有的 URL 查询参数（URLSearchParams）协同，用户点击预设可直接分享链接给他人。

### 4. 活动详情抽屉与 cURL 示例生成
- **决策**：在 `OfferDetailDialog` 中，若活动为 `accessType === 'api'`，根据其 `apiCompatibility`（OpenAI / Anthropic 兼容规范）自动组装标准的 `curl` 请求代码片段，并带有一键复制按钮。

## Risks / Trade-offs

- **[表格在极窄视口排版限制]** → 在小屏设备（`< 768px`）上使用带有横向轻微内阴影指示器的滚动容器，并在卡片模式默认作为窄屏的首选推荐。
- **[暗色模式对比度考量]** → 遵循 WCAG AA 对比度，次级文字使用 `#94a3b8`（slate-400），高亮指标采用 `#34d399`（emerald-400），确保在 `#090D16` 太空夜蓝底色上清晰可辨。

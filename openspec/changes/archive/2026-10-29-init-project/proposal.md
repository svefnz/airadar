# Proposal

## Why

AI Free Radar 需要一个可持续维护的数据产品：由 ChatGPT 自动化任务每 3 小时监控 AI 免费额度与新平台，结果持久化到 GitHub 仓库，网页随数据自动更新。当前项目已有实现，但缺乏正式、版本化的行为规格；本 change 初始化整个项目的规格基线，使后续所有变更（数据协议调整、新页面、自动化策略）可基于明确规格讨论与演进。

## What Changes

- 建立项目级规格基线（specs），覆盖数据协议、自动化监控、网页应用、个人状态与部署五个能力域。
- 明确 `data/radar.json` 的实体结构、枚举约束、稳定 ID 与去重合并语义。
- 明确 ChatGPT 自动化监控协议：A/B 两类搜索、核验、增量写入、运行记录、审批/冲突处理、无变化处理。
- 明确网页应用行为：页面集、搜索/筛选/排序、URL 同步、图表、主题与移动端适配。
- 明确个人状态（localStorage）行为：收藏/已领取/忽略/备注、导入导出、版本迁移、跨设备边界。
- 明确部署要求：GitHub Pages（含子路径 base）为主、CI 校验、失败保护与替代部署通道（Cloudflare Pages）。

## Capabilities

### New Capabilities

- `data-protocol`: 权威数据文件 `data/radar.json` 的实体、枚举、Schema 校验、稳定 ID、去重/合并/事件追溯与数据工具链。
- `monitor-automation`: ChatGPT 定时任务每 3 小时执行 A/B 搜索、官方核验、增量写入、运行记录、审批与冲突处理、通知策略。
- `web-app`: 网页应用的页面集、搜索/筛选/排序/视图、URL 状态同步、图表、主题与移动端适配。
- `personal-state`: 仅存于当前浏览器的个人管理（收藏/领取/忽略/备注、导入导出、版本迁移），不得污染公共数据。
- `deployment`: 静态构建与发布（GitHub Pages 子路径 base、替代部署通道）、CI 校验、失败保护与回滚。

### Modified Capabilities

- （无：项目尚无既有规格）

## Impact

- **代码**: `src/`（数据层、features、pages）、`scripts/`（validate/merge/check-duplicates）、`.github/workflows/`、`astro.config.mjs`、`data/radar.json`。
- **数据**: `data/radar.json` 为唯一权威源；个人状态仅存在浏览器 localStorage。
- **外部系统**: 与 GitHub 仓库（数据写入、Actions 构建、Pages 发布）及 ChatGPT 连接器对接；不引入后端、数据库或付费服务。
- **兼容**: 不破坏现有已部署站点；规格化仅收束行为契约，不改变对外 URL 与数据格式。

## 说明

- 本 change 为项目初始化基线：随后实现将依据这些规格对现有实现核对，必要时补齐差异。

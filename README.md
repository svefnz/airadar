# AI Free Radar

持续更新的 **AI 免费额度与新平台情报站**。ChatGPT 自动化任务每 3 小时监控免费额度与平台动态，把结果以结构化 JSON 写入本仓库，GitHub Actions 自动校验、构建并发布 GitHub Pages。

- **数据即代码**：GitHub 仓库是唯一权威数据源，无后端、无数据库、无付费服务。
- **个人状态**：仅保存在浏览器 localStorage（收藏/已领取/忽略/备注），支持导入导出。
- **默认部署**：GitHub Pages（支持用户主页域名、项目子路径、自定义域名）。

## 功能总览

| 页面 | 说明 |
| --- | --- |
| 总览 Dashboard | 统计卡片、30 天趋势、API/客户端占比、额度周期分布、值得立即领取、最新发现、最新变化、值得长期使用 |
| 资源库 | 搜索（平台/模型/活动/域名）、多条件组合筛选、6 种排序、卡片/列表双视图、筛选同步 URL |
| 平台详情 | 平台资料、独立免费权益（多活动）、逐字段“未确认”提示、历史变更、证据链接 |
| 新平台发现 | 最近 7/30 天平台，按“已确认 / 部分核实 / 待核实”分组 |
| 变更记录 | 全局事件时间线，按平台/时间/类型筛选，显示原值与新值 |
| 监控状态 | 真实运行记录：A/B 搜索是否完成、新增/更新/过期数、失败项、GitHub 数据更新时间 |

主题：浅色 / 深色 / 跟随系统。

## 技术栈

Astro · React · TypeScript（strict）· Tailwind CSS v4 · Zod · Lucide Icons · Vitest · Playwright · pnpm · GitHub Actions + Pages

组件为自研轻量实现（等效 shadcn/ui 的质量与可访问性，避免引入大量运行时依赖；图表为纯 SVG，无图表库）。

## 目录结构

```
data/radar.json           # 权威数据(GitHub 连接器唯一写入口)
scripts/
  validate.ts             # Schema + 业务校验
  merge.ts                # 增量合并(幂等)
  check-duplicates.ts     # 疑似重复检测
  generate-demo.ts        # 生成演示数据(全部标记 demo)
src/
  lib/data/               # 数据层: enums / schema / ids / merge / validate / radar / load
  lib/personal.ts         # localStorage 个人状态(版本化)
  features/               # 业务模块: Dashboard / Resources / Changelog / PersonalActions …
  components/             # UI 组件与图表
  pages/                  # Astro 页面(SSG)
docs/
  chatgpt-automation-prompt.md   # ChatGPT 定时任务专用 Prompt
  github-connector.md            # GitHub 连接器接入指南
tests/unit/               # Vitest
tests/e2e/                # Playwright
.github/workflows/ci.yml   # 校验+构建+部署
```

## 快速开始

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm check        # 类型检查
pnpm test         # 单元测试
pnpm build        # 静态构建(输出 dist/)
pnpm preview      # 本地预览构建产物
```

## 数据格式

数据保存在 `data/radar.json`，包含：

```jsonc
{
  "schemaVersion": 1,
  "lastSuccessfulSync": "2026-10-28T06:00:00.000Z",   // 最近成功监控完成时间
  "platforms": [ /* Platform */ ],
  "offers": [ /* Offer */ ],
  "events": [ /* ChangeEvent */ ],
  "runs": [ /* MonitorRun */ ]
}
```

完整 Schema 见 `src/lib/data/schema.ts`，枚举取值见 `src/lib/data/enums.ts`。

### 实体要点

- **Platform**：id/name/slug/canonicalDomain/websiteUrl/description/category/launchDate/firstDiscoveredAt/lastCheckedAt/trustStatus。
- **Offer**：稳定 id、platformId、title、models、accessType(api|client|web|unknown)、amount、unit(USD|CNY|Token|Credit|Point|Request|Message|Call|Unlimited|Unknown)、amountType(one-time|daily|weekly|monthly|fixed-period|limited-unlimited|unknown)、resetInterval、claimConditions、billingRequirements、identityVerification、regionRestrictions、rateLimits、contextWindow、toolCalling、apiCompatibility、startAt/endAt/creditExpiresAt、status(active|upcoming|ended|paused|unknown)、verificationStatus(official|community|unverified)、discoveredAt、lastVerifiedAt、officialUrl、sources[]。

**额度不可跨单位比较**：在 Credits/Token/美元等之间禁止直接换算比较。

### 稳定 ID 与去重

- 平台 ID = slug；活动 ID = `{platformSlug}:{hash(去重键)}`，去重键由 **域名+活动名+模型+权益类型+单位+渠道+地区+周期** 规范化拼接。
- 同一活动额度/截止日期变化 → 更新原活动 + 追加 `ChangeEvent`，绝不重复新增。
- 合并引擎幂等：同一补丁执行两次不会产生重复活动/事件/运行记录。

## 如何新增/更新资源（手动）

编辑 `data/radar.json`（按 Schema），然后：

```bash
pnpm validate             # 必须通过(exit 0)
pnpm check-duplicates     # 确认无疑似重复
pnpm test && pnpm build
```

推送后 CI 自动校验并发布。任何校验失败都会**阻止发布**并保留上一版页面。

## 如何利用 ChatGPT 定时任务维护数据

1. 阅读 `docs/chatgpt-automation-prompt.md`，把其中内容设置为定时任务提示词。
2. 定时任务将按协议读取 `data/radar.json`，增量更新并提交。
3. 提交后网页自动更新（GitHub Actions 构建发布）。

> ⚠️ **关键限制**：ChatGPT 连接器是否可无人值守修改 GitHub，取决于其所权限与审批要求。项目完全接受“需要人工审批”的模式：
> - 审批通过 → 数据落库 → 页面自动更新；
> - 未审批 → 任务如实记录“待审批”，网站照常工作（显示上一版数据）。

## 如何检查自动更新是否成功

- 打开「监控状态」页：看**最近成功执行时间**（真实 completedAt）与最近一次运行结果。
- 页面上“最后尝试执行时间”与“最后成功完成时间”严格区分，失败运行会显示异常状态。
- 在 GitHub 仓库 Actions 页确认 workflow 通过。
- 通过 `pnpm validate` 本地复验 `data/radar.json`。

## 更新失败 / 审批模式 / 冲突怎么办

| 场景 | 处理 |
| --- | --- |
| 写入需人工审批 | 连接器生成 `data/incoming/patch-<时间戳>.json`，人工运行 `pnpm merge --patch <file>` |
| GitHub 版本冲突 | 重新读取最新数据 → 重新合并 → 再次提交，禁止强制覆盖 |
| 数据格式错误 | CI 校验失败自动阻止发布，页面保持上一版可用 |
| 需要恢复损坏数据 | 见下节 |

## 如何恢复损坏的数据

```bash
# 1. 找到历史完好版本
git log --oneline -- data/radar.json
git show <commit>:data/radar.json > /tmp/radar-ok.json

# 2. 校验该版本
pnpm validate -- /tmp/radar-ok.json

# 3. 恢复并重新发布
cp /tmp/radar-ok.json data/radar.json
git add data/radar.json && git commit -m "restore: 恢复损坏数据到 <commit>"
git push
```

> 数据损坏时 CI 会自动阻止发布，上一版页面继续可用，不会出现“坏数据弄挂整个网站”。

## 如何手动导入数据（chat 审批/离线）

1. 将补丁文件放入 `data/incoming/`（格式见 `docs/chatgpt-automation-prompt.md` 第 9 节）。
2. 执行：

```bash
pnpm merge --patch data/incoming/patch-xxxx.json
pnpm validate
```

3. 提交并推送，CI 会重新构建发布。

## 部署

### 推荐：Cloudflare Pages（免费，支持私有仓库）

本项目当前为私有仓库，GitHub 免费计划不支持私有仓库 Pages，因此推荐 Cloudflare Pages：

1. 在 Cloudflare Dashboard → Workers & Pages → Create → Pages → **Connect to Git**。
2. 选择 GitHub 仓库 `svefnz/airadar`（首次需授权 Cloudflare 访问该仓库）。
3. 构建设置：
   - 框架预设：**Astro**
   - 构建命令：`pnpm install --frozen-lockfile && pnpm build`
   - 构建输出目录：`dist`
   - 环境变量：`NODE_VERSION=22`（必须，Astro 7 要求 Node 22+）
4. 保存并部署。Cloudflare 分配 `https://<project>.pages.dev` 域名；站点在根路径 `/` 下运行（base 默认 `/`，无需额外配置）。
5. 自定义域名：在 Pages 项目 → Custom domains 添加，并按提示配置 DNS 记录。
6. 之后每次推送 `main`，Cloudflare 自动重新构建发布；GitHub Actions 同时执行校验+构建，作为双保险。

### 备选：GitHub Pages（需仓库公开）

`.github/workflows/ci.yml` 已预置 GitHub Pages 部署逻辑（提交注释掉了，仓库转为公开后可取消注释启用）：

- 触发：push 到 `main`（代码与数据提交都会触发）。
- 步骤：pnpm 安装 → 类型检查 → 数据 Schema+业务校验 → 单元测试 → `astro build`（+ sync/artifact/deploy 任务）。
- 权限：`contents: read`；为 Pages 部署时另需 `pages: write`、`id-token: write`。

如果启用 GitHub Pages：

1. 仓库 Settings → Pages → Source：**GitHub Actions**。
2. **项目站点**（如 `/airadar/`）构建时会自动按仓库名推导 base；无需手动设置。
3. **用户主页域名**（`USER.github.io`）：无需 base（默认 `/`）。
4. **自定义域名**：仓库 Settings → Pages 添加域名 + 配置 DNS；构建时设置 `SITE_URL=https://radar.example.com`。

## 个人状态说明

- 个人状态（收藏/领取/忽略/备注）只保存在当前浏览器 localStorage（`ai-radar:personal:v1`），**不会自动同步**。
- 侧边栏提供导出/导入/清除；导入文件版本不兼容时会明确拒绝。
- 设计预留了迁移机制（`migratePersonal`），未来可扩展账号同步。

## 安全与可信度

- 数据文件仅含公开信息；页面不执行任何来自数据的 HTML/JS（纯文本渲染 + 转义）。
- 外链统一 `rel="noopener noreferrer"`，并校验 `http(s)` 白名单。
- 页面加载时对 GitHub 数据做 Zod Schema 校验，错误数据不会导致整页崩溃。
- 每项资源均要求证据链接（优先官方；社区来源显式标记）。
- 高风险场景（API 中转、上传 Key、自动扣费等）在卡片上给出简洁风险提示。

## 测试

```bash
pnpm test      # Vitest 单元测试(数据层 + localStorage)
pnpm e2e      # Playwright 端到端(需先 pnpm build && pnpm preview)
```

覆盖场景：新增平台/活动、更新活动、重复输入幂等、活动延期/结束/恢复、无法确认数据、缺失字段、错误 URL、Schema 版本不匹配、GitHub 冲突合并、旧事件不被覆盖、localStorage 迁移、E2E（首页/搜索/筛选/详情/收藏/已领取/移动端）。

## 演示数据

开发阶段 `data/radar.json` 由 `pnpm generate-demo` 生成，**全部条目标记 `demo: true`**，页面显示演示横幅，且禁止标记“官方确认”。正式监控写入后，用 `pnpm merge --patch` 合并真实数据（或将 demo 数据替换为正式数据）。

## 路线图（未实现）

- 账号同步 / 后端（第一版刻意不做，个人状态保持纯 localStorage）
- 数据文件拆分与归档（当前单文件 `data/radar.json`；规模增长后利用合并工具拆分 `data/offers/*.json`）
- 邮件/RSS 订阅通知
- 更多图表与指标

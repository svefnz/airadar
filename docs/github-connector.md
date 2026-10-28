# GitHub 连接器接入说明（ChatGPT 自动任务）

本文说明如何让 ChatGPT（或任何自动化工具）安全地向本仓库写数据。

## 1. 连接器与权限模型

- **推荐**：使用支持“单文件读/写 + 审批”的连接器（如 ChatGPT 官方 GitHub 动作 / Zapier / n8n 等）。
- **必须确认**：
  1. 能否读取 `data/radar.json`？
  2. 能否发起单文件提交？
  3. 提交是否需要人工审批？
  4. 是否支持冲突提示（版本过期）？
- 若无法无人值守写入：**接受“待审批”模式**，网页正常展示上一版数据。

## 2. 连接器配置

| 项 | 值 |
| --- | --- |
| 仓库 | `YOUR_GITHUB_USER/ai-radar` |
| 文件 | `data/radar.json`（唯一写入口） |
| 写模式 | 创建 commit/Pull Request（禁止 force 覆盖） |
| Token 权限 | `contents: write` 最小权限（仅该仓库） |
| 审批 | 按平台的审计要求（若启用审批，连接器需等待） |

> ⚠️ 禁止把 Access Token 写入前端代码、仓库或提示词。Token 只在连接器运行时环境持有。

## 3. 数据写入协议（连接器侧）

1. 读取 `data/radar.json` 最新内容。
2. 校验 `schemaVersion === 1`；不符则停止并报告。
3. 按 `docs/chatgpt-automation-prompt.md` 的规则生成更新后的完整数据。
4. 提交前自检：数组 ID 唯一、offer.platformId 存在、日期合法、单位/额度一致（可用 `pnpm validate` 等价规则）。
5. 提交（单文件 commit）。
6. **提交后重新读取文件并比对内容**，确认写入成功再报告。
7. 若返回“版本冲突”，重新读取最新版本并重新合并（见 README「更新失败/冲突」）。

## 4. 审批模式

| 情况 | 连接器行为 | 页面表现 |
| --- | --- | --- |
| 无需审批 | 直接提交 | 构建后自动更新 |
| 需要审批 | 生成 PR 或待审补丁，标记“待审批” | 保持上一版，监控状态如实显示 |
| 提交被驳回 | 记录错误，不伪装成功 | 监控状态显示异常 |

连接器在运行记录 `runs[]` 中写入 `status: "partial"/"failed"` 与 `errors[]`，绝不能写 `success`。

## 5. 离线替代方案

无法连接 GitHub 时，输出 `data/incoming/patch-<时间戳>.json`（格式见 Prompt 第 9 节），人工执行：

```bash
pnpm merge --patch data/incoming/patch-<时间戳>.json
```

## 6. 验证链路

```
ChatGPT 定时任务
  → 读取 radar.json
  → 搜索 A/B（独立完成）
  → 核验 + 去重
  → 生成更新数据（自检）
  → 连接器提交（审批视环境）
      → GitHub Actions: check + validate + test + build
      → 发布(Cloudflare Pages 或 GitHub Pages, 见 README「部署」)
  → 网页展示最新数据
```

## 7. 常见问题

- **Q：为什么页面没有更新？**
  检查：Actions 是否通过？`data/radar.json` 是否真的变了？“监控状态”页最近成功时间是否已推进。
- **Q：文件被人同时改了怎么办？**
  连接器应重新读取最新版本再合并；`scripts/merge.ts` 支持幂等合并，重复执行安全。
- **Q：能直接改 `src/` 吗？**
  不能。连接器只允许读写 `data/radar.json` 与 `data/incoming/`。

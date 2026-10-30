# Supabase 数据更新联动 GitHub Actions 自动构建部署指南

AI Free Radar 的静态站点托管在 GitHub Pages 上。当 Supabase 数据库通过定时任务（ChatGPT 自动化）写入新权益或更新时，需要触发 GitHub Actions 重新拉取数据库最新内容并部署。

GitHub Actions 工作流（`.github/workflows/ci.yml`）已经配置了对 `repository_dispatch` 事件的监听：
```yaml
repository_dispatch:
  types: [supabase-db-update, radar-update]
```

为了实现「数据库有变动 $\rightarrow$ 自动触发构建部署」闭环，建议采用以下两种方式之一：

---

## 方式一：Supabase Database Webhook（推荐，完全无需代码）

1. **生成 GitHub Personal Access Token (PAT)**：
   - 访问 GitHub -> Settings -> Developer Settings -> Personal Access Tokens (Classic 或 Fine-grained)。
   - 赋予仓库 `svefnz/airadar` 的 `Contents: Read and write` 权限（Classic Token 勾选 `repo` 作用域）。
   - 复制生成的 Token。

2. **在 Supabase 控制台添加 Webhook**：
   - 打开 Supabase 控制台 -> 你的项目（airadar）-> **Database** -> **Webhooks**。
   - 点击 **Create a new webhook**：
     - **Name**: `trigger_github_radar_build`
     - **Table**: 选择 `offers`（也可以同时为 `platforms` 创建）
     - **Events**: 勾选 `Insert`, `Update`, `Delete`
     - **Type of Webhook**: HTTP Request
     - **HTTP Method**: `POST`
     - **URL**: `https://api.github.com/repos/svefnz/airadar/dispatches`
     - **HTTP Headers**:
       - `Authorization`: `Bearer <你的 GITHUB_PAT_TOKEN>`
       - `Accept`: `application/vnd.github.v3+json`
       - `User-Agent`: `Supabase-Webhook`
       - `Content-Type`: `application/json`
     - **HTTP Request Body**:
       ```json
       {
         "event_type": "supabase-db-update"
       }
       ```
3. 保存后，每当 `offers` 表有插入或更新，Supabase 会自动向 GitHub 发送 POST 请求，触发 CI 运行并拉取最新数据部署！

---

## 方式二：ChatGPT 定时任务在调用 RPC 成功后直接触发

如果不想在 Supabase 控制台手动配置 Webhook，可以在 ChatGPT 定时任务中，在成功调用 `ingest_radar_batch` 并且返回值中的变动数量（`platforms_created + platforms_updated + offers_created + offers_updated + offers_ended`）大于 0 时，由 ChatGPT 的 Actions 发起一个 HTTP POST 请求：

- **URL**: `https://api.github.com/repos/svefnz/airadar/dispatches`
- **Method**: `POST`
- **Headers**:
  ```http
  Authorization: Bearer <GITHUB_TOKEN>
  Accept: application/vnd.github.v3+json
  Content-Type: application/json
  ```
- **Body**:
  ```json
  {
    "event_type": "radar-update"
  }
  ```

---

## 方式三：Supabase SQL 内部利用 `pg_net` 触发

在 `scripts/supabase-schema.sql` 中已内置了特权函数 `public.dispatch_github_radar_build`。
如果启用了 Supabase 的 `pg_net` 扩展，可以在 SQL Editor 中执行：

```sql
select public.dispatch_github_radar_build(
  'svefnz',
  'airadar',
  'ghp_your_github_token_here',
  'supabase-db-update'
);
```
此调用会异步发送 HTTP POST 请求到 GitHub API，立即触发构建。

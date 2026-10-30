# Tasks

## 1. 依赖与基础设施接入

- [x] 1.1 安装 `@supabase/supabase-js` 依赖并在 `src/lib/supabase.ts` 中封装客户端单例，包含环境变量检测（`PUBLIC_SUPABASE_URL`、`PUBLIC_SUPABASE_ANON_KEY`）与防御性降级逻辑，通过类型检查验证
- [x] 1.2 创建数据库初始化与 RLS 策略脚本 `scripts/supabase-schema.sql`，提供 `user_favorites` 与 `user_claims` 表结构定义与行级权限规则文档

## 2. 鉴权状态管理与全局访问守卫

- [x] 2.1 创建 `src/lib/auth.ts` 与 `useAuth` React Hook，实现 GitHub OAuth 登录 (`signInWithOAuth`)、登出 (`signOut`)、当前 Session 获取与会话变更监听
- [x] 2.2 实现全局访问守卫组件 `src/components/auth/AuthGuard.tsx` 与登录卡片 `src/components/auth/LoginView.tsx`，未登录时统一拦截主体渲染并仅展示 GitHub 登录入口
- [x] 2.3 在 `src/components/AppShell.tsx` 中接入 `AuthGuard`，并在全局导航栏顶栏增加用户 GitHub 头像、昵称及登出下拉菜单

## 3. 个人状态管理迁移至 Supabase 云端

- [x] 3.1 重构 `src/lib/personal.ts`，由原有的单机 `localStorage` 存取改造为面向 Supabase 的异步数据层（查询用户收藏列表、领取状态、批量拉取、写入/删除收藏、保存领取标记与备忘）
- [x] 3.2 重构 `src/lib/usePersonal.ts`，基于登录用户的 UID 进行状态水合与本地乐观更新（Optimistic UI），网络失败时执行回滚并弹出 Toast
- [x] 3.3 更新个人数据面板 `PersonalDataPanel.tsx` 与操作触发器 `PersonalActions.tsx`，移除已废弃的 JSON 导入/导出，替换为多端云同步状态展示与清空云端个人记录操作

## 4. 测试套件与集成校验

- [x] 4.1 更新单元测试：新增 `auth.test.ts` 覆盖登录守卫拦截与会话状态，重构 `personal.test.ts` 适配云端数据层契约，运行 `npx vitest run` 验证全部测试通过
- [x] 4.2 运行 `npm run check` 确保 TypeScript 全局类型零错误
- [x] 4.3 运行 `npm run validate` 确保公共数据文件与 Schema 完整合规
- [x] 4.4 运行 `npm run build` 确保 Astro 静态站点打包编译完全顺利

## Workflow follow-up

- 运行 `/opsx-apply` 逐项实施并验证上述任务。

# Spec Delta

## Purpose

提供基于 Supabase 与 GitHub OAuth 的单一鉴权体系与全站强制访问守卫，确保仅授权 GitHub 用户可访问雷达核心界面与个人状态数据。

## ADDED Requirements

### Requirement: 全局强制登录守卫

系统 MUST 阻止未登录匿名用户访问站点核心功能；未登录访客访问任何功能页面时，系统 MUST 拦截主体内容渲染，并呈现强制登录引导视图与 GitHub 登录操作入口。

#### Scenario: 未登录用户被全局拦截
- **WHEN** 未登录访客直接访问站点首页或资源中心页面
- **THEN** 系统阻止功能主体渲染，展示 GitHub OAuth 登录卡片与授权按钮

#### Scenario: 登录成功后解除拦截
- **WHEN** 用户完成 GitHub 授权并返回应用
- **THEN** 系统解除拦截，自动渲染目标页面内容

### Requirement: 仅支持 GitHub OAuth 登录

系统鉴权中心 MUST 仅提供且仅支持 GitHub OAuth 授权登录途径，不开放账号密码注册或其他第三方登录方式。

#### Scenario: 点击 GitHub 登录跳转
- **WHEN** 用户在登录引导卡片中点击“使用 GitHub 登录”按钮
- **THEN** 系统发起 Supabase OAuth 请求并重定向至 GitHub 官方授权确认页面

#### Scenario: 授权回调会话建立
- **WHEN** GitHub 授权回调携带有效授权令牌返回系统
- **THEN** 系统建立用户持久化会话，提取用户 GitHub 资料（UID、用户名、头像）并在本地保持登录态

### Requirement: 用户信息展示与登出操作

系统全局导航栏 MUST 向已登录用户展示当前 GitHub 账号的头像与昵称，并提供一键登出（Sign out）功能；登出后系统 MUST 立即清除当前会话并重新触发全局登录拦截。

#### Scenario: 导航栏展示用户信息
- **WHEN** 用户已成功登录
- **THEN** 全局顶栏呈现用户的 GitHub 头像与用户名，并提供登出下拉操作项

#### Scenario: 用户执行退出登录
- **WHEN** 用户点击“退出登录”按钮
- **THEN** 系统销毁当前会话，清空内存与存储中的认证令牌，并即时恢复强制登录拦截视图

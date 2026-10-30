# Spec Delta

## MODIFIED Requirements

### Requirement: 个人数据仅存本浏览器

个人状态（收藏、领取状态、忽略、备注等）系统 MUST 在已登录前提下持久化存储至 Supabase 云端数据库，按用户唯一标识（User ID）与活动稳定 ID 进行隔离存储与多端同步，不得允许未登录匿名写入。页面 MUST 向用户明确提示该数据已接入多端云同步。

#### Scenario: 刷新后状态保留
- **WHEN** 用户标记收藏或已领取并刷新页面
- **THEN** 个人状态仍保留

#### Scenario: 公共数据不受污染
- **WHEN** 用户产生任意个人状态变更
- **THEN** 公共资源数据文件不变，其他用户不受影响

#### Scenario: 跨设备状态保留
- **WHEN** 已登录用户标记收藏或已领取并在其他设备登录访问
- **THEN** 个人状态自动从云端同步加载并保持一致

#### Scenario: 未登录禁止写入个人状态
- **WHEN** 未登录访客尝试触发收藏或修改状态
- **THEN** 系统阻止状态变更并弹出强制登录提示

### Requirement: 活动个人状态

每项活动系统 MUST 支持以下个人标记：未领取（默认）、已领取、已过期、不感兴趣；额外支持收藏、个人备注与领取日期记录。个人状态通过云端数据表持久化，并支持即时乐观更新与失败回滚。

#### Scenario: 标记已领取
- **WHEN** 用户将活动标记为已领取
- **THEN** 该活动在个人情境中显示为已领取，并记录领取日期

#### Scenario: 忽略与取消
- **WHEN** 用户将活动标记为不感兴趣或取消该标记
- **THEN** 对应状态即时更新，可随时变更

## REMOVED Requirements

### Requirement: 导入导出与清除

**Reason**: 废弃客户端单机 localStorage 导入导出模式，全面转为 Supabase 云端数据库多端实时同步与集中持久化存储。用户个人数据随 GitHub 账号自动漫游，不再需要手动导入导出 JSON 备份。
**Migration**: 统一通过 Supabase 云端 `user_favorites` 与 `user_claims` 自动读写。如需清空个人云端数据，在个人中心通过授权 RPC 或批量删除实现。

### Requirement: 个人数据版本迁移

**Reason**: 原有浏览器本地 localStorage 的客户端数据版本迁移逻辑已不再适用，数据结构版本控制由 Supabase PostgreSQL 数据表迁移脚本（Migrations）统一接管。
**Migration**: 数据结构的扩展与演进统一由 Supabase 数据库 DDL/迁移脚本维护。

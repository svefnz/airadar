# Tasks

## 1. 规格基线落地

- [x] 1.1 将本 change 的 5 个能力 delta 合并进 `openspec/specs/`（data-protocol、monitor-automation、web-app、personal-state、deployment），并运行 `openspec sync specs` 确认主规格生成且 `openspec validate` 通过
- [x] 1.2 在 `openspec/specs/` 下核对主规格结构与要求完整，运行 `openspec list --specs` 确认 5 个能力全部存在且无遗漏要求

## 2. 数据协议核对

^- [x] 2.1 运行 `pnpm validate` 与 `pnpm check-duplicates`，确认当前 `data/radar.json`（82 平台/107 活动）通过校验且无疑似重复；如有错误，修正数据并使校验全绿
^- [x] 2.2 运行 `pnpm test`（26 项单测）确认数据层全部通过，覆盖稳定 ID、幂等合并、事件保留与并发冲突场景
^- [x] 2.3 应用幂等演练：重复执行同一补丁合并两次，断言活动/事件/运行记录数量不变（新增或复用测试）
^- [x] 2.4 补充 `data-protocol` 规格中“单位不可跨单位比较”与“未确认显示”的单元或冒烟测试

## 3. 监控自动化核对

^- [x] 3.1 核对运行记录：现有 `runs` 必须包含状态、A/B 完成标志、真实完成时间、失败项；缺失 `repositoryCommit` 的旧记录在下一轮监控写入时补全
^- [x] 3.2 校验自动化写入协议文档与实现一致：读取最新数据 → 校验 schemaVersion → 生成补丁 → 事务性合并 → 原子写入 → 提交后回读，运行 `pnpm merge --patch` 演练并验证回读一致
^- [x] 3.3 补充对审批/冲突分支的测试：模拟版本冲突重放与非法补丁，断言合并拒绝且文件不被修改

## 4. 网页应用核对

^- [x] 4.1 运行 `pnpm build` 与 `pnpm preview`，核对 6 个核心页面（Dashboard/资源库/平台详情/新平台/变更记录/监控状态）正常渲染
^- [x] 4.2 验证子路径部署：以 `ASTRO_BASE=/airadar/` 构建，断言内部导航与资源均带前缀且可访问；默认根路径构建无多余前缀
^- [x] 4.3 运行 Playwright（桌面 + iPhone 视口）覆盖：首页指标、搜索筛选排序、URL 同步、详情页、收藏/已领取、移动端导航与无横向溢出
^- [x] 4.4 核对图表与统计全部来自真实数据，并执行一次“空数据”渲染检查，确认显示空态而非伪造统计

## 5. 个人状态核对

^- [x] 5.1 运行个人状态单测（保存/读取/损坏回退/版本迁移/导入导出）确认全部通过
^- [x] 5.2 在浏览器 E2E 中验证：收藏与已领取刷新后保留，且不影响公共数据文件（断言 `data/radar.json` 不变）

## 6. 部署与文档核对

^- [x] 6.1 核对 GitHub Actions：push main 自动执行 check/validate/单测/build/deploy，且部署到 GitHub Pages 成功；私有仓库场景保留 Cloudflare 部署说明
^- [x] 6.2 核对 README 与 `docs/` 部署、恢复、手动导入与连接器说明与当前实现一致，命令可直接运行
^- [x] 6.3 执行一次数据损坏演练：故意引入非法数据，确认 CI 阻止发布且上一版站点仍然可访问（在测试分支完成，不污染 main）

## 7. 集成验收

- [ ] 7.1 全量执行 `pnpm check && pnpm test && pnpm e2e && pnpm build`，全部通过
- [ ] 7.2 线上验证：确认 https://svefnz.github.io/airadar/ 各页面与内部跳转可用，监控状态页展示最新真实运行记录

## Workflow follow-up

- Archive 本 change（`openspec archive`）并在归档后运行 `openspec validate` 确认主规格完整
- 将 ChatGPT 自动化 prompt 与最新协议内容同步进 `docs/chatgpt-automation-prompt.md`
- 跟踪数据规模指标，触发拆分归档时机时单独开 change 实施

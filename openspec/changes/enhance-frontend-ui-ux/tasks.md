# Tasks: 前端产品 UI/UX 全面重构与体验优化

## 1. 品牌视觉体系与特色展台

- [x] 1.1 封装 `BrandLogo` 矢量徽标组件，提供主流 AI 厂商（OpenAI、Google、Anthropic、DeepSeek、Qoder 等）图标与通用哈希渐变降级，运行类型检查验证无报错
- [x] 1.2 封装 `BrandBanner` 氛围展台组件，实现定制化特色视觉卡片，验证在各厂商平台下的渲染表现

## 2. 卡片网格与紧凑表格双视图

- [x] 2.1 重构 `OfferCard` 卡片组件，集成厂商徽标、官方/NEW 胶囊、核心属性排、4 项结构化元数据列表与操作底栏
- [x] 2.2 实现 `OfferTableView` 紧凑数据表格组件，包含单选/全选、两行高亮核心权益、状态标签、时效信息与批量操作工具条
- [x] 2.3 更新 `ResourcesApp` 支持卡片与表格视图平滑切换，验证视图切换时 URL 筛选参数不丢失

## 3. 场景化快捷预设与详情弹窗能力

- [x] 3.1 在 `ResourcesApp` 增加场景化快捷预设筛选胶囊（新手无门槛、开发者 Coding API、1M 超长文本、临期捡漏），验证一键组合过滤与重置行为
- [x] 3.2 完善 `OfferDetailDialog` 弹窗，为原生 API 资源增加 cURL 请求示例代码块与一键复制功能，展示上下文与 Tool Calling 等技术规格

## 4. 时效微动效与响应式适配

- [x] 4.1 对 $\le 3$ 天即将过期的活动增加临期琥珀光晕视觉微动效，验证临期状态准确呈现
- [x] 4.2 优化移动端和窄屏设备下的表格与抽屉适配，确保无破坏性横向滚动溢出
- [x] 4.3 同步优化 `AppShell`、`DesktopSidebar` 与 `DashboardApp` 仪表盘

## 5. 综合验证与质量保障

- [x] 5.1 运行 `npm run validate` 验证数据文件与 Schema 完整性
- [x] 5.2 运行 `npm run check` 确保 TypeScript 全局类型零错误
- [x] 5.3 运行 `npx vitest run` 确保全部单元测试通过
- [x] 5.4 运行 `npm run build` 确保所有页面静态编译与打包顺利完成

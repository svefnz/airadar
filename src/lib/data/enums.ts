/**
 * AI Free Radar 数据字典:所有枚举的取值、中文标签与展示辅助。
 * 取值用稳定英文标识(数据文件中存储), 标签用于 UI。
 */

export const OFFER_UNITS = ['USD', 'CNY', 'Token', 'Credit', 'Point', 'Request', 'Message', 'Call', 'Unlimited', 'Unknown'] as const;
export type OfferUnit = (typeof OFFER_UNITS)[number];

export const UNIT_LABELS: Record<OfferUnit, string> = {
  USD: 'USD',
  CNY: 'CNY',
  Token: 'Tokens',
  Credit: 'Credits',
  Point: '积分',
  Request: '次调用',
  Message: '条消息',
  Call: '次请求',
  Unlimited: '无限量',
  Unknown: '未确认',
};

/** 额度类型:一次性/每日/每周/每月/按固定周期/限时无限量/未确认 */
export const AMOUNT_TYPES = ['one-time', 'daily', 'weekly', 'monthly', 'fixed-period', 'limited-unlimited', 'unknown'] as const;
export type AmountType = (typeof AMOUNT_TYPES)[number];

export const AMOUNT_TYPE_LABELS: Record<AmountType, string> = {
  'one-time': '一次性',
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  'fixed-period': '按固定周期',
  'limited-unlimited': '限时无限量',
  unknown: '未确认',
};

/** 额度恢复周期(补充字段, 与 amountType 保持一致) */
export const RESET_INTERVALS = ['none', 'daily', 'weekly', 'monthly', 'periodic', 'unlimited', 'unknown'] as const;
export type ResetInterval = (typeof RESET_INTERVALS)[number];

export const RESET_INTERVAL_LABELS: Record<ResetInterval, string> = {
  none: '无(一次性)',
  daily: '每日恢复',
  weekly: '每周恢复',
  monthly: '每月恢复',
  periodic: '固定周期',
  unlimited: '无限量',
  unknown: '未确认',
};

/** 免费资源类型 */
export const ACCESS_TYPES = ['api', 'client', 'web', 'unknown'] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];

export const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  api: '原生 API',
  client: '客户端专用',
  web: '网页专用',
  unknown: '接入方式不确定',
};

/** 平台可信度 */
export const TRUST_STATUSES = ['official', 'community', 'unverified'] as const;
export type TrustStatus = (typeof TRUST_STATUSES)[number];

export const TRUST_STATUS_LABELS: Record<TrustStatus, string> = {
  official: '官方确认',
  community: '社区实测',
  unverified: '待核实',
};

/** 活动状态 */
export const OFFER_STATUSES = ['active', 'upcoming', 'ended', 'paused', 'unknown'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  active: '有效',
  upcoming: '即将开始',
  ended: '已结束',
  paused: '暂停',
  unknown: '状态未知',
};

/** 平台类别 */
export const PLATFORM_CATEGORIES = ['llm-api', 'agent-platform', 'coding-agent', 'api-relay', 'dev-tool', 'application', 'other'] as const;
export type PlatformCategory = (typeof PLATFORM_CATEGORIES)[number];

export const PLATFORM_CATEGORY_LABELS: Record<PlatformCategory, string> = {
  'llm-api': 'LLM API 平台',
  'agent-platform': 'Agent 平台',
  'coding-agent': 'Coding Agent',
  'api-relay': 'API 中转',
  'dev-tool': '开发者工具',
  application: '应用',
  other: '其他',
};

/** 变更事件类型 */
export const EVENT_TYPES = [
  'platform-added',
  'offer-created',
  'amount-changed',
  'deadline-extended',
  'model-changed',
  'conditions-changed',
  'status-changed',
  'offer-ended',
  'offer-resumed',
  'service-restored',
  'verified',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  'platform-added': '发现新平台',
  'offer-created': '新增活动',
  'amount-changed': '额度变化',
  'deadline-extended': '活动延期',
  'model-changed': '模型变动',
  'conditions-changed': '领取条件变化',
  'status-changed': '状态变化',
  'offer-ended': '活动结束',
  'offer-resumed': '活动恢复',
  'service-restored': '平台恢复免费服务',
  verified: '核验更新',
};

/** 证据来源类型 */
export const SOURCE_KINDS = ['official', 'community', 'forum', 'other'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  official: '官方来源',
  community: '社区实测',
  forum: '社区讨论',
  other: '其他',
};

/** 监控运行状态 */
export const RUN_STATUSES = ['success', 'partial', 'failed'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  success: '成功',
  partial: '部分完成',
  failed: '失败',
};

/** API 兼容性 */
export const API_COMPATIBILITIES = ['openai', 'anthropic', 'both', 'none', 'unknown'] as const;
export type ApiCompatibility = (typeof API_COMPATIBILITIES)[number];

export const API_COMPATIBILITY_LABELS: Record<ApiCompatibility, string> = {
  openai: 'OpenAI 兼容',
  anthropic: 'Anthropic 兼容',
  both: 'OpenAI + Anthropic 兼容',
  none: '不兼容',
  unknown: '未确认',
};

/** 绑卡/实名要求 */
export const BILLING_REQUIREMENTS = ['none', 'card', 'trial', 'unknown'] as const;
export type BillingRequirement = (typeof BILLING_REQUIREMENTS)[number];

export const BILLING_REQUIREMENT_LABELS: Record<BillingRequirement, string> = {
  none: '无需绑卡',
  card: '需要绑卡',
  trial: '试用额度',
  unknown: '未确认',
};

export const IDENTITY_VERIFICATIONS = ['none', 'phone', 'id', 'unknown'] as const;
export type IdentityVerification = (typeof IDENTITY_VERIFICATIONS)[number];

export const IDENTITY_VERIFICATION_LABELS: Record<IdentityVerification, string> = {
  none: '无需实名',
  phone: '需要手机号',
  id: '需要实名认证',
  unknown: '未确认',
};

/**
 * 数据 Schema (Zod v4)。data/radar.json 与增量补丁共用。
 * 所有日期使用 ISO-8601 字符串 UTC。
 */
import { z } from 'zod';
import {
  ACCESS_TYPES,
  AMOUNT_TYPES,
  API_COMPATIBILITIES,
  BILLING_REQUIREMENTS,
  EVENT_TYPES,
  IDENTITY_VERIFICATIONS,
  OFFER_STATUSES,
  OFFER_UNITS,
  PLATFORM_CATEGORIES,
  RESET_INTERVALS,
  RUN_STATUSES,
  SOURCE_KINDS,
  TRUST_STATUSES,
} from './enums';

export const SCHEMA_VERSION = 1;

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), '必须是合法 ISO-8601 日期');

const url = z.string().url().refine((s) => /^https?:\/\//i.test(s), '必须是 http(s) URL');

export const sourceSchema = z.object({
  url: url,
  label: z.string().min(1),
  kind: z.enum(SOURCE_KINDS),
  verifiedAt: isoDate.optional(),
});
export type Source = z.infer<typeof sourceSchema>;

export const platformSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'slug 只允许小写字母、数字、连字符'),
  canonicalDomain: z.string().min(3),
  websiteUrl: url,
  description: z.string().default(''),
  category: z.enum(PLATFORM_CATEGORIES),
  launchDate: isoDate.optional(),
  firstDiscoveredAt: isoDate,
  lastCheckedAt: isoDate,
  trustStatus: z.enum(TRUST_STATUSES),
  logoUrl: url.optional(),
  /** 仅开发阶段示例数据使用, 真实监控写入不得设置 */
  demo: z.boolean().optional(),
});
export type Platform = z.infer<typeof platformSchema>;

export const offerSchema = z.object({
  id: z.string().min(1),
  platformId: z.string().min(1),
  title: z.string().min(1),
  models: z.array(z.string()).default([]),
  accessType: z.enum(ACCESS_TYPES),
  amount: z.number().nonnegative().nullable(),
  unit: z.enum(OFFER_UNITS),
  amountType: z.enum(AMOUNT_TYPES),
  resetInterval: z.enum(RESET_INTERVALS),
  claimConditions: z.array(z.string()).default([]),
  billingRequirements: z.enum(BILLING_REQUIREMENTS),
  identityVerification: z.enum(IDENTITY_VERIFICATIONS),
  regionRestrictions: z.array(z.string()).default([]),
  rateLimits: z.string().default(''),
  contextWindow: z.number().int().positive().nullable().optional(),
  toolCalling: z.boolean().nullable().optional(),
  apiCompatibility: z.enum(API_COMPATIBILITIES),
  startAt: isoDate.optional(),
  endAt: isoDate.optional(),
  creditExpiresAt: isoDate.optional(),
  status: z.enum(OFFER_STATUSES),
  verificationStatus: z.enum(TRUST_STATUSES),
  discoveredAt: isoDate,
  lastVerifiedAt: isoDate,
  officialUrl: url.optional(),
  sources: z.array(sourceSchema).min(1, '至少需要一个证据来源'),
  demo: z.boolean().optional(),
});
export type Offer = z.infer<typeof offerSchema>;

export const eventSchema = z.object({
  id: z.string().min(1),
  offerId: z.string().nullable().optional(),
  platformId: z.string().optional(),
  eventType: z.enum(EVENT_TYPES),
  timestamp: isoDate,
  field: z.string().optional(),
  previousValue: z.string().nullable().optional(),
  currentValue: z.string().nullable().optional(),
  sources: z.array(sourceSchema).default([]),
  description: z.string().default(''),
});
export type ChangeEvent = z.infer<typeof eventSchema>;

export const monitorRunSchema = z.object({
  id: z.string().min(1),
  startedAt: isoDate,
  completedAt: isoDate.optional(),
  status: z.enum(RUN_STATUSES),
  searchACompleted: z.boolean(),
  searchBCompleted: z.boolean(),
  sourcesChecked: z.number().int().nonnegative().default(0),
  candidatesFound: z.number().int().nonnegative().default(0),
  offersCreated: z.number().int().nonnegative().default(0),
  offersUpdated: z.number().int().nonnegative().default(0),
  offersExpired: z.number().int().nonnegative().default(0),
  errors: z.array(z.object({ code: z.string(), message: z.string(), item: z.string().optional() })).default([]),
  repositoryCommit: z.string().optional(),
  note: z.string().optional(),
});
export type MonitorRun = z.infer<typeof monitorRunSchema>;

export const radarSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  lastSuccessfulSync: isoDate.nullable(),
  platforms: z.array(platformSchema),
  offers: z.array(offerSchema),
  events: z.array(eventSchema),
  runs: z.array(monitorRunSchema),
});
export type RadarData = z.infer<typeof radarSchema>;

/** 增量补丁: ChatGPT 连接器/工具的写入协议，支持基于已有 ID 的局部更新 */
export const offerPatchSchema = offerSchema.partial().extend({
  id: z.string().optional(),
  platformId: z.string().optional(),
});
export type OfferPatch = z.infer<typeof offerPatchSchema>;

export const endOfferPatchSchema = z.object({
  offerId: z.string(),
  reason: z.string().default(''),
  timestamp: isoDate,
  sources: z.array(sourceSchema).default([]),
});
export type EndOfferPatch = z.infer<typeof endOfferPatchSchema>;

export const patchSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  generatedAt: isoDate,
  source: z.string().default('chatgpt-automation'),
  note: z.string().optional(),
  platforms: z.array(platformSchema).default([]),
  upserts: z.array(offerPatchSchema).default([]),
  ends: z.array(endOfferPatchSchema).default([]),
  events: z.array(eventSchema).default([]),
  runs: z.array(monitorRunSchema).default([]),
});
export type RadarPatch = z.infer<typeof patchSchema>;

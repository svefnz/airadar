/**
 * 用户个人状态(localStorage)。
 * - 仅存在于当前浏览器, 不写入公共数据, 不自动跨设备同步
 * - 版本化信封: 未来升级时通过 migrate 兼容
 * - 稳定 Offer ID 关联
 */
import { z } from 'zod';

export const PERSONAL_STORAGE_KEY = 'ai-radar:personal:v1';

export const CLAIM_STATUSES = ['claimed', 'ignored', 'expired'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  claimed: '已领取',
  ignored: '不感兴趣',
  expired: '已过期',
};

export interface ClaimRecord {
  status: ClaimStatus;
  claimedAt?: string;
  note?: string;
}

export const claimRecordSchema = z.object({
  status: z.enum(CLAIM_STATUSES),
  claimedAt: z.string().optional(),
  note: z.string().max(2000).optional(),
});

export const personalSchema = z.object({
  version: z.literal(1),
  favorites: z.array(z.string()).default([]),
  claims: z.record(z.string(), claimRecordSchema).default({}),
});
export type PersonalState = z.infer<typeof personalSchema>;

export function emptyPersonal(): PersonalState {
  return { version: 1, favorites: [], claims: {} };
}

/** 迁移旧版本(当前仅 v1; 未来升版时在此逐级转换) */
export function migratePersonal(raw: unknown): PersonalState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const version = typeof obj.version === 'number' ? obj.version : 1;
  if (version > 1) return null; // 未来版本数据, 拒绝读取, 避免损坏(在 UI 上提示)
  const parsed = personalSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** 读取个人状态, 任何异常回退为空状态 */
export function loadPersonal(storage: Storage = window.localStorage): PersonalState {
  try {
    const raw = storage.getItem(PERSONAL_STORAGE_KEY);
    if (!raw) return emptyPersonal();
    return migratePersonal(JSON.parse(raw)) ?? emptyPersonal();
  } catch {
    return emptyPersonal();
  }
}

export function savePersonal(state: PersonalState, storage: Storage = window.localStorage): void {
  storage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify(state));
}

export function clearPersonal(storage: Storage = window.localStorage): void {
  storage.removeItem(PERSONAL_STORAGE_KEY);
}

/** 导出为可下载 JSON 文本 */
export function exportPersonal(state: PersonalState): string {
  return JSON.stringify(state, null, 2);
}

/** 导入解析: 返回 {ok, state?, error?} */
export function parsePersonalImport(text: string): { ok: true; state: PersonalState } | { ok: false; error: string } {
  try {
    const json = JSON.parse(text) as unknown;
    const migrated = migratePersonal(json);
    if (!migrated) return { ok: false, error: '文件格式不支持或版本过新' };
    return { ok: true, state: migrated };
  } catch {
    return { ok: false, error: '不是合法的 JSON 文件' };
  }
}

export function isFavorite(state: PersonalState, offerId: string): boolean {
  return state.favorites.includes(offerId);
}

export function toggleFavorite(state: PersonalState, offerId: string): PersonalState {
  return {
    ...state,
    favorites: isFavorite(state, offerId)
      ? state.favorites.filter((id) => id !== offerId)
      : [...state.favorites, offerId],
  };
}

export function setClaim(state: PersonalState, offerId: string, claim: ClaimRecord): PersonalState {
  return { ...state, claims: { ...state.claims, [offerId]: claim } };
}

export function getClaim(state: PersonalState, offerId: string): ClaimRecord | undefined {
  return state.claims[offerId];
}

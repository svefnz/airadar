import { describe, expect, it } from 'vitest';
import {
  emptyPersonal,
  isFavorite,
  toggleFavorite,
  setClaim,
  getClaim,
  type PersonalState,
} from '../../src/lib/personal';

describe('personal: 纯函数状态模型与云端契约', () => {
  it('emptyPersonal 提供符合 Schema 规范的初始空状态', () => {
    const s = emptyPersonal();
    expect(s).toEqual({ version: 1, favorites: [], claims: {} });
  });

  it('toggleFavorite 支持收藏与取消收藏切换', () => {
    const s = emptyPersonal();
    const s2 = toggleFavorite(s, 'off_1');
    expect(isFavorite(s2, 'off_1')).toBe(true);
    expect(s2.favorites).toContain('off_1');

    const s3 = toggleFavorite(s2, 'off_1');
    expect(isFavorite(s3, 'off_1')).toBe(false);
    expect(s3.favorites).not.toContain('off_1');
  });

  it('setClaim 与 getClaim 能够正确建立领取标记与备忘录', () => {
    const s = emptyPersonal();
    const s2 = setClaim(s, 'off_1', {
      status: 'claimed',
      claimedAt: '2026-02-01T00:00:00Z',
      note: '专属测试备忘',
    });

    const record = getClaim(s2, 'off_1');
    expect(record).toBeDefined();
    expect(record?.status).toBe('claimed');
    expect(record?.note).toBe('专属测试备忘');
  });

  it('多个独立活动的状态不会相互覆盖', () => {
    let s: PersonalState = emptyPersonal();
    s = setClaim(s, 'off_1', { status: 'claimed' });
    s = setClaim(s, 'off_2', { status: 'ignored' });
    s = toggleFavorite(s, 'off_2');

    expect(getClaim(s, 'off_1')?.status).toBe('claimed');
    expect(getClaim(s, 'off_2')?.status).toBe('ignored');
    expect(isFavorite(s, 'off_1')).toBe(false);
    expect(isFavorite(s, 'off_2')).toBe(true);
  });
});

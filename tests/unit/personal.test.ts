// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  clearPersonal,
  emptyPersonal,
  exportPersonal,
  getClaim,
  isFavorite,
  loadPersonal,
  parsePersonalImport,
  savePersonal,
  setClaim,
  toggleFavorite,
  PERSONAL_STORAGE_KEY,
} from '../../src/lib/personal';

describe('personal: localStorage 状态', () => {
  it('空状态默认值正确', () => {
    const s = emptyPersonal();
    expect(s).toEqual({ version: 1, favorites: [], claims: {} });
  });

  it('保存与读取往返一致', () => {
    const s = emptyPersonal();
    const s2 = toggleFavorite(s, 'off_1');
    const s3 = setClaim(s2, 'off_1', { status: 'claimed', claimedAt: '2026-02-01T00:00:00Z' });
    savePersonal(s3);
    expect(loadPersonal()).toEqual(s3);
    expect(isFavorite(s3, 'off_1')).toBe(true);
    expect(getClaim(s3, 'off_1')?.status).toBe('claimed');
  });

  it('损坏数据回退空状态, 不崩溃', () => {
    window.localStorage.setItem(PERSONAL_STORAGE_KEY, '{broken json');
    expect(loadPersonal()).toEqual(emptyPersonal());
    window.localStorage.setItem(PERSONAL_STORAGE_KEY, 'null');
    expect(loadPersonal()).toEqual(emptyPersonal());
  });

  it('版本迁移: v1 正常读取; 未来版本拒绝', () => {
    window.localStorage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify({ version: 1, favorites: ['a'], claims: {} }));
    expect(loadPersonal().favorites).toEqual(['a']);

    window.localStorage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify({ version: 99, favorites: ['a'], claims: {} }));
    expect(loadPersonal()).toEqual(emptyPersonal());
  });

  it('导出/导入往返, 非法输入报错', () => {
    const s = { version: 1 as const, favorites: ['o1'], claims: { o1: { status: 'claimed' as const, note: '测试' } } };
    const text = exportPersonal(s);
    const parsed = parsePersonalImport(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.state).toEqual(s);
    expect(parsePersonalImport('not json').ok).toBe(false);
    expect(parsePersonalImport(JSON.stringify({ version: 99 })).ok).toBe(false);
  });

  it('单独个人状态互不影响(公共数据不受污染)', () => {
    const a = emptyPersonal();
    const b = emptyPersonal();
    expect(toggleFavorite(a, 'o1').favorites).toEqual(['o1']);
    expect(b.favorites).toEqual([]);
  });

  it('清除个人状态', () => {
    savePersonal({ version: 1, favorites: ['o1'], claims: {} });
    clearPersonal();
    expect(window.localStorage.getItem(PERSONAL_STORAGE_KEY)).toBeNull();
    expect(loadPersonal()).toEqual(emptyPersonal());
  });
});

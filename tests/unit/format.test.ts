import { describe, expect, it } from 'vitest';
import { daysUntil, fmtAmount, fmtDate, fmtNumber } from '../../src/lib/utils/format';

/** data-protocol 规格: “额度不可跨单位比较”与“未确认信息显式呈现”的行为测试 */
describe('format: 未确认与单位语义', () => {
  it('单位 Unknown 且额度为空 → 显示“未确认”, 不推断值', () => {
    expect(fmtAmount(null, 'Unknown')).toBe('未确认');
  });

  it('单位 Unlimited → 显示“无限量”', () => {
    expect(fmtAmount(null, 'Unlimited')).toBe('无限量');
  });

  it('未知日期字段 → 显示“未确认”', () => {
    expect(fmtDate(undefined)).toBe('未确认');
    expect(fmtDate('not-a-date')).toBe('未确认');
    expect(daysUntil(undefined)).toBeNull();
  });

  it('数值展示保持单位标签而不进行跨单位换算', () => {
    // 100 Credits 保持显示为 100 Credits, 绝不显示为 100万 Tokens 等换算值
    expect(fmtAmount(100, 'Credit')).toBe('100 Credits');
    expect(fmtAmount(1000000, 'Token')).toBe('100万 Tokens');
    expect(fmtAmount(10, 'USD')).toBe('$10');
    expect(fmtAmount(4000, 'Point')).toBe('4k 积分');
  });

  it('数值缩写仅用于同单位展示层', () => {
    expect(fmtNumber(1_500)).toBe('1.5k');
    expect(fmtNumber(12_000)).toBe('1.2万');
  });
});

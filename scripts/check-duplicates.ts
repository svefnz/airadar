#!/usr/bin/env node
/**
 * 识别可能重复的活动。
 * 规则: 同一平台、标题规范化后相同, 或模糊相似(双字符 Dice 系数 ≥ 0.6)。
 * 只做提示, 不修改数据。用法: pnpm check-duplicates
 */
import { readFileSync } from 'node:fs';
import { radarSchema } from '../src/lib/data/schema';

const raw = readFileSync('data/radar.json', 'utf8');
const data = radarSchema.parse(JSON.parse(raw));

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
}

function dice(a: string, b: string): number {
  const A = norm(a);
  const B = norm(b);
  if (!A || !B) return 0;
  const pairs = (s: string) => {
    const p = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) p.set(s.slice(i, i + 2), (p.get(s.slice(i, i + 2)) ?? 0) + 1);
    return p;
  };
  const pa = pairs(A);
  const pb = pairs(B);
  let inter = 0;
  for (const [k, v] of pa) inter += Math.min(v, pb.get(k) ?? 0);
  return (2 * inter) / (A.length - 1 + B.length - 1);
}

const byPlatform = new Map<string, (typeof data.offers)[number][]>();
for (const o of data.offers) {
  const list = byPlatform.get(o.platformId) ?? [];
  list.push(o);
  byPlatform.set(o.platformId, list);
}

let hits = 0;
for (const [, offers] of byPlatform) {
  for (let i = 0; i < offers.length; i++) {
    for (let j = i + 1; j < offers.length; j++) {
      const a = offers[i]!;
      const b = offers[j]!;
      if (a.id === b.id) continue;
      const exact = norm(a.title) === norm(b.title) && a.accessType === b.accessType && a.unit === b.unit;
      const sim = dice(a.title, b.title);
      if (exact || sim >= 0.6) {
        hits++;
        console.log(`  ? ${a.id} ≈ ${b.id} (标题相似度 ${(sim * 100).toFixed(0)}%${exact ? ', 精确相同' : ''})`);
      }
    }
  }
}
console.log(hits ? `发现 ${hits} 组疑似重复活动(请人工确认后合并, 勿直接删除历史)` : '✓ 未发现疑似重复活动');
process.exit(hits ? 0 : 0);

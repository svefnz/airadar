#!/usr/bin/env node
/**
 * 将增量补丁合并进 data/radar.json。
 * 用法: pnpm merge --patch <patch.json> [--out data/radar.json] [--dry-run]
 *
 * 补丁格式见 src/lib/data/schema.ts 的 RadarPatch(与 ChatGPT 自动化协议一致)。
 * - 合并前先读取 && 校验当前数据
 * - 合并后进行完整校验, 失败则回滚(不写文件)
 * - 写文件采用原子方式(tmp + rename)
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { patchSchema, radarSchema } from '../src/lib/data/schema';
import { applyPatch } from '../src/lib/data/merge';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const patchPath = arg('--patch');
const outPath = arg('--out') ?? 'data/radar.json';
const dryRun = process.argv.includes('--dry-run');

if (!patchPath) {
  console.error('用法: pnpm merge --patch <patch.json> [--out data/radar.json] [--dry-run]');
  process.exit(1);
}

let current: ReturnType<typeof radarSchema.parse>;
try {
  const raw = readFileSync(outPath, 'utf8');
  current = radarSchema.parse(JSON.parse(raw));
} catch (e) {
  console.error(`✗ 当前数据 ${outPath} 无法读取或非法: ${(e as Error).message}`);
  process.exit(1);
}

let patch: ReturnType<typeof patchSchema.parse>;
try {
  const raw = readFileSync(patchPath, 'utf8');
  patch = patchSchema.parse(JSON.parse(raw));
} catch (e) {
  console.error(`✗ 补丁 ${patchPath} 不符合协议: ${(e as Error).message}`);
  process.exit(1);
}

try {
  const { data, summary } = applyPatch(current, patch);
  console.log('合并摘要:');
  console.log(`  + ${summary.platformsAdded} 新平台`);
  console.log(`  + ${summary.offersCreated} 新活动`);
  console.log(`  ~ ${summary.offersUpdated} 活动更新`);
  console.log(`  − ${summary.offersEnded} 活动结束`);
  console.log(`  • ${summary.eventsAdded} 事件(另有自动生成的变更事件)`);
  console.log(`  ↻ ${summary.runsAdded} 监控运行记录`);
  console.log(`  总量: ${data.platforms.length} 平台, ${data.offers.length} 活动, ${data.events.length} 事件, ${data.runs.length} 运行`);

  if (dryRun) {
    console.log('(--dry-run 未写文件)');
    process.exit(0);
  }
  const tmp = `${outPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  renameSync(tmp, outPath);
  console.log(`✓ 已原子写入 ${outPath}`);
} catch (e) {
  console.error(`✗ 合并失败(未写入任何文件): ${(e as Error).message}`);
  process.exit(1);
}

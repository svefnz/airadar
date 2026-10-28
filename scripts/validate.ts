#!/usr/bin/env node
/**
 * 校验 data/radar.json: 先 Zod Schema, 再业务约束。
 * 用法: pnpm validate [path]
 * 退出码: 0=通过(可包含 warning), 1=发现错误(应阻止发布)
 */
import { readFileSync } from 'node:fs';
import { radarSchema } from '../src/lib/data/schema';
import { validateRadar } from '../src/lib/data/validate';

const path = process.argv[2] ?? 'data/radar.json';

let raw: string;
try {
  raw = readFileSync(path, 'utf8');
} catch {
  console.error(`✗ 无法读取数据文件: ${path}`);
  process.exit(1);
}

let json: unknown;
try {
  json = JSON.parse(raw);
} catch {
  console.error(`✗ ${path} 不是合法 JSON`);
  process.exit(1);
}

const schemaResult = radarSchema.safeParse(json);
if (!schemaResult.success) {
  console.error(`✗ Schema 校验失败 (${path}):`);
  for (const issue of schemaResult.error.issues) {
    console.error(`  - [${issue.path.join('.')}] ${issue.message}`);
  }
  process.exit(1);
}

const result = validateRadar(schemaResult.data);
for (const w of result.warnings) console.warn(`  ⚠ ${w}`);
if (result.errors.length) {
  console.error(`✗ 业务约束校验失败 (${path}):`);
  for (const e of result.errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ ${path} 校验通过 (${schemaResult.data.platforms.length} 平台, ${schemaResult.data.offers.length} 活动, ${schemaResult.data.events.length} 事件, ${schemaResult.data.runs.length} 运行)`);
if (result.warnings.length) console.warn(`  ⚠ ${result.warnings.length} 条警告:`);

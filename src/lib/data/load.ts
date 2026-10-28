/** 仅在构建/脚本环境使用: 从磁盘加载并校验 radar.json */
import { readFileSync } from 'node:fs';
import type { RadarData } from './schema';
import { radarSchema } from './schema';

export function loadRadar(path = 'data/radar.json'): RadarData {
  const raw = readFileSync(path, 'utf8');
  const parsed = radarSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`radar.json 校验失败: [${first?.path?.join('.')}] ${first?.message}`);
  }
  return parsed.data;
}

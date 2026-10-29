import { cn } from './cn';

/**
 * 业务语义色映射(shadcn badge variant="outline" + 语义类)。
 * 语义色来自扩展变量(--ok/--warn/--bad/--info), 边界/shadcn 基础变量。
 */
export type BadgeTone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad' | 'info';

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'border-edge bg-elevated text-muted',
  accent: 'border-accent/25 bg-accent/10 text-accent',
  ok: 'border-ok/25 bg-ok-bg text-ok',
  warn: 'border-warn/25 bg-warn-bg text-warn',
  bad: 'border-bad/25 bg-bad-bg text-bad',
  info: 'border-info/25 bg-info-bg text-info',
};

export function badgeTone(tone: BadgeTone, extra?: string): string {
  return cn('border', TONE_CLASS[tone], extra);
}

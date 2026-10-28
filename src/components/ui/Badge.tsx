import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-elevated text-muted border-edge',
  accent: 'bg-accent/10 text-accent border-accent/25',
  ok: 'bg-ok-bg text-ok border-ok/25',
  warn: 'bg-warn-bg text-warn border-warn/25',
  bad: 'bg-bad-bg text-bad border-bad/25',
  info: 'bg-info-bg text-info border-info/25',
};

export function Badge({
  tone = 'neutral',
  class: clazz,
  className,
  children,
  title,
}: {
  tone?: Tone;
  className?: string;
  class?: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] leading-4 font-medium border whitespace-nowrap', tones[tone], clazz, className)}
    >
      {children}
    </span>
  );
}

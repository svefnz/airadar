import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type WithClass = { className?: string; class?: string };

function resolveClass(clazz?: string, className?: string): string | undefined {
  return [clazz, className].filter(Boolean).join(' ') || undefined;
}

export function Card({ class: clazz, className, children, ...rest }: HTMLAttributes<HTMLDivElement> & WithClass) {
  return (
    <div {...rest} className={cn('rounded-lg border border-edge bg-surface', resolveClass(clazz, className))}>
      {children}
    </div>
  );
}

export function CardHeader({ class: clazz, className, children }: WithClass & { children: ReactNode }) {
  return <div className={cn('flex items-start justify-between gap-3 px-4 pt-3.5 pb-2', resolveClass(clazz, className))}>{children}</div>;
}

export function CardTitle({ class: clazz, className, children }: WithClass & { children: ReactNode }) {
  return <h3 className={cn('text-sm font-semibold text-ink', resolveClass(clazz, className))}>{children}</h3>;
}

export function CardBody({ class: clazz, className, children }: WithClass & { children: ReactNode }) {
  return <div className={cn('px-4 pb-4', resolveClass(clazz, className))}>{children}</div>;
}

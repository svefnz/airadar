import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const fieldBase =
  'h-9 w-full rounded-md border border-edge-strong bg-surface px-3 text-sm text-ink ' +
  'placeholder:text-faint focus:outline-2 focus:outline-offset-1 focus:outline-accent ' +
  'disabled:opacity-50 transition-colors';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(fieldBase, className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cn(fieldBase, 'appearance-none pr-8 bg-no-repeat cursor-pointer', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b94a3' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 0.6rem center',
      }}
    >
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        checked ? 'bg-accent' : 'bg-edge-strong',
      )}
    >
      <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
    </button>
  );
}

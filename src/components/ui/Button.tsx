import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:opacity-90 border border-transparent',
  outline: 'border border-edge-strong bg-surface hover:bg-elevated text-ink',
  ghost: 'border border-transparent hover:bg-elevated text-muted hover:text-ink',
  danger: 'border border-transparent bg-bad text-white hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1',
  md: 'h-9 px-3.5 text-sm gap-1.5',
  icon: 'h-8 w-8',
};

export function Button({
  variant = 'outline',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; children?: ReactNode }) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

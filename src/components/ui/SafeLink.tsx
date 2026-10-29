import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** 外部链接: 强制新窗口 + noopener, 白名单仅 http(s) 并校验 URL */
export function SafeLink({ href, className, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  let safeHref = href;
  try {
    const u = new URL(href ?? '');
    if (u.protocol !== 'http:' && u.protocol !== 'https:') safeHref = undefined;
  } catch {
    safeHref = undefined;
  }
  if (!safeHref) return <span className={cn('text-faint line-through', className)}>{children}</span>;
  return (
    <a
      {...rest}
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('text-primary hover:underline underline-offset-2', className)}
    >
      {children}
    </a>
  );
}

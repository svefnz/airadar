import { Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonalDataPanel } from '@/features/PersonalDataPanel';
import { withBase } from '@/lib/utils/url';
import { cn } from '@/lib/utils/cn';

const ITEMS = [
  { href: '/', label: '总览', exact: true },
  { href: '/resources/', label: '资源库' },
  { href: '/discoveries/', label: '新平台发现' },
  { href: '/changelog/', label: '变更记录' },
  { href: '/monitor/', label: '监控状态' },
];

/**
 * 桌面侧边栏: 结构沿用文档流布局, 交互元素使用 shadcn Button(asChild)。
 * 避免引入 SidebarProvider 的 fixed/peer 布局, 保证与主内容流稳定共存。
 */
export function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-r border-edge bg-surface lg:flex">
      <a href={withBase('/')} className="flex items-center gap-2 px-5 pt-5 pb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Radio className="h-4 w-4" />
        </span>
        <span className="text-sm font-bold tracking-tight">AI Free Radar</span>
      </a>
      <nav className="flex-1 space-y-1 px-3 pb-4">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Button
              key={item.href}
              asChild
              size="sm"
              variant={active ? 'default' : 'ghost'}
              className={cn('w-full justify-start text-left', !active && 'text-muted hover:text-ink')}
            >
              <a href={withBase(item.href)}>{item.label}</a>
            </Button>
          );
        })}
      </nav>
      <p className="border-t border-edge px-5 py-4 text-[11px] leading-4 text-faint">
        GitHub 仓库为唯一数据源
        <br />
        持续监控 · 永久历史
      </p>
      <PersonalDataPanel />
    </aside>
  );
}

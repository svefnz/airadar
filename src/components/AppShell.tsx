import type { CSSProperties, ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme';
import { DesktopSidebar } from '@/components/DesktopSidebar';

export function AppShell({
  pathname,
  demoCount,
  children,
}: {
  pathname: string;
  demoCount: number;
  children: ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={200}>
    <SidebarProvider style={{ '--sidebar-width': '14rem' } as CSSProperties}>
      <DesktopSidebar pathname={pathname} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background px-3">
          <SidebarTrigger aria-label="打开导航" />
          <span className="text-sm font-bold lg:hidden">AI Free Radar</span>
          <div className="ml-auto flex items-center">
            <ThemeToggle />
          </div>
        </header>
        {demoCount > 0 && (
          <div className="flex items-center gap-2 border-b border-warn/30 bg-warn-bg px-4 py-2 text-xs text-warn">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span>当前为演示数据（{demoCount} 项），正式监控写入后将自动替换。演示条目均标记「Demo」。</span>
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-faint sm:px-6 lg:px-8">
          个人状态仅保存在当前浏览器（localStorage），不会自动同步其他设备 · 数据来自公开情报，使用前请自行核验官方条款
        </footer>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  );
}

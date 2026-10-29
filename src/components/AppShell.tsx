import type { CSSProperties, ReactNode } from 'react';
import { ShieldAlert, Radio, Activity } from 'lucide-react';
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
        <SidebarInset className="bg-[#080d1a] min-h-screen">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#182338] bg-[#0b1020]/80 backdrop-blur-md px-4 sm:px-6">
            <SidebarTrigger aria-label="打开导航" className="text-slate-400 hover:text-white" />
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white lg:hidden">
                <Radio className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-bold text-white lg:hidden">AI Free Radar</span>
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-800/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  信源雷达实时追踪中
                </span>
                <span className="text-slate-600">•</span>
                <span>持续监控国内外大模型免费额度与开发者红利</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
          {demoCount > 0 && (
            <div className="flex items-center gap-2 border-b border-warn/30 bg-warn-bg px-4 py-2 text-xs text-warn">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>当前为演示数据（{demoCount} 项），正式监控写入后将自动替换。演示条目均标记「Demo」。</span>
            </div>
          )}
          <main className="mx-auto w-full max-w-7xl xl:max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="mx-auto max-w-7xl xl:max-w-[1440px] px-4 pb-8 text-center text-xs text-slate-500 sm:px-6 lg:px-8 border-t border-[#141d30] pt-6 mt-12">
            个人状态仅保存在当前浏览器（localStorage），不会自动同步其他设备 · 数据来自公开信源自动监测与核验，使用前请自行查阅官方条款
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

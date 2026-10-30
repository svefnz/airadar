import { useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { Radio, Sparkles, History, Activity, Layers, Cloud, ShieldAlert } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { UserNav } from '@/components/auth/UserNav';
import { DiscoveriesDialog } from '@/features/modals/DiscoveriesDialog';
import { ChangelogDialog } from '@/features/modals/ChangelogDialog';
import { MonitorDialog } from '@/features/modals/MonitorDialog';
import { PersonalDataDialog } from '@/features/modals/PersonalDataDialog';
import { usePersonal } from '@/lib/usePersonal';
import { withBase } from '@/lib/utils/url';
import type { RadarData } from '@/lib/data/schema';

export function AppShell({
  pathname,
  demoCount,
  data,
  children,
}: {
  pathname: string;
  demoCount: number;
  data?: RadarData;
  children: ReactNode;
}) {
  const [discoveriesOpen, setDiscoveriesOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
  const { state } = usePersonal();

  // 监听 URL 参数自动展开弹窗（兼容存量外链与深度链接）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const modal = sp.get('modal');
    if (modal === 'discoveries' || window.location.pathname.includes('/discoveries')) {
      setDiscoveriesOpen(true);
    } else if (modal === 'changelog' || window.location.pathname.includes('/changelog')) {
      setChangelogOpen(true);
    } else if (modal === 'monitor' || window.location.pathname.includes('/monitor')) {
      setMonitorOpen(true);
    }
  }, []);

  const isResourcesActive = pathname.includes('/resources');
  const isHomeActive = pathname === '/' || pathname === withBase('/');

  return (
    <AuthGuard>
      <TooltipProvider delayDuration={200}>
        <div className="min-h-screen bg-[#080d1a] flex flex-col text-slate-100">
          {/* 统一无侧边栏集约化顶栏 Header */}
          <header className="sticky top-0 z-40 flex flex-nowrap h-14 items-center justify-between border-b border-[#182338] bg-[#0b1020]/90 backdrop-blur-md px-3 sm:px-6 lg:px-8">
            {/* 左侧品牌与主页面链接 */}
            <div className="flex items-center gap-2 sm:gap-6 min-w-0 shrink-0">
              <a href={withBase('/')} className="flex items-center gap-2 group shrink-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform shrink-0">
                  <Radio className="h-4 w-4" />
                </span>
                <span className="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-blue-400 transition-colors shrink-0">
                  AI Free Radar
                </span>
              </a>

              {/* 核心页面快捷切换 */}
              <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
                <a
                  href={withBase('/')}
                  className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isHomeActive && !isResourcesActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <span className="hidden sm:inline">总览大屏</span>
                  <span className="sm:hidden">总览</span>
                </a>
                <a
                  href={withBase('/resources/')}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isResourcesActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                      : 'text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">资源库 (刷卡)</span>
                  <span className="sm:hidden">资源库</span>
                </a>
              </nav>
            </div>

            {/* 中间/右侧：弹窗辅助功能与个人中心 */}
            <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
              {data && (
                <>
                  <div className="hidden lg:flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDiscoveriesOpen(true)}
                      className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                      新平台发现
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setChangelogOpen(true)}
                      className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60"
                    >
                      <History className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                      变更记录
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMonitorOpen(true)}
                      className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60"
                    >
                      <Activity className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                      监控状态
                    </Button>
                  </div>

                  {/* 中屏平板紧凑图标按钮 */}
                  <div className="hidden sm:flex lg:hidden items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDiscoveriesOpen(true)}
                      aria-label="新平台发现"
                      title="新平台发现"
                      className="h-8 w-8 text-slate-400 hover:text-white"
                    >
                      <Sparkles className="h-4 w-4 text-blue-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setChangelogOpen(true)}
                      aria-label="变更记录"
                      title="变更记录"
                      className="h-8 w-8 text-slate-400 hover:text-white"
                    >
                      <History className="h-4 w-4 text-indigo-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMonitorOpen(true)}
                      aria-label="监控状态"
                      title="监控状态"
                      className="h-8 w-8 text-slate-400 hover:text-white"
                    >
                      <Activity className="h-4 w-4 text-emerald-400" />
                    </Button>
                  </div>
                </>
              )}

              <div className="h-4 w-[1px] bg-slate-800 hidden md:block" />

              {/* 个人云端资产弹窗按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPersonalOpen(true)}
                aria-label="云端资产"
                className="hidden sm:inline-flex h-8 px-2.5 text-xs border-[#1e2a42] bg-[#0c1220] hover:bg-slate-800 text-slate-300 shrink-0"
              >
                <Cloud className="h-3.5 w-3.5 sm:mr-1 text-blue-400" />
                <span>云端资产</span>
                {state.favorites.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-blue-600/30 text-[10px] text-blue-400 font-bold">
                    {state.favorites.length}
                  </span>
                )}
              </Button>

              <UserNav />
              <ThemeToggle />
            </div>
          </header>

          {demoCount > 0 && (
            <div className="flex items-center gap-2 border-b border-warn/30 bg-warn-bg px-4 py-2 text-xs text-warn">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>当前为演示数据（{demoCount} 项），正式监控写入后将自动替换。演示条目均标记「Demo」。</span>
            </div>
          )}

          {/* 全宽主内容区 */}
          <main className="mx-auto w-full max-w-7xl xl:max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>

          {/* 极简页脚 */}
          <footer className="mx-auto max-w-7xl xl:max-w-[1440px] w-full px-4 pb-8 text-center text-xs text-slate-500 sm:px-6 lg:px-8 border-t border-[#141d30] pt-6 mt-12">
            已接入 Supabase 云端安全同步 · 仅通过 GitHub OAuth 授权使用 · 数据来自公开信源自动监测与核验
          </footer>

          {/* 模态弹窗挂载 */}
          {data && (
            <>
              <DiscoveriesDialog
                open={discoveriesOpen}
                onOpenChange={setDiscoveriesOpen}
                data={data}
              />
              <ChangelogDialog
                open={changelogOpen}
                onOpenChange={setChangelogOpen}
                data={data}
              />
              <MonitorDialog
                open={monitorOpen}
                onOpenChange={setMonitorOpen}
                data={data}
              />
            </>
          )}
          <PersonalDataDialog open={personalOpen} onOpenChange={setPersonalOpen} />
        </div>
      </TooltipProvider>
    </AuthGuard>
  );
}

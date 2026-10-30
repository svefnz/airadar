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
        <div className="min-h-screen bg-background flex flex-col text-foreground selection:bg-primary/10">
          {/* Notion-style 集约化顶栏 Header */}
          <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
            {/* 顶栏主行 */}
            <div className="mx-auto flex h-12 max-w-7xl xl:max-w-[1440px] items-center justify-between px-3 sm:px-6 lg:px-8">
              {/* 左侧品牌与主页面链接 */}
              <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                <a href={withBase('/')} className="flex items-center gap-2 group shrink-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/70 text-foreground group-hover:bg-muted transition-colors">
                    <Radio className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <span className="text-sm font-semibold tracking-tight text-foreground group-hover:opacity-80 transition-opacity">
                    AI Free Radar
                  </span>
                </a>

              {/* 桌面端视图切换标签 (Notion View Tabs) */}
              <nav className="hidden sm:flex items-center gap-1">
                <a
                  href={withBase('/')}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                    isHomeActive && !isResourcesActive
                      ? 'bg-muted text-foreground font-medium shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  总览大屏
                </a>
                <a
                  href={withBase('/resources/')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                    isResourcesActive
                      ? 'bg-muted text-foreground font-medium shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Layers className="h-3 w-3 text-muted-foreground" />
                  <span>资源库 (刷卡)</span>
                </a>
              </nav>
            </div>

            {/* 中间/右侧：弹窗辅助功能与个人中心 */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {data && (
                <>
                  <div className="hidden lg:flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDiscoveriesOpen(true)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5 text-info" />
                      新平台发现
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setChangelogOpen(true)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    >
                      <History className="h-3.5 w-3.5 mr-1.5 text-primary" />
                      变更记录
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMonitorOpen(true)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    >
                      <Activity className="h-3.5 w-3.5 mr-1.5 text-ok" />
                      监控状态
                    </Button>
                  </div>

                  {/* 中屏平板紧凑图标按钮 */}
                  <div className="hidden sm:flex lg:hidden items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDiscoveriesOpen(true)}
                      aria-label="新平台发现"
                      title="新平台发现"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-info" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setChangelogOpen(true)}
                      aria-label="变更记录"
                      title="变更记录"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    >
                      <History className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMonitorOpen(true)}
                      aria-label="监控状态"
                      title="监控状态"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    >
                      <Activity className="h-3.5 w-3.5 text-ok" />
                    </Button>
                  </div>
                </>
              )}

              <div className="h-3.5 w-[1px] bg-border hidden sm:block" />

              {/* 个人云端资产弹窗按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPersonalOpen(true)}
                aria-label="云端资产"
                className="hidden sm:inline-flex h-7 px-2 text-xs border-border bg-card hover:bg-muted text-foreground shrink-0 shadow-xs"
              >
                <Cloud className="h-3.5 w-3.5 sm:mr-1 text-muted-foreground" />
                <span>云端资产</span>
                {state.favorites.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-primary/10 text-[10px] text-primary font-medium">
                    {state.favorites.length}
                  </span>
                )}
              </Button>

              <UserNav />
              <ThemeToggle />
            </div>
          </div>

          {/* 移动端专属二级导航与工具栏 (Notion Mobile Bar) */}
          <div className="flex sm:hidden items-center justify-between border-t border-border px-3 py-1.5 bg-card/60 overflow-x-auto no-scrollbar gap-2">
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={withBase('/')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  isHomeActive && !isResourcesActive
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                总览
              </a>
              <a
                href={withBase('/resources/')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                  isResourcesActive
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="h-3 w-3" />
                <span>资源库</span>
              </a>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {data && (
                <>
                  <button
                    type="button"
                    onClick={() => setDiscoveriesOpen(true)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/70 text-xs"
                    title="新发现"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-info" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setChangelogOpen(true)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/70 text-xs"
                    title="变更记录"
                  >
                    <History className="h-3.5 w-3.5 text-primary" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonitorOpen(true)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/70 text-xs"
                    title="监控状态"
                  >
                    <Activity className="h-3.5 w-3.5 text-ok" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setPersonalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-card text-xs text-foreground"
              >
                <Cloud className="h-3 w-3 text-muted-foreground" />
                <span>资产</span>
                {state.favorites.length > 0 && (
                  <span className="text-[10px] text-primary font-medium">
                    ({state.favorites.length})
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {demoCount > 0 && (
          <div className="flex items-center gap-2 border-b border-warn/30 bg-warn-bg px-4 py-2 text-xs text-warn">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span>当前为演示数据（{demoCount} 项），正式监控写入后将自动替换。演示条目均标记「Demo」。</span>
          </div>
        )}

        {/* 全宽主内容区 */}
        <main className="mx-auto w-full max-w-7xl xl:max-w-[1440px] flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </main>

        {/* 极简页脚 */}
        <footer className="mx-auto max-w-7xl xl:max-w-[1440px] w-full px-4 pb-8 text-center text-xs text-muted-foreground sm:px-6 lg:px-8 border-t border-border pt-6 mt-12">
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

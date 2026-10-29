import { Radio, LayoutDashboard, Layers, Sparkles, History, Activity } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { PersonalDataPanel } from '@/features/PersonalDataPanel';
import { withBase } from '@/lib/utils/url';

const ITEMS = [
  { href: '/', label: '总览', icon: LayoutDashboard },
  { href: '/resources/', label: '资源库', icon: Layers },
  { href: '/discoveries/', label: '新平台发现', icon: Sparkles },
  { href: '/changelog/', label: '变更记录', icon: History },
  { href: '/monitor/', label: '监控状态', icon: Activity },
];

function isActive(href: string, pathname: string, exact = false): boolean {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <Sidebar collapsible="icon" className="border-r border-[#182338] bg-[#090e1c]">
      <SidebarHeader className="border-b border-[#182338]/60 p-3">
        <div className="flex h-9 items-center gap-2.5 px-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
            <Radio className="h-4 w-4" />
          </span>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-black tracking-tight text-white">
              AI Free Radar
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              活动与福利情报雷达
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3">
            导航导航
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, pathname, item.href === '/');
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={active ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'}
                    >
                      <a href={withBase(item.href)} className="flex items-center gap-2.5 px-3 py-2">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="border-[#182338]" />
      </SidebarContent>
      <SidebarFooter className="border-t border-[#182338]/60 p-3">
        <div className="px-2 pb-2">
          <p className="text-[11px] leading-relaxed text-slate-500 group-data-[collapsible=icon]:hidden">
            对接 ChatGPT 定时任务信源
            <br />
            自动抓取 · 严谨核验
          </p>
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
          <PersonalDataPanel />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

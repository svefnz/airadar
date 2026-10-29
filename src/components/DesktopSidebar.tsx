import { Radio } from 'lucide-react';
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
  { href: '/', label: '总览' },
  { href: '/resources/', label: '资源库' },
  { href: '/discoveries/', label: '新平台发现' },
  { href: '/changelog/', label: '变更记录' },
  { href: '/monitor/', label: '监控状态' },
];

function isActive(href: string, pathname: string, exact = false): boolean {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-9 items-center gap-2 px-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Radio className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            AI Free Radar
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>浏览</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href, pathname, item.href === '/')}
                    tooltip={item.label}
                  >
                    <a href={withBase(item.href)}>{item.label}</a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 pb-1">
          <p className="text-[11px] leading-4 text-muted-foreground group-data-[collapsible=icon]:hidden">
            GitHub 仓库为唯一数据源
            <br />
            持续监控 · 永久历史
          </p>
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
          <PersonalDataPanel />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

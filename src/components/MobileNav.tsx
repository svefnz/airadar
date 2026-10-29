import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { withBase } from '@/lib/utils/url';

const ITEMS = [
  { href: '/', label: '总览' },
  { href: '/resources/', label: '资源库' },
  { href: '/discoveries/', label: '新平台发现' },
  { href: '/changelog/', label: '变更记录' },
  { href: '/monitor/', label: '监控状态' },
];

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="打开导航">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64 p-0">
        <SheetTitle className="sr-only">导航菜单</SheetTitle>
        <nav className="flex flex-col gap-1 p-3">
          {ITEMS.map((item) => (
            <a
              key={item.href}
              href={withBase(item.href)}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-ink hover:bg-muted"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <p className="absolute bottom-8 left-0 right-0 px-4 text-xs text-muted-foreground">
          个人状态仅保存在当前浏览器
        </p>
      </SheetContent>
    </Sheet>
  );
}

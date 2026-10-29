import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export const THEME_STORAGE_KEY = 'ai-radar:theme';
export type Theme = 'light' | 'dark' | 'system';

/** 注入 <head>: 首帧前应用主题, 避免闪烁 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'system';
    var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

function resolveDark(theme: Theme): boolean {
  if (theme === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
  return theme === 'dark';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const s = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      return s === 'light' || s === 'dark' || s === 'system' ? s : 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('dark', resolveDark(theme));
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
  const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;
  const label = theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统';

  return (
    <button
      type="button"
      title={`主题: ${label}(点击切换)`}
      aria-label={`当前主题 ${label}, 点击切换`}
      onClick={() => setTheme(next[theme])}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-elevated',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/**
 * GitHub Pages 子路径(base)支持。
 * Astro 不会自动给手写的绝对路径 <a href="/xxx/"> 加 base,
 * 因此所有内部导航必须经过 withBase() 拼接, 否则在 /airadar/ 下点击会丢前缀。
 */
export const BASE_URL: string = ((import.meta.env.BASE_URL as string | undefined) ?? '/');

export function withBase(path: string): string {
  if (path === '' || path === '/') return BASE_URL;
  if (BASE_URL === '/') return path;
  const base = BASE_URL.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

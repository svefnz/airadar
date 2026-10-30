/**
 * E2E 测试路径解析辅助
 * 支持根据环境变量 ASTRO_BASE (如 '/' 或 '/airadar/') 生成正确的应用访问 URL
 */
export const ASTRO_BASE = (process.env.ASTRO_BASE || '/').replace(/\/+$/, '') + '/';

export function appUrl(path = ''): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${ASTRO_BASE}${cleanPath}`;
}

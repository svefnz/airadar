// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// 项目子路径(GitHub Pages 项目站点)通过 ASTRO_BASE 环境变量覆盖:
// 例如仓库名为 ai-radar: ASTRO_BASE=/ai-radar/
// 用户主页/组织页或自定义域名: 保持默认 "/" 即可。
const base = process.env.ASTRO_BASE || '/';

export default defineConfig({
  site: process.env.SITE_URL || 'https://yourname.github.io/ai-radar/',
  base,
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});

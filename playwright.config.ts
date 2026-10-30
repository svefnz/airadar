import { defineConfig, devices } from '@playwright/test';

const base = process.env.ASTRO_BASE || '/';
const normalizedBase = base.endsWith('/') ? base : `${base}/`;
const port = 4321;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  workers: process.env.CI ? undefined : 2,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-iphone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: `pnpm exec vite preview --port ${port} --host 127.0.0.1 --base ${normalizedBase}`,
    url: `http://127.0.0.1:${port}${normalizedBase}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      ASTRO_BASE: normalizedBase,
      PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL || 'https://iqfuxhpsfbfsfjhyqffo.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY || 'dummy_anon_key_for_e2e_tests',
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy_anon_key_for_e2e_tests',
    },
  },
});

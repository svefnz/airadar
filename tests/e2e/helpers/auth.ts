import type { Page } from '@playwright/test';

export interface MockUserOptions {
  id?: string;
  userName?: string;
  avatarUrl?: string;
}

export async function loginAsTestUser(page: Page, options: MockUserOptions = {}) {
  const userData = {
    id: options.id || 'usr_playwright_e2e',
    userName: options.userName || 'octocat',
    avatarUrl: options.avatarUrl || 'https://avatars.githubusercontent.com/u/9919?v=4',
  };

  await page.addInitScript((data) => {
    (window as any).__MOCK_AUTH_SESSION__ = {
      session: {
        access_token: 'mock-access-token-jwt',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: data.id,
          aud: 'authenticated',
          app_metadata: { provider: 'github' },
          user_metadata: {
            user_name: data.userName,
            avatar_url: data.avatarUrl,
          },
          created_at: '2026-01-01T00:00:00Z',
        },
      },
      user: {
        id: data.id,
        aud: 'authenticated',
        app_metadata: { provider: 'github' },
        user_metadata: {
          user_name: data.userName,
          avatar_url: data.avatarUrl,
        },
        created_at: '2026-01-01T00:00:00Z',
      },
    };
  }, userData);
}

export async function waitForHydration(page: Page) {
  await page.locator('[data-hydrated="true"]').waitFor({ timeout: 15000 });
}

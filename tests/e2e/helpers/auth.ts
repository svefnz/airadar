import type { Page } from '@playwright/test';

export interface MockUserOptions {
  id?: string;
  userName?: string;
  avatarUrl?: string;
  initialFavorites?: string[];
}

export async function loginAsTestUser(page: Page, options: MockUserOptions = {}) {
  const userId = options.id || 'usr_playwright_e2e';
  const userName = options.userName || 'octocat';
  const avatarUrl = options.avatarUrl || 'https://avatars.githubusercontent.com/u/9919?v=4';
  let favorites = [...(options.initialFavorites || [])];

  // 1. 设置 Supabase 客户端标准 Session 存储 (基于 localStorage storageKey 'ai_radar_auth_session')
  const sessionData = {
    access_token: 'fake-jwt-token-for-e2e',
    refresh_token: 'fake-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${userName}@example.com`,
      app_metadata: { provider: 'github' },
      user_metadata: {
        user_name: userName,
        avatar_url: avatarUrl,
      },
      created_at: '2026-01-01T00:00:00Z',
    },
  };

  await page.addInitScript(
    ({ session, key }) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(session));
      } catch (e) {
        console.error('Failed to set test auth session:', e);
      }
    },
    { session: sessionData, key: 'ai_radar_auth_session' }
  );

  // 2. 网络级拦截 Supabase API 请求 (通过 Playwright 隔离模拟后端返回，不入侵生产代码)
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // 收藏表接口
    if (url.includes('/rest/v1/user_favorites')) {
      if (method === 'GET') {
        const body = favorites.map((id) => ({ offer_id: id }));
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      }
      if (method === 'POST') {
        try {
          const payload = JSON.parse(route.request().postData() || '{}');
          if (payload.offer_id && !favorites.includes(payload.offer_id)) {
            favorites.push(payload.offer_id);
          }
        } catch {}
        return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
      }
      if (method === 'DELETE') {
        const match = url.match(/offer_id=eq\.([^&]+)/);
        if (match) {
          favorites = favorites.filter((id) => id !== match[1]);
        }
        return route.fulfill({ status: 204, body: '' });
      }
    }

    // 领取记录接口
    if (url.includes('/rest/v1/user_claims')) {
      if (method === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }

    // 清空数据 RPC
    if (url.includes('/rest/v1/rpc/clear_my_personal_data')) {
      favorites = [];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }

    return route.continue();
  });
}

export async function clearAuthSession(page: Page) {
  await page.addInitScript((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }, 'ai_radar_auth_session');
}

export async function waitForHydration(page: Page) {
  await page.locator('[data-hydrated="true"]').first().waitFor({ timeout: 15000 });
}

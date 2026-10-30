import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { LoginView } from '../../src/components/auth/LoginView';
import { UserNav } from '../../src/components/auth/UserNav';
import { AuthContext, type AuthState } from '../../src/lib/auth';

describe('user-auth: 登录守卫与组件呈现', () => {
  it('未登录时 LoginView 能够正确渲染 GitHub 授权按钮与品牌标题', () => {
    const html = renderToStaticMarkup(React.createElement(LoginView));
    expect(html).toContain('AI Free Radar');
    expect(html).toContain('使用 GitHub 授权登录');
    expect(html).toContain('私密多端云同步系统');
  });

  it('已登录时 UserNav 展示用户 GitHub 昵称与退出登录按钮', () => {
    const mockAuth: AuthState = {
      session: {
        access_token: 'fake-token',
        refresh_token: 'fake-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'user_123',
          app_metadata: {},
          user_metadata: {
            user_name: 'octocat',
            avatar_url: 'https://github.com/octocat.png',
          },
          aud: 'authenticated',
          created_at: '2026-01-01T00:00:00Z',
        },
      },
      user: {
        id: 'user_123',
        app_metadata: {},
        user_metadata: {
          user_name: 'octocat',
          avatar_url: 'https://github.com/octocat.png',
        },
        aud: 'authenticated',
        created_at: '2026-01-01T00:00:00Z',
      },
      loading: false,
      isConfigured: true,
      signInWithGitHub: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    };

    const html = renderToStaticMarkup(
      React.createElement(
        AuthContext.Provider,
        { value: mockAuth },
        React.createElement(UserNav)
      )
    );

    expect(html).toContain('octocat');
    expect(html).toContain('退出登录');
  });

  it('未登录时 UserNav 返回空', () => {
    const mockAuth: AuthState = {
      session: null,
      user: null,
      loading: false,
      isConfigured: true,
      signInWithGitHub: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    };

    const html = renderToStaticMarkup(
      React.createElement(
        AuthContext.Provider,
        { value: mockAuth },
        React.createElement(UserNav)
      )
    );

    expect(html).toBe('');
  });
});

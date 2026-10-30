import { useStore } from '@nanostores/react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { $auth } from '@/lib/store';

export function useAuth() {
  const state = useStore($auth);

  const signInWithGitHub = async () => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase 环境变量尚未配置') };
    }

    // 采用固定的 origin 规范回调，兼容 GitHub Pages 子路径
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : undefined;

    return await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
      },
    });
  };

  const signOut = async () => {
    if (typeof window !== 'undefined' && (window as any).__MOCK_AUTH_SESSION__) {
      delete (window as any).__MOCK_AUTH_SESSION__;
      $auth.set({
        session: null,
        user: null,
        loading: false,
        isConfigured: true,
      });
      return { error: null };
    }
    if (!isSupabaseConfigured) return { error: null };
    return await supabase.auth.signOut();
  };

  return {
    ...state,
    signInWithGitHub,
    signOut,
  };
}

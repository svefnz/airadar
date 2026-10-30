import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGitHub: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  loading: true,
  isConfigured: isSupabaseConfigured,
  signInWithGitHub: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/**
 * Direct API helper to initiate GitHub OAuth login
 */
export async function signInWithGitHub() {
  if (!isSupabaseConfigured) {
    return { error: new Error('Supabase 环境变量尚未配置，无法发起 GitHub 登录。') };
  }

  const redirectTo = typeof window !== 'undefined' ? window.location.href : undefined;
  return await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo,
    },
  });
}

/**
 * Direct API helper to sign out
 */
export async function signOut() {
  if (!isSupabaseConfigured) return { error: null };
  return await supabase.auth.signOut();
}

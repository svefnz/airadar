import React, { useState, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AuthContext, signInWithGitHub, signOut } from '@/lib/auth';
import { LoginView } from '@/components/auth/LoginView';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 1. Initial get session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Subscribe to auth changes (sign in, sign out, token refreshed)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const authContextValue = {
    session,
    user,
    loading,
    isConfigured: isSupabaseConfigured,
    signInWithGitHub,
    signOut,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {loading ? (
        // Initializing skeleton / loading indicator
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="text-xs text-slate-400">正在验证 GitHub 登录会话…</span>
          </div>
        </div>
      ) : user ? (
        // Authenticated: Render actual website content
        children
      ) : (
        // Unauthenticated: Global Auth Wall interception
        <LoginView />
      )}
    </AuthContext.Provider>
  );
}

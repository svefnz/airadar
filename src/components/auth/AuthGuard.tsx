import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $auth, initAuthListener, initPersonalSync } from '@/lib/store';
import { LoginView } from '@/components/auth/LoginView';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, isConfigured } = useStore($auth);

  useEffect(() => {
    // 启动全局单例监听（只执行一次）
    initAuthListener();
    initPersonalSync();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-xs text-slate-400">正在验证 GitHub 登录会话…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return <>{children}</>;
}

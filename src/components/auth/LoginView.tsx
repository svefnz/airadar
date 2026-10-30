import React, { useState } from 'react';
import { ShieldAlert, Sparkles, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function LoginView() {
  const { isConfigured, signInWithGitHub } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const { error } = await signInWithGitHub();
      if (error) {
        setErrorMessage(error.message);
        setSubmitting(false);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '发起登录请求失败');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[68vh] w-full items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 sm:p-8 text-center shadow-sm transition-colors">
        {/* Radar Brand Icon */}
        <div className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>

        {/* Title & Tagline */}
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          AI Free Radar
        </h2>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          全球主流 AI 免费额度 · 原生 API 限免与开发者权益雷达
        </p>

        {/* Security / Notice Badge */}
        <div className="my-5 rounded-lg border border-border bg-muted/40 p-3.5 text-left text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <KeyRound className="h-3.5 w-3.5 text-ok" />
            <span>私密多端云同步系统</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
            本项目已升级为全站云端资产雷达，仅支持 GitHub OAuth 授权登录。登录后自动同步您的专属收藏、领取标记与备忘录，数据受到 Supabase 行级安全（RLS）严格保护。
          </p>
        </div>

        {/* Missing Env Configuration Warning */}
        {!isConfigured && (
          <div className="mb-5 rounded-lg border border-warn/30 bg-warn-bg p-3 text-left text-xs text-warn">
            <div className="flex items-center gap-1.5 font-medium mb-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>尚未配置 Supabase 环境变量</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              请在项目的 <code className="rounded bg-muted px-1 py-0.5">.env</code> 文件中配置 <code className="rounded bg-muted px-1 py-0.5">PUBLIC_SUPABASE_URL</code> 和 <code className="rounded bg-muted px-1 py-0.5">PUBLIC_SUPABASE_ANON_KEY</code>。
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-bad/30 bg-bad-bg p-2.5 text-xs text-bad text-left">
            {errorMessage}
          </div>
        )}

        {/* Action Button: GitHub Login */}
        <button
          type="button"
          onClick={handleLogin}
          disabled={submitting || !isConfigured}
          className="group relative flex w-full items-center justify-center gap-2 rounded-md bg-foreground text-background px-4 py-2.5 text-xs font-semibold shadow-xs transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin text-background" />
          ) : (
            <GitHubIcon className="h-4 w-4 text-background" />
          )}
          <span>使用 GitHub 授权登录</span>
        </button>

        {/* Privacy Footnote */}
        <p className="mt-5 text-[11px] text-slate-500">
          仅读取您的 GitHub 公开公开资料 (UID, 用户名与头像)，绝不请求额外读写权限。
        </p>
      </div>
    </div>
  );
}

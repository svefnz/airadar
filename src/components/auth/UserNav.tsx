import React from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function UserNav() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const metadata = user.user_metadata || {};
  const avatarUrl = metadata.avatar_url;
  const username = metadata.user_name || metadata.preferred_username || user.email?.split('@')[0] || 'GitHub 用户';

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-[#1e2a42] bg-[#0e1626] px-2 sm:px-2.5 py-1 shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username}
            className="h-5 w-5 rounded-full border border-slate-700 object-cover shrink-0"
          />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-300 shrink-0">
            <UserIcon className="h-3 w-3" />
          </div>
        )}
        <span className="text-xs font-medium text-slate-200 max-w-[80px] sm:max-w-[120px] truncate shrink-0">
          {username}
        </span>
      </div>

      <button
        type="button"
        onClick={() => signOut()}
        title="退出 GitHub 登录"
        aria-label="退出登录"
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#1e2a42] bg-[#0e1626] text-slate-400 hover:border-rose-500/50 hover:bg-rose-950/20 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

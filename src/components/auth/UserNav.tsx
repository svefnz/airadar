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
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shrink-0 hover:bg-muted/50 transition-colors">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username}
            className="h-4 w-4 rounded-full border border-border object-cover shrink-0"
          />
        ) : (
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
            <UserIcon className="h-2.5 w-2.5" />
          </div>
        )}
        <span className="text-xs font-medium text-foreground max-w-[80px] sm:max-w-[120px] truncate shrink-0">
          {username}
        </span>
      </div>

      <button
        type="button"
        onClick={() => signOut()}
        title="退出 GitHub 登录"
        aria-label="退出登录"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer shrink-0"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

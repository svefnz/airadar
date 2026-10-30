-- ==============================================================================
-- AI Free Radar - Supabase Database Initialization & RLS Policies
-- ==============================================================================
-- 运行方法：在 Supabase Dashboard -> SQL Editor 中粘贴并运行此脚本。

-- 1. 用户个人收藏表 (user_favorites)
create table if not exists public.user_favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  offer_id text not null,
  created_at timestamp with time zone default now() not null,
  unique (user_id, offer_id)
);

-- 创建索引提升按用户查询性能
create index if not exists idx_user_favorites_user_id on public.user_favorites(user_id);
create index if not exists idx_user_favorites_offer_id on public.user_favorites(offer_id);

-- 开启行级安全（Row Level Security）
alter table public.user_favorites enable row level security;

-- 策略：仅允许用户查看、插入、删除属于自己的收藏
drop policy if exists "Users can view their own favorites" on public.user_favorites;
create policy "Users can view their own favorites" on public.user_favorites
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own favorites" on public.user_favorites;
create policy "Users can insert their own favorites" on public.user_favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own favorites" on public.user_favorites;
create policy "Users can delete their own favorites" on public.user_favorites
  for delete using (auth.uid() = user_id);


-- 2. 用户个人领取状态与备忘录表 (user_claims)
create table if not exists public.user_claims (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  offer_id text not null,
  status text not null check (status in ('claimed', 'ignored')),
  claimed_at timestamp with time zone default now() not null,
  notes text default '',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique (user_id, offer_id)
);

-- 创建索引提升按用户与活动联合检索效率
create index if not exists idx_user_claims_user_id on public.user_claims(user_id);
create index if not exists idx_user_claims_user_offer on public.user_claims(user_id, offer_id);

-- 开启行级安全（Row Level Security）
alter table public.user_claims enable row level security;

-- 策略：仅允许用户查看、插入/更新、删除属于自己的领取记录
drop policy if exists "Users can view their own claims" on public.user_claims;
create policy "Users can view their own claims" on public.user_claims
  for select using (auth.uid() = user_id);

drop policy if exists "Users can manage their own claims" on public.user_claims;
create policy "Users can manage their own claims" on public.user_claims
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own claims" on public.user_claims;
create policy "Users can delete their own claims" on public.user_claims
  for delete using (auth.uid() = user_id);

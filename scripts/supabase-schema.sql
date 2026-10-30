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

create index if not exists idx_user_favorites_user_id on public.user_favorites(user_id);
create index if not exists idx_user_favorites_offer_id on public.user_favorites(offer_id);

alter table public.user_favorites enable row level security;

-- 策略：支持 SELECT, INSERT, UPDATE, DELETE (满足 upsert 冲突更新需求)
drop policy if exists "Users can view their own favorites" on public.user_favorites;
create policy "Users can view their own favorites" on public.user_favorites
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own favorites" on public.user_favorites;
create policy "Users can insert their own favorites" on public.user_favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own favorites" on public.user_favorites;
create policy "Users can update their own favorites" on public.user_favorites
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own favorites" on public.user_favorites;
create policy "Users can delete their own favorites" on public.user_favorites
  for delete using (auth.uid() = user_id);


-- 2. 用户个人领取状态与备忘录表 (user_claims)
-- 注意：CHECK 约束必须覆盖全部业务枚举 ('claimed', 'ignored', 'expired')
create table if not exists public.user_claims (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  offer_id text not null,
  status text not null check (status in ('claimed', 'ignored', 'expired')),
  claimed_at timestamp with time zone default now() not null,
  notes text default '',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique (user_id, offer_id)
);

-- 如果此前已存在该表，安全更新 check 约束以兼容 'expired'
do $$
begin
  alter table public.user_claims drop constraint if exists user_claims_status_check;
  alter table public.user_claims add constraint user_claims_status_check check (status in ('claimed', 'ignored', 'expired'));
exception
  when others then null;
end $$;

create index if not exists idx_user_claims_user_id on public.user_claims(user_id);
create index if not exists idx_user_claims_user_offer on public.user_claims(user_id, offer_id);

alter table public.user_claims enable row level security;

drop policy if exists "Users can view their own claims" on public.user_claims;
create policy "Users can view their own claims" on public.user_claims
  for select using (auth.uid() = user_id);

drop policy if exists "Users can manage their own claims" on public.user_claims;
create policy "Users can manage their own claims" on public.user_claims
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own claims" on public.user_claims;
create policy "Users can delete their own claims" on public.user_claims
  for delete using (auth.uid() = user_id);


-- 3. 原子性事务清空个人所有数据 RPC (保证 favorites 和 claims 同时删除)
create or replace function public.clear_my_personal_data()
returns void
language plpgsql
security invoker
as $$
begin
  delete from public.user_favorites where user_id = auth.uid();
  delete from public.user_claims where user_id = auth.uid();
end;
$$;

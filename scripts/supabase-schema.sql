-- ==============================================================================
-- AI Free Radar - Supabase Database Initialization & Security Hardening
-- ==============================================================================

-- 0. 安全补丁：撤销数据库自带特权触发器函数的不必要权限
do $$
begin
  if exists (select 1 from pg_proc where proname = 'rls_auto_enable') then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated;';
  end if;
exception
  when others then null;
end $$;


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

-- 策略优化：采用 (select auth.uid()) 避免逐行重复计算提升性能，合并单条 ALL 策略消除重复策略告警
drop policy if exists "Users can manage their own favorites" on public.user_favorites;
drop policy if exists "Users can view their own favorites" on public.user_favorites;
drop policy if exists "Users can insert their own favorites" on public.user_favorites;
drop policy if exists "Users can update their own favorites" on public.user_favorites;
drop policy if exists "Users can delete their own favorites" on public.user_favorites;
create policy "Users can manage their own favorites" on public.user_favorites
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 撤销不必要的危险特权（TRUNCATE/TRIGGER/REFERENCES），遵循最小特权原则
revoke truncate, trigger, references on public.user_favorites from public, anon, authenticated;
grant select, insert, update, delete on public.user_favorites to authenticated;
grant all on public.user_favorites to service_role;


-- 2. 用户个人领取状态与备忘录表 (user_claims)
-- 解耦备注与领取状态：status 允许为 NULL，claimed_at 允许为 NULL
create table if not exists public.user_claims (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  offer_id text not null,
  status text check (status is null or status in ('claimed', 'ignored', 'expired')),
  claimed_at timestamp with time zone,
  notes text default '',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique (user_id, offer_id)
);

-- 安全更新现有约束：兼容 status 为 null，移除 claimed_at 强制非空与默认值
alter table public.user_claims alter column status drop not null;
alter table public.user_claims alter column claimed_at drop default;
alter table public.user_claims alter column claimed_at drop not null;
alter table public.user_claims drop constraint if exists user_claims_status_check;
alter table public.user_claims add constraint user_claims_status_check check (status is null or status in ('claimed', 'ignored', 'expired'));

create index if not exists idx_user_claims_user_id on public.user_claims(user_id);
create index if not exists idx_user_claims_user_offer on public.user_claims(user_id, offer_id);

alter table public.user_claims enable row level security;

drop policy if exists "Users can manage their own claims" on public.user_claims;
drop policy if exists "Users can view their own claims" on public.user_claims;
drop policy if exists "Users can insert their own claims" on public.user_claims;
drop policy if exists "Users can update their own claims" on public.user_claims;
drop policy if exists "Users can delete their own claims" on public.user_claims;
create policy "Users can manage their own claims" on public.user_claims
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 撤销不必要的危险特权（TRUNCATE/TRIGGER/REFERENCES），遵循最小特权原则
revoke truncate, trigger, references on public.user_claims from public, anon, authenticated;
grant select, insert, update, delete on public.user_claims to authenticated;
grant all on public.user_claims to service_role;


-- 3. 原子性事务清空个人所有数据 RPC (固定 search_path 与权限收紧)
create or replace function public.clear_my_personal_data()
returns void
set search_path = public, pg_temp
as $$
begin
  delete from public.user_favorites where user_id = auth.uid();
  delete from public.user_claims where user_id = auth.uid();
end;
$$ language plpgsql security invoker;

revoke all on function public.clear_my_personal_data() from public, anon;
grant execute on function public.clear_my_personal_data() to authenticated;


-- ==============================================================================
-- 4. 公共雷达数据表 (platforms, offers, radar_events, monitor_runs)
-- ==============================================================================

-- 4.1 平台表 (platforms)
create table if not exists public.platforms (
  id text primary key,
  name text not null,
  slug text not null unique,
  canonical_domain text not null,
  website_url text not null,
  description text default '',
  category text not null,
  launch_date timestamptz,
  first_discovered_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  trust_status text not null default 'unverified',
  logo_url text,
  demo boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_platforms_slug on public.platforms(slug);
create index if not exists idx_platforms_category on public.platforms(category);
create index if not exists idx_platforms_trust_status on public.platforms(trust_status);

alter table public.platforms enable row level security;
drop policy if exists "Public read for platforms" on public.platforms;
create policy "Public read for platforms" on public.platforms for select using (true);

alter table public.platforms drop constraint if exists chk_platforms_slug_format;
alter table public.platforms add constraint chk_platforms_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]*$');
alter table public.platforms drop constraint if exists chk_platforms_canonical_domain_len;
alter table public.platforms add constraint chk_platforms_canonical_domain_len check (length(canonical_domain) >= 3);
alter table public.platforms drop constraint if exists chk_platforms_website_url_format;
alter table public.platforms add constraint chk_platforms_website_url_format check (website_url ~* '^https?://');


-- 4.2 活动福利表 (offers)
create table if not exists public.offers (
  id text primary key,
  platform_id text not null references public.platforms(id) on delete cascade,
  title text not null,
  models jsonb not null default '[]'::jsonb,
  access_type text not null,
  amount numeric,
  unit text not null,
  amount_type text not null,
  reset_interval text not null,
  claim_conditions jsonb not null default '[]'::jsonb,
  billing_requirements text not null,
  identity_verification text not null,
  region_restrictions jsonb not null default '[]'::jsonb,
  rate_limits text default '',
  context_window integer,
  tool_calling boolean,
  api_compatibility text not null,
  start_at timestamptz,
  end_at timestamptz,
  credit_expires_at timestamptz,
  status text not null default 'active',
  verification_status text not null default 'unverified',
  discovered_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  official_url text,
  sources jsonb not null default '[]'::jsonb,
  demo boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_offers_platform_id on public.offers(platform_id);
create index if not exists idx_offers_status on public.offers(status);
create index if not exists idx_offers_verification_status on public.offers(verification_status);
create index if not exists idx_offers_discovered_at on public.offers(discovered_at desc);

alter table public.offers enable row level security;
drop policy if exists "Public read for offers" on public.offers;
create policy "Public read for offers" on public.offers for select using (true);

alter table public.offers drop constraint if exists chk_offers_amount_nonnegative;
alter table public.offers add constraint chk_offers_amount_nonnegative check (amount is null or amount >= 0);

alter table public.offers drop constraint if exists chk_offers_context_window_positive;
alter table public.offers add constraint chk_offers_context_window_positive check (context_window is null or context_window > 0);


-- 4.3 变更事件表 (radar_events)
create table if not exists public.radar_events (
  id text primary key,
  offer_id text references public.offers(id) on delete cascade,
  platform_id text references public.platforms(id) on delete cascade,
  event_type text not null,
  timestamp timestamptz not null default now(),
  field text,
  previous_value text,
  current_value text,
  sources jsonb not null default '[]'::jsonb,
  description text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_radar_events_offer_id on public.radar_events(offer_id);
create index if not exists idx_radar_events_platform_id on public.radar_events(platform_id);
create index if not exists idx_radar_events_timestamp on public.radar_events(timestamp desc);

alter table public.radar_events enable row level security;
drop policy if exists "Public read for radar_events" on public.radar_events;
create policy "Public read for radar_events" on public.radar_events for select using (true);


-- 4.4 监控运行记录表 (monitor_runs)
create table if not exists public.monitor_runs (
  id text primary key,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'success',
  search_a_completed boolean default false,
  search_b_completed boolean default false,
  sources_checked integer default 0,
  candidates_found integer default 0,
  offers_created integer default 0,
  offers_updated integer default 0,
  offers_expired integer default 0,
  errors jsonb not null default '[]'::jsonb,
  repository_commit text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_monitor_runs_started_at on public.monitor_runs(started_at desc);

alter table public.monitor_runs enable row level security;
drop policy if exists "Public read for monitor_runs" on public.monitor_runs;
create policy "Public read for monitor_runs" on public.monitor_runs for select using (true);


-- 4.5 公共雷达表权限彻底收紧：清退公共角色所有写入与触发特权，仅授予只读 SELECT
revoke all on public.platforms, public.offers, public.radar_events, public.monitor_runs from public, anon, authenticated;
grant select on public.platforms, public.offers, public.radar_events, public.monitor_runs to anon, authenticated;
grant all on public.platforms, public.offers, public.radar_events, public.monitor_runs to service_role;


-- ==============================================================================
-- 5. ChatGPT 自动化写入 RPC (严格身份校验、复合身份防误合并、完整差异比对与服务端校验)
-- ==============================================================================
create or replace function public.ingest_radar_batch(patch jsonb)
returns jsonb
set search_path = public, pg_temp
as $$
declare
  p jsonb;
  o jsonb;
  e jsonb;
  end_item jsonb;
  run_item jsonb;
  existing_rec record;
  existing_platform record;
  target_offer_id text;
  target_platform_id text;
  incoming_title text;
  merged_sources jsonb;
  src_item jsonb;
  new_title text;
  new_models jsonb;
  new_access_type text;
  new_amount numeric;
  new_unit text;
  new_amount_type text;
  new_reset_interval text;
  new_claim_conditions jsonb;
  new_billing_req text;
  new_identity_ver text;
  new_region_res jsonb;
  new_rate_limits text;
  new_context_win integer;
  new_tool_calling boolean;
  new_api_compat text;
  new_end_at timestamptz;
  new_credit_exp timestamptz;
  new_status text;
  new_ver_status text;
  new_official_url text;
  has_diff boolean;
  has_platform_diff boolean;
  target_platform_name text;
  target_platform_slug text;
  target_platform_domain text;
  target_platform_desc text;
  target_platform_cat text;
  target_platform_url text;
  target_platform_trust text;
  target_platform_logo text;
  platforms_created int := 0;
  platforms_updated int := 0;
  offers_created int := 0;
  offers_updated int := 0;
  offers_unchanged int := 0;
  offers_ended int := 0;
  events_count int := 0;
  now_ts timestamptz := now();
  jwt_role text;
begin
  -- 严格权限防御：
  -- 1. REST 请求时，检查 JWT 声明必须为 service_role；
  -- 2. SQL 直连时（无 JWT 声明），检查实际会话发起者 session_user（而非 SECURITY DEFINER 切换后的 current_user），仅允许 postgres 或 supabase_admin
  jwt_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role';
  if jwt_role is not null then
    if jwt_role <> 'service_role' then
      raise exception 'Permission denied: service_role required for REST calls to ingest_radar_batch (got: %)', jwt_role;
    end if;
  else
    if session_user not in ('postgres', 'supabase_admin') then
      raise exception 'Permission denied: trusted server session required for ingest_radar_batch (got session_user: %)', session_user;
    end if;
  end if;

  -- 强制要求 schemaVersion 且必须为 1，拒绝缺失或非法版本
  if not (patch ? 'schemaVersion') or (patch->>'schemaVersion')::int <> 1 then
    raise exception 'Missing or unsupported schema version: % (expected: 1)', coalesce(patch->>'schemaVersion', 'null');
  end if;

  -- 强制要求 generatedAt 且必须为合法 ISO 时间戳
  if not (patch ? 'generatedAt') or trim(patch->>'generatedAt') = '' then
    raise exception 'Patch requires non-empty generatedAt ISO timestamp';
  end if;
  begin
    perform (patch->>'generatedAt')::timestamptz;
  exception when others then
    raise exception 'Invalid generatedAt timestamp format: %', patch->>'generatedAt';
  end;

  -- 1. 合并平台 (platforms)
  if patch ? 'platforms' and jsonb_typeof(patch->'platforms') = 'array' then
    for p in select * from jsonb_array_elements(patch->'platforms') loop
      target_platform_id := coalesce(p->>'id', p->>'slug');
      if target_platform_id is null or trim(target_platform_id) = '' then
        raise exception 'Platform requires non-empty id or slug';
      end if;

      target_platform_slug := coalesce(p->>'slug', target_platform_id);
      if target_platform_slug !~ '^[a-z0-9][a-z0-9-]*$' then
        raise exception 'Platform slug is invalid: % (must match ^[a-z0-9][a-z0-9-]*$)', target_platform_slug;
      end if;

      -- 服务端枚举与格式校验
      if (p ? 'category') and (p->>'category' not in ('llm-api', 'agent-platform', 'coding-agent', 'api-relay', 'dev-tool', 'application', 'other')) then
        raise exception 'Invalid platform category: % (platform: %)', p->>'category', target_platform_id;
      end if;
      if (p ? 'trustStatus' or p ? 'trust_status') and coalesce(p->>'trustStatus', p->>'trust_status') not in ('official', 'community', 'unverified') then
        raise exception 'Invalid platform trustStatus: % (platform: %)', coalesce(p->>'trustStatus', p->>'trust_status'), target_platform_id;
      end if;
      if (p ? 'websiteUrl' or p ? 'website_url') then
        target_platform_url := coalesce(p->>'websiteUrl', p->>'website_url');
        if target_platform_url is not null and target_platform_url !~* '^https?://[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}' then
          raise exception 'Invalid platform websiteUrl: % (platform: %)', target_platform_url, target_platform_id;
        end if;
      end if;
      if (p ? 'canonicalDomain' or p ? 'canonical_domain') then
        target_platform_domain := coalesce(p->>'canonicalDomain', p->>'canonical_domain');
        if target_platform_domain is not null and length(trim(target_platform_domain)) < 3 then
          raise exception 'Invalid platform canonicalDomain: % (platform: %)', target_platform_domain, target_platform_id;
        end if;
      end if;

      select * into existing_platform from public.platforms
      where id = target_platform_id or slug = target_platform_slug or (canonical_domain <> '' and canonical_domain = coalesce(p->>'canonicalDomain', p->>'canonical_domain'))
      limit 1;

      if existing_platform.id is not null then
        -- 计算根据写入逻辑处理后的实际目标值
        target_platform_name := coalesce(p->>'name', existing_platform.name);
        target_platform_desc := case when (p ? 'description') and (p->>'description' <> '') then p->>'description' else existing_platform.description end;
        target_platform_cat := case when (p ? 'category') then coalesce(p->>'category', existing_platform.category) else existing_platform.category end;
        target_platform_domain := coalesce(p->>'canonicalDomain', p->>'canonical_domain', existing_platform.canonical_domain);
        target_platform_url := coalesce(p->>'websiteUrl', p->>'website_url', existing_platform.website_url);
        target_platform_trust := case when (p ? 'trustStatus' or p ? 'trust_status') and coalesce(p->>'trustStatus', p->>'trust_status') <> 'unverified' then coalesce(p->>'trustStatus', p->>'trust_status') else existing_platform.trust_status end;
        target_platform_logo := case when (p ? 'logoUrl' or p ? 'logo_url') then coalesce(p->>'logoUrl', p->>'logo_url') else existing_platform.logo_url end;

        -- 依据最终实际写入值与现有值进行精准比对，避免伪更新
        has_platform_diff := (target_platform_name is distinct from existing_platform.name)
          or (target_platform_desc is distinct from existing_platform.description)
          or (target_platform_cat is distinct from existing_platform.category)
          or (target_platform_domain is distinct from existing_platform.canonical_domain)
          or (target_platform_url is distinct from existing_platform.website_url)
          or (target_platform_trust is distinct from existing_platform.trust_status)
          or (target_platform_logo is distinct from existing_platform.logo_url);

        if has_platform_diff then
          update public.platforms set
            name = target_platform_name,
            description = target_platform_desc,
            category = target_platform_cat,
            canonical_domain = target_platform_domain,
            website_url = target_platform_url,
            last_checked_at = coalesce((p->>'lastCheckedAt')::timestamptz, (p->>'last_checked_at')::timestamptz, now_ts),
            trust_status = target_platform_trust,
            logo_url = target_platform_logo,
            updated_at = now_ts
          where id = existing_platform.id;
          platforms_updated := platforms_updated + 1;
        else
          -- 业务数据无实质变动时，仅静默更新 last_checked_at 证明巡检查验过，不递增 platforms_updated 避免误触发重新部署
          update public.platforms set
            last_checked_at = coalesce((p->>'lastCheckedAt')::timestamptz, (p->>'last_checked_at')::timestamptz, now_ts)
          where id = existing_platform.id;
        end if;
      else
        -- 新建平台分支：强制要求有效 websiteUrl 和 canonicalDomain
        target_platform_url := coalesce(p->>'websiteUrl', p->>'website_url');
        if target_platform_url is null or trim(target_platform_url) = '' or target_platform_url !~* '^https?://[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}' then
          raise exception 'Creating platform % requires a valid websiteUrl starting with http:// or https:// (got: %)', target_platform_id, coalesce(target_platform_url, 'null');
        end if;

        target_platform_domain := coalesce(p->>'canonicalDomain', p->>'canonical_domain');
        if target_platform_domain is null or length(trim(target_platform_domain)) < 3 then
          raise exception 'Creating platform % requires canonicalDomain with at least 3 characters (got: %)', target_platform_id, coalesce(target_platform_domain, 'null');
        end if;

        if not (p ? 'firstDiscoveredAt' or p ? 'first_discovered_at') then
          raise exception 'Creating platform % requires explicit firstDiscoveredAt timestamp', target_platform_id;
        end if;
        if not (p ? 'lastCheckedAt' or p ? 'last_checked_at') then
          raise exception 'Creating platform % requires explicit lastCheckedAt timestamp', target_platform_id;
        end if;

        insert into public.platforms (
          id, name, slug, canonical_domain, website_url, description,
          category, launch_date, first_discovered_at, last_checked_at,
          trust_status, logo_url, demo, created_at, updated_at
        ) values (
          target_platform_id,
          coalesce(p->>'name', target_platform_id),
          target_platform_slug,
          target_platform_domain,
          target_platform_url,
          coalesce(p->>'description', ''),
          coalesce(p->>'category', 'llm-api'),
          case when p ? 'launchDate' then (p->>'launchDate')::timestamptz else null end,
          coalesce((p->>'firstDiscoveredAt')::timestamptz, (p->>'first_discovered_at')::timestamptz),
          coalesce((p->>'lastCheckedAt')::timestamptz, (p->>'last_checked_at')::timestamptz),
          coalesce(p->>'trustStatus', p->>'trust_status', 'unverified'),
          coalesce(p->>'logoUrl', p->>'logo_url'),
          coalesce((p->>'demo')::boolean, false),
          now_ts, now_ts
        );
        platforms_created := platforms_created + 1;
      end if;
    end loop;
  end if;

  -- 2. 合并/更新活动 (offers)
  if patch ? 'upserts' and jsonb_typeof(patch->'upserts') = 'array' then
    for o in select * from jsonb_array_elements(patch->'upserts') loop
      target_platform_id := coalesce(o->>'platformId', o->>'platform_id');
      incoming_title := trim(coalesce(o->>'title', ''));
      target_offer_id := o->>'id';

      -- 严格稳定身份匹配：
      -- 若提供了 ID 则优先按 ID 精确匹配；若未提供 ID，则综合（平台 + 接入方式 + 额度单位 + 重置周期 + 标题规范化）复合去重
      existing_rec := null;
      if target_offer_id is not null and trim(target_offer_id) <> '' then
        select * into existing_rec from public.offers where id = target_offer_id limit 1;
      elsif target_platform_id is not null and incoming_title <> '' then
        select * into existing_rec from public.offers
        where platform_id = target_platform_id
          and access_type = coalesce(o->>'accessType', o->>'access_type', 'api')
          and unit = coalesce(o->>'unit', 'Credit')
          and reset_interval = coalesce(o->>'resetInterval', o->>'reset_interval', 'none')
          and lower(trim(title)) = lower(trim(incoming_title))
        limit 1;
      end if;

      -- 严格枚举值校验（若传入该字段，绝不允许非法值）
      if (o ? 'accessType' or o ? 'access_type') and coalesce(o->>'accessType', o->>'access_type') not in ('api', 'client', 'web', 'unknown') then
        raise exception 'Invalid accessType: %', coalesce(o->>'accessType', o->>'access_type');
      end if;
      if (o ? 'unit') and (o->>'unit' not in ('USD', 'CNY', 'Token', 'Credit', 'Point', 'Request', 'Message', 'Call', 'Unlimited', 'Unknown')) then
        raise exception 'Invalid unit: %', o->>'unit';
      end if;
      if (o ? 'amountType' or o ? 'amount_type') and coalesce(o->>'amountType', o->>'amount_type') not in ('one-time', 'daily', 'weekly', 'monthly', 'fixed-period', 'limited-unlimited', 'unknown') then
        raise exception 'Invalid amountType: %', coalesce(o->>'amountType', o->>'amount_type');
      end if;
      if (o ? 'resetInterval' or o ? 'reset_interval') and coalesce(o->>'resetInterval', o->>'reset_interval') not in ('none', 'daily', 'weekly', 'monthly', 'periodic', 'unlimited', 'unknown') then
        raise exception 'Invalid resetInterval: %', coalesce(o->>'resetInterval', o->>'reset_interval');
      end if;
      if (o ? 'billingRequirements' or o ? 'billing_requirements') and coalesce(o->>'billingRequirements', o->>'billing_requirements') not in ('none', 'card', 'trial', 'unknown') then
        raise exception 'Invalid billingRequirements: %', coalesce(o->>'billingRequirements', o->>'billing_requirements');
      end if;
      if (o ? 'identityVerification' or o ? 'identity_verification') and coalesce(o->>'identityVerification', o->>'identity_verification') not in ('none', 'phone', 'id', 'unknown') then
        raise exception 'Invalid identityVerification: %', coalesce(o->>'identityVerification', o->>'identity_verification');
      end if;
      if (o ? 'apiCompatibility' or o ? 'api_compatibility') and coalesce(o->>'apiCompatibility', o->>'api_compatibility') not in ('openai', 'anthropic', 'both', 'none', 'unknown') then
        raise exception 'Invalid apiCompatibility: %', coalesce(o->>'apiCompatibility', o->>'api_compatibility');
      end if;
      if (o ? 'status') and (o->>'status' not in ('active', 'upcoming', 'ended', 'paused', 'unknown')) then
        raise exception 'Invalid status (use ended instead of expired): %', o->>'status';
      end if;
      if (o ? 'verificationStatus' or o ? 'verification_status') and coalesce(o->>'verificationStatus', o->>'verification_status') not in ('official', 'community', 'unverified') then
        raise exception 'Invalid verificationStatus: %', coalesce(o->>'verificationStatus', o->>'verification_status');
      end if;

      -- 额度非负校验
      if (o ? 'amount') and (o->>'amount' is not null) and (o->>'amount' <> 'null') and ((o->>'amount')::numeric < 0) then
        raise exception 'Offer amount cannot be negative: % (offer: %)', o->>'amount', coalesce(target_offer_id, incoming_title);
      end if;

      -- 上下文窗口正整数校验
      if (o ? 'contextWindow' or o ? 'context_window') then
        if (coalesce(o->>'contextWindow', o->>'context_window') is not null and coalesce(o->>'contextWindow', o->>'context_window') <> 'null') then
          if (coalesce(o->>'contextWindow', o->>'context_window')::integer <= 0) then
            raise exception 'Offer contextWindow must be a positive integer (got: %, offer: %)', coalesce(o->>'contextWindow', o->>'context_window'), coalesce(target_offer_id, incoming_title);
          end if;
        end if;
      end if;

      -- 证据 sources 结构校验（若传入）
      if (o ? 'sources') then
        if jsonb_typeof(o->'sources') <> 'array' then
          raise exception 'Offer sources must be an array (offer: %)', coalesce(target_offer_id, incoming_title);
        end if;
        for src_item in select * from jsonb_array_elements(o->'sources') loop
          if (src_item->>'url' is null or trim(src_item->>'url') = '' or src_item->>'url' !~* '^https?://[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}') then
            raise exception 'Source requires a valid http(s) url (got: %, offer: %)', coalesce(src_item->>'url', 'null'), coalesce(target_offer_id, incoming_title);
          end if;
          if (src_item->>'label' is null or trim(src_item->>'label') = '') then
            raise exception 'Source requires non-empty label (offer: %)', coalesce(target_offer_id, incoming_title);
          end if;
          if (src_item->>'kind' is null or src_item->>'kind' not in ('official', 'community', 'forum', 'other')) then
            raise exception 'Source requires valid kind (official, community, forum, other; got: %, offer: %)', coalesce(src_item->>'kind', 'null'), coalesce(target_offer_id, incoming_title);
          end if;
        end loop;
      end if;

      if existing_rec.id is not null then
        -- 【分支 A：现有活动局部更新 (Patch)】
        -- 允许只提交变更字段，未提交字段沿用数据库中已有记录，不强制要求 title / platformId
        merged_sources := coalesce(existing_rec.sources, '[]'::jsonb);
        if (o ? 'sources') and jsonb_typeof(o->'sources') = 'array' then
          for src_item in select * from jsonb_array_elements(o->'sources') loop
            if not exists (select 1 from jsonb_array_elements(merged_sources) as s where s->>'url' = src_item->>'url') then
              merged_sources := merged_sources || jsonb_build_array(src_item);
            end if;
          end loop;
        end if;

        new_title := case when (o ? 'title') and trim(o->>'title') <> '' then trim(o->>'title') else existing_rec.title end;
        new_models := case when (o ? 'models') then coalesce(o->'models', '[]'::jsonb) else existing_rec.models end;
        new_access_type := case when (o ? 'accessType' or o ? 'access_type') then coalesce(o->>'accessType', o->>'access_type') else existing_rec.access_type end;
        new_amount := case when (o ? 'amount') then (case when o->>'amount' is null or o->>'amount' = 'null' then null else (o->>'amount')::numeric end) else existing_rec.amount end;
        new_unit := case when (o ? 'unit') then o->>'unit' else existing_rec.unit end;
        new_amount_type := case when (o ? 'amountType' or o ? 'amount_type') then coalesce(o->>'amountType', o->>'amount_type') else existing_rec.amount_type end;
        new_reset_interval := case when (o ? 'resetInterval' or o ? 'reset_interval') then coalesce(o->>'resetInterval', o->>'reset_interval') else existing_rec.reset_interval end;
        new_claim_conditions := case when (o ? 'claimConditions' or o ? 'claim_conditions') then coalesce(o->'claimConditions', o->'claim_conditions') else existing_rec.claim_conditions end;
        new_billing_req := case when (o ? 'billingRequirements' or o ? 'billing_requirements') then coalesce(o->>'billingRequirements', o->>'billing_requirements') else existing_rec.billing_requirements end;
        new_identity_ver := case when (o ? 'identityVerification' or o ? 'identity_verification') then coalesce(o->>'identityVerification', o->>'identity_verification') else existing_rec.identity_verification end;
        new_region_res := case when (o ? 'regionRestrictions' or o ? 'region_restrictions') then coalesce(o->'regionRestrictions', o->'region_restrictions') else existing_rec.region_restrictions end;
        new_rate_limits := case when (o ? 'rateLimits' or o ? 'rate_limits') then coalesce(o->>'rateLimits', o->>'rate_limits') else existing_rec.rate_limits end;
        new_context_win := case when (o ? 'contextWindow') then (case when o->>'contextWindow' is null or o->>'contextWindow' = 'null' then null else (o->>'contextWindow')::integer end) else existing_rec.context_window end;
        new_tool_calling := case when (o ? 'toolCalling') then (case when o->>'toolCalling' is null or o->>'toolCalling' = 'null' then null else (o->>'toolCalling')::boolean end) else existing_rec.tool_calling end;
        new_api_compat := case when (o ? 'apiCompatibility' or o ? 'api_compatibility') then coalesce(o->>'apiCompatibility', o->>'api_compatibility') else existing_rec.api_compatibility end;
        new_end_at := case when (o ? 'endAt') then (case when o->>'endAt' is null or o->>'endAt' = 'null' then null else (o->>'endAt')::timestamptz end) else existing_rec.end_at end;
        new_credit_exp := case when (o ? 'creditExpiresAt') then (case when o->>'creditExpiresAt' is null or o->>'creditExpiresAt' = 'null' then null else (o->>'creditExpiresAt')::timestamptz end) else existing_rec.credit_expires_at end;
        new_status := case when (o ? 'status') then o->>'status' else existing_rec.status end;
        new_ver_status := case when (o ? 'verificationStatus' or o ? 'verification_status') then coalesce(o->>'verificationStatus', o->>'verification_status') else existing_rec.verification_status end;
        new_official_url := case when (o ? 'officialUrl' or o ? 'official_url') then coalesce(o->>'officialUrl', o->>'official_url') else existing_rec.official_url end;

        has_diff := false;

        -- 差异比对 1: 额度或单位变更（清晰区分 null 为未知额度，绝不格式化为 0）
        if (new_amount is distinct from existing_rec.amount) or (new_unit is distinct from existing_rec.unit) then
          has_diff := true;
          insert into public.radar_events (id, offer_id, platform_id, event_type, timestamp, field, previous_value, current_value, sources, description)
          values (
            'evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
            existing_rec.id, existing_rec.platform_id, 'amount-changed', now_ts, 'amount',
            coalesce(existing_rec.amount::text, '未知') || ' ' || existing_rec.unit,
            coalesce(new_amount::text, '未知') || ' ' || new_unit,
            coalesce(o->'sources', '[]'::jsonb),
            '额度由 ' || coalesce(existing_rec.amount::text, '未确认') || ' 调整为 ' || coalesce(new_amount::text, '未确认')
          );
          events_count := events_count + 1;
        end if;

        -- 差异比对 2: 状态变更
        if new_status is distinct from existing_rec.status then
          has_diff := true;
          insert into public.radar_events (id, offer_id, platform_id, event_type, timestamp, field, previous_value, current_value, sources, description)
          values (
            'evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
            existing_rec.id, existing_rec.platform_id, 'status-changed', now_ts, 'status',
            existing_rec.status, new_status,
            coalesce(o->'sources', '[]'::jsonb),
            '活动状态由「' || existing_rec.status || '」变更为「' || new_status || '」'
          );
          events_count := events_count + 1;
        end if;

        -- 差异比对 3: 截止日期变动
        if new_end_at is distinct from existing_rec.end_at then
          has_diff := true;
          insert into public.radar_events (id, offer_id, platform_id, event_type, timestamp, field, previous_value, current_value, sources, description)
          values (
            'evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
            existing_rec.id, existing_rec.platform_id, 'deadline-extended', now_ts, 'endAt',
            coalesce(existing_rec.end_at::text, '未设定'), coalesce(new_end_at::text, '未设定'),
            coalesce(o->'sources', '[]'::jsonb),
            '活动截止时间调整为 ' || coalesce(new_end_at::text, '未设定')
          );
          events_count := events_count + 1;
        end if;

        -- 差异比对 4: 额度有效期变动 (creditExpiresAt)
        if new_credit_exp is distinct from existing_rec.credit_expires_at then
          has_diff := true;
          insert into public.radar_events (id, offer_id, platform_id, event_type, timestamp, field, previous_value, current_value, sources, description)
          values (
            'evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
            existing_rec.id, existing_rec.platform_id, 'deadline-extended', now_ts, 'creditExpiresAt',
            coalesce(existing_rec.credit_expires_at::text, '未设定'), coalesce(new_credit_exp::text, '未设定'),
            coalesce(o->'sources', '[]'::jsonb),
            '额度有效期调整为 ' || coalesce(new_credit_exp::text, '未设定')
          );
          events_count := events_count + 1;
        end if;

        -- 差异比对 5: 模型列表变动
        if new_models is distinct from existing_rec.models then
          has_diff := true;
          insert into public.radar_events (id, offer_id, platform_id, event_type, timestamp, field, previous_value, current_value, sources, description)
          values (
            'evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
            existing_rec.id, existing_rec.platform_id, 'model-changed', now_ts, 'models',
            existing_rec.models::text, new_models::text,
            coalesce(o->'sources', '[]'::jsonb),
            '支持模型列表变动'
          );
          events_count := events_count + 1;
        end if;

        -- 差异比对 6: 技术规格变动 (上下文长度/Tool Calling/API兼容性/速率限制)
        if (new_context_win is distinct from existing_rec.context_window) or
           (new_tool_calling is distinct from existing_rec.tool_calling) or
           (new_api_compat is distinct from existing_rec.api_compatibility) or
           (new_rate_limits is distinct from existing_rec.rate_limits) then
          has_diff := true;
          insert into public.radar_events (id, offer_id, platform_id, event_type, timestamp, field, sources, description)
          values (
            'evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
            existing_rec.id, existing_rec.platform_id, 'model-changed', now_ts, 'capabilities',
            coalesce(o->'sources', '[]'::jsonb),
            '模型能力与技术规格变动 (上下文/工具调用/API兼容性/速率限制)'
          );
          events_count := events_count + 1;
        end if;

        -- 差异比对 7: 门槛、条件与地区限制变更
        if (new_access_type is distinct from existing_rec.access_type) or
           (new_billing_req is distinct from existing_rec.billing_requirements) or
           (new_identity_ver is distinct from existing_rec.identity_verification) or
           (new_claim_conditions is distinct from existing_rec.claim_conditions) or
           (new_region_res is distinct from existing_rec.region_restrictions) then
          has_diff := true;
          insert into public.radar_events (id, offer_id, platform_id, event_type, timestamp, field, sources, description)
          values (
            'evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
            existing_rec.id, existing_rec.platform_id, 'conditions-changed', now_ts, 'conditions',
            coalesce(o->'sources', '[]'::jsonb),
            '权益门槛、实名/绑卡条件或地区限制调整'
          );
          events_count := events_count + 1;
        end if;

        -- 差异比对 8: 其他元数据字段变动
        if (new_title is distinct from existing_rec.title) or
           (new_official_url is distinct from existing_rec.official_url) or
           (new_ver_status is distinct from existing_rec.verification_status) or
           (new_amount_type is distinct from existing_rec.amount_type) or
           (new_reset_interval is distinct from existing_rec.reset_interval) then
          has_diff := true;
        end if;

        -- 差异比对 9: 新增证据来源
        if jsonb_array_length(merged_sources) > jsonb_array_length(coalesce(existing_rec.sources, '[]'::jsonb)) then
          has_diff := true;
        end if;

        -- 只有字段确实变动才执行 UPDATE，避免伪更新与无意义的 offers_updated 递增
        if has_diff then
          update public.offers set
            title = new_title,
            models = new_models,
            access_type = new_access_type,
            amount = new_amount,
            unit = new_unit,
            amount_type = new_amount_type,
            reset_interval = new_reset_interval,
            claim_conditions = new_claim_conditions,
            billing_requirements = new_billing_req,
            identity_verification = new_identity_ver,
            region_restrictions = new_region_res,
            rate_limits = new_rate_limits,
            context_window = new_context_win,
            tool_calling = new_tool_calling,
            api_compatibility = new_api_compat,
            end_at = new_end_at,
            credit_expires_at = new_credit_exp,
            status = new_status,
            verification_status = new_ver_status,
            official_url = new_official_url,
            sources = merged_sources,
            last_verified_at = coalesce((o->>'lastVerifiedAt')::timestamptz, (o->>'last_verified_at')::timestamptz, now_ts),
            updated_at = now_ts
          where id = existing_rec.id;
          offers_updated := offers_updated + 1;
        else
          -- 业务数据无变动时，仅静默刷新 last_verified_at 保持数据新鲜度，绝不累加 offers_updated 避免误触发构建部署
          update public.offers set
            last_verified_at = coalesce((o->>'lastVerifiedAt')::timestamptz, (o->>'last_verified_at')::timestamptz, now_ts)
          where id = existing_rec.id;
          offers_unchanged := offers_unchanged + 1;
        end if;
      else
        -- 【分支 B：新增活动 (Insert)】
        -- 严格要求提供完整规格，拒绝静默赋予默认值造成不完整数据
        if target_platform_id is null or target_platform_id = '' then
          raise exception 'New offer missing required platformId';
        end if;
        if not exists (select 1 from public.platforms where id = target_platform_id or slug = target_platform_id) then
          raise exception 'Platform not found: %', target_platform_id;
        end if;
        select id into target_platform_id from public.platforms where id = target_platform_id or slug = target_platform_id limit 1;

        if incoming_title = '' then
          raise exception 'New offer requires non-empty title (platform: %)', target_platform_id;
        end if;

        if not (o ? 'sources') or jsonb_typeof(o->'sources') <> 'array' or jsonb_array_length(o->'sources') = 0 then
          raise exception 'New offer requires at least one source (platform: %, title: %)', target_platform_id, incoming_title;
        end if;

        if not (o ? 'accessType' or o ? 'access_type') then
          raise exception 'New offer requires explicit accessType (offer: %)', incoming_title;
        end if;
        if not (o ? 'amount') then
          raise exception 'New offer requires explicit amount (numeric value >= 0 or null) (offer: %)', incoming_title;
        end if;
        if not (o ? 'unit') then
          raise exception 'New offer requires explicit unit (offer: %)', incoming_title;
        end if;
        if not (o ? 'amountType' or o ? 'amount_type') then
          raise exception 'New offer requires explicit amountType (offer: %)', incoming_title;
        end if;
        if not (o ? 'resetInterval' or o ? 'reset_interval') then
          raise exception 'New offer requires explicit resetInterval (offer: %)', incoming_title;
        end if;
        if not (o ? 'billingRequirements' or o ? 'billing_requirements') then
          raise exception 'New offer requires explicit billingRequirements (offer: %)', incoming_title;
        end if;
        if not (o ? 'identityVerification' or o ? 'identity_verification') then
          raise exception 'New offer requires explicit identityVerification (offer: %)', incoming_title;
        end if;
        if not (o ? 'apiCompatibility' or o ? 'api_compatibility') then
          raise exception 'New offer requires explicit apiCompatibility (offer: %)', incoming_title;
        end if;

        if target_offer_id is null or trim(target_offer_id) = '' then
          target_offer_id := 'off_' || target_platform_id || '_' || substr(md5(incoming_title), 1, 8);
        end if;

        insert into public.offers (
          id, platform_id, title, models, access_type, amount, unit,
          amount_type, reset_interval, claim_conditions, billing_requirements,
          identity_verification, region_restrictions, rate_limits, context_window,
          tool_calling, api_compatibility, start_at, end_at, credit_expires_at,
          status, verification_status, discovered_at, last_verified_at,
          official_url, sources, demo, created_at, updated_at
        ) values (
          target_offer_id,
          target_platform_id,
          incoming_title,
          coalesce(o->'models', '[]'::jsonb),
          coalesce(o->>'accessType', o->>'access_type'),
          case when (o->>'amount') is not null and (o->>'amount') <> 'null' then (o->>'amount')::numeric else null end,
          o->>'unit',
          coalesce(o->>'amountType', o->>'amount_type'),
          coalesce(o->>'resetInterval', o->>'reset_interval'),
          coalesce(o->'claimConditions', o->'claim_conditions', '[]'::jsonb),
          coalesce(o->>'billingRequirements', o->>'billing_requirements'),
          coalesce(o->>'identityVerification', o->>'identity_verification'),
          coalesce(o->'regionRestrictions', o->'region_restrictions', '[]'::jsonb),
          coalesce(o->>'rateLimits', o->>'rate_limits', ''),
          case when (o->>'contextWindow') is not null and (o->>'contextWindow') <> 'null' then (o->>'contextWindow')::integer else null end,
          case when (o->>'toolCalling') is not null and (o->>'toolCalling') <> 'null' then (o->>'toolCalling')::boolean else null end,
          coalesce(o->>'apiCompatibility', o->>'api_compatibility'),
          case when o ? 'startAt' then (o->>'startAt')::timestamptz else null end,
          case when o ? 'endAt' then (o->>'endAt')::timestamptz else null end,
          case when o ? 'creditExpiresAt' then (o->>'creditExpiresAt')::timestamptz else null end,
          coalesce(o->>'status', 'active'),
          coalesce(o->>'verificationStatus', o->>'verification_status', 'unverified'),
          coalesce((o->>'discoveredAt')::timestamptz, (o->>'discovered_at')::timestamptz, now_ts),
          coalesce((o->>'lastVerifiedAt')::timestamptz, (o->>'last_verified_at')::timestamptz, now_ts),
          coalesce(o->>'officialUrl', o->>'official_url'),
          o->'sources',
          coalesce((o->>'demo')::boolean, false),
          now_ts, now_ts
        );

        insert into public.radar_events (
          id, offer_id, platform_id, event_type, timestamp, description, sources
        ) values (
          'evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
          target_offer_id,
          target_platform_id,
          'offer-created',
          now_ts,
          '新增活动「' || incoming_title || '」',
          o->'sources'
        );
        offers_created := offers_created + 1;
        events_count := events_count + 1;
      end if;
    end loop;
  end if;

  -- 3. 标记结束的活动 (ends) -> 统一置为 'ended' 状态并追加事件
  if patch ? 'ends' and jsonb_typeof(patch->'ends') = 'array' then
    for end_item in select * from jsonb_array_elements(patch->'ends') loop
      target_offer_id := coalesce(end_item->>'offerId', end_item->>'offer_id');
      if target_offer_id is not null then
        -- 证据校验：结束下线必须提供至少一条证据来源
        if not (end_item ? 'sources') or jsonb_typeof(end_item->'sources') <> 'array' or jsonb_array_length(end_item->'sources') = 0 then
          raise exception 'Ending offer % requires at least one source (sources array cannot be empty)', target_offer_id;
        end if;
        for src_item in select * from jsonb_array_elements(end_item->'sources') loop
          if (src_item->>'url' is null or trim(src_item->>'url') = '' or src_item->>'url' !~* '^https?://[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}') then
            raise exception 'Source in ends requires a valid http(s) url (got: %, offer: %)', coalesce(src_item->>'url', 'null'), target_offer_id;
          end if;
          if (src_item->>'label' is null or trim(src_item->>'label') = '') then
            raise exception 'Source in ends requires non-empty label (offer: %)', target_offer_id;
          end if;
          if (src_item->>'kind' is null or src_item->>'kind' not in ('official', 'community', 'forum', 'other')) then
            raise exception 'Source in ends requires valid kind (official, community, forum, other; got: %, offer: %)', coalesce(src_item->>'kind', 'null'), target_offer_id;
          end if;
        end loop;

        select * into existing_rec from public.offers where id = target_offer_id limit 1;
        if existing_rec.id is not null and existing_rec.status <> 'ended' then
          update public.offers set
            status = 'ended',
            end_at = coalesce((end_item->>'timestamp')::timestamptz, now_ts),
            updated_at = now_ts
          where id = existing_rec.id;

          insert into public.radar_events (
            id, offer_id, platform_id, event_type, timestamp, description, sources
          ) values (
            'evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
            existing_rec.id,
            existing_rec.platform_id,
            'offer-ended',
            now_ts,
            coalesce(end_item->>'reason', '活动已结束'),
            coalesce(end_item->'sources', '[]'::jsonb)
          );
          offers_ended := offers_ended + 1;
          events_count := events_count + 1;
        end if;
      end if;
    end loop;
  end if;

  -- 4. 显式事件写入 (events)
  if patch ? 'events' and jsonb_typeof(patch->'events') = 'array' then
    for e in select * from jsonb_array_elements(patch->'events') loop
      insert into public.radar_events (
        id, offer_id, platform_id, event_type, timestamp, field,
        previous_value, current_value, sources, description
      ) values (
        coalesce(e->>'id', 'evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
        coalesce(e->>'offerId', e->>'offer_id'),
        coalesce(e->>'platformId', e->>'platform_id'),
        coalesce(e->>'eventType', e->>'event_type', 'status-changed'),
        coalesce((e->>'timestamp')::timestamptz, now_ts),
        e->>'field',
        coalesce(e->>'previousValue', e->>'previous_value'),
        coalesce(e->>'currentValue', e->>'current_value'),
        coalesce(e->'sources', '[]'::jsonb),
        coalesce(e->>'description', '')
      )
      on conflict (id) do nothing;
      events_count := events_count + 1;
    end loop;
  end if;

  -- 5. 记录监控运行：强制要求调用方提供真实 status，严禁默认伪造 success
  if patch ? 'run' and jsonb_typeof(patch->'run') = 'object' then
    run_item := patch->'run';
    if not (run_item ? 'status') or (run_item->>'status' not in ('success', 'partial', 'failed')) then
      raise exception 'Monitor run requires valid explicit status: success | partial | failed';
    end if;

    -- 状态约束：标记为 success 时，必须确认已同时完成双向检索 (Search A + Search B)
    if (run_item->>'status' = 'success') and not (coalesce((run_item->>'searchACompleted')::boolean, (run_item->>'search_a_completed')::boolean, false) and coalesce((run_item->>'searchBCompleted')::boolean, (run_item->>'search_b_completed')::boolean, false)) then
      raise exception 'Monitor run marked as success requires both searchACompleted and searchBCompleted to be true';
    end if;

    insert into public.monitor_runs (
      id, started_at, completed_at, status, search_a_completed, search_b_completed,
      sources_checked, candidates_found, offers_created, offers_updated,
      offers_expired, errors, repository_commit, note
    ) values (
      coalesce(run_item->>'id', 'run_' || to_char(now_ts, 'YYYYMMDD_HH24MISS')),
      coalesce((run_item->>'startedAt')::timestamptz, (run_item->>'started_at')::timestamptz, now_ts),
      case when run_item ? 'completedAt' then (run_item->>'completedAt')::timestamptz else now_ts end,
      run_item->>'status',
      coalesce((run_item->>'searchACompleted')::boolean, (run_item->>'search_a_completed')::boolean, false),
      coalesce((run_item->>'searchBCompleted')::boolean, (run_item->>'search_b_completed')::boolean, false),
      coalesce((run_item->>'sourcesChecked')::integer, 0),
      coalesce((run_item->>'candidatesFound')::integer, 0),
      coalesce((run_item->>'offersCreated')::integer, offers_created),
      coalesce((run_item->>'offersUpdated')::integer, offers_updated),
      coalesce((run_item->>'offersExpired')::integer, offers_ended),
      coalesce(run_item->'errors', '[]'::jsonb),
      run_item->>'repositoryCommit',
      run_item->>'note'
    )
    on conflict (id) do nothing;
  end if;

  if patch ? 'runs' and jsonb_typeof(patch->'runs') = 'array' then
    for run_item in select * from jsonb_array_elements(patch->'runs') loop
      if not (run_item ? 'status') or (run_item->>'status' not in ('success', 'partial', 'failed')) then
        raise exception 'Monitor run requires valid explicit status: success | partial | failed';
      end if;

      if (run_item->>'status' = 'success') and not (coalesce((run_item->>'searchACompleted')::boolean, (run_item->>'search_a_completed')::boolean, false) and coalesce((run_item->>'searchBCompleted')::boolean, (run_item->>'search_b_completed')::boolean, false)) then
        raise exception 'Monitor run marked as success requires both searchACompleted and searchBCompleted to be true';
      end if;

      insert into public.monitor_runs (
        id, started_at, completed_at, status, search_a_completed, search_b_completed,
        sources_checked, candidates_found, offers_created, offers_updated,
        offers_expired, errors, repository_commit, note
      ) values (
        coalesce(run_item->>'id', 'run_' || to_char(now_ts, 'YYYYMMDD_HH24MISS')),
        coalesce((run_item->>'startedAt')::timestamptz, (run_item->>'started_at')::timestamptz, now_ts),
        case when run_item ? 'completedAt' then (run_item->>'completedAt')::timestamptz else now_ts end,
        run_item->>'status',
        coalesce((run_item->>'searchACompleted')::boolean, (run_item->>'search_a_completed')::boolean, false),
        coalesce((run_item->>'searchBCompleted')::boolean, (run_item->>'search_b_completed')::boolean, false),
        coalesce((run_item->>'sourcesChecked')::integer, 0),
        coalesce((run_item->>'candidatesFound')::integer, 0),
        coalesce((run_item->>'offersCreated')::integer, offers_created),
        coalesce((run_item->>'offersUpdated')::integer, offers_updated),
        coalesce((run_item->>'offersExpired')::integer, offers_ended),
        coalesce(run_item->'errors', '[]'::jsonb),
        run_item->>'repositoryCommit',
        run_item->>'note'
      )
      on conflict (id) do nothing;
    end loop;
  end if;

  return jsonb_build_object(
    'success', true,
    'platforms_created', platforms_created,
    'platforms_updated', platforms_updated,
    'offers_created', offers_created,
    'offers_updated', offers_updated,
    'offers_unchanged', offers_unchanged,
    'offers_ended', offers_ended,
    'events_created', events_count,
    'timestamp', now_ts
  );
end;
$$ language plpgsql security definer;

-- 权限完全收紧：仅赋予受信任角色调用权限，彻底阻断匿名与普通登录用户
revoke all on function public.ingest_radar_batch(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_radar_batch(jsonb) to service_role, postgres;

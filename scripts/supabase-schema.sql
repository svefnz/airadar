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
do language plpgsql $$
begin
  alter table public.user_claims drop constraint if exists user_claims_status_check;
  alter table public.user_claims add constraint user_claims_status_check check (status in ('claimed', 'ignored', 'expired'));
exception
  when others then null;
end;
$$;

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


-- ==============================================================================
-- 5. ChatGPT 自动化写入 RPC (原子性批量合并)
-- ==============================================================================
create or replace function public.ingest_radar_batch(patch jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  p jsonb;
  o jsonb;
  e jsonb;
  end_item jsonb;
  run_item jsonb;
  platforms_count int := 0;
  offers_count int := 0;
  ends_count int := 0;
  events_count int := 0;
  now_ts timestamptz := now();
begin
  -- 权限防御: 仅允许 service_role 身份执行写入
  if auth.role() is not null and auth.role() <> 'service_role' then
    raise exception 'Permission denied: service_role required for ingest_radar_batch';
  end if;

  -- 1. 合并平台 (platforms)
  if patch ? 'platforms' and jsonb_typeof(patch->'platforms') = 'array' then
    for p in select * from jsonb_array_elements(patch->'platforms') loop
      insert into public.platforms (
        id, name, slug, canonical_domain, website_url, description,
        category, launch_date, first_discovered_at, last_checked_at,
        trust_status, logo_url, demo, updated_at
      ) values (
        p->>'id',
        p->>'name',
        coalesce(p->>'slug', p->>'id'),
        coalesce(p->>'canonicalDomain', p->>'canonical_domain', ''),
        coalesce(p->>'websiteUrl', p->>'website_url', ''),
        coalesce(p->>'description', ''),
        coalesce(p->>'category', 'model-vendor'),
        case when p ? 'launchDate' then (p->>'launchDate')::timestamptz else null end,
        coalesce((p->>'firstDiscoveredAt')::timestamptz, (p->>'first_discovered_at')::timestamptz, now_ts),
        coalesce((p->>'lastCheckedAt')::timestamptz, (p->>'last_checked_at')::timestamptz, now_ts),
        coalesce(p->>'trustStatus', p->>'trust_status', 'unverified'),
        p->>'logoUrl',
        coalesce((p->>'demo')::boolean, false),
        now_ts
      )
      on conflict (id) do update set
        name = excluded.name,
        description = case when excluded.description <> '' then excluded.description else public.platforms.description end,
        last_checked_at = excluded.last_checked_at,
        trust_status = case when excluded.trust_status <> 'unverified' then excluded.trust_status else public.platforms.trust_status end,
        logo_url = coalesce(excluded.logo_url, public.platforms.logo_url),
        updated_at = now_ts;
      platforms_count := platforms_count + 1;
    end loop;
  end if;

  -- 2. 合并/更新活动 (offers)
  if patch ? 'upserts' and jsonb_typeof(patch->'upserts') = 'array' then
    for o in select * from jsonb_array_elements(patch->'upserts') loop
      insert into public.offers (
        id, platform_id, title, models, access_type, amount, unit,
        amount_type, reset_interval, claim_conditions, billing_requirements,
        identity_verification, region_restrictions, rate_limits, context_window,
        tool_calling, api_compatibility, start_at, end_at, credit_expires_at,
        status, verification_status, discovered_at, last_verified_at,
        official_url, sources, demo, updated_at
      ) values (
        o->>'id',
        coalesce(o->>'platformId', o->>'platform_id'),
        o->>'title',
        coalesce(o->'models', '[]'::jsonb),
        coalesce(o->>'accessType', o->>'access_type', 'api-key'),
        case when (o->>'amount') is not null and (o->>'amount') <> 'null' then (o->>'amount')::numeric else null end,
        coalesce(o->>'unit', 'credits'),
        coalesce(o->>'amountType', o->>'amount_type', 'fixed'),
        coalesce(o->>'resetInterval', o->>'reset_interval', 'once'),
        coalesce(o->'claimConditions', o->'claim_conditions', '[]'::jsonb),
        coalesce(o->>'billingRequirements', o->>'billing_requirements', 'none'),
        coalesce(o->>'identityVerification', o->>'identity_verification', 'none'),
        coalesce(o->'regionRestrictions', o->'region_restrictions', '[]'::jsonb),
        coalesce(o->>'rateLimits', o->>'rate_limits', ''),
        case when (o->>'contextWindow') is not null and (o->>'contextWindow') <> 'null' then (o->>'contextWindow')::integer else null end,
        case when (o->>'toolCalling') is not null and (o->>'toolCalling') <> 'null' then (o->>'toolCalling')::boolean else null end,
        coalesce(o->>'apiCompatibility', o->>'api_compatibility', 'openai-compatible'),
        case when o ? 'startAt' then (o->>'startAt')::timestamptz else null end,
        case when o ? 'endAt' then (o->>'endAt')::timestamptz else null end,
        case when o ? 'creditExpiresAt' then (o->>'creditExpiresAt')::timestamptz else null end,
        coalesce(o->>'status', 'active'),
        coalesce(o->>'verificationStatus', o->>'verification_status', 'unverified'),
        coalesce((o->>'discoveredAt')::timestamptz, (o->>'discovered_at')::timestamptz, now_ts),
        coalesce((o->>'lastVerifiedAt')::timestamptz, (o->>'last_verified_at')::timestamptz, now_ts),
        coalesce(o->>'officialUrl', o->>'official_url'),
        coalesce(o->'sources', '[]'::jsonb),
        coalesce((o->>'demo')::boolean, false),
        now_ts
      )
      on conflict (id) do update set
        title = excluded.title,
        models = case when jsonb_array_length(excluded.models) > 0 then excluded.models else public.offers.models end,
        access_type = excluded.access_type,
        amount = coalesce(excluded.amount, public.offers.amount),
        unit = excluded.unit,
        amount_type = excluded.amount_type,
        reset_interval = excluded.reset_interval,
        claim_conditions = case when jsonb_array_length(excluded.claim_conditions) > 0 then excluded.claim_conditions else public.offers.claim_conditions end,
        billing_requirements = excluded.billing_requirements,
        identity_verification = excluded.identity_verification,
        region_restrictions = case when jsonb_array_length(excluded.region_restrictions) > 0 then excluded.region_restrictions else public.offers.region_restrictions end,
        rate_limits = coalesce(excluded.rate_limits, public.offers.rate_limits),
        context_window = coalesce(excluded.context_window, public.offers.context_window),
        tool_calling = coalesce(excluded.tool_calling, public.offers.tool_calling),
        api_compatibility = excluded.api_compatibility,
        end_at = coalesce(excluded.end_at, public.offers.end_at),
        credit_expires_at = coalesce(excluded.credit_expires_at, public.offers.credit_expires_at),
        status = excluded.status,
        verification_status = case when excluded.verification_status <> 'unverified' then excluded.verification_status else public.offers.verification_status end,
        last_verified_at = excluded.last_verified_at,
        official_url = coalesce(excluded.official_url, public.offers.official_url),
        sources = case when jsonb_array_length(excluded.sources) > 0 then excluded.sources else public.offers.sources end,
        updated_at = now_ts;
      offers_count := offers_count + 1;
    end loop;
  end if;

  -- 3. 标记结束的活动 (ends)
  if patch ? 'ends' and jsonb_typeof(patch->'ends') = 'array' then
    for end_item in select * from jsonb_array_elements(patch->'ends') loop
      update public.offers
      set status = 'expired', updated_at = now_ts
      where id = (end_item->>'offerId');
      ends_count := ends_count + 1;
    end loop;
  end if;

  -- 4. 插入事件 (events)
  if patch ? 'events' and jsonb_typeof(patch->'events') = 'array' then
    for e in select * from jsonb_array_elements(patch->'events') loop
      insert into public.radar_events (
        id, offer_id, platform_id, event_type, timestamp, field,
        previous_value, current_value, sources, description
      ) values (
        e->>'id',
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

  -- 5. 记录监控运行 (run)
  if patch ? 'run' and jsonb_typeof(patch->'run') = 'object' then
    run_item := patch->'run';
    insert into public.monitor_runs (
      id, started_at, completed_at, status, search_a_completed, search_b_completed,
      sources_checked, candidates_found, offers_created, offers_updated,
      offers_expired, errors, repository_commit, note
    ) values (
      run_item->>'id',
      coalesce((run_item->>'startedAt')::timestamptz, (run_item->>'started_at')::timestamptz, now_ts),
      case when run_item ? 'completedAt' then (run_item->>'completedAt')::timestamptz else now_ts end,
      coalesce(run_item->>'status', 'success'),
      coalesce((run_item->>'searchACompleted')::boolean, (run_item->>'search_a_completed')::boolean, true),
      coalesce((run_item->>'searchBCompleted')::boolean, (run_item->>'search_b_completed')::boolean, true),
      coalesce((run_item->>'sourcesChecked')::integer, 0),
      coalesce((run_item->>'candidatesFound')::integer, 0),
      coalesce((run_item->>'offersCreated')::integer, 0),
      coalesce((run_item->>'offersUpdated')::integer, 0),
      coalesce((run_item->>'offersExpired')::integer, 0),
      coalesce(run_item->'errors', '[]'::jsonb),
      run_item->>'repositoryCommit',
      run_item->>'note'
    )
    on conflict (id) do nothing;
  end if;

  return jsonb_build_object(
    'success', true,
    'platforms_upserted', platforms_count,
    'offers_upserted', offers_count,
    'offers_ended', ends_count,
    'events_created', events_count,
    'timestamp', now_ts
  );
end;
$$;

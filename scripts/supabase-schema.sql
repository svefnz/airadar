-- ==============================================================================
-- AI Free Radar - Supabase Database Initialization & Security Hardening
-- ==============================================================================

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
-- 解耦备注与领取状态：status 允许为 NULL（仅填写备注场景）
create table if not exists public.user_claims (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  offer_id text not null,
  status text check (status is null or status in ('claimed', 'ignored', 'expired')),
  claimed_at timestamp with time zone default now(),
  notes text default '',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique (user_id, offer_id)
);

-- 安全更新现有约束以兼容 status 为 null（解耦备注与状态）
alter table public.user_claims alter column status drop not null;
alter table public.user_claims drop constraint if exists user_claims_status_check;
alter table public.user_claims add constraint user_claims_status_check check (status is null or status in ('claimed', 'ignored', 'expired'));

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


-- 4.5 公共雷达表权限收紧：严格只读，禁止匿名及普通用户 DML 篡改
revoke insert, update, delete, truncate on public.platforms, public.offers, public.radar_events, public.monitor_runs from anon, authenticated;
grant select on public.platforms, public.offers, public.radar_events, public.monitor_runs to anon, authenticated;
grant all on public.platforms, public.offers, public.radar_events, public.monitor_runs to service_role;


-- ==============================================================================
-- 5. ChatGPT 自动化写入 RPC (严格权限、语义去重、增量局部更新与证据合并)
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
  platforms_created int := 0;
  platforms_updated int := 0;
  offers_created int := 0;
  offers_updated int := 0;
  offers_ended int := 0;
  events_count int := 0;
  now_ts timestamptz := now();
  claim_role text;
begin
  -- 严格权限防御：仅允许 service_role 身份执行写入，严禁 NULL 或匿名/普通用户执行
  claim_role := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', current_user);
  if claim_role is null or claim_role <> 'service_role' then
    raise exception 'Permission denied: service_role required for ingest_radar_batch (got: %)', claim_role;
  end if;

  -- 校验 Schema 版本（如有提供）
  if patch ? 'schemaVersion' and (patch->>'schemaVersion')::int <> 1 then
    raise exception 'Unsupported schema version: %', patch->>'schemaVersion';
  end if;

  -- 1. 合并平台 (platforms)
  if patch ? 'platforms' and jsonb_typeof(patch->'platforms') = 'array' then
    for p in select * from jsonb_array_elements(patch->'platforms') loop
      target_platform_id := coalesce(p->>'id', p->>'slug');
      if target_platform_id is not null then
        select * into existing_platform from public.platforms
        where id = target_platform_id or slug = target_platform_id or (canonical_domain <> '' and canonical_domain = coalesce(p->>'canonicalDomain', p->>'canonical_domain'))
        limit 1;

        if existing_platform.id is not null then
          update public.platforms set
            name = coalesce(p->>'name', existing_platform.name),
            description = case when (p ? 'description') and (p->>'description' <> '') then p->>'description' else existing_platform.description end,
            category = case when (p ? 'category') then coalesce(p->>'category', existing_platform.category) else existing_platform.category end,
            website_url = coalesce(p->>'websiteUrl', p->>'website_url', existing_platform.website_url),
            last_checked_at = coalesce((p->>'lastCheckedAt')::timestamptz, (p->>'last_checked_at')::timestamptz, now_ts),
            trust_status = case when (p ? 'trustStatus' or p ? 'trust_status') and coalesce(p->>'trustStatus', p->>'trust_status') <> 'unverified' then coalesce(p->>'trustStatus', p->>'trust_status') else existing_platform.trust_status end,
            logo_url = case when (p ? 'logoUrl' or p ? 'logo_url') then coalesce(p->>'logoUrl', p->>'logo_url') else existing_platform.logo_url end,
            updated_at = now_ts
          where id = existing_platform.id;
          platforms_updated := platforms_updated + 1;
        else
          insert into public.platforms (
            id, name, slug, canonical_domain, website_url, description,
            category, launch_date, first_discovered_at, last_checked_at,
            trust_status, logo_url, demo, created_at, updated_at
          ) values (
            target_platform_id,
            coalesce(p->>'name', target_platform_id),
            coalesce(p->>'slug', target_platform_id),
            coalesce(p->>'canonicalDomain', p->>'canonical_domain', ''),
            coalesce(p->>'websiteUrl', p->>'website_url', ''),
            coalesce(p->>'description', ''),
            coalesce(p->>'category', 'llm-api'),
            case when p ? 'launchDate' then (p->>'launchDate')::timestamptz else null end,
            coalesce((p->>'firstDiscoveredAt')::timestamptz, (p->>'first_discovered_at')::timestamptz, now_ts),
            coalesce((p->>'lastCheckedAt')::timestamptz, (p->>'last_checked_at')::timestamptz, now_ts),
            coalesce(p->>'trustStatus', p->>'trust_status', 'unverified'),
            coalesce(p->>'logoUrl', p->>'logo_url'),
            coalesce((p->>'demo')::boolean, false),
            now_ts, now_ts
          );
          platforms_created := platforms_created + 1;
        end if;
      end if;
    end loop;
  end if;

  -- 2. 合并/更新活动 (offers)
  if patch ? 'upserts' and jsonb_typeof(patch->'upserts') = 'array' then
    for o in select * from jsonb_array_elements(patch->'upserts') loop
      target_platform_id := coalesce(o->>'platformId', o->>'platform_id');
      incoming_title := coalesce(o->>'title', '');
      target_offer_id := o->>'id';

      -- 语义匹配与 ID 查找：优先按 ID 匹配，找不到则按 (platform_id + 标题规范化) 进行语义去重
      select * into existing_rec from public.offers
      where (target_offer_id is not null and id = target_offer_id)
         or (target_platform_id is not null and platform_id = target_platform_id and lower(trim(title)) = lower(trim(incoming_title)))
      limit 1;

      if existing_rec.id is not null then
        -- 证据合并：保留历史证据并加入新证据（按 URL 去重）
        merged_sources := coalesce(existing_rec.sources, '[]'::jsonb);
        if (o ? 'sources') and jsonb_typeof(o->'sources') = 'array' then
          for src_item in select * from jsonb_array_elements(o->'sources') loop
            if not exists (select 1 from jsonb_array_elements(merged_sources) as s where s->>'url' = src_item->>'url') then
              merged_sources := merged_sources || jsonb_build_array(src_item);
            end if;
          end loop;
        end if;

        -- 局部增量更新：严格只更新明确提供的字段，支持有依据将 amount 置 null
        update public.offers set
          title = case when (o ? 'title') then o->>'title' else existing_rec.title end,
          models = case when (o ? 'models') then coalesce(o->'models', '[]'::jsonb) else existing_rec.models end,
          access_type = case when (o ? 'accessType' or o ? 'access_type') then coalesce(o->>'accessType', o->>'access_type') else existing_rec.access_type end,
          amount = case when (o ? 'amount') then (case when o->>'amount' is null or o->>'amount' = 'null' then null else (o->>'amount')::numeric end) else existing_rec.amount end,
          unit = case when (o ? 'unit') then o->>'unit' else existing_rec.unit end,
          amount_type = case when (o ? 'amountType' or o ? 'amount_type') then coalesce(o->>'amountType', o->>'amount_type') else existing_rec.amount_type end,
          reset_interval = case when (o ? 'resetInterval' or o ? 'reset_interval') then coalesce(o->>'resetInterval', o->>'reset_interval') else existing_rec.reset_interval end,
          claim_conditions = case when (o ? 'claimConditions' or o ? 'claim_conditions') then coalesce(o->'claimConditions', o->'claim_conditions') else existing_rec.claim_conditions end,
          billing_requirements = case when (o ? 'billingRequirements' or o ? 'billing_requirements') then coalesce(o->>'billingRequirements', o->>'billing_requirements') else existing_rec.billing_requirements end,
          identity_verification = case when (o ? 'identityVerification' or o ? 'identity_verification') then coalesce(o->>'identityVerification', o->>'identity_verification') else existing_rec.identity_verification end,
          region_restrictions = case when (o ? 'regionRestrictions' or o ? 'region_restrictions') then coalesce(o->'regionRestrictions', o->'region_restrictions') else existing_rec.region_restrictions end,
          rate_limits = case when (o ? 'rateLimits' or o ? 'rate_limits') then coalesce(o->>'rateLimits', o->>'rate_limits') else existing_rec.rate_limits end,
          context_window = case when (o ? 'contextWindow') then (case when o->>'contextWindow' is null or o->>'contextWindow' = 'null' then null else (o->>'contextWindow')::integer end) else existing_rec.context_window end,
          tool_calling = case when (o ? 'toolCalling') then (case when o->>'toolCalling' is null or o->>'toolCalling' = 'null' then null else (o->>'toolCalling')::boolean end) else existing_rec.tool_calling end,
          api_compatibility = case when (o ? 'apiCompatibility' or o ? 'api_compatibility') then coalesce(o->>'apiCompatibility', o->>'api_compatibility') else existing_rec.api_compatibility end,
          end_at = case when (o ? 'endAt') then (case when o->>'endAt' is null or o->>'endAt' = 'null' then null else (o->>'endAt')::timestamptz end) else existing_rec.end_at end,
          credit_expires_at = case when (o ? 'creditExpiresAt') then (case when o->>'creditExpiresAt' is null or o->>'creditExpiresAt' = 'null' then null else (o->>'creditExpiresAt')::timestamptz end) else existing_rec.credit_expires_at end,
          status = case when (o ? 'status') then o->>'status' else existing_rec.status end,
          verification_status = case when (o ? 'verificationStatus' or o ? 'verification_status') then coalesce(o->>'verificationStatus', o->>'verification_status') else existing_rec.verification_status end,
          official_url = case when (o ? 'officialUrl' or o ? 'official_url') then coalesce(o->>'officialUrl', o->>'official_url') else existing_rec.official_url end,
          sources = merged_sources,
          last_verified_at = coalesce((o->>'lastVerifiedAt')::timestamptz, (o->>'last_verified_at')::timestamptz, now_ts),
          updated_at = now_ts
        where id = existing_rec.id;
        offers_updated := offers_updated + 1;
      else
        -- 新增活动 (严格使用 enums.ts 规范默认值)
        if target_offer_id is null then
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
          coalesce(o->>'accessType', o->>'access_type', 'api'),
          case when (o->>'amount') is not null and (o->>'amount') <> 'null' then (o->>'amount')::numeric else null end,
          coalesce(o->>'unit', 'Credit'),
          coalesce(o->>'amountType', o->>'amount_type', 'one-time'),
          coalesce(o->>'resetInterval', o->>'reset_interval', 'none'),
          coalesce(o->'claimConditions', o->'claim_conditions', '[]'::jsonb),
          coalesce(o->>'billingRequirements', o->>'billing_requirements', 'none'),
          coalesce(o->>'identityVerification', o->>'identity_verification', 'none'),
          coalesce(o->'regionRestrictions', o->'region_restrictions', '[]'::jsonb),
          coalesce(o->>'rateLimits', o->>'rate_limits', ''),
          case when (o->>'contextWindow') is not null and (o->>'contextWindow') <> 'null' then (o->>'contextWindow')::integer else null end,
          case when (o->>'toolCalling') is not null and (o->>'toolCalling') <> 'null' then (o->>'toolCalling')::boolean else null end,
          coalesce(o->>'apiCompatibility', o->>'api_compatibility', 'openai'),
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
          coalesce(o->'sources', '[]'::jsonb)
        );
        offers_created := offers_created + 1;
        events_count := events_count + 1;
      end if;
    end loop;
  end if;

  -- 3. 标记结束的活动 (ends) -> 统一规范为 'ended' 状态并追加事件
  if patch ? 'ends' and jsonb_typeof(patch->'ends') = 'array' then
    for end_item in select * from jsonb_array_elements(patch->'ends') loop
      target_offer_id := coalesce(end_item->>'offerId', end_item->>'offer_id');
      if target_offer_id is not null then
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

  -- 5. 记录监控运行 (兼容单对象 'run' 和数组 'runs')
  if patch ? 'run' and jsonb_typeof(patch->'run') = 'object' then
    run_item := patch->'run';
    insert into public.monitor_runs (
      id, started_at, completed_at, status, search_a_completed, search_b_completed,
      sources_checked, candidates_found, offers_created, offers_updated,
      offers_expired, errors, repository_commit, note
    ) values (
      coalesce(run_item->>'id', 'run_' || to_char(now_ts, 'YYYYMMDD_HH24MISS')),
      coalesce((run_item->>'startedAt')::timestamptz, (run_item->>'started_at')::timestamptz, now_ts),
      case when run_item ? 'completedAt' then (run_item->>'completedAt')::timestamptz else now_ts end,
      coalesce(run_item->>'status', 'success'),
      coalesce((run_item->>'searchACompleted')::boolean, (run_item->>'search_a_completed')::boolean, true),
      coalesce((run_item->>'searchBCompleted')::boolean, (run_item->>'search_b_completed')::boolean, true),
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
      insert into public.monitor_runs (
        id, started_at, completed_at, status, search_a_completed, search_b_completed,
        sources_checked, candidates_found, offers_created, offers_updated,
        offers_expired, errors, repository_commit, note
      ) values (
        coalesce(run_item->>'id', 'run_' || to_char(now_ts, 'YYYYMMDD_HH24MISS')),
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
    end loop;
  end if;

  return jsonb_build_object(
    'success', true,
    'platforms_created', platforms_created,
    'platforms_updated', platforms_updated,
    'offers_created', offers_created,
    'offers_updated', offers_updated,
    'offers_ended', offers_ended,
    'events_created', events_count,
    'timestamp', now_ts
  );
end;
$$ language plpgsql security definer;

-- 权限完全收紧：仅赋予 service_role 调用权限，彻底阻断匿名与普通用户
revoke all on function public.ingest_radar_batch(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_radar_batch(jsonb) to service_role;

import { useMemo, useState } from 'react';
import { Search, LayoutGrid, List, X, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { OfferCard } from '@/features/OfferCard';
import { priorityScore } from '@/lib/data/radar';
import { daysUntil, isPast } from '@/lib/utils/format';
import type { Offer, RadarData } from '@/lib/data/schema';
import { useUrlState } from '@/lib/useUrlState';

type View = 'card' | 'list';
type SortKey = 'discovered' | 'updated' | 'expiring' | 'value' | 'name' | 'verified';

interface Filters {
  q: string;
  access: string[]; // api/client/web/unknown
  amountType: string[]; // one-time/daily/weekly/monthly/limited-unlimited
  status: string[]; // active/upcoming/ended/paused
  verification: string[]; // official/community/unverified
  billing: string[]; // none/card
  identity: string[]; // id
  compat: string[]; // openai/anthropic
  toolCalling: boolean;
  context: string; // '' | '256k' | '1m'
  expiringOnly: boolean;
  longTermOnly: boolean;
}

const DEFAULT_FILTERS: Filters = {
  q: '',
  access: [],
  amountType: [],
  status: [],
  verification: [],
  billing: [],
  identity: [],
  compat: [],
  toolCalling: false,
  context: '',
  expiringOnly: false,
  longTermOnly: false,
};

function parseFilters(search: string): Filters {
  const sp = new URLSearchParams(search);
  const arr = (k: string) => sp.get(k)?.split(',').filter(Boolean) ?? [];
  return {
    q: sp.get('q') ?? '',
    access: arr('access'),
    amountType: arr('amount'),
    status: arr('status'),
    verification: arr('verification'),
    billing: arr('billing'),
    identity: arr('identity'),
    compat: arr('compat'),
    toolCalling: sp.get('tool') === '1',
    context: sp.get('context') ?? '',
    expiringOnly: sp.get('expiring') === '1',
    longTermOnly: sp.get('longterm') === '1',
  };
}

function serializeFilters(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.q) sp.set('q', f.q);
  const setArr = (k: string, v: string[]) => { if (v.length) sp.set(k, v.join(',')); };
  setArr('access', f.access);
  setArr('amount', f.amountType);
  setArr('status', f.status);
  setArr('verification', f.verification);
  setArr('billing', f.billing);
  setArr('identity', f.identity);
  setArr('compat', f.compat);
  if (f.toolCalling) sp.set('tool', '1');
  if (f.context) sp.set('context', f.context);
  if (f.expiringOnly) sp.set('expiring', '1');
  if (f.longTermOnly) sp.set('longterm', '1');
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function ResourcesApp({ data }: { data: RadarData }) {
  const [filters, setFilters] = useUrlState<Filters>(parseFilters, serializeFilters, DEFAULT_FILTERS);
  const [view, setView] = useState<View>('card');
  const [sort, setSort] = useState<SortKey>('value');

  const platformById = useMemo(() => {
    const m = new Map<string, RadarData['platforms'][number]>();
    for (const p of data.platforms) m.set(p.id, p);
    return m;
  }, [data]);

  const results = useMemo(() => {
    let list = data.offers;
    const q = filters.q.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => {
        const p = platformById.get(o.platformId);
        const hay = [p?.name, p?.canonicalDomain, p?.description, o.title, ...o.models, ...o.claimConditions]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (filters.access.length) list = list.filter((o) => filters.access.includes(o.accessType));
    if (filters.amountType.length) list = list.filter((o) => filters.amountType.includes(o.amountType));
    if (filters.status.length) list = list.filter((o) => filters.status.includes(o.status));
    if (filters.verification.length) list = list.filter((o) => filters.verification.includes(o.verificationStatus));
    if (filters.billing.length) list = list.filter((o) => filters.billing.includes(o.billingRequirements));
    if (filters.identity.length) list = list.filter((o) => filters.identity.includes(o.identityVerification));
    if (filters.compat.length) {
      list = list.filter((o) => {
        const c = o.apiCompatibility;
        return filters.compat.some((k) => k === 'openai' ? c === 'openai' || c === 'both' : k === 'anthropic' ? c === 'anthropic' || c === 'both' : false);
      });
    }
    if (filters.toolCalling) list = list.filter((o) => o.toolCalling === true);
    if (filters.context === '256k') list = list.filter((o) => (o.contextWindow ?? 0) >= 256_000);
    if (filters.context === '1m') list = list.filter((o) => (o.contextWindow ?? 0) >= 1_000_000);
    if (filters.expiringOnly) list = list.filter((o) => o.status === 'active' && o.endAt && (daysUntil(o.endAt) ?? 999) <= 14);
    if (filters.longTermOnly) list = list.filter((o) => !o.endAt || isPast(o.endAt) === false && o.endAt !== undefined && daysUntil(o.endAt)! > 60 || o.amountType === 'daily' || o.amountType === 'weekly' || o.amountType === 'monthly');

    const sorted = [...list];
    switch (sort) {
      case 'discovered':
        sorted.sort((a, b) => Date.parse(b.discoveredAt) - Date.parse(a.discoveredAt));
        break;
      case 'updated':
        sorted.sort((a, b) => Date.parse(b.lastVerifiedAt) - Date.parse(a.lastVerifiedAt));
        break;
      case 'expiring':
        sorted.sort((a, b) => {
          const d = (x: Offer) => x.endAt ? Date.parse(x.endAt) : Number.MAX_SAFE_INTEGER;
          return d(a) - d(b);
        });
        break;
      case 'verified':
        sorted.sort((a, b) => Date.parse(b.lastVerifiedAt) - Date.parse(a.lastVerifiedAt));
        break;
      case 'name':
        sorted.sort((a, b) => {
          const pa = platformById.get(a.platformId)?.name ?? '';
          const pb = platformById.get(b.platformId)?.name ?? '';
          return pa.localeCompare(pb) || a.title.localeCompare(b.title);
        });
        break;
      default:
        sorted.sort((a, b) => priorityScore(b) - priorityScore(a));
    }
    return sorted;
  }, [data, filters, sort, platformById]);

  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });

  return (
    <div className="space-y-4">
      {/* 搜索与排序栏 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索平台 / 模型 / 活动 / 域名…"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            aria-label="搜索资源"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-44" aria-label="排序方式">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="value">按领取价值</SelectItem>
              <SelectItem value="discovered">最近发现</SelectItem>
              <SelectItem value="updated">最近更新</SelectItem>
              <SelectItem value="expiring">即将过期</SelectItem>
              <SelectItem value="verified">最近核验</SelectItem>
              <SelectItem value="name">平台名称</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-md border border-edge-strong bg-surface p-0.5">
            <button
              type="button"
              aria-label="卡片视图"
              aria-pressed={view === 'card'}
              onClick={() => setView('card')}
              className={`inline-flex h-7 w-7 items-center justify-center rounded ${view === 'card' ? 'bg-elevated text-primary' : 'text-muted-foreground hover:text-foreground'} cursor-pointer`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="紧凑列表视图"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
              className={`inline-flex h-7 w-7 items-center justify-center rounded ${view === 'list' ? 'bg-elevated text-primary' : 'text-muted-foreground hover:text-foreground'} cursor-pointer`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs rounded-lg border border-edge bg-surface px-3 py-2.5">
        <FilterGroup label="接入方式">
          {['api', 'client', 'web', 'unknown'].map((k) => (
            <Chip key={k} active={filters.access.includes(k)} onClick={() => toggleArr('access', k)} label={{ api: '原生 API', client: '客户端专用', web: '网页专用', unknown: '接入方式不确定' }[k]!} />
          ))}
        </FilterGroup>
        <FilterGroup label="额度周期">
          {[['one-time', '免费注册赠额'], ['daily', '每日恢复'], ['weekly', '每周恢复'], ['monthly', '每月恢复'], ['limited-unlimited', '限时免费']].map((kv) => {
            const [k, l] = kv as [string, string];
            return <Chip key={k} active={filters.amountType.includes(k)} onClick={() => toggleArr('amountType', k)} label={l} />;
          })}
        </FilterGroup>
        <FilterGroup label="状态">
          {[['active', '有效'], ['upcoming', '即将开始'], ['ended', '已过期'], ['paused', '暂停']].map((kv) => {
            const [k, l] = kv as [string, string];
            return <Chip key={k} active={filters.status.includes(k)} onClick={() => toggleArr('status', k)} label={l} />;
          })}
        </FilterGroup>
        <FilterGroup label="可信度">
          {[['official', '官方确认'], ['community', '社区实测'], ['unverified', '待核实']].map((kv) => {
            const [k, l] = kv as [string, string];
            return <Chip key={k} active={filters.verification.includes(k)} onClick={() => toggleArr('verification', k)} label={l} />;
          })}
        </FilterGroup>
        <FilterGroup label="领取门槛">
          <Chip active={filters.billing.includes('none')} onClick={() => toggleArr('billing', 'none')} label="无需绑卡" />
          <Chip active={filters.identity.includes('id')} onClick={() => toggleArr('identity', 'id')} label="需要实名认证" />
        </FilterGroup>
        <FilterGroup label="接口">
          <Chip active={filters.compat.includes('openai')} onClick={() => toggleArr('compat', 'openai')} label="OpenAI 兼容" />
          <Chip active={filters.compat.includes('anthropic')} onClick={() => toggleArr('compat', 'anthropic')} label="Anthropic 兼容" />
          <Chip active={filters.toolCalling} onClick={() => set({ toolCalling: !filters.toolCalling })} label="Tool Calling" />
        </FilterGroup>
        <FilterGroup label="上下文">
          <Chip active={filters.context === '256k'} onClick={() => set({ context: filters.context === '256k' ? '' : '256k' })} label="256K+" />
          <Chip active={filters.context === '1m'} onClick={() => set({ context: filters.context === '1m' ? '' : '1m' })} label="1M+" />
        </FilterGroup>
        <div className="flex items-center gap-1.5 ml-auto">
          <Switch checked={filters.expiringOnly} onCheckedChange={(v) => set({ expiringOnly: v })} aria-label="仅看即将过期" />
          <span className="text-muted-foreground">即将过期</span>
          <Switch checked={filters.longTermOnly} onCheckedChange={(v) => set({ longTermOnly: v })} aria-label="仅看长期免费" />
          <span className="text-muted-foreground">长期免费</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setFilters(DEFAULT_FILTERS)} className="gap-1">
          <X className="h-3 w-3" /> 清除筛选
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        共 <span className="tabular font-medium text-foreground">{results.length}</span> 个活动
      </p>

      {results.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="没有匹配的资源"
          hint="尝试减少筛选条件，或该状态确实没有数据（未渲染空状态以外的内容）。"
          action={<Button size="sm" variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>清除全部筛选</Button>}
        />
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results.map((o) => (
            <OfferCard key={o.id} offer={o} platform={platformById.get(o.platformId)!} />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-edge rounded-lg border border-edge bg-surface">
          {results.map((o) => (
            <OfferCard key={o.id} offer={o} platform={platformById.get(o.platformId)!} list />
          ))}
        </div>
      )}
    </div>
  );

  type ArrKey = 'access' | 'amountType' | 'status' | 'verification' | 'billing' | 'identity' | 'compat';
  function toggleArr(key: ArrKey, value: string) {
    const cur = filters[key] as string[];
    set({ [key]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] } as Partial<Filters>);
  }
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ' +
        (active ? 'border-accent bg-accent/10 text-primary' : 'border-edge text-muted-foreground hover:border-edge-strong hover:text-foreground')
      }
    >
      {label}
    </button>
  );
}

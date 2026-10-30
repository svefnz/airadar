import { useMemo, useState, useEffect } from 'react';
import { Search, LayoutGrid, List, Flame, X, ArrowUpDown, Filter, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { OfferCard } from '@/features/OfferCard';
import { OfferTableView } from '@/features/OfferTableView';
import { OfferSwipeDeck } from '@/features/OfferSwipeDeck';
import { priorityScore } from '@/lib/data/radar';
import { daysUntil, isPast } from '@/lib/utils/format';
import type { Offer, RadarData } from '@/lib/data/schema';
import { useUrlState } from '@/lib/useUrlState';

type View = 'card' | 'list' | 'swipe';
type SortKey = 'discovered' | 'updated' | 'expiring' | 'value' | 'name' | 'verified';

interface Filters {
  view: View;
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
  view: 'card',
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
  const rawView = sp.get('view');
  const view: View = rawView === 'swipe' || rawView === 'list' ? rawView : 'card';
  return {
    view,
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
  if (f.view && f.view !== 'card') sp.set('view', f.view);
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

interface PresetItem {
  id: string;
  label: string;
  desc: string;
  apply: Partial<Filters>;
}

const PRESETS: PresetItem[] = [
  {
    id: 'beginner',
    label: '🔥 新手无门槛',
    desc: '无需绑卡 · 注册即用',
    apply: { billing: ['none'], amountType: ['one-time'] },
  },
  {
    id: 'developer',
    label: '⚡ 开发者 API',
    desc: '原生 API · Tool Calling',
    apply: { access: ['api'], toolCalling: true },
  },
  {
    id: 'long-context',
    label: '📚 1M 超长上下文',
    desc: '百万级 Tokens 处理',
    apply: { context: '1m' },
  },
  {
    id: 'expiring',
    label: '⏰ 临期捡漏',
    desc: '14 天内即将截止',
    apply: { expiringOnly: true },
  },
  {
    id: 'long-term',
    label: '🌟 长期稳定免费',
    desc: '每日恢复 / 周期可用',
    apply: { longTermOnly: true },
  },
];

export function ResourcesApp({ data }: { data: RadarData }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const [filters, setFilters] = useUrlState<Filters>(parseFilters, serializeFilters, DEFAULT_FILTERS);
  const view = filters.view;
  const setView = (v: View) => setFilters({ ...filters, view: v });
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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.q) count++;
    count += filters.access.length;
    count += filters.amountType.length;
    count += filters.status.length;
    count += filters.verification.length;
    count += filters.billing.length;
    count += filters.identity.length;
    count += filters.compat.length;
    if (filters.toolCalling) count++;
    if (filters.context) count++;
    if (filters.expiringOnly) count++;
    if (filters.longTermOnly) count++;
    return count;
  }, [filters]);

  return (
    <div className="space-y-5" data-hydrated={hydrated ? 'true' : undefined}>
      {/* Search and Tool Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-10 h-10 rounded-xl bg-[#0e1626] border-[#1e2a42] text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 text-sm"
            placeholder="搜索平台 / 模型 / 活动 / 域名…"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            aria-label="搜索资源"
          />
          {filters.q && (
            <button
              type="button"
              onClick={() => set({ q: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort selector */}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-40 h-10 rounded-xl bg-[#0e1626] border-[#1e2a42] text-slate-200 text-xs font-medium" aria-label="排序方式">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#10192e] border-slate-800 text-slate-200 text-xs">
              <SelectItem value="value">按领取价值</SelectItem>
              <SelectItem value="discovered">最近发现</SelectItem>
              <SelectItem value="updated">最近更新</SelectItem>
              <SelectItem value="expiring">即将过期</SelectItem>
              <SelectItem value="verified">最近核验</SelectItem>
              <SelectItem value="name">平台名称</SelectItem>
            </SelectContent>
          </Select>

          {/* View switcher: Card View vs Table / List View vs Reigns Swipe View */}
          <div className="flex items-center rounded-xl border border-[#1e2a42] bg-[#0e1626] p-1 shadow-inner">
            <button
              type="button"
              aria-label="卡片网格视图"
              aria-pressed={view === 'card'}
              onClick={() => setView('card')}
              className={`inline-flex h-8 px-2.5 items-center gap-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                view === 'card'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">卡片</span>
            </button>
            <button
              type="button"
              aria-label="紧凑列表表格视图"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
              className={`inline-flex h-8 px-2.5 items-center gap-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                view === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">表格</span>
            </button>
            <button
              type="button"
              aria-label="王权堆叠滑动视图"
              aria-pressed={view === 'swipe'}
              onClick={() => setView('swipe')}
              className={`inline-flex h-8 px-2.5 items-center gap-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                view === 'swipe'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">王权刷卡</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
          <span>快捷场景:</span>
        </span>
        {PRESETS.map((preset) => {
          const isActive =
            preset.id === 'beginner'
              ? filters.billing.includes('none') && filters.amountType.includes('one-time')
              : preset.id === 'developer'
              ? filters.access.includes('api') && filters.toolCalling
              : preset.id === 'long-context'
              ? filters.context === '1m'
              : preset.id === 'expiring'
              ? filters.expiringOnly
              : preset.id === 'long-term'
              ? filters.longTermOnly
              : false;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                if (isActive) {
                  setFilters({ ...DEFAULT_FILTERS, q: filters.q, view: filters.view });
                } else {
                  setFilters({ ...DEFAULT_FILTERS, q: filters.q, view: filters.view, ...preset.apply });
                }
              }}
              className={`group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-500 bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                  : 'border-[#1e2a42] bg-[#0c1220]/80 text-slate-300 hover:border-slate-600 hover:bg-[#121c2e]'
              }`}
            >
              <span>{preset.label}</span>
              <span className={`text-[10px] hidden sm:inline ${isActive ? 'text-blue-100' : 'text-slate-500 group-hover:text-slate-400'}`}>
                {preset.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Chips Container */}
      <div className="rounded-2xl border border-[#1e2a42] bg-[#0c1220]/95 p-4 space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs">
          <FilterGroup label="接入方式">
            {['api', 'client', 'web', 'unknown'].map((k) => (
              <Chip
                key={k}
                active={filters.access.includes(k)}
                onClick={() => toggleArr('access', k)}
                label={{ api: '原生 API', client: '客户端专用', web: '网页专用', unknown: '接入方式不确定' }[k]!}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="额度周期">
            {(
              [
                ['one-time', '免费注册赠额'],
                ['daily', '每日恢复'],
                ['weekly', '每周恢复'],
                ['monthly', '每月恢复'],
                ['limited-unlimited', '限时免费'],
              ] as [string, string][]
            ).map(([k, l]) => (
              <Chip
                key={k}
                active={filters.amountType.includes(k)}
                onClick={() => toggleArr('amountType', k)}
                label={l}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="状态">
            {(
              [
                ['active', '有效'],
                ['upcoming', '即将开始'],
                ['ended', '已过期'],
                ['paused', '暂停'],
              ] as [string, string][]
            ).map(([k, l]) => (
              <Chip
                key={k}
                active={filters.status.includes(k)}
                onClick={() => toggleArr('status', k)}
                label={l}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="可信度">
            {(
              [
                ['official', '官方确认'],
                ['community', '社区实测'],
                ['unverified', '待核实'],
              ] as [string, string][]
            ).map(([k, l]) => (
              <Chip
                key={k}
                active={filters.verification.includes(k)}
                onClick={() => toggleArr('verification', k)}
                label={l}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="领取门槛">
            <Chip active={filters.billing.includes('none')} onClick={() => toggleArr('billing', 'none')} label="无需绑卡" />
            <Chip active={filters.identity.includes('id')} onClick={() => toggleArr('identity', 'id')} label="需要实名认证" />
          </FilterGroup>

          <FilterGroup label="接口兼容">
            <Chip active={filters.compat.includes('openai')} onClick={() => toggleArr('compat', 'openai')} label="OpenAI 兼容" />
            <Chip active={filters.compat.includes('anthropic')} onClick={() => toggleArr('compat', 'anthropic')} label="Anthropic 兼容" />
            <Chip active={filters.toolCalling} onClick={() => set({ toolCalling: !filters.toolCalling })} label="Tool Calling" />
          </FilterGroup>

          <FilterGroup label="上下文">
            <Chip active={filters.context === '256k'} onClick={() => set({ context: filters.context === '256k' ? '' : '256k' })} label="256K+" />
            <Chip active={filters.context === '1m'} onClick={() => set({ context: filters.context === '1m' ? '' : '1m' })} label="1M+" />
          </FilterGroup>
        </div>

        {/* Footer of filter section */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1a2336] text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={filters.expiringOnly} onCheckedChange={(v) => set({ expiringOnly: v })} aria-label="仅看即将过期" />
              <span className="text-slate-300">即将过期 (14天内)</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={filters.longTermOnly} onCheckedChange={(v) => set({ longTermOnly: v })} aria-label="仅看长期免费" />
              <span className="text-slate-300">长期有效</span>
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-400 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>重置全部筛选 ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-400">
          共发现 <span className="font-bold text-white tabular">{results.length}</span> 个 AI 免费活动
        </p>
      </div>

      {/* Main Content Area */}
      {results.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8 text-slate-500" />}
          title="没有匹配的资源"
          hint="尝试减少筛选条件，或重置搜索词。"
          action={
            <Button size="sm" variant="outline" onClick={() => setFilters({ ...DEFAULT_FILTERS, view: filters.view })} className="border-slate-700 text-slate-200">
              清除全部筛选
            </Button>
          }
        />
      ) : view === 'swipe' ? (
        <OfferSwipeDeck
          offers={results}
          platformById={platformById}
          onSwitchView={setView}
        />
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {results.map((o) => (
            <OfferCard key={o.id} offer={o} platform={platformById.get(o.platformId)!} />
          ))}
        </div>
      ) : (
        <OfferTableView
          offers={results}
          platformById={platformById}
          onSortToggle={() => setSort(sort === 'value' ? 'expiring' : 'value')}
        />
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
    <div className="flex items-center gap-2">
      <span className="text-slate-400 text-[11px] font-medium shrink-0">{label}:</span>
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
        'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all cursor-pointer ' +
        (active
          ? 'border border-blue-500 bg-blue-600/25 text-blue-300 font-semibold shadow-xs'
          : 'border border-[#223048] bg-[#111827]/70 text-slate-400 hover:border-slate-600 hover:text-slate-200')
      }
    >
      {label}
    </button>
  );
}

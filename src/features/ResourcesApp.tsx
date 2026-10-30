import { useMemo, useState, useEffect } from 'react';
import {
  Search,
  Flame,
  X,
  ArrowUpDown,
  Filter,
  RotateCcw,
  Star,
  CheckCircle2,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { OfferSwipeDeck } from '@/features/OfferSwipeDeck';
import { priorityScore } from '@/lib/data/radar';
import { daysUntil, isPast } from '@/lib/utils/format';
import { usePersonal } from '@/lib/usePersonal';
import type { Offer, RadarData } from '@/lib/data/schema';
import { useUrlState } from '@/lib/useUrlState';

type Disposition = 'unprocessed' | 'favorited' | 'passed' | 'all';
type SortKey = 'value' | 'discovered' | 'updated' | 'expiring' | 'name';

interface Filters {
  q: string;
  disposition: Disposition;
  access: string[];
  amountType: string[];
  status: string[];
  billing: string[];
  identity: string[];
  expiringOnly: boolean;
  longTermOnly: boolean;
  toolCalling: boolean;
}

const DEFAULT_FILTERS: Filters = {
  q: '',
  disposition: 'unprocessed',
  access: [],
  amountType: [],
  status: [],
  billing: [],
  identity: [],
  expiringOnly: false,
  longTermOnly: false,
  toolCalling: false,
};

function parseFilters(search: string): Filters {
  const sp = new URLSearchParams(search);
  const arr = (k: string) => sp.get(k)?.split(',').filter(Boolean) ?? [];
  const rawDisp = sp.get('disposition');
  const disposition: Disposition =
    rawDisp === 'favorited' || rawDisp === 'passed' || rawDisp === 'all'
      ? rawDisp
      : 'unprocessed';

  return {
    q: sp.get('q') ?? '',
    disposition,
    access: arr('access'),
    amountType: arr('amount'),
    status: arr('status'),
    billing: arr('billing'),
    identity: arr('identity'),
    expiringOnly: sp.get('expiring') === '1',
    longTermOnly: sp.get('longterm') === '1',
    toolCalling: sp.get('tool') === '1',
  };
}

function serializeFilters(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.q) sp.set('q', f.q);
  if (f.disposition && f.disposition !== 'unprocessed') sp.set('disposition', f.disposition);
  const setArr = (k: string, v: string[]) => {
    if (v.length) sp.set(k, v.join(','));
  };
  setArr('access', f.access);
  setArr('amount', f.amountType);
  setArr('status', f.status);
  setArr('billing', f.billing);
  setArr('identity', f.identity);
  if (f.expiringOnly) sp.set('expiring', '1');
  if (f.longTermOnly) sp.set('longterm', '1');
  if (f.toolCalling) sp.set('tool', '1');
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function ResourcesApp({ data }: { data: RadarData }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const [filters, setFilters] = useUrlState<Filters>(parseFilters, serializeFilters, DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>('value');
  const { isFavorite, state } = usePersonal();

  const platformById = useMemo(() => {
    const m = new Map<string, RadarData['platforms'][number]>();
    for (const p of data.platforms) m.set(p.id, p);
    return m;
  }, [data]);

  const results = useMemo(() => {
    let list = data.offers;

    // 1. 个人处理状态过滤（收件箱归零流）
    if (filters.disposition === 'unprocessed') {
      list = list.filter((o) => {
        const isFav = isFavorite(o.id);
        const claim = state.claims[o.id]?.status;
        return !isFav && claim !== 'ignored' && claim !== 'claimed';
      });
    } else if (filters.disposition === 'favorited') {
      list = list.filter((o) => isFavorite(o.id));
    } else if (filters.disposition === 'passed') {
      list = list.filter((o) => state.claims[o.id]?.status === 'ignored');
    }

    // 2. 文本搜索
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

    // 3. 维度筛选
    if (filters.access.length) list = list.filter((o) => filters.access.includes(o.accessType));
    if (filters.amountType.length) list = list.filter((o) => filters.amountType.includes(o.amountType));
    if (filters.status.length) list = list.filter((o) => filters.status.includes(o.status));
    if (filters.billing.length) list = list.filter((o) => filters.billing.includes(o.billingRequirements));
    if (filters.identity.length) list = list.filter((o) => filters.identity.includes(o.identityVerification));
    if (filters.toolCalling) list = list.filter((o) => o.toolCalling === true);
    if (filters.expiringOnly) list = list.filter((o) => o.status === 'active' && o.endAt && (daysUntil(o.endAt) ?? 999) <= 14);
    if (filters.longTermOnly) {
      list = list.filter(
        (o) =>
          !o.endAt ||
          (isPast(o.endAt) === false && o.endAt !== undefined && daysUntil(o.endAt)! > 60) ||
          o.amountType === 'daily' ||
          o.amountType === 'weekly' ||
          o.amountType === 'monthly'
      );
    }

    // 4. 排序
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
          const d = (x: Offer) => (x.endAt ? Date.parse(x.endAt) : Number.MAX_SAFE_INTEGER);
          return d(a) - d(b);
        });
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
  }, [data, filters, sort, platformById, isFavorite, state.claims]);

  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });

  // 统计数据
  const favoriteCount = useMemo(
    () => data.offers.filter((o) => isFavorite(o.id)).length,
    [data.offers, isFavorite]
  );
  const passedCount = useMemo(
    () => data.offers.filter((o) => state.claims[o.id]?.status === 'ignored').length,
    [data.offers, state.claims]
  );

  return (
    <div className="space-y-4" data-hydrated={hydrated ? 'true' : undefined}>
      {/* 极简顶层控制栏 */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center justify-between">
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-9 rounded-md bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-border text-xs shadow-xs"
            placeholder="搜索平台 / 模型 / 域名 / 权益…"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            aria-label="搜索资源"
          />
          {filters.q && (
            <button
              type="button"
              onClick={() => set({ q: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 排序与重置 */}
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-32 h-9 rounded-md bg-card border-border text-xs text-foreground shadow-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                <SelectItem value="value">推荐价值优先</SelectItem>
                <SelectItem value="discovered">最新发现优先</SelectItem>
                <SelectItem value="expiring">即将截止优先</SelectItem>
                <SelectItem value="updated">最新核验优先</SelectItem>
                <SelectItem value="name">平台名称 A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(filters.q ||
            filters.disposition !== 'unprocessed' ||
            filters.access.length > 0 ||
            filters.billing.length > 0 ||
            filters.expiringOnly ||
            filters.longTermOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> 重置
            </Button>
          )}
        </div>
      </div>

      {/* 状态与属性过滤芯片组 (Notion 属性过滤条) */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
        {/* 处理状态芯片 (收件箱归零) */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border shrink-0">
          <button
            type="button"
            onClick={() => set({ disposition: 'unprocessed' })}
            className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              filters.disposition === 'unprocessed'
                ? 'bg-card text-foreground font-medium shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>未处理 (候选)</span>
          </button>

          <button
            type="button"
            onClick={() => set({ disposition: 'favorited' })}
            className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              filters.disposition === 'favorited'
                ? 'bg-card text-foreground font-medium shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Star className="h-3.5 w-3.5 text-warn fill-warn/20" />
            <span>已收藏 ({favoriteCount})</span>
          </button>

          <button
            type="button"
            onClick={() => set({ disposition: 'passed' })}
            className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              filters.disposition === 'passed'
                ? 'bg-card text-foreground font-medium shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <X className="h-3.5 w-3.5 text-bad" />
            <span>已跳过 ({passedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => set({ disposition: 'all' })}
            className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
              filters.disposition === 'all'
                ? 'bg-card text-foreground font-medium shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            全部
          </button>
        </div>

        <div className="h-4 w-[1px] bg-border mx-0.5 hidden sm:block" />

        {/* 关键属性标签过滤 */}
        <div className="flex flex-wrap items-center gap-1">
          <FilterChip
            active={filters.access.includes('api')}
            onClick={() =>
              set({
                access: filters.access.includes('api') ? [] : ['api'],
              })
            }
            label="原生 API"
          />
          <FilterChip
            active={filters.billing.includes('none')}
            onClick={() =>
              set({
                billing: filters.billing.includes('none') ? [] : ['none'],
              })
            }
            label="无需绑卡"
          />
          <FilterChip
            active={filters.identity.includes('none')}
            onClick={() =>
              set({
                identity: filters.identity.includes('none') ? [] : ['none'],
              })
            }
            label="免实名"
          />
          <FilterChip
            active={filters.expiringOnly}
            onClick={() => set({ expiringOnly: !filters.expiringOnly })}
            label="14天内临期"
          />
          <FilterChip
            active={filters.longTermOnly}
            onClick={() => set({ longTermOnly: !filters.longTermOnly })}
            label="长期稳定恢复"
          />
        </div>
      </div>

      {/* 沉浸式王权刷卡视图呈现 */}
      <div className="pt-2">
        {results.length === 0 ? (
          <EmptyState
            title={
              filters.disposition === 'unprocessed'
                ? '🎉 当前未处理卡片已全部清空！'
                : '未找到符合条件的活动'
            }
            hint={
              filters.disposition === 'unprocessed'
                ? '您已完成了全部候选权益的决策。可切换至「已收藏」或「已跳过」查看历史，或重置搜索条件。'
                : '尝试切换或清除上方筛选芯片以寻找更多权益。'
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="text-xs border-border bg-card hover:bg-muted text-foreground"
              >
                重置所有筛选
              </Button>
            }
          />
        ) : (
          <OfferSwipeDeck offers={results} platformById={platformById} />
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 rounded text-xs font-normal transition-all cursor-pointer border ${
        active
          ? 'bg-muted text-foreground border-border font-medium shadow-xs'
          : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}

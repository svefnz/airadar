import { useMemo } from 'react';
import { CalendarClock, Layers, Radar, ShieldCheck, Sparkles, TrendingUp, WifiOff, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { badgeTone } from '@/lib/utils/badgeTone';
import { Button } from '@/components/ui/button';
import { Donut } from '@/components/charts/Donut';
import { TrendBars } from '@/components/charts/TrendBars';
import { OfferCard } from '@/features/OfferCard';
import { computeDashboard, priorityScore } from '@/lib/data/radar';
import { AMOUNT_TYPE_LABELS, RUN_STATUS_LABELS } from '@/lib/data/enums';
import { daysUntil, fmtDateTime, fmtTimeAgo } from '@/lib/utils/format';
import { withBase } from '@/lib/utils/url';
import type { RadarData } from '@/lib/data/schema';

export function DashboardApp({ data }: { data: RadarData }) {
  const stats = useMemo(() => computeDashboard(data), [data]);
  const platformById = useMemo(() => {
    const m = new Map<string, RadarData['platforms'][number]>();
    for (const p of data.platforms) m.set(p.id, p);
    return m;
  }, [data]);

  const now = Date.now();
  const active = data.offers.filter((o) => o.status === 'active');

  // 最近 30 天新增趋势
  const trend = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const start = new Date(now - i * 86_400_000);
      const end = new Date(now - (i - 1) * 86_400_000);
      const count = data.offers.filter((o) => {
        const t = Date.parse(o.discoveredAt);
        return t >= start.getTime() && t < end.getTime();
      }).length;
      days.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, count });
    }
    return days;
  }, [data, now]);

  const resetDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of active) map.set(o.amountType, (map.get(o.amountType) ?? 0) + 1);
    const colors: Record<string, string> = {
      'one-time': 'var(--color-accent)',
      daily: 'var(--color-ok)',
      weekly: 'var(--color-info)',
      monthly: 'var(--color-warn)',
      'limited-unlimited': 'var(--color-bad)',
      unknown: 'var(--color-faint)',
    };
    return [...map.entries()].map(([k, v]) => ({ label: AMOUNT_TYPE_LABELS[k as keyof typeof AMOUNT_TYPE_LABELS] ?? k, value: v, color: colors[k] ?? 'var(--color-faint)' }));
  }, [active]);

  const accessShare = useMemo(() => {
    const api = active.filter((o) => o.accessType === 'api').length;
    const client = active.filter((o) => o.accessType === 'client').length;
    const web = active.filter((o) => o.accessType === 'web').length;
    const unknown = active.length - api - client - web;
    return [
      { label: '原生 API', value: api, color: 'var(--color-accent)' },
      { label: '客户端', value: client, color: 'var(--color-info)' },
      { label: '网页', value: web, color: 'var(--color-ok)' },
      { label: '未知', value: unknown, color: 'var(--color-faint)' },
    ].filter((s) => s.value > 0);
  }, [active]);

  const statusCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of data.offers) m.set(o.status, (m.get(o.status) ?? 0) + 1);
    return m;
  }, [data.offers]);

  // 值得立即领取: 有效 + 非待核实 + 未结束(demo 也保留但少提示)
  const immediate = useMemo(
    () =>
      active
        .filter((o) => o.status === 'active' && o.verificationStatus !== 'unverified' && !(o.endAt && Date.parse(o.endAt) < now))
        .sort((a, b) => priorityScore(b, now) - priorityScore(a, now))
        .slice(0, 6),
    [active, now],
  );

  const latest = useMemo(() => [...data.offers].sort((a, b) => Date.parse(b.discoveredAt) - Date.parse(a.discoveredAt)).slice(0, 5), [data.offers]);

  const longTerm = useMemo(
    () =>
      active
        .filter((o) => o.amountType === 'daily' || o.amountType === 'weekly' || o.amountType === 'monthly')
        .sort((a, b) => Date.parse(b.lastVerifiedAt) - Date.parse(a.lastVerifiedAt))
        .slice(0, 5),
    [active],
  );

  const recentEvents = useMemo(() => [...data.events].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 8), [data.events]);

  // 数据新鲜度: 最近成功同步超过 48h 提示
  const staleData = stats.lastSuccessfulSync ? Date.now() - Date.parse(stats.lastSuccessfulSync) > 2 * 86_400_000 : !stats.lastSuccessfulSync && data.runs.length > 0;

  return (
    <div className="space-y-5">
      {staleData && (
        <div className="flex items-center gap-2 rounded-lg border border-warn/30 bg-warn-bg px-3 py-2 text-xs text-warn">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>数据可能已过期：最近成功同步 {stats.lastSuccessfulSync ? fmtTimeAgo(stats.lastSuccessfulSync) : '时间未知'}。请检查监控运行状态。</span>
        </div>
      )}
      {/* 顶部指标 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Layers className="h-4 w-4" />} label="当前有效免费资源" value={String(stats.activeOffers)} sub={`API ${stats.apiOffers} · 客户端 ${stats.clientOffers}`} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="最近 24 小时新发现" value={String(stats.discovered24h)} sub={`7 天累计 ${stats.discovered7d}`} />
        <StatCard icon={<CalendarClock className="h-4 w-4" />} label="即将过期(14天内)" value={String(stats.expiringSoon)} tone={stats.expiringSoon > 0 ? 'warn' : 'ok'} />
        <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="最近一次成功监控" value={stats.lastSuccessfulSync ? fmtTimeAgo(stats.lastSuccessfulSync) : '—'} sub={stats.lastSuccessfulSync ? fmtDateTime(stats.lastSuccessfulSync) : '尚无成功记录'} />
      </div>

      {/* 监控状态异常提示 */}
      {stats.lastRunStatus && stats.lastRunStatus !== 'success' && (
        <div className="flex items-center gap-2 rounded-lg border border-bad/30 bg-bad-bg px-3 py-2 text-xs text-bad">
          <WifiOff className="h-3.5 w-3.5" />
          <span>最近一次监控运行状态：{RUN_STATUS_LABELS[stats.lastRunStatus]}。详细见「监控状态」页。</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* 值得立即领取 */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-warn" /> 值得立即领取</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => window.location.assign(withBase('/resources/?sort=value'))}>全部资源 →</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {immediate.length === 0 && <p className="py-6 text-center text-xs text-faint">暂无可推荐的立即领取资源</p>}
            {immediate.map((o) => (
              <OfferCard key={o.id} offer={o} platform={platformById.get(o.platformId)!} />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>近 30 天新增趋势</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <TrendBars values={trend.map((d) => d.count)} labels={trend.map((d) => d.label)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>API / 客户端占比</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Donut slices={accessShare} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>额度恢复周期分布</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {resetDist.length === 0 ? (
                <p className="py-4 text-center text-xs text-faint">暂无数据</p>
              ) : (
                <ul className="space-y-1.5">
                  {resetDist.map((r) => (
                    <li key={r.label} className="flex items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 text-muted">{r.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded bg-elevated">
                        <div className="h-full rounded" style={{ width: `${(r.value / active.length) * 100}%`, background: r.color }} />
                      </div>
                      <span className="tabular w-6 text-right text-ink font-medium">{r.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>活动状态分布</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-1.5">
                {[...statusCounts.entries()].map(([k, v]) => (
                  <Badge key={k} variant="outline" className={badgeTone(k === 'active' ? 'ok' : k === 'ended' ? 'bad' : k === 'upcoming' ? 'info' : k === 'paused' ? 'warn' : 'neutral')}>
                    {k} {v}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 最新发现 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-accent" /> 最新发现</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => window.location.assign(withBase('/resources/?sort=discovered'))}>查看全部 →</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {latest.map((o) => (
            <OfferCard key={o.id} offer={o} platform={platformById.get(o.platformId)!} />
          ))}
        </CardContent>
      </Card>

      {/* 值得长期使用 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><Radar className="h-3.5 w-3.5 text-ok" /> 值得长期使用</CardTitle>
          <span className="text-[11px] text-faint">每日/每周/每月恢复</span>
        </CardHeader>
        <CardContent className="space-y-3">
          {longTerm.length === 0 && <p className="py-6 text-center text-xs text-faint">暂无长期免费资源</p>}
          {longTerm.map((o) => (
            <OfferCard key={o.id} offer={o} platform={platformById.get(o.platformId)!} />
          ))}
        </CardContent>
      </Card>

      {/* 最新变化时间线 */}
      <Card>
        <CardHeader>
          <CardTitle>最新变化</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => window.location.assign(withBase('/changelog/'))}>变更记录 →</Button>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ol className="relative border-l border-edge pl-4 space-y-3">
            {recentEvents.map((ev) => {
              const p = ev.platformId ? platformById.get(ev.platformId) : undefined;
              return (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span className="tabular text-faint">{ev.timestamp.slice(0, 16)}</span>
                    {p && <a href={withBase(`/platforms/${p.slug}/`)} className="font-medium text-muted hover:text-accent">{p.name}</a>}
                    <Badge variant="outline" className={badgeTone('accent')}>{ev.eventType}</Badge>
                  </div>
                  <p className="mt-0.5 text-[13px] text-ink">{ev.description}</p>
                  {ev.previousValue && ev.currentValue && (
                    <p className="mt-0.5 text-[11px] text-muted">
                      <span className="line-through text-faint">{ev.previousValue}</span> → <span className="font-medium">{ev.currentValue}</span>
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          {recentEvents.length === 0 && <p className="py-6 text-center text-xs text-faint">暂无变更事件</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub, tone = 'neutral' }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: 'neutral' | 'ok' | 'warn' }) {
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2 text-faint">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className={`mt-1.5 text-2xl font-bold tabular leading-8 ${tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-ink'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-faint">{sub}</p>}
    </Card>
  );
}

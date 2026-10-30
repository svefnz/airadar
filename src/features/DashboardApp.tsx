import { useMemo } from 'react';
import {
  CalendarClock,
  Layers,
  ShieldCheck,
  TrendingUp,
  WifiOff,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { badgeTone } from '@/lib/utils/badgeTone';
import { Button } from '@/components/ui/button';
import { Donut } from '@/components/charts/Donut';
import { TrendBars } from '@/components/charts/TrendBars';
import { computeDashboard } from '@/lib/data/radar';
import { AMOUNT_TYPE_LABELS, RUN_STATUS_LABELS } from '@/lib/data/enums';
import { fmtDateTime, fmtTimeAgo } from '@/lib/utils/format';
import { withBase } from '@/lib/utils/url';
import type { RadarData } from '@/lib/data/schema';

export function DashboardApp({ data }: { data: RadarData }) {
  const stats = useMemo(() => computeDashboard(data), [data]);

  const now = Date.now();
  const active = useMemo(() => data.offers.filter((o) => o.status === 'active'), [data.offers]);

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
  }, [data.offers, now]);

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
    return [...map.entries()].map(([k, v]) => ({
      label: AMOUNT_TYPE_LABELS[k as keyof typeof AMOUNT_TYPE_LABELS] ?? k,
      value: v,
      color: colors[k] ?? 'var(--color-faint)',
    }));
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

  // 数据新鲜度: 最近成功同步超过 48h 提示
  const staleData = stats.lastSuccessfulSync
    ? Date.now() - Date.parse(stats.lastSuccessfulSync) > 2 * 86_400_000
    : !stats.lastSuccessfulSync && data.runs.length > 0;

  return (
    <div className="space-y-6">
      {staleData && (
        <div className="flex items-center gap-2 rounded-xl border border-warn/30 bg-warn-bg px-4 py-2.5 text-xs text-warn">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>数据可能已过期：最近成功同步 {stats.lastSuccessfulSync ? fmtTimeAgo(stats.lastSuccessfulSync) : '时间未知'}。请检查监控运行状态。</span>
        </div>
      )}

      {/* 顶部指标卡片行 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="当前有效免费资源"
          value={String(stats.activeOffers)}
          sub={`API ${stats.apiOffers} · 客户端 ${stats.clientOffers}`}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="最近 24 小时新发现"
          value={String(stats.discovered24h)}
          sub={`7 天累计 ${stats.discovered7d}`}
        />
        <StatCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="即将过期(14天内)"
          value={String(stats.expiringSoon)}
          tone={stats.expiringSoon > 0 ? 'warn' : 'ok'}
        />
        <StatCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label="最近成功同步"
          value={stats.lastSuccessfulSync ? fmtTimeAgo(stats.lastSuccessfulSync) : '—'}
          sub={stats.lastSuccessfulSync ? fmtDateTime(stats.lastSuccessfulSync) : '尚无记录'}
        />
      </div>

      {/* 监控状态异常提示 */}
      {stats.lastRunStatus && stats.lastRunStatus !== 'success' && (
        <div className="flex items-center gap-2 rounded-xl border border-bad/30 bg-bad-bg px-4 py-2.5 text-xs text-bad">
          <WifiOff className="h-4 w-4" />
          <span>最近一次监控运行状态：{RUN_STATUS_LABELS[stats.lastRunStatus]}。详细见顶栏「监控状态」。</span>
        </div>
      )}

      {/* 突出主行动入口 (Hero CTA Banner: Notion Callout 风格) */}
      <div className="relative rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>智能手势卡牌流</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              收录 {data.platforms.length} 个 AI 平台 · {stats.activeOffers} 个实时可用额度
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              支持左滑跳过、右滑收藏、上滑详阅。基于收件箱零待办机制，已处理条目自动隐去，专注呈现最新未读福利。
            </p>
          </div>
          <div className="shrink-0">
            <Button
              size="default"
              onClick={() => window.location.assign(withBase('/resources/'))}
              className="w-full sm:w-auto h-9 px-4 rounded-md bg-foreground text-background hover:bg-foreground/90 font-medium text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 group cursor-pointer"
            >
              <span>进入资源库 (刷卡探索)</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>
      </div>

      {/* 纯数据可视化大屏网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 近 30 天新增趋势 */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              近 30 天新发现趋势
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <TrendBars values={trend.map((d) => d.count)} labels={trend.map((d) => d.label)} />
          </CardContent>
        </Card>

        {/* 接入方式占比 */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-ok" />
              API / 客户端 / 网页 占比
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Donut slices={accessShare} />
          </CardContent>
        </Card>

        {/* 额度恢复周期分布 */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">额度恢复周期分布</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {resetDist.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">暂无数据</p>
            ) : (
              <ul className="space-y-2 pt-1">
                {resetDist.map((r) => (
                  <li key={r.label} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 text-muted-foreground">{r.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded"
                        style={{ width: `${(r.value / (active.length || 1)) * 100}%`, background: r.color }}
                      />
                    </div>
                    <span className="tabular w-8 text-right text-foreground font-medium">{r.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 活动状态分布 */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">全量活动状态分布</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-2 pt-2">
              {[...statusCounts.entries()].map(([k, v]) => (
                <Badge
                  key={k}
                  variant="outline"
                  className={`${badgeTone(
                    k === 'active'
                      ? 'ok'
                      : k === 'ended'
                      ? 'bad'
                      : k === 'upcoming'
                      ? 'info'
                      : k === 'paused'
                      ? 'warn'
                      : 'neutral'
                  )} px-2.5 py-0.5 text-xs font-normal`}
                >
                  {k} · {v}
                </Badge>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">
              数据经由自动探针校验，已失效活动自动归入 ended 历史存档。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'ok' | 'warn';
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3.5 sm:p-4 shadow-xs transition-colors hover:border-muted-foreground/30">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="p-1 rounded bg-muted text-foreground">{icon}</span>
        <span className="text-xs font-normal text-muted-foreground">{label}</span>
      </div>
      <p
        className={`mt-2 text-xl sm:text-2xl font-bold tabular tracking-tight ${
          tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-foreground'
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

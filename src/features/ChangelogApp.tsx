import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { badgeTone } from '@/lib/utils/badgeTone';
import { EmptyState } from '@/components/ui/EmptyState';
import { SafeLink } from '@/components/ui/SafeLink';
import { EVENT_TYPE_LABELS, EVENT_TYPES, SOURCE_KIND_LABELS } from '@/lib/data/enums';
import { withBase } from '@/lib/utils/url';
import type { RadarData } from '@/lib/data/schema';

const RANGES = [
  ['all', '全部时间'],
  ['7', '最近 7 天'],
  ['30', '最近 30 天'],
  ['90', '最近 90 天'],
] as const;

export function ChangelogApp({ data }: { data: RadarData }) {
  const [platformId, setPlatformId] = useState('all');
  const [range, setRange] = useState('all');
  const [types, setTypes] = useState<string[]>([]);

  const events = useMemo(() => {
    let list = [...data.events];
    if (platformId !== 'all') list = list.filter((e) => e.platformId === platformId);
    if (range !== 'all') {
      const cutoff = Date.now() - Number(range) * 86_400_000;
      list = list.filter((e) => Date.parse(e.timestamp) >= cutoff);
    }
    if (types.length) list = list.filter((e) => types.includes(e.eventType));
    return list.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }, [data, platformId, range, types]);

  const platformById = useMemo(() => {
    const m = new Map<string, RadarData['platforms'][number]>();
    for (const p of data.platforms) m.set(p.id, p);
    return m;
  }, [data]);

  const toggleType = (t: string) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={platformId} onValueChange={setPlatformId}>
          <SelectTrigger className="w-44" aria-label="按平台筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部平台</SelectItem>
            {data.platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-32" aria-label="按时间范围筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-1.5">
          {EVENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={types.includes(t)}
              onClick={() => toggleType(t)}
              className={
                'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ' +
                (types.includes(t) ? 'border-accent bg-accent/10 text-primary' : 'border-edge bg-surface text-muted-foreground hover:text-foreground')
              }
            >
              {EVENT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState title="没有符合条件的变更记录" hint="换一组筛选条件试试。" />
      ) : (
        <ol className="relative border-l border-edge pl-5 space-y-4">
          {events.map((ev) => {
            const p = ev.platformId ? platformById.get(ev.platformId) : undefined;
            return (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />
                <div className="rounded-lg border border-edge bg-surface p-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="tabular text-[11px] text-muted-foreground">{ev.timestamp.replace('T', ' ').slice(0, 16)}</span>
                    <Badge variant="outline" className={badgeTone('accent')}>{EVENT_TYPE_LABELS[ev.eventType]}</Badge>
                    {p && (
                      <a href={withBase(`/platforms/${p.slug}/`)} className="text-xs font-medium text-muted-foreground hover:text-primary">
                        {p.name}
                      </a>
                    )}
                    {ev.field && <Badge variant="outline" className={badgeTone('neutral')}>字段: {ev.field}</Badge>}
                  </div>
                  <p className="mt-1.5 text-[13px] text-foreground">{ev.description}</p>
                  {ev.previousValue && ev.currentValue && (
                    <p className="mt-1 text-[11px] text-muted-foreground break-all">
                      <span className="line-through text-muted-foreground">{ev.previousValue}</span> → <span className="font-medium text-foreground">{ev.currentValue}</span>
                    </p>
                  )}
                  {ev.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {ev.sources.map((s) => (
                        <SafeLink key={s.url} href={s.url} className="text-[11px]">
                          {s.label || s.url} <span className="text-muted-foreground">({SOURCE_KIND_LABELS[s.kind]})</span>
                        </SafeLink>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

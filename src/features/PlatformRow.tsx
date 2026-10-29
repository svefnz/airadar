import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { badgeTone } from '@/lib/utils/badgeTone';
import { PLATFORM_CATEGORY_LABELS } from '@/lib/data/enums';
import { fmtDate } from '@/lib/utils/format';
import { withBase } from '@/lib/utils/url';
import type { Platform, RadarData } from '@/lib/data/schema';

function statusOf(data: RadarData, platform: Platform): { label: string; tone: 'ok' | 'info' | 'warn' } {
  const hasActive = data.offers.some((o) => o.platformId === platform.id && o.status === 'active');
  const hasAny = data.offers.some((o) => o.platformId === platform.id);
  if (hasActive) return { label: '已确认提供免费资源', tone: 'ok' };
  if (hasAny) return { label: '免费权益部分核实', tone: 'info' };
  return { label: '免费权益待核实', tone: 'warn' };
}

export function PlatformRow({ data, platform }: { data: RadarData; platform: Platform }) {
  const st = statusOf(data, platform);
  const offers = data.offers.filter((o) => o.platformId === platform.id);
  return (
    <Card>
      <CardContent className="px-4 pb-4">
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <a href={withBase(`/platforms/${platform.slug}/`)} className="text-sm font-semibold text-foreground hover:text-primary">{platform.name}</a>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={badgeTone(st.tone)}>{st.label}</Badge>
                <Badge variant="outline" className={badgeTone('neutral')}>{PLATFORM_CATEGORY_LABELS[platform.category]}</Badge>
                {platform.demo && <Badge variant="outline" className={badgeTone('info')}>Demo</Badge>}
              </div>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              <p>发现于 {fmtDate(platform.firstDiscoveredAt)}</p>
              {platform.launchDate && <p>官方上线 {fmtDate(platform.launchDate)}</p>}
            </div>
          </div>
          {platform.description && <p className="line-clamp-2 text-xs text-muted-foreground">{platform.description}</p>}
          {offers.length > 0 && (
            <div className="border-t border-edge pt-2 text-[11px] text-muted-foreground">
              {offers.map((o) => (
                <a key={o.id} href={withBase(`/platforms/${platform.slug}/#${o.id}`)} className="mr-3 inline-flex items-center gap-1 hover:text-primary">
                  <span className="h-1 w-1 rounded-full bg-accent" />
                  {o.title}
                </a>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

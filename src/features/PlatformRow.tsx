import { BrandLogo } from '@/features/brand/BrandLogo';
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
    <div className="rounded-2xl border border-[#1e2a42] bg-[#0c1220]/90 p-4 transition-all hover:border-blue-500/30">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo platformId={platform.id} platformName={platform.name} size="md" />
            <div>
              <a
                href={withBase(`/platforms/${platform.slug}/`)}
                className="text-base font-bold text-white hover:text-blue-400 transition-colors"
              >
                {platform.name}
              </a>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={badgeTone(st.tone)}>
                  {st.label}
                </Badge>
                <Badge variant="outline" className={badgeTone('neutral')}>
                  {PLATFORM_CATEGORY_LABELS[platform.category]}
                </Badge>
                {platform.demo && (
                  <Badge variant="outline" className={badgeTone('info')}>
                    Demo
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <p>发现于 {fmtDate(platform.firstDiscoveredAt)}</p>
            {platform.launchDate && <p>官方上线 {fmtDate(platform.launchDate)}</p>}
          </div>
        </div>
        {platform.description && (
          <p className="line-clamp-2 text-xs text-slate-300 leading-relaxed">
            {platform.description}
          </p>
        )}
        {offers.length > 0 && (
          <div className="border-t border-[#182338] pt-2.5 text-xs text-slate-400 flex flex-wrap gap-2">
            {offers.map((o) => (
              <a
                key={o.id}
                href={withBase(`/platforms/${platform.slug}/#${o.id}`)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#131d30] border border-[#1e2a42] px-2.5 py-1 text-slate-300 hover:text-blue-300 hover:border-blue-500/40 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span className="truncate max-w-xs">{o.title}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

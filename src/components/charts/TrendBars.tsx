/** 最近 N 天每日新增活动趋势(纯 SVG) */
export function TrendBars({ values, labels }: { values: number[]; labels: string[] }) {
  const w = 640;
  const h = 140;
  const pad = 4;
  const max = Math.max(1, ...values);
  const n = values.length;
  const barW = (w - pad * 2) / Math.max(n, 1);
  const hBar = barW * 0.55;

  const bars = values.map((v, i) => {
    const bh = v === 0 ? 2 : Math.max(2, (v / max) * (h - 24));
    const x = pad + i * barW + (barW - hBar) / 2;
    const y = h - 20 - bh;
    return (
      <g key={i}>
        <title>{`${labels[i] ?? ''}: ${v} 个新活动`}</title>
        <rect x={x} y={y} width={hBar} height={bh} rx={2} fill="var(--color-accent)" fill-opacity={v === 0 ? 0.15 : 0.85} />
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="近 30 天新增活动趋势" preserveAspectRatio="xMidYMid meet">
      {bars}
      <line x1={0} y1={h - 20} x2={w} y2={h - 20} stroke="var(--color-edge)" stroke-width={1} />
    </svg>
  );
}

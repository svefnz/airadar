export interface DonutSlice {
  label: string;
  value: number;
  color: string; // CSS var 或色值
}

function describeArc(cx: number, cy: number, r: number, start: number, end: number): string {
  const large = end - start > 180 ? 1 : 0;
  const x1 = cx + r * Math.cos((Math.PI * start) / 180);
  const y1 = cy + r * Math.sin((Math.PI * start) / 180);
  const x2 = cx + r * Math.cos((Math.PI * end) / 180);
  const y2 = cy + r * Math.sin((Math.PI * end) / 180);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export function Donut({ slices, size = 120, thickness = 14 }: { slices: DonutSlice[]; size?: number; thickness?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-faint" style={{ width: size, height: size }}>
        暂无数据
      </div>
    );
  }

  let angle = -90;
  const paths = slices.map((s) => {
    if (s.value <= 0) return null;
    const angleLen = (s.value / total) * 360;
    const d = describeArc(cx, cy, r, angle, angle + angleLen);
    angle += angleLen;
    return <path key={s.label} d={d} fill="none" stroke={s.color} stroke-width={thickness} />;
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="占比图">
        <g fill="none" stroke-width={thickness} stroke-linecap="butt">
          {paths}
        </g>
        <text x={cx} y={cy} text-anchor="middle" dominant-baseline="middle" className="fill-ink text-sm font-semibold tabular">
          {total}
        </text>
      </svg>
      <ul className="space-y-1 text-xs">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="shrink-0">{s.label}</span>
            <span className="tabular text-ink font-medium">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

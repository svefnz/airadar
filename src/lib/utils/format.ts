/** 展示格式化工具(纯函数, 可同时用于构建端与浏览器端) */

const zhUnits = ['', '万', '亿', '万亿'];

export function fmtNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  let v = n;
  let i = 0;
  while (v >= 10000 && i < zhUnits.length - 1) {
    v /= 10000;
    i++;
  }
  return (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + (zhUnits[i] ?? '');
}

export function fmtAmount(amount: number | null, unit: string): string {
  if (amount === null) return unit === 'Unlimited' ? '无限量' : '未确认';
  const n = fmtNumber(amount);
  switch (unit) {
    case 'USD':
      return `$${n}`;
    case 'CNY':
      return `¥${n}`;
    case 'Token':
      return `${n} Tokens`;
    case 'Credit':
      return `${n} Credits`;
    case 'Point':
      return `${n} 积分`;
    case 'Request':
      return `${n} 次调用`;
    case 'Message':
      return `${n} 条消息`;
    case 'Call':
      return `${n} 次请求`;
    default:
      return `${n} ${unit}`;
  }
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return '未确认';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '未确认';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${fmtDate(iso)} ${hh}:${mm}`;
}

export function isPast(iso?: string | null): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return !Number.isNaN(t) && t < Date.now();
}

export function isFuture(iso?: string | null): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return !Number.isNaN(t) && t > Date.now();
}

export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

export function isWithinDays(iso: string | undefined | null, days: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  return t >= now - days * 86_400_000 && t <= now + days * 86_400_000;
}

export function fmtTimeAgo(iso?: string | null): string {
  if (!iso) return '未确认';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '未确认';
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return fmtDate(iso);
}

export function fmtNumberSigned(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

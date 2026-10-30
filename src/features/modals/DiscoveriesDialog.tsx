import { useState, useMemo } from 'react';
import { Sparkles, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { badgeTone } from '@/lib/utils/badgeTone';
import { PlatformRow } from '@/features/PlatformRow';
import type { RadarData } from '@/lib/data/schema';

interface DiscoveriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: RadarData;
}

export function DiscoveriesDialog({ open, onOpenChange, data }: DiscoveriesDialogProps) {
  const [q, setQ] = useState('');
  const now = Date.now();
  const day = 86_400_000;

  const discovered = useMemo(() => {
    return data.platforms
      .filter((p) => now - Date.parse(p.firstDiscoveredAt) <= 30 * day)
      .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.description.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => Date.parse(b.firstDiscoveredAt) - Date.parse(a.firstDiscoveredAt));
  }, [data.platforms, now, q]);

  const last7 = useMemo(
    () => discovered.filter((p) => now - Date.parse(p.firstDiscoveredAt) <= 7 * day),
    [discovered, now],
  );
  const last30 = useMemo(
    () => discovered.filter((p) => now - Date.parse(p.firstDiscoveredAt) > 7 * day),
    [discovered, now],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-[#0b1020] border-[#1e2a42] text-slate-100 p-6">
        <DialogHeader className="border-b border-[#182338] pb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-white">新平台发现</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                最近 30 天主动雷达发现的新 AI 平台（共 {discovered.length} 个）
              </DialogDescription>
            </div>
          </div>
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索新平台名称或描述..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 bg-[#080d1a] border-[#1e2a42] text-xs h-9 text-slate-200"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                最近 7 天发现
                <Badge variant="outline" className={badgeTone('accent')}>
                  {last7.length}
                </Badge>
              </h3>
            </div>
            {last7.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">暂无 7 天内新发现平台</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {last7.map((p) => (
                  <PlatformRow key={p.id} data={data} platform={p} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                8–30 天前发现
                <Badge variant="outline" className={badgeTone('neutral')}>
                  {last30.length}
                </Badge>
              </h3>
            </div>
            {last30.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">暂无 8–30 天前新发现平台</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {last30.map((p) => (
                  <PlatformRow key={p.id} data={data} platform={p} />
                ))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

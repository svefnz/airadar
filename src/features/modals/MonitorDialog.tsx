import { Activity, Clock3, CheckCircle2, Search, AlertTriangle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { badgeTone } from '@/lib/utils/badgeTone';
import { RUN_STATUS_LABELS } from '@/lib/data/enums';
import { fmtDateTime, fmtTimeAgo } from '@/lib/utils/format';
import type { RadarData } from '@/lib/data/schema';

interface MonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: RadarData;
}

export function MonitorDialog({ open, onOpenChange, data }: MonitorDialogProps) {
  const lastRun = [...data.runs].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  const successRuns = data.runs.filter((r) => r.status === 'success');
  const lastSuccess = successRuns.sort((a, b) => Date.parse(b.completedAt ?? '') - Date.parse(a.completedAt ?? ''))[0];

  const runTone = { success: 'ok', partial: 'warn', failed: 'bad' } as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-[#0b1020] border-[#1e2a42] text-slate-100 p-6">
        <DialogHeader className="border-b border-[#182338] pb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-white">监控运行状态</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                每 3 小时执行一次双向信源自动化巡检，数据全量同步至 Supabase 生产库
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#1e2a42] bg-[#080d1a] p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Clock3 className="h-3.5 w-3.5" />
                <span>调度周期</span>
              </div>
              <p className="mt-1 text-base font-bold text-white">3 小时</p>
            </div>
            <div className="rounded-xl border border-[#1e2a42] bg-[#080d1a] p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>最近成功执行</span>
              </div>
              <p className="mt-1 text-base font-bold text-emerald-400 truncate">
                {lastSuccess?.completedAt ? fmtTimeAgo(lastSuccess.completedAt) : '尚无'}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e2a42] bg-[#080d1a] p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Search className="h-3.5 w-3.5 text-blue-400" />
                <span>最新运行结果</span>
              </div>
              <div className="mt-1">
                {lastRun ? (
                  <Badge variant="outline" className={badgeTone(runTone[lastRun.status])}>
                    {RUN_STATUS_LABELS[lastRun.status]}
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-500">无运行记录</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-[#1e2a42] bg-[#080d1a] p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                <span>最后成功同步</span>
              </div>
              <p className="mt-1 text-base font-bold text-white truncate">
                {data.lastSuccessfulSync ? fmtTimeAgo(data.lastSuccessfulSync) : '—'}
              </p>
            </div>
          </div>

          {lastRun && (
            <Card className="border-[#1e2a42] bg-[#080d1a]">
              <CardHeader className="py-3 px-4 border-b border-[#182338]">
                <CardTitle className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>最近一次执行详情</span>
                  <Badge variant="outline" className={badgeTone(runTone[lastRun.status])}>
                    {RUN_STATUS_LABELS[lastRun.status]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2 text-slate-300">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <span className="text-slate-500">巡检信源</span>
                    <p className="font-semibold">{lastRun.sourcesChecked} 个</p>
                  </div>
                  <div>
                    <span className="text-slate-500">发现候选</span>
                    <p className="font-semibold">{lastRun.candidatesFound} 个</p>
                  </div>
                  <div>
                    <span className="text-slate-500">新增权益</span>
                    <p className="font-semibold text-emerald-400">{lastRun.offersCreated} 个</p>
                  </div>
                  <div>
                    <span className="text-slate-500">更新/结束</span>
                    <p className="font-semibold text-blue-400">{lastRun.offersUpdated} / {lastRun.offersExpired} 个</p>
                  </div>
                </div>
                {lastRun.note && (
                  <p className="pt-2 border-t border-[#182338] text-slate-400 italic">
                    巡检备注：{lastRun.note}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">近期巡检历史</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {data.runs.slice(0, 10).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-[#182338] bg-[#0c1220] px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={badgeTone(runTone[r.status])}>
                      {RUN_STATUS_LABELS[r.status]}
                    </Badge>
                    <span className="text-slate-300 tabular">{fmtDateTime(r.startedAt)}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    信源 {r.sourcesChecked} · 新增 {r.offersCreated} · 更新 {r.offersUpdated}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

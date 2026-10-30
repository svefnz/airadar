import { useState } from 'react';
import { Cloud, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePersonal } from '@/lib/usePersonal';

interface PersonalDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonalDataDialog({ open, onOpenChange }: PersonalDataDialogProps) {
  const { state, clear, syncStatus, syncError, retrySync } = usePersonal();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const claimed = Object.values(state.claims).filter((c) => c.status === 'claimed').length;
  const ignored = Object.values(state.claims).filter((c) => c.status === 'ignored').length;

  const handleClear = async () => {
    await clear();
    setConfirmClearOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-[#0b1020] border-[#1e2a42] text-slate-100 p-6">
          <DialogHeader className="border-b border-[#182338] pb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
                <Cloud className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold text-white">云端个人资产</DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  与您的 GitHub 账号绑定并在 Supabase 云端安全持久化
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[#1e2a42] bg-[#080d1a] p-3 text-center">
                <span className="text-slate-400 text-[11px]">收藏</span>
                <p className="mt-1 text-xl font-black text-white">{state.favorites.length}</p>
              </div>
              <div className="rounded-xl border border-[#1e2a42] bg-[#080d1a] p-3 text-center">
                <span className="text-slate-400 text-[11px]">已跳过(Pass)</span>
                <p className="mt-1 text-xl font-black text-slate-300">{ignored}</p>
              </div>
              <div className="rounded-xl border border-[#1e2a42] bg-[#080d1a] p-3 text-center">
                <span className="text-slate-400 text-[11px]">已领取</span>
                <p className="mt-1 text-xl font-black text-emerald-400">{claimed}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#182338] bg-[#080d1a] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">云端同步状态</span>
                {syncStatus === 'loading' ? (
                  <span className="flex items-center gap-1 text-blue-400 font-semibold">
                    <RefreshCw className="h-3 w-3 animate-spin" /> 正在同步…
                  </span>
                ) : syncStatus === 'error' ? (
                  <span className="flex items-center gap-1 text-rose-400 font-semibold">
                    <AlertCircle className="h-3 w-3" /> 同步异常
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 实时加密同步中
                  </span>
                )}
              </div>
              {syncStatus === 'error' && (
                <div className="flex items-center justify-between text-rose-300 text-[11px] pt-1">
                  <span className="truncate max-w-[240px]">{syncError || '网络错误'}</span>
                  <Button size="sm" variant="ghost" onClick={retrySync} className="h-6 text-xs text-rose-400 hover:text-rose-200">
                    <RefreshCw className="h-3 w-3 mr-1" /> 重试
                  </Button>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClearOpen(true)}
                className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> 清空个人云端数据
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="max-w-sm bg-[#0b1020] border-rose-500/40 text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> 确认清空个人数据？
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              此操作将永久清空您在云端的全部收藏、跳过标记与个人备忘录，操作不可撤回。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setConfirmClearOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClear}>
              确认彻底删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState } from 'react';
import { Trash2, Cloud, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePersonal } from '@/lib/usePersonal';

export function PersonalDataPanel() {
  const { state, clear, syncStatus, syncError, retrySync } = usePersonal();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const claimed = Object.values(state.claims).filter((c) => c.status === 'claimed').length;

  return (
    <div className="border-t border-[#182338] px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
          <Cloud className="h-3.5 w-3.5 text-blue-400" />
          <span>云端个人资产</span>
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="h-3 w-3" />
          多端实时同步
        </span>
      </div>

      <p className="text-[11px] leading-4 text-slate-400">
        收藏 <span className="font-bold text-white">{state.favorites.length}</span> 项 · 已领取 <span className="font-bold text-emerald-400">{claimed}</span> 项 · 已与您的 GitHub 账号绑定并在 Supabase 云端安全持久化
      </p>

      {/* 明确提示同步失败状态，提供重试按键，坚决不把网络错误误导为空数据 */}
      {syncStatus === 'error' && (
        <div className="flex items-center justify-between rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 text-[11px] text-rose-300">
          <span className="flex items-center gap-1 truncate max-w-[200px]" title={syncError || '加载云端数据失败'}>
            <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{syncError || '同步失败'}</span>
          </span>
          <button
            type="button"
            onClick={retrySync}
            className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 hover:text-rose-200 cursor-pointer ml-2"
          >
            <RefreshCw className="h-3 w-3" /> 重试
          </button>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-slate-500 flex items-center gap-1">
          {syncStatus === 'loading' ? (
            <span className="flex items-center gap-1 text-blue-400">
              <RefreshCw className="h-3 w-3 animate-spin" /> 正在同步…
            </span>
          ) : syncStatus === 'error' ? (
            <span className="text-rose-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> 同步异常（保留本地缓存）
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> 云端同步正常
            </span>
          )}
        </span>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive" className="h-7 text-xs bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600 hover:text-white">
              <Trash2 className="h-3 w-3 mr-1" /> 清空记录
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#101726] border-[#1e2a42] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">清空云端个人记录？</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                将彻底删除您在云端保存的全部收藏、已领取状态与专属备忘录。公共雷达信源不受任何影响。此操作不可逆。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmOpen(false)} className="border-slate-700 text-slate-300">
                取消
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  void clear();
                  setConfirmOpen(false);
                }}
              >
                确认清空
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

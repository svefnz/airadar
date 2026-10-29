import { useRef, useState } from 'react';
import { Download, Upload, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { usePersonal } from '@/lib/usePersonal';

export function PersonalDataPanel() {
  const { state, clear, exportText, importFromText } = usePersonal();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const doExport = () => {
    const blob = new Blob([exportText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-radar-personal-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('个人记录已导出');
  };

  const doImport = async (file: File) => {
    const text = await file.text();
    const r = importFromText(text);
    if (r.ok) {
      setStatus({ ok: true, msg: '导入成功，已合并到当前浏览器' });
      toast.success('导入成功');
    } else {
      setStatus({ ok: false, msg: r.error ?? '导入失败' });
      toast.error(r.error ?? '导入失败');
    }
  };

  const claimed = Object.values(state.claims).filter((c) => c.status === 'claimed').length;

  return (
    <div className="border-t border-edge px-5 py-4 space-y-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <UserRound className="h-3.5 w-3.5" /> 个人数据（localStorage）
      </p>
      <p className="text-[11px] leading-4 text-muted-foreground">
        收藏 {state.favorites.length} 项 · 已领取 {claimed} 项 · 仅保存在当前浏览器，不同设备不自动同步
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" onClick={doExport}>
          <Download className="h-3 w-3" /> 导出
        </Button>
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3 w-3" /> 导入
        </Button>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive">
              <Trash2 className="h-3 w-3" /> 清除
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>清除个人记录？</DialogTitle>
              <DialogDescription>
                将删除本浏览器中的收藏、领取状态与备注（localStorage），公共数据不受影响。此操作不可撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setConfirmOpen(false)}>
                取消
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  clear();
                  setConfirmOpen(false);
                  setStatus({ ok: true, msg: '已清除个人记录' });
                  toast.success('已清除个人记录');
                }}
              >
                确认清除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="导入个人记录文件"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void doImport(f);
          e.target.value = '';
        }}
      />
      {status && <p className={`text-[11px] ${status.ok ? 'text-ok' : 'text-bad'}`}>{status.msg}</p>}
    </div>
  );
}

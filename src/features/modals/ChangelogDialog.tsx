import { History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ChangelogApp } from '@/features/ChangelogApp';
import type { RadarData } from '@/lib/data/schema';

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: RadarData;
}

export function ChangelogDialog({ open, onOpenChange, data }: ChangelogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-[#0b1020] border-[#1e2a42] text-slate-100 p-6">
        <DialogHeader className="border-b border-[#182338] pb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
              <History className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-white">变更记录时间线</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                可追溯每一次额度调整、到期延期、活动下线及原始信源证据
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="pt-2">
          <ChangelogApp data={data} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-popover border-border text-foreground p-5 sm:p-6 shadow-md rounded-xl">
        <DialogHeader className="border-b border-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-md bg-muted text-foreground">
              <History className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">变更记录时间线</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
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

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, UserCheck } from 'lucide-react';
import { StatusBadge } from './status-badge';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  status?: string | null;
  assigneeName?: string | null;
}

export function SuccessModal({
  open,
  onClose,
  title = 'Ticket Submitted Successfully',
  description = 'Your ticket has been created and is now:',
  status,
  assigneeName,
}: SuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="flex flex-col items-center gap-3 pt-2 pb-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 mb-1">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <DialogTitle className="text-2xl font-extrabold tracking-tight text-center text-slate-900 dark:text-slate-50">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        {(status || assigneeName) && (
          <div className="flex flex-col items-center justify-center py-5 gap-2.5">
            {status && <StatusBadge status={status} />}
            {assigneeName && (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <UserCheck className="size-3.5 text-emerald-600" />
                <span>Assigned to: {assigneeName}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="sm:justify-center pt-2">
          <Button
            type="button"
            className="w-full sm:w-auto px-10 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all"
            onClick={onClose}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

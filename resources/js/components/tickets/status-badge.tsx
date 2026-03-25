import React from 'react';
import { Badge } from '@/components/ui/badge';

const map: Record<string, string> = {
  pending_approval: 'bg-gray-200 text-gray-800',
  approved: 'bg-blue-100 text-blue-800',
  not_started: 'bg-teal-100 text-teal-800',
  in_progress: 'bg-orange-100 text-orange-800',
  hold: 'bg-yellow-100 text-yellow-800',
  escalated: 'bg-red-100 text-red-800',
  done: 'bg-green-100 text-green-800',
  closed: 'bg-indigo-100 text-indigo-800',
  rejected: 'bg-black text-white',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = map[status] ?? 'bg-gray-100 text-gray-800';
  return <Badge className={cls + ' capitalize'}>{status.replace('_', ' ')}</Badge>;
}

import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TablePagination from '@/components/table-pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EvaluationPeriod {
  id: number;
  evaluation_period_name: string;
}

interface RejectedEvaluation {
  id: number;
  evaluation: {
    id: number;
    name: string;
  };
  evaluatee_name: string;
  evaluation_period: string;
  evaluator: string;
  average_score: number | null;
  evaluation_type: string;
  rejected_at: string;
  rejection_reason: string | null;
}

interface Props {
  items: {
    data: RejectedEvaluation[];
    links: any[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  periods: EvaluationPeriod[];
  request: {
    search?: string;
    period_id?: string;
  };
}

export default function RejectedEvaluationsIndex({ items, periods, request }: Props) {
  const [search, setSearch] = useState(request.search || '');
  const [periodId, setPeriodId] = useState(request.period_id || 'all');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.get(route('rejected-evaluations.index'), { search, period_id: periodId }, { preserveState: true });
  };

  const handlePeriodChange = (value: string) => {
    setPeriodId(value);
    router.get(route('rejected-evaluations.index'), { search, period_id: value }, { preserveState: true });
  };

  const openApproveDialog = (id: number) => {
    setSelectedId(id);
    setShowApproveDialog(true);
  };

  const confirmApprove = () => {
    if (selectedId) {
      router.post(route('rejected-evaluations.approve', selectedId), {}, {
        preserveScroll: true,
        onSuccess: () => {
          setShowApproveDialog(false);
          setSelectedId(null);
        }
      });
    }
  };

  const openCancelDialog = (id: number) => {
    setSelectedId(id);
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    if (selectedId) {
      router.delete(route('rejected-evaluations.cancel', selectedId), {
        preserveScroll: true,
        onSuccess: () => {
          setShowCancelDialog(false);
          setSelectedId(null);
        }
      });
    }
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Rejected Evaluations', href: '/rejected-evaluations' },
      ]}
    >
      <Head title="Rejected Evaluations" />

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Rejected Evaluations</CardTitle>
          <CardAction>
            <form className="flex gap-2" onSubmit={submitSearch}>
              <Select value={periodId} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={String(period.id)}>
                      {period.evaluation_period_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rejected evaluations..."
                className="w-[300px]"
              />
              <Button type="submit" variant="outline">Search</Button>
            </form>
          </CardAction>
        </CardHeader>

        <div className="border-b border-gray-200 dark:border-gray-700" />

        <CardContent className="p-6">
          {items.data.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              No rejected evaluations found.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 dark:bg-gray-800">
                    <TableHead className="font-bold text-white">ID</TableHead>
                    <TableHead className="font-bold text-white">Evaluation</TableHead>
                    <TableHead className="font-bold text-white">Evaluatee</TableHead>
                    <TableHead className="font-bold text-white">Type</TableHead>
                    <TableHead className="font-bold text-white">Period</TableHead>
                    <TableHead className="font-bold text-white">Evaluator</TableHead>
                    <TableHead className="font-bold text-white">Avg Score</TableHead>
                    <TableHead className="font-bold text-white">Rejected At</TableHead>
                    <TableHead className="font-bold text-white">Reason</TableHead>
                    <TableHead className="font-bold text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.evaluation.name}</TableCell>
                      <TableCell>{item.evaluatee_name}</TableCell>
                      <TableCell>
                        <Badge className={
                          item.evaluation_type === 'Personal'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }>
                          {item.evaluation_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.evaluation_period}</TableCell>
                      <TableCell>{item.evaluator}</TableCell>
                      <TableCell>{item.average_score?.toFixed(2) ?? 'N/A'}</TableCell>
                      <TableCell>
                        {item.rejected_at ? new Date(item.rejected_at).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.rejection_reason ? (
                          <span className="max-w-xs truncate block" title={item.rejection_reason}>
                            {item.rejection_reason}
                          </span>
                        ) : (
                          'No reason provided'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => openApproveDialog(item.id)}
                            className="bg-green-600 hover:bg-green-700"
                            title="Approve and change status to Accepted"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openCancelDialog(item.id)}
                            title="Cancel evaluation (allows re-evaluation)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <TablePagination 
                links={items.links} 
                total={items.total}
                from={items.data.length > 0 ? (items.current_page - 1) * items.per_page + 1 : 0}
                to={items.data.length > 0 ? (items.current_page - 1) * items.per_page + items.data.length : 0}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Rejected Evaluation</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this rejected evaluation? This will change the status to "Accepted" and keep all evaluation data intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Evaluation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this evaluation? This will permanently delete it and allow the evaluator to re-evaluate. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmCancel}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}


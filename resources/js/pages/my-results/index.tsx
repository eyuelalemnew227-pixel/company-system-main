import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Award, Building2, TrendingUp, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'My Evaluation Results', href: '/my-results' },
];

interface KPI {
  personal_avg_score: number | null;
  department_avg_score: number | null;
  combined_avg_score: number | null;
  department_name: string;
}

export default function MyResultsIndex({ items, periods, request, kpi }: { items: { data: any[]; total: number; from: number; to: number; links: any[] }; periods: { id: number; evaluation_period_name: string }[]; request?: { search?: string; period_id?: string }; kpi: KPI }) {
  const [search, setSearch] = useState<string>(request?.search ?? '');
  const [periodId, setPeriodId] = useState<string>(request?.period_id ?? 'all');

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.get('/my-results', { search, period_id: periodId }, { preserveState: true, replace: true });
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="My Evaluation Results" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personal Average</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpi.personal_avg_score !== null ? kpi.personal_avg_score.toFixed(2) : ''}
              </div>
              <p className="text-xs text-muted-foreground">Your overall evaluation score</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Department Average</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpi.department_avg_score !== null ? kpi.department_avg_score.toFixed(2) : ''}
              </div>
              <p className="text-xs text-muted-foreground">{kpi.department_name}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Combined Average</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpi.combined_avg_score !== null ? kpi.combined_avg_score.toFixed(2) : ''}
              </div>
              <p className="text-xs text-muted-foreground"></p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>My Evaluation Results</CardTitle>
            <form className="ml-4 flex gap-2" onSubmit={submitSearch}>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search evaluations..." />
              <Select value={periodId} onValueChange={setPeriodId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filter by period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.evaluation_period_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" variant="outline">Search</Button>
            </form>
            <CardAction />
          </CardHeader>
          <hr />
          <CardContent>
            <Table>
              <TableHeader className="bg-slate-500 dark:bg-slate-700 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-bold text-white">ID</TableHead>
                  <TableHead className="font-bold text-white">Evaluation</TableHead>
                  <TableHead className="font-bold text-white">Type</TableHead>
                  <TableHead className="font-bold text-white">Period</TableHead>
                  <TableHead className="font-bold text-white">Avg Score</TableHead>
                  <TableHead className="font-bold text-white">Status</TableHead>
                  <TableHead className="font-bold text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.data.map((it, index) => (
                  <TableRow key={it.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                    <TableCell>{(items.from ?? 0) + index}</TableCell>
                    <TableCell className="font-medium">{it.evaluation?.name || `Evaluation #${it.evaluation?.id}`}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${it.evaluation_type === 'Personal'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }`}>
                        {it.evaluation_type}
                      </span>
                    </TableCell>
                    <TableCell>{it.evaluation_period || 'N/A'}</TableCell>
                    <TableCell>{it.average_score ?? 'N/A'}</TableCell>
                    <TableCell>
                      {it.status === 'accepted' && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Accepted
                        </Badge>
                      )}
                      {it.status === 'rejected' && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                          <XCircle className="mr-1 h-3 w-3" />
                          Rejected
                        </Badge>
                      )}
                      {it.status === 'pending' && (
                        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/my-results/${it.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {items.data.length > 0 ? (
            <TablePagination total={items.total} from={items.from} to={items.to} links={items.links} />
          ) : (
            <div className="flex h-full items-center justify-center p-8">No Results Found!</div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}



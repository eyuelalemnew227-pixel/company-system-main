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
import { Award, Building2, TrendingUp } from 'lucide-react';

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
    router.get('/my-results', { search, period_id: periodId !== 'all' ? periodId : undefined }, { preserveState: true, replace: true });
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
                {kpi.personal_avg_score !== null ? kpi.personal_avg_score.toFixed(2) : 'N/A'}
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
                {kpi.department_avg_score !== null ? kpi.department_avg_score.toFixed(2) : 'N/A'}
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
                {kpi.combined_avg_score !== null ? kpi.combined_avg_score.toFixed(2) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">(Personal + Department) / 2</p>
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
              <TableHeader className="bg-slate-500 dark:bg-slate-700">
                <TableRow>
                  <TableHead className="font-bold text-white">ID</TableHead>
                  <TableHead className="font-bold text-white">Evaluation</TableHead>
                  <TableHead className="font-bold text-white">Period</TableHead>
                  <TableHead className="font-bold text-white">Avg Score</TableHead>
                  <TableHead className="font-bold text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.data.map((it, index) => (
                  <TableRow key={it.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                    <TableCell>{(items.from ?? 0) + index}</TableCell>
                    <TableCell className="font-medium">{it.evaluation?.name || `Evaluation #${it.evaluation?.id}`}</TableCell>
                    <TableCell>{it.evaluation_period || 'N/A'}</TableCell>
                    <TableCell>{it.average_score ?? 'N/A'}</TableCell>
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



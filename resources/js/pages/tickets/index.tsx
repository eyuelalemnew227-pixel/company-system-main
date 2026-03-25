import TablePagination from '@/components/table-pagination';
import { StatusBadge } from '@/components/tickets/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Search, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Ticket = {
  id: number;
  title: string;
  status: string;
  severity: string;
  priority: string;
  department?: { name: string };
  mainCategory?: { name: string };
  subCategory?: { name: string };
  main_category?: { name: string };
  sub_category?: { name: string };
  asset?: { name: string; bar_code?: string | null; article_code?: string | null } | null;
  created_at: string;
};

type PageProps = {
  tickets: {
    data: Ticket[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number;
    to: number;
  };
  filters: {
    search?: string;
    status?: string;
    department_id?: string;
    severity?: string;
    priority?: string;
    main_category_id?: string;
    start_date?: string;
    end_date?: string;
  };
  flash: { message?: string };
  can_create: boolean;
  options: {
    statuses: string[];
    severities: string[];
    priorities: string[];
    departments: { id: number; name: string }[];
    categories: { id: number; name: string }[];
  };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Tickets', href: '/tickets' }];

export default function TicketIndex() {
  const { tickets, filters, flash, can_create, options } = usePage<PageProps>().props;
  const [params, setParams] = useState({
    search: filters.search ?? '',
    status: filters.status ?? 'all',
    department_id: filters.department_id ?? 'all',
    severity: filters.severity ?? 'all',
    priority: filters.priority ?? 'all',
    main_category_id: filters.main_category_id ?? 'all',
    start_date: filters.start_date ?? '',
    end_date: filters.end_date ?? '',
  });

  useEffect(() => {
    if (flash?.message) toast.success(flash.message);
  }, [flash?.message]);

  const applyFilters = () => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== 'all')
    );
    router.get('/tickets', cleanParams, { preserveState: true, replace: true });
  };

  const clearFilters = () => {
    setParams({
      search: '',
      status: 'all',
      department_id: 'all',
      severity: 'all',
      priority: 'all',
      main_category_id: 'all',
      start_date: '',
      end_date: '',
    });
    router.get('/tickets', {}, { replace: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyFilters();
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Tickets" />
      <div className="flex h-full flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tickets</h1>
          {can_create && (
            <Button asChild>
              <Link href={route('tickets.create')}>New Ticket</Link>
            </Button>
          )}
        </div>

        <Card className="bg-slate-50 border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10 gap-3 items-end">
              <div className="space-y-1.5 xl:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={params.search}
                    onChange={(e) => setParams({ ...params, search: e.target.value })}
                    onKeyDown={handleKeyDown}
                    placeholder="ID, Title, Description..."
                    className="pl-9 bg-white border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                <Select value={params.status} onValueChange={(v) => setParams({ ...params, status: v })}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {options.statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</label>
                <Select value={params.department_id} onValueChange={(v) => setParams({ ...params, department_id: v })}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {options.departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>



              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</label>
                <Select value={params.priority} onValueChange={(v) => setParams({ ...params, priority: v })}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {options.priorities.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</label>
                <Select value={params.main_category_id} onValueChange={(v) => setParams({ ...params, main_category_id: v })}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {options.categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Start Date</label>
                <Input
                  type="date"
                  value={params.start_date}
                  onChange={(e) => setParams({ ...params, start_date: e.target.value })}
                  className="bg-white border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">End Date</label>
                <Input
                  type="date"
                  value={params.end_date}
                  onChange={(e) => setParams({ ...params, end_date: e.target.value })}
                  className="bg-white border-slate-200"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={applyFilters} className="flex-1 shadow-sm">
                  Filter
                </Button>
                <Button variant="outline" onClick={clearFilters} className="px-3 border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50">
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-100 border-b border-slate-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-slate-700 w-20">ID</TableHead>
                    <TableHead className="font-bold text-slate-700">Title</TableHead>
                    <TableHead className="font-bold text-slate-700">Department</TableHead>
                    <TableHead className="font-bold text-slate-700">Category</TableHead>
                    <TableHead className="font-bold text-slate-700">Status</TableHead>

                    <TableHead className="font-bold text-slate-700">Priority</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center text-slate-400 italic">
                        No tickets matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.data.map((t) => (
                      <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-mono text-xs text-slate-500">#{t.id}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-md">
                          <Link className="text-blue-600 hover:text-blue-800 transition-colors" href={route('tickets.show', t.id)}>
                            {t.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{t.department?.name ?? '—'}</TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-600 line-clamp-1">
                            {t.main_category?.name ?? t.mainCategory?.name ?? '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">
                            {t.sub_category?.name ?? t.subCategory?.name ?? ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={t.status} />
                        </TableCell>

                        <TableCell>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${t.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' :
                            t.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              t.priority === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                            {(t.priority ?? 'medium').toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-500 whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString()}
                          <div className="text-[10px] opacity-70">
                            {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <div className="border-t border-slate-200">
            <TablePagination total={tickets.total} from={tickets.from} to={tickets.to} links={tickets.links} />
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

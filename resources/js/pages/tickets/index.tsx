import TablePagination from '@/components/table-pagination';
import { StatusBadge } from '@/components/tickets/status-badge';
import { SuccessModal } from '@/components/tickets/success-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown, Download, Edit3, Eye, Lock, Search, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Ticket = {
  id: number;
  title: string;
  status: string;
  severity: string;
  priority: string;
  department_id?: number;
  department?: { name: string };
  mainCategory?: { name: string };
  subCategory?: { name: string };
  requestor_branch?: { name: string };
  main_category?: { name: string };
  sub_category?: { name: string };
  asset?: { name: string; bar_code?: string | null; article_code?: string | null } | null;
  assignments?: { id: number; assigned_to: number; is_current: boolean; assignee?: { name: string } }[];
  allowed_statuses?: string[];
  can_assign?: boolean;
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
    fiscal_year_id?: string;
    fiscal_month_id?: string;
    start_date?: string;
    end_date?: string;
    requestor_branch_id?: string;
  };
  flash: { message?: string };
  can_create: boolean;
  options: {
    statuses: string[];
    severities: string[];
    priorities: string[];
    departments: { id: number; name: string }[];
    categories: { id: number; name: string }[];
    fiscalYears: { id: number; name: string }[];
    fiscalMonths: { id: number; name: string; fiscal_year_id: number }[];
    branches?: { id: number; name: string }[];
    assignableUsers?: { id: number; name: string; email: string; department_id?: number }[];
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
    fiscal_year_id: filters.fiscal_year_id ?? 'all',
    fiscal_month_id: filters.fiscal_month_id ?? 'all',
    start_date: filters.start_date ?? '',
    end_date: filters.end_date ?? '',
    requestor_branch_id: filters.requestor_branch_id ?? 'all',
  });

  const [deptOpen, setDeptOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [assigneeModalOpen, setAssigneeModalOpen] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    open: boolean;
    title?: string;
    description?: string;
    status?: string | null;
    assigneeName?: string | null;
  }>({ open: false });

  const { data: updateData, setData: setUpdateData, post: postQuickUpdate, processing: updatingQuick, errors: updateErrors, reset: resetUpdate } = useForm({
    status: '',
    assigned_to: '',
    comment: '',
  });

  const handleOpenUpdateModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    const currentAssignee = ticket.assignments?.find((a) => a.is_current)?.assigned_to ?? '';
    const baseStatuses = ticket.allowed_statuses && ticket.allowed_statuses.length > 0
      ? ticket.allowed_statuses
      : options.statuses;
    const remaining = baseStatuses.filter((s: string) => s !== 'in_progress' && s !== ticket.status);
    setUpdateData({
      status: remaining[0] ?? '',
      assigned_to: currentAssignee ? String(currentAssignee) : '',
      comment: '',
    });
    setIsUpdateModalOpen(true);
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    postQuickUpdate(route('tickets.quick-update', selectedTicket.id), {
      onSuccess: () => {
        setIsUpdateModalOpen(false);
        if (updateData.status === 'ticket_approved') {
          router.visit(route('tickets.show', selectedTicket.id));
          return;
        }
        const assignedStaff = options.assignableUsers?.find((s) => String(s.id) === updateData.assigned_to)?.name;
        const currentAssignee = selectedTicket.assignments?.find((a) => a.is_current)?.assigned_to;
        const isAssigning = !!updateData.assigned_to && updateData.assigned_to !== String(currentAssignee || '');
        const isStatusChanging = !!updateData.status && updateData.status !== selectedTicket.status;

        setSuccessModal({
          open: true,
          title: isAssigning ? 'Technician Assigned Successfully' : isStatusChanging ? 'Status Updated Successfully' : 'Case Updated Successfully',
          description: isAssigning
            ? 'The ticket technician assignment has been updated to:'
            : isStatusChanging
            ? 'The ticket status has been changed to:'
            : 'Your case update has been recorded successfully.',
          status: updateData.status || selectedTicket.status,
          assigneeName: assignedStaff ?? null,
        });

        setSelectedTicket(null);
        resetUpdate();
      },
    });
  };

  const filteredFiscalMonths = options.fiscalMonths.filter(
    (m) => params.fiscal_year_id === 'all' || String(m.fiscal_year_id) === params.fiscal_year_id
  );

  useEffect(() => {
    if (flash?.message) {
      const msg = flash.message.toLowerCase();
      const isAssign = msg.includes('assign');
      const isStatus = msg.includes('status') || msg.includes('case');
      setSuccessModal({
        open: true,
        title: isAssign ? 'Technician Assigned Successfully' : isStatus ? 'Status Updated Successfully' : 'Action Completed Successfully',
        description: isAssign
          ? 'The ticket technician assignment is now:'
          : isStatus
          ? 'The ticket status has been changed to:'
          : flash.message,
        status: selectedTicket?.status,
      });
    }
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
      fiscal_year_id: 'all',
      fiscal_month_id: 'all',
      start_date: '',
      end_date: '',
      requestor_branch_id: 'all',
    });
    router.get('/tickets', {}, { replace: true });
  };

  const handleExport = () => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== 'all')
    );
    const queryString = new URLSearchParams(cleanParams).toString();
    window.location.href = `/tickets/export?${queryString}`;
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="flex gap-2 bg-white hover:bg-slate-50 border-slate-200">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            {can_create && (
              <Button asChild>
                <Link href={route('tickets.create')}>New Ticket</Link>
              </Button>
            )}
          </div>
        </div>

        <Card className="bg-slate-50 border-slate-200 shadow-sm">
          <CardContent className="p-4 space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 items-end">
              <div className="space-y-1.5 xl:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={params.search}
                    onChange={(e) => setParams({ ...params, search: e.target.value })}
                    onKeyDown={handleKeyDown}
                    placeholder="ID, Category, Description..."
                    className="pl-9 bg-white border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                <Select value={params.status} onValueChange={(v) => setParams({ ...params, status: v })}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
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
                <Popover open={deptOpen} onOpenChange={setDeptOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={deptOpen}
                      className="w-full justify-between bg-white border-slate-200 text-left font-normal text-sm"
                    >
                      <span className="truncate">
                        {params.department_id === 'all'
                          ? 'All'
                          : options.departments.find((d) => String(d.id) === params.department_id)?.name ?? 'Select Department'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search department..." />
                      <CommandList>
                        <CommandEmpty>No department found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all All"
                            onSelect={() => {
                              setParams({ ...params, department_id: 'all' });
                              setDeptOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', params.department_id === 'all' ? 'opacity-100' : 'opacity-0')} />
                            All
                          </CommandItem>
                          {options.departments.map((d) => (
                            <CommandItem
                              key={d.id}
                              value={`${d.id} ${d.name}`}
                              onSelect={() => {
                                setParams({ ...params, department_id: String(d.id) });
                                setDeptOpen(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', params.department_id === String(d.id) ? 'opacity-100' : 'opacity-0')} />
                              {d.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Requestor Branch</label>
                <Select value={params.requestor_branch_id} onValueChange={(v) => setParams({ ...params, requestor_branch_id: v })}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {options.branches?.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</label>
                <Select value={params.priority} onValueChange={(v) => setParams({ ...params, priority: v })}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
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
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {options.categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fiscal Year</label>
                <Select
                  value={params.fiscal_year_id}
                  onValueChange={(v) => setParams({ ...params, fiscal_year_id: v, fiscal_month_id: 'all' })}
                >
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {options.fiscalYears.map((y) => (
                      <SelectItem key={y.id} value={String(y.id)}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fiscal Month</label>
                <Select
                  value={params.fiscal_month_id}
                  onValueChange={(v) => setParams({ ...params, fiscal_month_id: v })}
                  disabled={params.fiscal_year_id === 'all'}
                >
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {filteredFiscalMonths.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
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
                    <TableHead className="font-bold text-slate-700">Category</TableHead>
                    <TableHead className="font-bold text-slate-700">Requestor Branch</TableHead>
                    <TableHead className="font-bold text-slate-700">Department</TableHead>
                    <TableHead className="font-bold text-slate-700">Sub Category</TableHead>
                    <TableHead className="font-bold text-slate-700">Status</TableHead>
                    <TableHead className="font-bold text-slate-700">Assigned Tech</TableHead>
                    <TableHead className="font-bold text-slate-700">Priority</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">Created</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right w-48">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-40 text-center text-slate-400 italic">
                        No tickets matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.data.map((t) => (
                      <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-mono text-xs text-slate-500">#{t.id}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-md">
                          <Link className="text-blue-600 hover:text-blue-800 transition-colors font-semibold" href={route('tickets.show', t.id)}>
                            {t.main_category?.name ?? t.mainCategory?.name ?? t.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{t.requestor_branch?.name ?? '—'}</TableCell>
                        <TableCell className="text-sm text-slate-600">{t.department?.name ?? '—'}</TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-600 line-clamp-1">
                            {t.sub_category?.name ?? t.subCategory?.name ?? '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={t.status} />
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-700">
                          {t.assignments?.find((a) => a.is_current)?.assignee?.name ?? '—'}
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
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild size="icon" variant="ghost" className="size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700" title="View Detail">
                              <Link href={route('tickets.show', t.id)}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                            {((t.allowed_statuses && t.allowed_statuses.length > 0) || t.can_assign) && (
                              <Button
                                size="icon"
                                variant="outline"
                                className="size-8 border-slate-200 text-slate-700 hover:bg-slate-100"
                                title="Update Case"
                                onClick={() => handleOpenUpdateModal(t)}
                              >
                                <Edit3 className="size-4 text-slate-600" />
                              </Button>
                            )}
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

      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-background rounded-xl border shadow-xl">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-xl font-bold">
              Update Case
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleQuickSubmit} className="space-y-4 pt-3">
            {/* Progress / Status dropdown */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/80">Progress / Status</label>
              <select
                className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={updateData.status}
                onChange={(e) => setUpdateData('status', e.target.value)}
              >
                {(() => {
                  const baseStatuses = selectedTicket?.allowed_statuses && selectedTicket.allowed_statuses.length > 0
                    ? selectedTicket.allowed_statuses
                    : options.statuses;
                  const remaining = baseStatuses.filter((s: string) => s !== 'in_progress' && s !== selectedTicket?.status);
                  if (remaining.length === 0) {
                    return <option value="">No other status transitions available</option>;
                  }
                  return remaining.map((s: string) => (
                    <option key={s} value={s}>
                      {s.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </option>
                  ));
                })()}
              </select>
              {updateErrors.status && <p className="text-xs text-red-500">{updateErrors.status}</p>}
            </div>

            {/* Assignee selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground/80">Assignee</label>
                {!selectedTicket?.can_assign && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                    <Lock className="size-3" /> Manager Only
                  </span>
                )}
              </div>

              {!selectedTicket?.can_assign ? (
                <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-700 border border-slate-200 flex items-center gap-2.5">
                  <Lock className="size-4 text-slate-400 shrink-0" />
                  <span className="font-semibold truncate">
                    {(() => {
                      const currentAssignee = selectedTicket?.assignments?.find((a: any) => a.is_current)?.assigned_to;
                      const staff = (options.assignableUsers ?? []).find((s: any) => String(s.id) === String(currentAssignee));
                      return staff ? `${staff.name} ${staff.email ? `(${staff.email})` : ''}` : 'Unassigned (Manager assignment required)';
                    })()}
                  </span>
                </div>
              ) : (
                <select
                  className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={updateData.assigned_to}
                  onChange={(e) => setUpdateData('assigned_to', e.target.value)}
                >
                  <option value="">Select staff member...</option>
                  {(() => {
                    const deptStaff = (options.assignableUsers ?? []).filter((u: any) =>
                      !selectedTicket?.department_id || String(u.department_id) === String(selectedTicket.department_id)
                    );
                    const list = deptStaff.length > 0 ? deptStaff : (options.assignableUsers ?? []);
                    return list.map((s: any) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name} ({s.email})
                      </option>
                    ));
                  })()}
                </select>
              )}
              {updateErrors.assigned_to && <p className="text-xs text-red-500">{updateErrors.assigned_to}</p>}
            </div>

            {/* Comment / Reason */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/80">Comment / Reason</label>
              <Textarea
                placeholder="Add update note or reason..."
                value={updateData.comment}
                onChange={(e) => setUpdateData('comment', e.target.value)}
                className="min-h-[90px] border-input rounded-lg text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
              />
              {(updateErrors.comment || (updateErrors as any).reason) && (
                <p className="text-xs font-semibold text-red-500">{updateErrors.comment || (updateErrors as any).reason}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUpdateModalOpen(false)}
                className="flex-1 h-10 font-semibold border-input hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingQuick}
                className="flex-1 h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg shadow-sm"
              >
                {updatingQuick ? 'Saving...' : 'Update Case'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* System Success Modal ("System Toaster") */}
      <SuccessModal
        open={successModal.open}
        onClose={() => setSuccessModal({ open: false })}
        title={successModal.title}
        description={successModal.description}
        status={successModal.status}
        assigneeName={successModal.assigneeName}
      />
    </AppLayout>
  );
}

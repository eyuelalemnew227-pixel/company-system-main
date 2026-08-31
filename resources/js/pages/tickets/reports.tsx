import { StatusBadge } from '@/components/tickets/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  Check,
  ChevronsUpDown,
  Clock,
  Crown,
  Download,
  Filter,
  MessageSquare,
  Printer,
  Send,
  Star,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

type PageProps = {
  filters: {
    period: string;
    department_id: string;
    start_date: string;
    end_date: string;
  };
  summary: {
    total_tickets: number;
    resolved_tickets: number;
    open_tickets: number;
    escalated_tickets: number;
    resolution_rate: number;
    avg_resolution_hours: number;
    avg_rating: number;
  };
  technicianPerformance: {
    id: number;
    name: string;
    email: string;
    department: string;
    assigned_count: number;
    resolved_count: number;
    avg_resolution_hours: number;
    avg_rating: number;
    completion_rate: number;
  }[];
  managerPerformance: {
    user_id: number;
    manager_name: string;
    email: string;
    department_id: number;
    department_name: string;
    total_tickets: number;
    resolved_tickets: number;
    open_tickets: number;
    escalated_tickets: number;
    avg_resolution_hours: number;
    resolution_rate: number;
  }[];
  resolutionByPriority: Record<string, { count: number; avg_hours: number }>;
  ratingDistribution: Record<number, number>;
  feedbackLog: {
    id: number;
    ticket_id: number;
    ticket_title: string;
    branch_name: string;
    user_name: string;
    stars: number;
    comment: string | null;
    created_at: string;
  }[];
  options: {
    departments: { id: number; name: string }[];
  };
};

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Ticketing', href: '/tickets' },
  { title: 'Ticketing Report', href: '/tickets/reports' },
];

export default function TicketingReport() {
  const { filters, summary, technicianPerformance, managerPerformance, resolutionByPriority, ratingDistribution, feedbackLog, options } = usePage<PageProps>().props;

  const [period, setPeriod] = useState(filters.period ?? 'monthly');
  const [departmentId, setDepartmentId] = useState(filters.department_id ?? 'all');
  const [deptOpen, setDeptOpen] = useState(false);
  const [startDate, setStartDate] = useState(filters.start_date ?? '');
  const [endDate, setEndDate] = useState(filters.end_date ?? '');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'critical'>('all');

  const handleApplyFilter = () => {
    router.get(
      '/tickets/reports',
      {
        period,
        department_id: departmentId,
        start_date: startDate,
        end_date: endDate,
      },
      { preserveState: true, replace: true }
    );
  };

  const handleResetFilter = () => {
    setPeriod('monthly');
    setDepartmentId('all');
    setStartDate('');
    setEndDate('');
    router.get('/tickets/reports', {}, { replace: true });
  };

  const handleExportCsv = () => {
    window.location.href = `/tickets/reports?period=${period}&department_id=${departmentId}&start_date=${startDate}&end_date=${endDate}&export=csv`;
  };

  const [sendingReport, setSendingReport] = useState<'weekly' | 'monthly' | null>(null);

  const handleSendTelegramReport = (type: 'weekly' | 'monthly') => {
    setSendingReport(type);
    router.post(
      '/tickets/reports/send-telegram',
      { period: type, department_id: departmentId },
      {
        onSuccess: () => {
          toast.success(`${type === 'weekly' ? 'Weekly' : 'Monthly'} performance report dispatched to Department Head(s) via Telegram!`);
        },
        onError: () => {
          toast.error('Failed to send Telegram report.');
        },
        onFinish: () => setSendingReport(null),
      }
    );
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Ticketing Performance Report" />

      <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Title Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
              <BarChart3 className="size-7 text-primary" />
              Ticketing Performance & Analytics Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time daily, weekly, and monthly SLA, technical staff resolution speed, and manager department oversight.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button
              variant="default"
              size="sm"
              disabled={sendingReport === 'weekly'}
              onClick={() => handleSendTelegramReport('weekly')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 shadow-sm"
            >
              <Send className="mr-1.5 size-3.5" />
              {sendingReport === 'weekly' ? 'Sending...' : 'Send Weekly Report'}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={sendingReport === 'monthly'}
              onClick={() => handleSendTelegramReport('monthly')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 shadow-sm"
            >
              <Send className="mr-1.5 size-3.5" />
              {sendingReport === 'monthly' ? 'Sending...' : 'Send Monthly Report'}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCsv}
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs h-9 shadow-sm"
            >
              <Download className="mr-1.5 size-4 text-emerald-600" /> Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs h-9 shadow-sm"
            >
              <Printer className="mr-1.5 size-4 text-blue-600" /> Print / PDF
            </Button>
          </div>
        </div>

        {/* Filter Controls Card */}
        <Card className="bg-slate-50/80 border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-48 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Report Period</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily (Today)</SelectItem>
                    <SelectItem value="weekly">Weekly (This Week)</SelectItem>
                    <SelectItem value="monthly">Monthly (This Month)</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-64 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Department</label>
                <Popover open={deptOpen} onOpenChange={setDeptOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={deptOpen}
                      className="w-full justify-between bg-white border-slate-200 text-left font-normal text-sm"
                    >
                      <span className="truncate">
                        {departmentId === 'all'
                          ? 'All Departments'
                          : options.departments.find((d) => String(d.id) === departmentId)?.name ?? 'Select Department'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search department..." />
                      <CommandList>
                        <CommandEmpty>No department found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all All Departments"
                            onSelect={() => {
                              setDepartmentId('all');
                              setDeptOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', departmentId === 'all' ? 'opacity-100' : 'opacity-0')} />
                            All Departments
                          </CommandItem>
                          {options.departments.map((d) => (
                            <CommandItem
                              key={d.id}
                              value={`${d.id} ${d.name}`}
                              onSelect={() => {
                                setDepartmentId(String(d.id));
                                setDeptOpen(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', departmentId === String(d.id) ? 'opacity-100' : 'opacity-0')} />
                              {d.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {period === 'custom' && (
                <>
                  <div className="w-full md:w-40 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">From Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white border-slate-200"
                    />
                  </div>
                  <div className="w-full md:w-40 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">To Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white border-slate-200"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 w-full md:w-auto">
                <Button onClick={handleApplyFilter} className="flex-1 md:flex-initial">
                  <Filter className="mr-2 size-4" /> Filter Report
                </Button>
                <Button variant="outline" onClick={handleResetFilter} title="Reset Filter">
                  <XCircle className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Executive Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Tickets Created</CardDescription>
              <CardTitle className="text-2xl font-bold flex items-center justify-between">
                <span>{summary.total_tickets}</span>
                <Ticket className="size-6 text-blue-500 opacity-80" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-blue-700">{summary.open_tickets}</span> currently open / active
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">Resolved & Closed Rate</CardDescription>
              <CardTitle className="text-2xl font-bold flex items-center justify-between">
                <span>{summary.resolution_rate}%</span>
                <CheckCircle2 className="size-6 text-emerald-500 opacity-80" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-emerald-700">{summary.resolved_tickets}</span> cases completed
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">Avg Case Resolution Time</CardDescription>
              <CardTitle className="text-2xl font-bold flex items-center justify-between">
                <span>{summary.avg_resolution_hours} hrs</span>
                <Clock className="size-6 text-amber-500 opacity-80" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-xs text-muted-foreground">
                Average turnaround time from creation to resolution
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-sm">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">Avg Customer Satisfaction</CardDescription>
              <CardTitle className="text-2xl font-bold flex items-center justify-between">
                <span className="flex items-center gap-1">
                  {summary.avg_rating} <Star className="size-5 fill-amber-400 text-amber-400 inline" />
                </span>
                <Award className="size-6 text-purple-500 opacity-80" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-xs text-muted-foreground">
                Based on branch feedback ratings (out of 5.0)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Report Navigation Tabs */}
        <Tabs defaultValue="manager" className="w-full space-y-6">
          <TabsList className="bg-slate-200/80 p-1.5 rounded-lg border border-slate-300 inline-flex w-full md:w-auto">
            <TabsTrigger
              value="manager"
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 font-bold text-sm data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <Crown className="size-4 text-amber-600" />
              Manager Performance Page
            </TabsTrigger>
            <TabsTrigger
              value="technician"
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 font-bold text-sm data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <UserCheck className="size-4 text-primary" />
              Technician Performance Page
            </TabsTrigger>
          </TabsList>

          {/* Manager Report Page */}
          <TabsContent value="manager" className="space-y-6 mt-4">
            {/* Manager Performance Table Card */}
            <Card className="shadow-sm border-l-4 border-l-amber-500">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Crown className="size-5 text-amber-600" />
                      Manager Performance Overview
                    </CardTitle>
                    <CardDescription>
                      Individual department manager workload, case resolution turnaround speed, and completion rate per Manager (filtered by selected target department).
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700">Manager</TableHead>
                        <TableHead className="font-bold text-slate-700">Managed Department</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Total Managed Tickets</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Resolved Cases</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Open / Pending</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Escalated</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Avg Resolution Speed</TableHead>
                        <TableHead className="font-bold text-slate-700 text-right">Manager Completion Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {managerPerformance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-28 text-center text-slate-400 italic">
                            No manager records found for the selected department/period.
                          </TableCell>
                        </TableRow>
                      ) : (
                        managerPerformance.map((mgr) => (
                          <TableRow key={`${mgr.user_id}-${mgr.department_id}`} className="hover:bg-slate-50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1.5">
                                <span>{mgr.manager_name}</span>
                                {(mgr.avg_resolution_hours > 24 || (mgr.resolution_rate < 70 && mgr.total_tickets > 0)) && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5 py-0 font-bold inline-flex items-center gap-0.5">
                                    <AlertTriangle className="size-3 text-red-600" /> SLA Breach
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{mgr.email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-semibold bg-amber-50 text-amber-900 border-amber-300">
                                {mgr.department_name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-bold">{mgr.total_tickets}</TableCell>
                            <TableCell className="text-center font-semibold text-emerald-700">{mgr.resolved_tickets}</TableCell>
                            <TableCell className="text-center font-semibold text-blue-700">{mgr.open_tickets}</TableCell>
                            <TableCell className="text-center font-semibold text-red-600">{mgr.escalated_tickets}</TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              {mgr.avg_resolution_hours > 0 ? `${mgr.avg_resolution_hours} hrs` : '—'}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs ${mgr.resolution_rate >= 80 ? 'bg-emerald-100 text-emerald-800' : mgr.resolution_rate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                {mgr.resolution_rate}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Technician Report Page */}
          <TabsContent value="technician" className="space-y-6 mt-4">
            {/* Technician Performance Table */}
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <UserCheck className="size-5 text-primary" />
                      Technician Performance Overview
                    </CardTitle>
                    <CardDescription>
                      Workload distribution, case completion rates, average resolution speed, and average rating per technical staff.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700">Technician</TableHead>
                        <TableHead className="font-bold text-slate-700">Department</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Assigned</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Resolved</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Completion Rate</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Avg Resolution Time</TableHead>
                        <TableHead className="font-bold text-slate-700 text-right">Avg Customer Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {technicianPerformance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-slate-400 italic">
                            No technician activity recorded for the selected period.
                          </TableCell>
                        </TableRow>
                      ) : (
                        technicianPerformance.map((tech) => (
                          <TableRow key={tech.id} className="hover:bg-slate-50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1.5">
                                <span>{tech.name}</span>
                                {(tech.avg_resolution_hours > 24 || (tech.completion_rate < 70 && tech.assigned_count > 0)) && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0 font-bold inline-flex items-center gap-0.5">
                                    <AlertTriangle className="size-3 text-amber-600" /> SLA Warning
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{tech.email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {tech.department}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-semibold">{tech.assigned_count}</TableCell>
                            <TableCell className="text-center font-semibold text-emerald-700">{tech.resolved_count}</TableCell>
                            <TableCell className="text-center font-bold">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${tech.completion_rate >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {tech.completion_rate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              {tech.avg_resolution_hours > 0 ? `${tech.avg_resolution_hours} hrs` : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {tech.avg_rating > 0 ? (
                                <span className="font-bold text-amber-700 inline-flex items-center gap-1">
                                  {tech.avg_rating} <Star className="size-3.5 fill-amber-400 text-amber-400" />
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Unrated</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Breakdown Section: Resolution Time by Priority & Rating Distribution */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Resolution Time by Priority */}
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-slate-50/50">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Clock className="size-5 text-primary" />
                    Average Resolution Time by Case Priority
                  </CardTitle>
                  <CardDescription>Average hours required to resolve tickets by priority level.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {['urgent', 'high', 'medium', 'low'].map((pri) => {
                    const data = resolutionByPriority[pri] ?? { count: 0, avg_hours: 0 };
                    const priColors: Record<string, string> = {
                      urgent: 'bg-red-500',
                      high: 'bg-orange-500',
                      medium: 'bg-blue-500',
                      low: 'bg-slate-400',
                    };
                    return (
                      <div key={pri} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="uppercase tracking-wider">{pri} Priority</span>
                          <span>
                            {data.avg_hours} hrs ({data.count} cases)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full ${priColors[pri]}`}
                            style={{ width: `${Math.min(100, (data.avg_hours / 48) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Rating Distribution */}
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-slate-50/50">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Star className="size-5 text-amber-500 fill-amber-500" />
                    Branch Feedback Rating Distribution
                  </CardTitle>
                  <CardDescription>Customer feedback star breakdown across evaluated tickets.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingDistribution[star] ?? 0;
                    const totalRatings = Object.values(ratingDistribution).reduce((a, b) => a + b, 0);
                    const percent = totalRatings > 0 ? round((count / totalRatings) * 100, 1) : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-12 font-bold flex items-center gap-1">
                          {star} <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        </span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-amber-400 h-2.5 rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="w-16 text-right font-medium text-muted-foreground">
                          {count} ({percent}%)
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Recent Branch Feedback Comments Log */}
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <MessageSquare className="size-5 text-primary" />
                    Recent Branch Service Ratings & Comments
                  </CardTitle>
                  <CardDescription>Direct feedback and ratings submitted by branches upon approving tickets.</CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start md:self-auto">
                  <Button
                    size="sm"
                    variant={sentimentFilter === 'all' ? 'default' : 'ghost'}
                    className="h-7 text-xs font-semibold px-2.5"
                    onClick={() => setSentimentFilter('all')}
                  >
                    All ({feedbackLog.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={sentimentFilter === 'positive' ? 'default' : 'ghost'}
                    className="h-7 text-xs font-semibold px-2.5 text-emerald-700 hover:text-emerald-800"
                    onClick={() => setSentimentFilter('positive')}
                  >
                    Positive 4-5★ ({feedbackLog.filter((f) => f.stars >= 4).length})
                  </Button>
                  <Button
                    size="sm"
                    variant={sentimentFilter === 'neutral' ? 'default' : 'ghost'}
                    className="h-7 text-xs font-semibold px-2.5 text-amber-700 hover:text-amber-800"
                    onClick={() => setSentimentFilter('neutral')}
                  >
                    Neutral 3★ ({feedbackLog.filter((f) => f.stars === 3).length})
                  </Button>
                  <Button
                    size="sm"
                    variant={sentimentFilter === 'critical' ? 'default' : 'ghost'}
                    className="h-7 text-xs font-semibold px-2.5 text-red-700 hover:text-red-800"
                    onClick={() => setSentimentFilter('critical')}
                  >
                    Critical 1-2★ ({feedbackLog.filter((f) => f.stars <= 2).length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700">Ticket</TableHead>
                        <TableHead className="font-bold text-slate-700">Branch</TableHead>
                        <TableHead className="font-bold text-slate-700">Submitted By</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Rating</TableHead>
                        <TableHead className="font-bold text-slate-700">Comment / Feedback</TableHead>
                        <TableHead className="font-bold text-slate-700 text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const filteredList = feedbackLog.filter((fb) => {
                          if (sentimentFilter === 'positive') return fb.stars >= 4;
                          if (sentimentFilter === 'neutral') return fb.stars === 3;
                          if (sentimentFilter === 'critical') return fb.stars <= 2;
                          return true;
                        });

                        if (filteredList.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={6} className="h-28 text-center text-slate-400 italic">
                                No ratings matching the selected sentiment filter.
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return filteredList.map((fb) => (
                          <TableRow key={fb.id} className="hover:bg-slate-50">
                            <TableCell className="font-semibold text-xs">#{fb.ticket_id} - {fb.ticket_title}</TableCell>
                            <TableCell className="font-medium text-xs">{fb.branch_name}</TableCell>
                            <TableCell className="text-xs text-slate-600">{fb.user_name}</TableCell>
                            <TableCell className="text-center">
                              <span className="font-bold text-amber-600 inline-flex items-center gap-0.5 text-xs">
                                {fb.stars} <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-slate-700 max-w-xs italic">
                              "{fb.comment || 'No comment provided'}"
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-500">
                              {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : '—'}
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function round(val: number, decimals: number): number {
  return Number(Math.round(Number(val + 'e' + decimals)) + 'e-' + decimals);
}

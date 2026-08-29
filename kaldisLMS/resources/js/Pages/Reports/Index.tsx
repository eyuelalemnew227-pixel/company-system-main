import * as React from 'react'
import axios from 'axios'
import { Head } from '@inertiajs/react'
import {
  BarChart3, Award, BookOpen, Users, ScrollText, ClipboardCheck,
  ShieldCheck, UserCog, Download, FileSpreadsheet, FileText, Play, X,
  type LucideIcon,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import AppLayout from '@/Layouts/AppLayout'
import { ModuleHeader, EmptyState, LoadingState, StatCard } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table'
import { Badge } from '@/Components/ui/badge'
import { useI18n } from '@/Components/i18n-provider'
import type { StringKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { downloadCSV, downloadExcel, printReport } from '@/lib/reportExport'

const COFFEE = ['#7a4a26', '#c08a3e', '#5a3618', '#9b6633']

type Row = Record<string, any>

interface FilterOption { id: string; name?: string; title?: string }
interface FilterData {
  branches: FilterOption[]
  courses: FilterOption[]
  categories: { id: string; name: string; slug: string }[]
  quizzes: FilterOption[]
  sops: FilterOption[]
  users: FilterOption[]
}

interface FilterDef {
  name: string
  label: string
  type: 'select' | 'date' | 'text' | 'number'
  options?: (data: FilterData) => { value: string; label: string }[]
}

interface ColumnDef {
  key: string
  label: string
  format?: (row: Row) => React.ReactNode
  align?: 'left' | 'right'
}

interface KpiDef {
  label: string
  icon: LucideIcon
  compute: (rows: Row[]) => string | number
  color?: 'primary' | 'amber' | 'green' | 'red' | 'blue'
}

interface ChartDef {
  type: 'bar' | 'line' | 'pie'
  xKey: string
  yKey: string
  topN?: number
}

interface ReportDef {
  key: string
  labelKey: StringKey
  descKey: StringKey
  icon: LucideIcon
  filters: FilterDef[]
  columns: ColumnDef[]
  kpis: KpiDef[]
  chart?: ChartDef
}

function fmtDate(v: string | null | undefined): string {
  return v ? new Date(v).toLocaleDateString() : '—'
}

function avg(nums: number[]): number {
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : 0
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    valid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    expired: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    revoked: 'bg-muted text-muted-foreground border-border',
  }
  return <Badge variant="outline" className={cn('capitalize text-[10px]', map[status])}>{status}</Badge>
}

const REPORTS: ReportDef[] = [
  {
    key: 'certificates',
    labelKey: 'reports.certificates',
    descKey: 'reports.certificatesDesc',
    icon: Award,
    filters: [
      { name: 'status', label: 'Status', type: 'select', options: () => [
        { value: 'valid', label: 'Valid' }, { value: 'expired', label: 'Expired' }, { value: 'revoked', label: 'Revoked' },
      ] },
      { name: 'expiry_from', label: 'Expiry From', type: 'date' },
      { name: 'expiry_to', label: 'Expiry To', type: 'date' },
    ],
    columns: [
      { key: 'number', label: 'Number' },
      { key: 'employeeName', label: 'Employee' },
      { key: 'courseTitle', label: 'Course' },
      { key: 'issueDate', label: 'Issued', format: (r) => fmtDate(r.issueDate) },
      { key: 'expiryDate', label: 'Expires', format: (r) => fmtDate(r.expiryDate) },
      { key: 'status', label: 'Status', format: (r) => statusBadge(r.status) },
    ],
    kpis: [
      { label: 'Total', icon: Award, compute: (rows) => rows.length },
      { label: 'Valid', icon: ShieldCheck, compute: (rows) => rows.filter((r) => r.status === 'valid').length, color: 'green' },
      { label: 'Expired', icon: BarChart3, compute: (rows) => rows.filter((r) => r.status === 'expired').length, color: 'red' },
      { label: 'Revoked', icon: X, compute: (rows) => rows.filter((r) => r.status === 'revoked').length, color: 'amber' },
    ],
    chart: { type: 'pie', xKey: 'status', yKey: 'count' },
  },
  {
    key: 'course-completion',
    labelKey: 'reports.courseCompletion',
    descKey: 'reports.courseCompletionDesc',
    icon: BookOpen,
    filters: [
      { name: 'course_id', label: 'Course', type: 'select', options: (d) => d.courses.map((c) => ({ value: c.id, label: c.title! })) },
      { name: 'category_slug', label: 'Category', type: 'select', options: (d) => d.categories.map((c) => ({ value: c.slug, label: c.name })) },
    ],
    columns: [
      { key: 'title', label: 'Course' },
      { key: 'category', label: 'Category' },
      { key: 'enrolled', label: 'Enrolled', align: 'right' },
      { key: 'completed', label: 'Completed', align: 'right' },
      { key: 'completionRate', label: 'Rate', align: 'right', format: (r) => `${r.completionRate}%` },
      { key: 'avgScore', label: 'Avg Score', align: 'right', format: (r) => r.avgScore ?? '—' },
    ],
    kpis: [
      { label: 'Courses', icon: BookOpen, compute: (rows) => rows.length },
      { label: 'Avg Completion', icon: ShieldCheck, compute: (rows) => `${avg(rows.map((r) => r.completionRate))}%`, color: 'green' },
      { label: 'Total Enrolled', icon: Users, compute: (rows) => rows.reduce((a, r) => a + r.enrolled, 0), color: 'blue' },
      { label: 'Total Completed', icon: Award, compute: (rows) => rows.reduce((a, r) => a + r.completed, 0), color: 'amber' },
    ],
    chart: { type: 'bar', xKey: 'title', yKey: 'completionRate', topN: 10 },
  },
  {
    key: 'employee-learning',
    labelKey: 'reports.employeeLearning',
    descKey: 'reports.employeeLearningDesc',
    icon: Users,
    filters: [
      { name: 'branch_id', label: 'Branch', type: 'select', options: (d) => d.branches.map((b) => ({ value: b.id, label: b.name! })) },
      { name: 'from_date', label: 'From', type: 'date' },
      { name: 'to_date', label: 'To', type: 'date' },
    ],
    columns: [
      { key: 'name', label: 'Employee' },
      { key: 'branchName', label: 'Branch' },
      { key: 'departmentName', label: 'Department' },
      { key: 'coursesEnrolled', label: 'Enrolled', align: 'right' },
      { key: 'coursesCompleted', label: 'Completed', align: 'right' },
      { key: 'avgProgress', label: 'Avg Progress', align: 'right', format: (r) => `${r.avgProgress}%` },
      { key: 'totalPoints', label: 'Points', align: 'right' },
    ],
    kpis: [
      { label: 'Employees', icon: Users, compute: (rows) => rows.length },
      { label: 'Avg Progress', icon: ShieldCheck, compute: (rows) => `${avg(rows.map((r) => r.avgProgress))}%`, color: 'green' },
      { label: 'Total Completed', icon: Award, compute: (rows) => rows.reduce((a, r) => a + r.coursesCompleted, 0), color: 'amber' },
      { label: 'Total Points', icon: BarChart3, compute: (rows) => rows.reduce((a, r) => a + r.totalPoints, 0), color: 'blue' },
    ],
    chart: { type: 'bar', xKey: 'name', yKey: 'avgProgress', topN: 10 },
  },
  {
    key: 'login-audit',
    labelKey: 'reports.loginAudit',
    descKey: 'reports.loginAuditDesc',
    icon: ScrollText,
    filters: [
      { name: 'user_id', label: 'User', type: 'select', options: (d) => d.users.map((u) => ({ value: u.id, label: u.name! })) },
      { name: 'action', label: 'Action', type: 'text' },
      { name: 'from_date', label: 'From', type: 'date' },
      { name: 'to_date', label: 'To', type: 'date' },
    ],
    columns: [
      { key: 'createdAt', label: 'When', format: (r) => new Date(r.createdAt).toLocaleString() },
      { key: 'userName', label: 'User' },
      { key: 'action', label: 'Action' },
      { key: 'module', label: 'Module' },
      { key: 'ipAddress', label: 'IP' },
    ],
    kpis: [
      { label: 'Entries', icon: ScrollText, compute: (rows) => rows.length },
      { label: 'Unique Users', icon: Users, compute: (rows) => new Set(rows.map((r) => r.userId)).size, color: 'blue' },
      { label: 'Unique Actions', icon: BarChart3, compute: (rows) => new Set(rows.map((r) => r.action)).size, color: 'amber' },
      { label: 'Modules', icon: ShieldCheck, compute: (rows) => new Set(rows.map((r) => r.module)).size, color: 'green' },
    ],
  },
  {
    key: 'quiz-performance',
    labelKey: 'reports.quizPerformance',
    descKey: 'reports.quizPerformanceDesc',
    icon: ClipboardCheck,
    filters: [
      { name: 'quiz_id', label: 'Quiz', type: 'select', options: (d) => d.quizzes.map((q) => ({ value: q.id, label: q.title! })) },
      { name: 'min_score', label: 'Min Score', type: 'number' },
      { name: 'max_score', label: 'Max Score', type: 'number' },
    ],
    columns: [
      { key: 'name', label: 'Employee' },
      { key: 'quizTitle', label: 'Quiz' },
      { key: 'attempts', label: 'Attempts', align: 'right' },
      { key: 'bestScore', label: 'Best Score', align: 'right' },
      { key: 'passed', label: 'Passed', format: (r) => (r.passed ? <Badge className="bg-emerald-600">Yes</Badge> : <Badge variant="outline">No</Badge>) },
      { key: 'lastAttempt', label: 'Last Attempt', format: (r) => fmtDate(r.lastAttempt) },
    ],
    kpis: [
      { label: 'Rows', icon: ClipboardCheck, compute: (rows) => rows.length },
      { label: 'Pass Rate', icon: ShieldCheck, compute: (rows) => `${rows.length ? Math.round((rows.filter((r) => r.passed).length / rows.length) * 100) : 0}%`, color: 'green' },
      { label: 'Avg Best Score', icon: BarChart3, compute: (rows) => avg(rows.map((r) => r.bestScore)), color: 'amber' },
      { label: 'Quizzes', icon: BookOpen, compute: (rows) => new Set(rows.map((r) => r.quizTitle)).size, color: 'blue' },
    ],
    chart: { type: 'bar', xKey: 'name', yKey: 'bestScore', topN: 10 },
  },
  {
    key: 'sop-compliance',
    labelKey: 'reports.sopCompliance',
    descKey: 'reports.sopComplianceDesc',
    icon: ShieldCheck,
    filters: [
      { name: 'sop_id', label: 'SOP', type: 'select', options: (d) => d.sops.map((s) => ({ value: s.id, label: s.title! })) },
      { name: 'branch_id', label: 'Branch', type: 'select', options: (d) => d.branches.map((b) => ({ value: b.id, label: b.name! })) },
    ],
    columns: [
      { key: 'title', label: 'SOP' },
      { key: 'version', label: 'Version' },
      { key: 'totalEmployees', label: 'Employees', align: 'right' },
      { key: 'acknowledgedCount', label: 'Acknowledged', align: 'right' },
      { key: 'complianceRate', label: 'Rate', align: 'right', format: (r) => `${r.complianceRate}%` },
    ],
    kpis: [
      { label: 'SOPs', icon: ShieldCheck, compute: (rows) => rows.length },
      { label: 'Avg Compliance', icon: BarChart3, compute: (rows) => `${avg(rows.map((r) => r.complianceRate))}%`, color: 'green' },
      { label: 'Acknowledged', icon: Award, compute: (rows) => rows.reduce((a, r) => a + r.acknowledgedCount, 0), color: 'amber' },
      { label: 'Employees', icon: Users, compute: (rows) => rows[0]?.totalEmployees ?? 0, color: 'blue' },
    ],
    chart: { type: 'bar', xKey: 'title', yKey: 'complianceRate', topN: 10 },
  },
  {
    key: 'trainer-activity',
    labelKey: 'reports.trainerActivity',
    descKey: 'reports.trainerActivityDesc',
    icon: UserCog,
    filters: [
      { name: 'trainer_id', label: 'Trainer', type: 'select', options: (d) => d.users.map((u) => ({ value: u.id, label: u.name! })) },
      { name: 'from_date', label: 'From', type: 'date' },
      { name: 'to_date', label: 'To', type: 'date' },
    ],
    columns: [
      { key: 'name', label: 'Trainer' },
      { key: 'coursesCreated', label: 'Courses', align: 'right' },
      { key: 'lessonsCreated', label: 'Lessons', align: 'right' },
      { key: 'quizzesCreated', label: 'Quizzes', align: 'right' },
      { key: 'assignmentsGraded', label: 'Graded', align: 'right' },
    ],
    kpis: [
      { label: 'Trainers', icon: UserCog, compute: (rows) => rows.length },
      { label: 'Courses Created', icon: BookOpen, compute: (rows) => rows.reduce((a, r) => a + r.coursesCreated, 0), color: 'amber' },
      { label: 'Quizzes Created', icon: ClipboardCheck, compute: (rows) => rows.reduce((a, r) => a + r.quizzesCreated, 0), color: 'blue' },
      { label: 'Assignments Graded', icon: ShieldCheck, compute: (rows) => rows.reduce((a, r) => a + r.assignmentsGraded, 0), color: 'green' },
    ],
    chart: { type: 'bar', xKey: 'name', yKey: 'coursesCreated', topN: 10 },
  },
]

export default function ReportsIndex({ canExport, filterData }: { canExport: boolean; filterData: FilterData }) {
  const { t } = useI18n()
  const [activeKey, setActiveKey] = React.useState(REPORTS[0].key)
  const [filters, setFilters] = React.useState<Record<string, string>>({})
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(false)

  const active = REPORTS.find((r) => r.key === activeKey)!

  const runReport = React.useCallback((key: string, activeFilters: Record<string, string>) => {
    setLoading(true)
    const params: Record<string, string> = {}
    Object.entries(activeFilters).forEach(([k, v]) => { if (v) params[k] = v })
    axios.get(`/reports/${key}/data`, { params })
      .then((res) => setRows(res.data.rows))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    setFilters({})
    runReport(activeKey, {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  function updateFilter(name: string, value: string) {
    setFilters((f) => ({ ...f, [name]: value }))
  }

  function clearFilters() {
    setFilters({})
    runReport(activeKey, {})
  }

  function tableRows(): (string | number)[][] {
    return rows.map((r) => active.columns.map((c) => {
      const v = c.key.toLowerCase().includes('date') || c.key === 'createdAt' || c.key === 'lastAttempt'
        ? fmtDate(r[c.key])
        : r[c.key]
      return typeof v === 'boolean' ? (v ? 'Yes' : 'No') : (v ?? '')
    }))
  }

  function exportCsv() {
    downloadCSV(`${active.key}.csv`, active.columns.map((c) => c.label), tableRows())
  }
  function exportExcel() {
    downloadExcel(`${active.key}.xls`, active.columns.map((c) => c.label), tableRows())
  }
  function exportPdf() {
    const subtitle = Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'All records'
    printReport(t(active.labelKey), subtitle, active.columns.map((c) => c.label), tableRows())
  }

  const chartData = React.useMemo(() => {
    if (!active.chart) return []
    if (active.chart.type === 'pie') {
      const counts: Record<string, number> = {}
      rows.forEach((r) => { counts[r[active.chart!.xKey]] = (counts[r[active.chart!.xKey]] ?? 0) + 1 })
      return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }
    return rows.slice(0, active.chart.topN ?? rows.length).map((r) => ({
      [active.chart!.xKey]: String(r[active.chart!.xKey]).slice(0, 18),
      [active.chart!.yKey]: r[active.chart!.yKey] ?? 0,
    }))
  }, [rows, active])

  return (
    <AppLayout>
      <Head title={t('reports.title')} />
      <ModuleHeader title={t('reports.title')} description={t('reports.subtitle')} icon={BarChart3} />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
        <div className="space-y-1">
          {REPORTS.map((r) => {
            const Icon = r.icon
            return (
              <button
                key={r.key}
                onClick={() => setActiveKey(r.key)}
                className={cn(
                  'w-full flex items-start gap-2.5 rounded-md px-3 py-2.5 text-left text-sm transition-colors border',
                  activeKey === r.key
                    ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                    : 'border-transparent hover:bg-muted text-foreground'
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <span className="block">{t(r.labelKey)}</span>
                  <span className="block text-xs text-muted-foreground font-normal">{t(r.descKey)}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="space-y-5 min-w-0">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-semibold flex items-center gap-2">
                  <active.icon className="h-4 w-4" /> {t(active.labelKey)}
                </h2>
                {canExport && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
                      <Download className="h-3.5 w-3.5" /> {t('reports.exportCsv')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportExcel} disabled={rows.length === 0}>
                      <FileSpreadsheet className="h-3.5 w-3.5" /> {t('reports.exportExcel')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportPdf} disabled={rows.length === 0}>
                      <FileText className="h-3.5 w-3.5" /> {t('reports.exportPdf')}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-3">
                {active.filters.map((f) => (
                  <div key={f.name} className="w-40">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    {f.type === 'select' ? (
                      <Select value={filters[f.name] ?? ''} onValueChange={(v) => updateFilter(f.name, v)}>
                        <SelectTrigger className="w-full mt-1"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          {f.options!(filterData).map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={f.type}
                        value={filters[f.name] ?? ''}
                        onChange={(e) => updateFilter(f.name, e.target.value)}
                        className="mt-1"
                      />
                    )}
                  </div>
                ))}
                <Button size="sm" onClick={() => runReport(activeKey, filters)}>
                  <Play className="h-3.5 w-3.5" /> {t('reports.runReport')}
                </Button>
                <Button size="sm" variant="ghost" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" /> {t('reports.clearFilters')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <LoadingState />
          ) : rows.length === 0 ? (
            <Card><CardContent className="py-10"><EmptyState icon={active.icon} title={t('common.noData')} /></CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {active.kpis.map((k) => (
                  <StatCard key={k.label} label={k.label} value={k.compute(rows)} icon={k.icon} color={k.color} />
                ))}
              </div>

              {active.chart && (
                <Card>
                  <CardContent className="p-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      {active.chart.type === 'pie' ? (
                        <PieChart>
                          <Tooltip />
                          <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90} label>
                            {chartData.map((_, i) => <Cell key={i} fill={COFFEE[i % COFFEE.length]} />)}
                          </Pie>
                        </PieChart>
                      ) : active.chart.type === 'line' ? (
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey={active.chart.xKey} tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Line type="monotone" dataKey={active.chart.yKey} stroke={COFFEE[0]} strokeWidth={2} dot={false} />
                        </LineChart>
                      ) : (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey={active.chart.xKey} tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey={active.chart.yKey} fill={COFFEE[0]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {active.columns.map((c) => (
                          <TableHead key={c.key} className={c.align === 'right' ? 'text-right' : undefined}>{c.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i}>
                          {active.columns.map((c) => (
                            <TableCell key={c.key} className={c.align === 'right' ? 'text-right' : undefined}>
                              {c.format ? c.format(r) : (r[c.key] ?? '—')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

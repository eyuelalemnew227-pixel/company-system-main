import { Head, Link, usePage } from '@inertiajs/react'
import {
  LayoutDashboard, Users, BookOpen, Building2, Award, ShieldCheck,
  Flame, GraduationCap, Trophy, Clock, AlertTriangle, Timer,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts'
import AppLayout from '@/Layouts/AppLayout'
import { ModuleHeader, StatCard, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Progress } from '@/Components/ui/progress'
import { Badge } from '@/Components/ui/badge'
import { useI18n } from '@/Components/i18n-provider'
import type { PageProps } from '@/types'

const COFFEE = { primary: '#7a4a26', amber: '#c08a3e', dark: '#5a3618', medium: '#9b6633' }

interface AdminDashboardData {
  type: 'admin'
  kpis: { employees: number; courses: number; branches: number; certs: number; complianceRate: number }
  enrollmentTrend: { label: string; count: number }[]
  branchComparison: { name: string; employees: number; enrollments: number; completed: number }[]
  deptHeatmap: { name: string; total: number; done: number; rate: number }[]
  certTrend: { label: string; count: number }[]
  alerts: {
    overdue: { id: string; employee: string; course: string; deadline: string | null }[]
    expiringCerts: { id: string; employee: string; course: string; expiry: string | null; number: string }[]
  }
}

interface EmployeeDashboardData {
  type: 'employee'
  kpis: { streak: number; longestStreak?: number; courses: number; completed?: number; certs: number; points: number }
  continueLearning: { id: string; courseId: string; title: string; progress: number; thumbnail: string | null; lessonsCount: number; deadline: string | null }[]
  deadlines: { id: string; course: string; deadline: string }[]
  badges: { id: string; name: string; icon: string | null; description: string; earnedAt: string }[]
  rank: number | null
  totalRank?: number
}

type DashboardData = AdminDashboardData | EmployeeDashboardData

export default function Dashboard(props: DashboardData) {
  const { t } = useI18n()
  const { auth } = usePage<PageProps>().props

  return (
    <AppLayout>
      <Head title={t('nav.dashboard')} />

      <ModuleHeader
        title={`${t('dash.welcome')}, ${auth.user?.name}`}
        description={auth.user?.role_name}
        icon={LayoutDashboard}
      />

      {props.type === 'admin' ? <AdminDashboard {...props} /> : <EmployeeDashboard {...props} />}
    </AppLayout>
  )
}

function AdminDashboard({ kpis, enrollmentTrend, branchComparison, deptHeatmap, certTrend, alerts }: AdminDashboardData) {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label={t('dash.totalEmployees')} value={kpis.employees} icon={Users} color="primary" />
        <StatCard label={t('dash.activeCourses')} value={kpis.courses} icon={BookOpen} color="amber" />
        <StatCard label={t('dash.branches')} value={kpis.branches} icon={Building2} color="blue" />
        <StatCard label={t('dash.certificatesIssued')} value={kpis.certs} icon={Award} color="green" />
        <StatCard label={t('dash.complianceRate')} value={`${kpis.complianceRate}%`} icon={ShieldCheck} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('dash.enrollmentTrend')}</CardTitle></CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollmentTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke={COFFEE.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t('dash.certIssuance')}</CardTitle></CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={certTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={COFFEE.amber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t('dash.branchComparison')}</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchComparison} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="enrollments" stackId="a" fill={COFFEE.medium} radius={[0, 0, 0, 0]} />
                <Bar dataKey="completed" stackId="b" fill={COFFEE.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t('dash.completionHeatmap')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {deptHeatmap.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : deptHeatmap.map((d) => (
              <div key={d.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium truncate">{d.name}</span>
                  <span className="text-muted-foreground">{d.done}/{d.total} ({d.rate}%)</span>
                </div>
                <Progress value={d.rate} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> {t('dash.overdueAssignments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : (
              <div className="space-y-2">
                {alerts.overdue.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <div className="font-medium">{a.employee}</div>
                      <div className="text-xs text-muted-foreground">{a.course}</div>
                    </div>
                    <Badge variant="destructive">{a.deadline ? new Date(a.deadline).toLocaleDateString() : '—'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="h-4 w-4 text-amber-500" /> {t('dash.expiringCerts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.expiringCerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : (
              <div className="space-y-2">
                {alerts.expiringCerts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <div className="font-medium">{c.employee}</div>
                      <div className="text-xs text-muted-foreground">{c.course} · {c.number}</div>
                    </div>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                      {c.expiry ? new Date(c.expiry).toLocaleDateString() : '—'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmployeeDashboard({ kpis, continueLearning, deadlines, badges, rank, totalRank }: EmployeeDashboardData) {
  const { t } = useI18n()
  const streakData = [{ name: 'streak', value: kpis.streak, fill: COFFEE.primary }]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('dash.streak')} value={kpis.streak} icon={Flame} color="amber" />
        <StatCard label={t('course.enrolled')} value={kpis.courses} icon={GraduationCap} color="primary" />
        <StatCard label={t('nav.certificates')} value={kpis.certs} icon={Award} color="green" />
        <StatCard label={t('common.points')} value={kpis.points} icon={Trophy} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('dash.streak')}</CardTitle></CardHeader>
          <CardContent className="h-48 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={streakData} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, Math.max(kpis.longestStreak ?? kpis.streak, kpis.streak, 1)]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground -mt-6">
              {kpis.streak} / {kpis.longestStreak ?? kpis.streak} {t('dash.streak').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t('dash.yourRank')}</CardTitle></CardHeader>
          <CardContent className="h-48 flex flex-col items-center justify-center gap-1">
            <div className="text-4xl font-bold text-primary">{rank ? `#${rank}` : '—'}</div>
            {totalRank ? <p className="text-xs text-muted-foreground">{t('common.rank')} / {totalRank}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t('dash.recentBadges')}</CardTitle></CardHeader>
          <CardContent className="h-48">
            {badges.length === 0 ? (
              <EmptyState icon={Award} title={t('common.noData')} />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {badges.map((b) => (
                  <div key={b.id} className="flex flex-col items-center text-center gap-1" title={b.description}>
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-lg">
                      {b.icon || '🏅'}
                    </div>
                    <span className="text-[11px] leading-tight line-clamp-2">{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">{t('dash.continueLearning')}</CardTitle></CardHeader>
        <CardContent>
          {continueLearning.length === 0 ? (
            <EmptyState icon={BookOpen} title={t('common.noData')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {continueLearning.map((c) => (
                <Link key={c.id} href={`/courses/${c.courseId}`} className="rounded-lg border p-3 hover:shadow-md transition-shadow block">
                  <div className="font-medium text-sm line-clamp-2 mb-2">{c.title}</div>
                  <Progress value={c.progress} className="mb-1" />
                  <div className="text-xs text-muted-foreground">{c.progress}% · {c.lessonsCount} {t('course.lessons')}</div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" /> {t('dash.upcomingDeadlines')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deadlines.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
          ) : (
            <div className="space-y-2">
              {deadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <span className="font-medium">{d.course}</span>
                  <Badge variant="outline">{new Date(d.deadline).toLocaleDateString()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

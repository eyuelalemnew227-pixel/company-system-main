import * as React from 'react'
import { Head, router } from '@inertiajs/react'
import {
  Trophy, Crown, Medal, Zap, ChevronLeft, ChevronRight,
  Building2, Users,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { Badge as UiBadge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { cn } from '@/lib/utils'

interface Entry {
  rank: number; employeeId: string; name: string; firstName: string; lastName: string
  branchName: string; departmentName: string; points: number; isCurrentUser: boolean
}
type Scope = 'company' | 'branch' | 'department'
type Period = 'alltime' | 'monthly'

function monthLabel(ym: string) {
  const [yy, mm] = ym.split('-').map(Number)
  return new Date(yy, mm - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' })
}
function currentYM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function prevYM(ym: string) {
  const [yy, mm] = ym.split('-').map(Number)
  const d = new Date(yy, mm - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?'
}

export default function LeaderboardIndex({
  entries, scope, scopeLabel, period, month,
}: {
  entries: Entry[]
  scope: Scope
  scopeLabel: string
  period: Period
  month: string | null
}) {
  const { t } = useI18n()
  const currentMonth = month || currentYM()

  function navigate(overrides: Partial<{ scope: Scope; period: Period; month: string }>) {
    const next = { scope, period, month: currentMonth, ...overrides }
    if (next.scope === 'company') next.period = 'alltime'
    else if (next.period === 'alltime' && overrides.scope) next.period = 'monthly'
    const query: Record<string, string> = { scope: next.scope, period: next.period }
    if (next.period === 'monthly') query.month = next.month
    router.get('/leaderboard', query, { preserveState: true })
  }

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)
  const me = entries.find((e) => e.isCurrentUser) ?? null
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as Entry[]
  const canShowMonthly = scope !== 'company' || period === 'monthly'

  return (
    <AppLayout>
      <Head title={t('nav.leaderboard')} />
      <div>
        <ModuleHeader
          title={t('nav.leaderboard')}
          description={t('leaderboard.subtitle')}
          icon={Trophy}
          actions={canShowMonthly ? (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navigate({ month: prevYM(currentMonth) })} aria-label={t('leaderboard.prevMonth')}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium px-2 min-w-[120px] text-center">{monthLabel(currentMonth)}</span>
              <Button variant="outline" size="icon" onClick={() => navigate({ month: currentYM() })} disabled={currentMonth === currentYM()} aria-label={t('leaderboard.nextMonth')}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          ) : undefined}
        />

        <Tabs value={scope} onValueChange={(v) => navigate({ scope: v as Scope })} className="mb-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-grid">
            <TabsTrigger value="company"><Building2 className="h-3.5 w-3.5" /> {t('leaderboard.company')}</TabsTrigger>
            <TabsTrigger value="branch"><Users className="h-3.5 w-3.5" /> {t('leaderboard.myBranch')}</TabsTrigger>
            <TabsTrigger value="department"><Users className="h-3.5 w-3.5" /> {t('leaderboard.myDept')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {scope !== 'company' && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground">{t('leaderboard.periodLabel')}</span>
            <Select value={period} onValueChange={(v) => navigate({ period: v as Period })}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t('leaderboard.monthly')}</SelectItem>
                <SelectItem value="alltime">{t('leaderboard.allTime')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {scope === 'company' && <p className="text-xs text-muted-foreground mb-4">{t('leaderboard.companyStandingsNote')}</p>}

        {entries.length === 0 ? (
          <EmptyState icon={Trophy} title={t('leaderboard.noneYet')} description={t('leaderboard.noneDesc')} />
        ) : (
          <div className="space-y-6">
            {top3.length > 0 && (
              <Card className="overflow-hidden">
                <CardContent className="pt-6 pb-2">
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-2xl mx-auto">
                    {podiumOrder.map((e) => {
                      const isFirst = e.rank === 1
                      const isSecond = e.rank === 2
                      const height = isFirst ? 'h-36 sm:h-44' : isSecond ? 'h-28 sm:h-36' : 'h-24 sm:h-32'
                      const metalBg = isFirst ? 'from-amber-400/20 to-amber-500/5 border-amber-500/40' : isSecond ? 'from-slate-300/20 to-slate-400/5 border-slate-400/40' : 'from-orange-700/20 to-orange-800/5 border-orange-700/40'
                      const metalText = isFirst ? 'text-amber-600 dark:text-amber-400' : isSecond ? 'text-slate-500 dark:text-slate-300' : 'text-orange-700 dark:text-orange-500'
                      const MetalIcon = isFirst ? Crown : Medal
                      return (
                        <div key={e.employeeId} className="flex flex-col items-center">
                          <div className="relative mb-2">
                            {isFirst && <Crown className={cn('h-5 w-5 mb-1 mx-auto', metalText)} />}
                            <div className={cn('h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold border-2', isFirst ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300' : isSecond ? 'bg-slate-400/15 border-slate-400 text-slate-600 dark:text-slate-300' : 'bg-orange-700/15 border-orange-700 text-orange-800 dark:text-orange-400', e.isCurrentUser && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}>
                              {initials(e.firstName, e.lastName)}
                            </div>
                            <div className={cn('absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow', isFirst ? 'bg-amber-500' : isSecond ? 'bg-slate-500' : 'bg-orange-700')}>{e.rank}</div>
                          </div>
                          <div className="text-center mb-2 px-1">
                            <div className="text-xs sm:text-sm font-semibold truncate max-w-[100px]">{e.firstName} {e.lastName}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">{e.branchName}</div>
                            <div className={cn('text-xs font-bold mt-0.5 flex items-center justify-center gap-0.5', metalText)}><Zap className="h-3 w-3" /> {e.points.toLocaleString()}</div>
                          </div>
                          <div className={cn('w-full rounded-t-lg bg-gradient-to-b border-t-2 flex items-start justify-center pt-2', height, metalBg)}>
                            <MetalIcon className={cn('h-5 w-5 mt-1', metalText)} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {me && (
              <Card className="border-primary/40 bg-primary/5">
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">#{me.rank}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold flex items-center gap-1">{t('leaderboard.youPrefix')} {me.firstName} {me.lastName}<UiBadge variant="secondary" className="text-[10px]">{t('leaderboard.you')}</UiBadge></div>
                    <div className="text-xs text-muted-foreground">{me.branchName} · {me.departmentName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold flex items-center justify-end gap-1 text-amber-600 dark:text-amber-400"><Zap className="h-3.5 w-3.5" /> {me.points.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">{t('leaderboard.yourPosition')}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {rest.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="px-4 py-3 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                    <span>{t('leaderboard.rankingsPrefix')} {scopeLabel}</span>
                    <span>{period === 'monthly' ? monthLabel(currentMonth) : t('leaderboard.allTimeShort')}</span>
                  </div>
                  <div className="divide-y">
                    {rest.map((e) => (
                      <div key={e.employeeId} className={cn('flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors', e.isCurrentUser && 'bg-primary/5')}>
                        <div className="w-8 text-center text-sm font-bold text-muted-foreground">{e.rank}</div>
                        <div className={cn('h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0', e.isCurrentUser ? 'bg-primary/20 text-primary ring-2 ring-primary/30' : 'bg-muted text-foreground')}>{initials(e.firstName, e.lastName)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-1">{e.firstName} {e.lastName}{e.isCurrentUser && <UiBadge variant="outline" className="text-[9px] border-primary text-primary px-1 py-0">{t('leaderboard.you').toUpperCase()}</UiBadge>}</div>
                          <div className="text-xs text-muted-foreground truncate">{e.branchName} · {e.departmentName}</div>
                        </div>
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 min-w-[70px] justify-end"><Zap className="h-3 w-3" />{e.points.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Crown className="h-3 w-3 text-amber-500" /> {t('leaderboard.firstPlace')}</span>
              <span className="flex items-center gap-1"><Medal className="h-3 w-3 text-slate-500" /> {t('leaderboard.secondPlace')}</span>
              <span className="flex items-center gap-1"><Medal className="h-3 w-3 text-orange-700" /> {t('leaderboard.thirdPlace')}</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" /> {t('leaderboard.pointsEarned')}</span>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

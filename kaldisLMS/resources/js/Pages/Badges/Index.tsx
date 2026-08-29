import * as React from 'react'
import { Head, router } from '@inertiajs/react'
import {
  Award, Plus, Lock, CheckCircle2, Sparkles, Zap,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState, StatCard } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { Badge as UiBadge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Progress } from '@/Components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/Components/ui/dialog'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { useForm } from '@inertiajs/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BadgeItem {
  id: string; name: string; description: string; icon: string
  criteriaType: string; criteriaValue: number; points: number
  earned: boolean; earnedAt: string | null
  progress: { current: number; target: number } | null; progressHint: string
}

const CRITERIA_TYPES = [
  { value: 'first_course', labelKey: 'badge.criteriaFirstCourse' },
  { value: 'courses_count', labelKey: 'badge.criteriaCoursesCount' },
  { value: 'streak', labelKey: 'badge.criteriaStreak' },
  { value: 'score', labelKey: 'badge.criteriaScore' },
  { value: 'branch_rank', labelKey: 'badge.criteriaBranchRank' },
  { value: 'sop_complete', labelKey: 'badge.criteriaSopComplete' },
] as const

type Filter = 'all' | 'earned' | 'locked'

export default function BadgesIndex({ badges, canManage }: { badges: BadgeItem[]; canManage: boolean }) {
  const { t } = useI18n()
  const [filter, setFilter] = React.useState<Filter>('all')
  const [manageOpen, setManageOpen] = React.useState(false)

  const earned = badges.filter((b) => b.earned)
  const locked = badges.filter((b) => !b.earned)
  const visible = filter === 'all' ? badges : filter === 'earned' ? earned : locked
  const totalPoints = earned.reduce((sum, b) => sum + b.points, 0)

  return (
    <AppLayout>
      <Head title={t('nav.badges')} />
      <div>
        <ModuleHeader
          title={t('nav.badges')}
          description={t('badge.subtitle')}
          icon={Award}
          actions={canManage ? <Button onClick={() => setManageOpen(true)}><Plus className="h-4 w-4 mr-1" /> {t('badge.newBadge')}</Button> : undefined}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <StatCard label={t('badge.totalBadges')} value={badges.length} icon={Award} color="primary" />
          <StatCard label={t('badge.earned')} value={earned.length} icon={CheckCircle2} color="green" />
          <StatCard label={t('badge.pointsFromBadges')} value={totalPoints} icon={Zap} color="amber" />
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">{t('common.all')} ({badges.length})</TabsTrigger>
            <TabsTrigger value="earned">{t('badge.earned')} ({earned.length})</TabsTrigger>
            <TabsTrigger value="locked">{t('badge.locked')} ({locked.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {visible.length === 0 ? (
          <EmptyState
            icon={Award}
            title={filter === 'earned' ? t('badge.noneEarnedYet') : filter === 'locked' ? t('badge.allEarned') : t('badge.none')}
            description={filter === 'earned' ? t('badge.noneEarnedDesc') : filter === 'locked' ? t('badge.allEarnedDesc') : t('badge.noneDefinedDesc')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((b) => <BadgeCard key={b.id} badge={b} />)}
          </div>
        )}

        {canManage && <ManageBadgeDialog open={manageOpen} onOpenChange={setManageOpen} />}
      </div>
    </AppLayout>
  )
}

function BadgeCard({ badge }: { badge: BadgeItem }) {
  const { t } = useI18n()
  const pct = badge.progress ? Math.min(100, Math.round((badge.progress.current / Math.max(badge.progress.target, 1)) * 100)) : badge.earned ? 100 : 0

  return (
    <Card className={cn('relative overflow-hidden transition-all', badge.earned ? 'border-amber-500/40 shadow-[0_0_25px_-5px_rgba(245,158,11,0.35)] hover:shadow-[0_0_30px_-3px_rgba(245,158,11,0.45)]' : 'opacity-80 hover:opacity-100')}>
      {badge.earned && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" /> {t('badge.earnedTag')}</div>}
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn('h-16 w-16 rounded-xl flex items-center justify-center text-4xl shrink-0', badge.earned ? 'bg-gradient-to-br from-amber-400/30 to-amber-600/10' : 'bg-muted grayscale opacity-60')}>{badge.icon || '🏅'}</div>
          <div className="flex-1 min-w-0">
            <h3 className={cn('font-semibold leading-tight', badge.earned && 'text-amber-700 dark:text-amber-300')}>{badge.name}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <UiBadge variant="secondary" className="text-[10px] gap-0.5"><Zap className="h-2.5 w-2.5" /> {badge.points} {t('badge.pts')}</UiBadge>
              {badge.earned && badge.earnedAt && <UiBadge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />{new Date(badge.earnedAt).toLocaleDateString()}</UiBadge>}
              {!badge.earned && <UiBadge variant="outline" className="text-[10px] text-muted-foreground"><Lock className="h-2.5 w-2.5 mr-0.5" /> {t('badge.lockedTag')}</UiBadge>}
            </div>
          </div>
        </div>
        <div className="mt-4">
          {badge.earned ? (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {t('badge.criteriaMet')}</div>
          ) : badge.progress ? (
            <div>
              <div className="flex justify-between text-[11px] mb-1"><span className="text-muted-foreground">{badge.progressHint || t('badge.progressDefault')}</span><span className="font-medium">{pct}%</span></div>
              <Progress value={pct} className="h-1.5" />
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground italic">{t('badge.keepLearning')}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ManageBadgeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n()
  const { data, setData, post, processing, reset } = useForm({
    name: '', description: '', icon: '🏅', criteria_type: 'courses_count', criteria_value: '1', points: '10',
  })

  React.useEffect(() => { if (open) reset() }, [open])

  function handleSave() {
    if (!data.name.trim() || !data.description.trim()) { toast.error(t('badge.nameDescRequired')); return }
    post('/badges', {
      onSuccess: () => onOpenChange(false),
      onError: () => toast.error(t('badge.couldNotCreate')),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('badge.createBadgeTitle')}</DialogTitle>
          <DialogDescription>{t('badge.createBadgeDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <Label htmlFor="b-name">{t('role.name')}</Label>
              <Input id="b-name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="e.g. Latte Art Pro" />
            </div>
            <div>
              <Label htmlFor="b-icon">{t('badge.iconField')}</Label>
              <Input id="b-icon" value={data.icon} onChange={(e) => setData('icon', e.target.value)} maxLength={4} className="text-center text-xl" />
            </div>
          </div>
          <div>
            <Label htmlFor="b-desc">{t('role.description')}</Label>
            <Textarea id="b-desc" value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder={t('badge.descPlaceholder')} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('badge.criteriaType')}</Label>
              <Select value={data.criteria_type} onValueChange={(v) => setData('criteria_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CRITERIA_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="b-val">{t('badge.criteriaValue')}</Label>
              <Input id="b-val" type="number" min={0} value={data.criteria_value} onChange={(e) => setData('criteria_value', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="b-pts">{t('badge.pointsAwarded')}</Label>
            <Input id="b-pts" type="number" min={0} value={data.points} onChange={(e) => setData('points', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
          <Button onClick={handleSave} disabled={processing}>{processing && <span className="mr-1 h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}{t('badge.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

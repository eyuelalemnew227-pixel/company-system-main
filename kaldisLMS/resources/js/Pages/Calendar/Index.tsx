import * as React from 'react'
import { Head, router } from '@inertiajs/react'
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, MapPin, Clock, User,
  Coffee, Video, ClipboardCheck, Users2, Calendar as CalIcon,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Badge as UiBadge } from '@/Components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/Components/ui/dialog'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { useForm } from '@inertiajs/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CalEvent {
  id: string; title: string; type: string; location: string | null
  startDatetime: string; endDatetime: string | null; status: string
  organizerName: string; branchName: string; branchId: string | null
}
interface BranchOption { id: string; name: string }
type EventType = 'training' | 'webinar' | 'exam' | 'meeting'

const TYPE_META: Record<EventType, { dot: string; chip: string; icon: React.ComponentType<{ className?: string }>; labelKey: 'calendar.typeTraining' | 'calendar.typeWebinar' | 'calendar.typeExam' | 'calendar.typeMeeting' }> = {
  training: { dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300/40', icon: Coffee, labelKey: 'calendar.typeTraining' },
  webinar: { dot: 'bg-yellow-500', chip: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200 border-yellow-300/40', icon: Video, labelKey: 'calendar.typeWebinar' },
  exam: { dot: 'bg-red-500', chip: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-300/40', icon: ClipboardCheck, labelKey: 'calendar.typeExam' },
  meeting: { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-300/40', icon: Users2, labelKey: 'calendar.typeMeeting' },
}
function getMeta(type: string) { return TYPE_META[type as EventType] ?? TYPE_META.training }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) }

export default function CalendarIndex({ events, month, canManage, branches }: { events: CalEvent[]; month: string; canManage: boolean; branches: BranchOption[] }) {
  const { t } = useI18n()
  const [yy, mm0] = month.split('-').map(Number)
  const viewYear = yy
  const viewMonth = mm0 - 1
  const today = new Date()

  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const [detailEvent, setDetailEvent] = React.useState<CalEvent | null>(null)
  const [addOpen, setAddOpen] = React.useState(false)

  function goToMonth(y: number, m: number) {
    router.get('/calendar', { month: `${y}-${String(m + 1).padStart(2, '0')}` }, { preserveState: true })
  }
  function prevMonth() { viewMonth === 0 ? goToMonth(viewYear - 1, 11) : goToMonth(viewYear, viewMonth - 1) }
  function nextMonth() { viewMonth === 11 ? goToMonth(viewYear + 1, 0) : goToMonth(viewYear, viewMonth + 1) }
  function goToday() {
    goToMonth(today.getFullYear(), today.getMonth())
    setSelectedDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
  }

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const e of events) {
      const d = new Date(e.startDatetime)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  }, [events])

  const grid = React.useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const startDay = first.getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: { date: Date | null; key: string }[] = []
    for (let i = 0; i < startDay; i++) cells.push({ date: null, key: `pre-${i}` })
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(viewYear, viewMonth, d), key: `${viewYear}-${viewMonth}-${d}` })
    while (cells.length % 7 !== 0) cells.push({ date: null, key: `post-${cells.length}` })
    while (cells.length < 42) cells.push({ date: null, key: `post-${cells.length}` })
    return cells
  }, [viewYear, viewMonth])

  const monthLabelStr = new Date(viewYear, viewMonth, 1).toLocaleString('en', { month: 'long', year: 'numeric' })
  const selectedDayEvents = selectedDate ? (byDay.get(selectedDate) ?? []) : []

  return (
    <AppLayout>
      <Head title={t('calendar.trainingCalendar')} />
      <div>
        <ModuleHeader
          title={t('calendar.trainingCalendar')}
          description={t('calendar.subtitle')}
          icon={CalIcon}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToday}><CalendarDays className="h-4 w-4 mr-1" /> {t('calendar.today')}</Button>
              {canManage && <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> {t('calendar.addEvent')}</Button>}
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
          {Object.entries(TYPE_META).map(([k, m]) => (
            <span key={k} className="inline-flex items-center gap-1"><span className={cn('h-2.5 w-2.5 rounded-full', m.dot)} /><span className="text-muted-foreground">{t(m.labelKey)}</span></span>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base sm:text-lg font-semibold">{monthLabelStr}</h2>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={prevMonth} aria-label={t('calendar.prevMonth')}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={nextMonth} aria-label={t('calendar.nextMonth')}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {(['calendar.sun', 'calendar.mon', 'calendar.tue', 'calendar.wed', 'calendar.thu', 'calendar.fri', 'calendar.sat'] as const).map((d) => <div key={d} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground uppercase py-1">{t(d)}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {grid.map((cell) => {
                  if (!cell.date) return <div key={cell.key} className="min-h-[68px] sm:min-h-[96px] rounded-md bg-muted/30" />
                  const d = cell.date
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                  const dayEvents = byDay.get(key) ?? []
                  const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
                  const isSelected = selectedDate === key
                  return (
                    <button
                      key={cell.key}
                      onClick={() => setSelectedDate(key)}
                      className={cn('min-h-[68px] sm:min-h-[96px] rounded-md border text-left p-1 sm:p-1.5 transition-colors flex flex-col gap-0.5', 'hover:border-primary/40 hover:bg-accent/30', isSelected ? 'border-primary bg-primary/5' : 'border-border', isToday && !isSelected && 'border-amber-500/60 bg-amber-500/5')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[11px] sm:text-xs font-medium', isToday ? 'h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center' : 'text-foreground')}>{d.getDate()}</span>
                        {dayEvents.length > 0 && <span className="text-[9px] text-muted-foreground hidden sm:inline">{dayEvents.length}</span>}
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                        {dayEvents.slice(0, 3).map((e) => {
                          const m = getMeta(e.type)
                          const Icon = m.icon
                          return <div key={e.id} className={cn('text-[9px] sm:text-[10px] truncate px-1 py-0.5 rounded border flex items-center gap-1', m.chip)}><Icon className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{e.title}</span></div>
                        })}
                        {dayEvents.length > 3 && <span className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 3} {t('calendar.moreSuffix')}</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{selectedDate ? new Date(selectedDate).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : t('calendar.selectDate')}</h3>
                {selectedDate && <UiBadge variant="secondary" className="text-[10px]">{selectedDayEvents.length} {selectedDayEvents.length === 1 ? t('calendar.eventSingular') : t('calendar.eventPlural')}</UiBadge>}
              </div>

              {!selectedDate ? (
                <EmptyState icon={CalendarDays} title={t('calendar.noDateSelected')} description={t('calendar.noDateDesc')} />
              ) : selectedDayEvents.length === 0 ? (
                <EmptyState icon={CalendarDays} title={t('calendar.noEvents')} description={t('calendar.noEventsDesc')} />
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {selectedDayEvents.map((e) => {
                    const m = getMeta(e.type)
                    const Icon = m.icon
                    return (
                      <button key={e.id} onClick={() => setDetailEvent(e)} className="w-full text-left p-2.5 rounded-md border hover:border-primary/40 hover:bg-accent/30 transition-colors">
                        <div className="flex items-start gap-2">
                          <div className={cn('h-8 w-8 rounded-md flex items-center justify-center shrink-0 border', m.chip)}><Icon className="h-4 w-4" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{e.title}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> {fmtTime(e.startDatetime)}</div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <EventDetailDialog event={detailEvent} onClose={() => setDetailEvent(null)} />
        {canManage && <AddEventDialog open={addOpen} onOpenChange={setAddOpen} defaultDate={selectedDate} branches={branches} />}
      </div>
    </AppLayout>
  )
}

function EventDetailDialog({ event, onClose }: { event: CalEvent | null; onClose: () => void }) {
  const { t } = useI18n()
  if (!event) return null
  const m = getMeta(event.type)
  const Icon = m.icon
  return (
    <Dialog open={!!event} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={cn('h-9 w-9 rounded-md flex items-center justify-center border', m.chip)}><Icon className="h-4 w-4" /></span>
            <span>{event.title}</span>
          </DialogTitle>
          <DialogDescription>{t('calendar.eventDetails')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <UiBadge variant="outline" className={cn('capitalize', m.chip)}>{t(m.labelKey)}</UiBadge>
            <UiBadge variant="secondary" className="text-[10px] capitalize">{event.status}</UiBadge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <div>{fmtDate(event.startDatetime)} · {fmtTime(event.startDatetime)}</div>
                {event.endDatetime && <div className="text-xs text-muted-foreground">{t('calendar.endsPrefix')} {fmtDate(event.endDatetime)} · {fmtTime(event.endDatetime)}</div>}
              </div>
            </div>
            {event.location && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{event.location}</span></div>}
            <div className="flex items-start gap-2"><User className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{t('calendar.organizerPrefix')} {event.organizerName}</span></div>
            <div className="flex items-start gap-2"><Users2 className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{t('calendar.branchPrefix')} {event.branchName}</span></div>
          </div>
        </div>
        <DialogFooter><DialogClose asChild><Button>{t('calendar.close')}</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddEventDialog({ open, onOpenChange, defaultDate, branches }: { open: boolean; onOpenChange: (v: boolean) => void; defaultDate: string | null; branches: BranchOption[] }) {
  const { t } = useI18n()
  const { data, setData, post, processing, reset } = useForm({
    title: '', type: 'training' as EventType, location: '', start_datetime: '', end_datetime: '', branch_id: '',
  })

  React.useEffect(() => {
    if (!open) return
    reset()
    const base = defaultDate ? new Date(`${defaultDate}T10:00`) : new Date()
    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    setData((d) => ({ ...d, start_datetime: fmt(base), end_datetime: fmt(new Date(base.getTime() + 60 * 60 * 1000)) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate])

  function handleSave() {
    if (!data.title.trim() || !data.start_datetime) { toast.error(t('calendar.titleStartRequired')); return }
    post('/calendar', {
      onSuccess: () => onOpenChange(false),
      onError: () => toast.error(t('calendar.couldNotCreateEvent')),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('calendar.addEventDialogTitle')}</DialogTitle>
          <DialogDescription>{t('calendar.addEventDialogDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="ev-title">{t('forum.titleLabel')}</Label><Input id="ev-title" value={data.title} onChange={(e) => setData('title', e.target.value)} placeholder="e.g. Latte Art Workshop" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('calendar.typeField')}</Label>
              <Select value={data.type} onValueChange={(v) => setData('type', v as EventType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">{t('calendar.typeTraining')}</SelectItem>
                  <SelectItem value="webinar">{t('calendar.typeWebinar')}</SelectItem>
                  <SelectItem value="exam">{t('calendar.typeExam')}</SelectItem>
                  <SelectItem value="meeting">{t('calendar.typeMeeting')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('user.branch')}</Label>
              <Select value={data.branch_id || 'none'} onValueChange={(v) => setData('branch_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder={t('user.allBranches')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('user.allBranches')}</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label htmlFor="ev-loc">{t('calendar.locationField')}</Label><Input id="ev-loc" value={data.location} onChange={(e) => setData('location', e.target.value)} placeholder="e.g. Bole HQ Training Room" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="ev-start">{t('calendar.startField')}</Label><Input id="ev-start" type="datetime-local" value={data.start_datetime} onChange={(e) => setData('start_datetime', e.target.value)} /></div>
            <div><Label htmlFor="ev-end">{t('calendar.endField')}</Label><Input id="ev-end" type="datetime-local" value={data.end_datetime} onChange={(e) => setData('end_datetime', e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
          <Button onClick={handleSave} disabled={processing}>{processing ? t('user.saving') : t('calendar.createEvent')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

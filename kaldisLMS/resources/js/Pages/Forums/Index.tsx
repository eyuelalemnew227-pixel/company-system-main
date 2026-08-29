import * as React from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import { MessageSquare, MessageCircle, Lock, ChevronRight, MessagesSquare, Plus } from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/Components/ui/dialog'
import { toast } from 'sonner'

interface ForumItem { id: string; title: string; isLocked: boolean; course: { id: string; title: string }; threadCount: number; lastActivity: string }
interface CourseOption { id: string; title: string }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function ForumsIndex({ forums, canPost, courses }: { forums: ForumItem[]; canPost: boolean; courses: CourseOption[] }) {
  const { t } = useI18n()
  const [newOpen, setNewOpen] = React.useState(false)

  return (
    <AppLayout>
      <Head title={t('nav.forums')} />
      <div>
        <ModuleHeader
          title={t('nav.forums')}
          description={t('forum.subtitle')}
          icon={MessagesSquare}
          actions={canPost ? <Button size="sm" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" /> {t('forum.newDiscussion')}</Button> : undefined}
        />
        {forums.length === 0 ? (
          <EmptyState icon={MessageSquare} title={t('forum.noneYet')} description={t('forum.noneDesc')} action={canPost ? <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" /> {t('forum.startDiscussion')}</Button> : undefined} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {forums.map((f) => (
              <Link key={f.id} href={`/forums/${f.id}/threads`}>
                <Card className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl shrink-0">☕</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{f.course.title}</h3>
                        {f.isLocked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{f.title}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {f.threadCount} {f.threadCount === 1 ? t('forum.threadSingular') : t('forum.threadPlural')}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {t('forum.lastPrefix')} {timeAgo(f.lastActivity)}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {newOpen && <NewDiscussionDialog courses={courses} onClose={() => setNewOpen(false)} />}
      </div>
    </AppLayout>
  )
}

function NewDiscussionDialog({ courses, onClose }: { courses: CourseOption[]; onClose: () => void }) {
  const { t } = useI18n()
  const { data, setData, post, processing } = useForm({ course_id: '', title: '', body: '' })

  function handleSubmit() {
    if (!data.course_id) { toast.error(t('forum.selectCourseRequired')); return }
    if (!data.title.trim() || !data.body.trim()) { toast.error(t('forum.titleMessageRequired')); return }
    post('/forums', { onError: () => toast.error(t('forum.couldNotStart')) })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('forum.newDiscussionDialogTitle')}</DialogTitle>
          <DialogDescription>{t('forum.newDiscussionDialogDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t('cert.course')}</Label>
            <Select value={data.course_id} onValueChange={(v) => setData('course_id', v)}>
              <SelectTrigger><SelectValue placeholder={t('forum.selectCoursePlaceholder')} /></SelectTrigger>
              <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="nd-title">{t('forum.threadTitleLabel')}</Label>
            <Input id="nd-title" value={data.title} onChange={(e) => setData('title', e.target.value)} placeholder={t('forum.questionPlaceholder')} />
          </div>
          <div>
            <Label htmlFor="nd-body">{t('forum.messageLabel')}</Label>
            <Textarea id="nd-body" value={data.body} onChange={(e) => setData('body', e.target.value)} rows={4} placeholder={t('forum.detailsPlaceholder')} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
          <Button onClick={handleSubmit} disabled={processing}>{processing ? t('forum.posting') : t('forum.startDiscussionBtn')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

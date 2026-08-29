import * as React from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import { MessageSquare, MessageCircle, Pin, Eye, Plus, ArrowLeft, ChevronRight } from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Avatar, AvatarFallback } from '@/Components/ui/avatar'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/Components/ui/dialog'
import { toast } from 'sonner'

interface ThreadItem { id: string; title: string; isPinned: boolean; views: number; createdAt: string; authorName: string; postCount: number; lastPostAt: string; lastPostAuthor: string }
interface ForumInfo { id: string; title: string; isLocked: boolean; course: { id: string; title: string } }

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
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

export default function ForumThreads({ forum, threads, canPost }: { forum: ForumInfo; threads: ThreadItem[]; canPost: boolean }) {
  const { t } = useI18n()
  const [newOpen, setNewOpen] = React.useState(false)

  return (
    <AppLayout>
      <Head title={forum.title} />
      <div>
        <ModuleHeader
          title={forum.title}
          description={forum.course.title}
          icon={MessageSquare}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild><Link href="/forums"><ArrowLeft className="h-4 w-4 mr-1" /> {t('nav.forums')}</Link></Button>
              {canPost && <Button size="sm" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" /> {t('forum.newThread')}</Button>}
            </div>
          }
        />
        {threads.length === 0 ? (
          <EmptyState icon={MessageCircle} title={t('forum.noThreadsYet')} description={t('forum.noThreadsDesc')} action={canPost ? <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" /> {t('forum.startThread')}</Button> : undefined} />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {threads.map((th) => (
                  <Link key={th.id} href={`/forums/thread/${th.id}`} className="w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0"><AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(th.authorName)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {th.isPinned && <Pin className="h-3 w-3 text-amber-600 shrink-0" />}
                        <h4 className="text-sm font-medium truncate">{th.title}</h4>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5"><span>{t('forum.byPrefix')} {th.authorName}</span><span>·</span><span>{timeAgo(th.createdAt)}</span></div>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1" title={t('forum.repliesTitle')}><MessageCircle className="h-3 w-3" /> {th.postCount}</span>
                      <span className="flex items-center gap-1" title={t('forum.viewsTitle')}><Eye className="h-3 w-3" /> {th.views}</span>
                    </div>
                    <div className="hidden md:block text-[11px] text-muted-foreground text-right shrink-0 min-w-[110px]"><div>{t('forum.lastReply')}</div><div className="font-medium text-foreground/80">{timeAgo(th.lastPostAt)}</div></div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {newOpen && <NewThreadDialog forumId={forum.id} onClose={() => setNewOpen(false)} />}
      </div>
    </AppLayout>
  )
}

function NewThreadDialog({ forumId, onClose }: { forumId: string; onClose: () => void }) {
  const { t } = useI18n()
  const { data, setData, post, processing } = useForm({ title: '', body: '' })

  function handleSubmit() {
    if (!data.title.trim() || !data.body.trim()) { toast.error(t('forum.titleBodyRequired')); return }
    post(`/forums/${forumId}/threads`, { onError: () => toast.error(t('forum.couldNotCreateThread')) })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('forum.newThreadDialogTitle')}</DialogTitle>
          <DialogDescription>{t('forum.newThreadDialogDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="th-title">{t('forum.titleLabel')}</Label><Input id="th-title" value={data.title} onChange={(e) => setData('title', e.target.value)} placeholder={t('forum.questionPlaceholder')} /></div>
          <div><Label htmlFor="th-body">{t('forum.messageLabel')}</Label><Textarea id="th-body" value={data.body} onChange={(e) => setData('body', e.target.value)} rows={4} placeholder={t('forum.detailsPlaceholder')} /></div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
          <Button onClick={handleSubmit} disabled={processing}>{processing ? t('forum.posting') : t('forum.createThreadBtn')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import * as React from 'react'
import { Head, Link, router, useForm, usePage } from '@inertiajs/react'
import axios from 'axios'
import { MessageCircle, Pin, Eye, ArrowLeft, Reply, CheckCircle2, Send } from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Badge as UiBadge } from '@/Components/ui/badge'
import { Avatar, AvatarFallback } from '@/Components/ui/avatar'
import { Textarea } from '@/Components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { PageProps } from '@/types'

interface PostItem { id: string; body: string; parentId: string | null; isSolution: boolean; createdAt: string; authorName: string; userId: string }
interface ThreadDetail {
  id: string; title: string; isPinned: boolean; views: number; createdAt: string; authorName: string; userId: string
  forum: { id: string; title: string; isLocked: boolean; course: { id: string; title: string } }
  posts: PostItem[]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
function fmtDateTime(iso: string) { return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

interface PostNode_ { post: PostItem; children: PostNode_[] }
function buildPostTree(posts: PostItem[]): PostNode_[] {
  const map = new Map<string, PostNode_>()
  for (const p of posts) map.set(p.id, { post: p, children: [] })
  const roots: PostNode_[] = []
  for (const p of posts) {
    const node = map.get(p.id)!
    if (p.parentId && map.has(p.parentId)) map.get(p.parentId)!.children.push(node)
    else roots.push(node)
  }
  return roots
}

export default function ForumThreadShow({ thread, canPost, canMarkSolution }: { thread: ThreadDetail; canPost: boolean; canMarkSolution: boolean }) {
  const { t } = useI18n()
  const { auth } = usePage<PageProps>().props
  const tree = React.useMemo(() => buildPostTree(thread.posts), [thread.posts])
  const [replyTo, setReplyTo] = React.useState<string | null>(null)
  const { data, setData, post, processing, reset } = useForm({ body: '', parent_id: '' })

  function handleSubmit() {
    if (!data.body.trim()) return
    post(`/forums/thread/${thread.id}`, {
      onSuccess: () => { reset(); setReplyTo(null) },
      onError: () => toast.error(t('forum.couldNotPostReply')),
    })
  }

  async function markSolution(postId: string, isSolution: boolean) {
    try {
      await axios.patch(`/forums/thread/${thread.id}/posts/${postId}/solution`, { is_solution: !isSolution })
      router.reload()
    } catch {
      toast.error(t('forum.couldNotUpdateSolution'))
    }
  }

  return (
    <AppLayout>
      <Head title={thread.title} />
      <div>
        <ModuleHeader
          title={thread.title}
          description={`${t('forum.inPrefix')} ${thread.forum.course.title}`}
          icon={MessageCircle}
          actions={<Button variant="outline" size="sm" asChild><Link href={`/forums/${thread.forum.id}/threads`}><ArrowLeft className="h-4 w-4 mr-1" /> {t('forum.backToThreads')}</Link></Button>}
        />

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                {thread.isPinned && <UiBadge variant="secondary" className="text-[10px] gap-0.5"><Pin className="h-2.5 w-2.5" /> {t('forum.pinned')}</UiBadge>}
                <UiBadge variant="outline" className="text-[10px]">{thread.forum.course.title}</UiBadge>
                <UiBadge variant="outline" className="text-[10px] flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> {thread.views} {t('forum.viewsSuffix')}</UiBadge>
                <UiBadge variant="outline" className="text-[10px] flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" /> {thread.posts.length} {thread.posts.length === 1 ? t('forum.postSingular') : t('forum.postPlural')}</UiBadge>
                <span className="text-[11px] text-muted-foreground ml-auto">{t('forum.startedByPrefix')} {thread.authorName} · {fmtDateTime(thread.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {tree.length === 0 ? (
            <EmptyState icon={MessageCircle} title={t('forum.noPostsTitle')} description={t('forum.noPostsDesc')} />
          ) : (
            <div className="space-y-3">
              {tree.map((node) => (
                <PostNodeView
                  key={node.post.id}
                  node={node}
                  depth={0}
                  canPost={canPost}
                  canMarkSolution={canMarkSolution}
                  currentUserId={auth.user?.id ?? null}
                  isOriginalPoster={node.post.userId === thread.userId}
                  onReply={(postId) => setReplyTo(postId)}
                  onMarkSolution={markSolution}
                />
              ))}
            </div>
          )}

          {canPost ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Reply className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">{replyTo ? t('forum.replyToPost') : t('forum.postAReply')}</h4>
                  {replyTo && <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => setReplyTo(null)}>{t('forum.cancelReply')}</Button>}
                </div>
                <Textarea value={data.body} onChange={(e) => setData('body', e.target.value)} placeholder={t('forum.shareThoughts')} rows={4} className="resize-none" />
                <div className="flex justify-end mt-2">
                  <Button onClick={() => { setData('parent_id', replyTo || ''); handleSubmit() }} disabled={processing || !data.body.trim()}>
                    {processing ? <span className="mr-1 h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                    {t('forum.postReplyBtn')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">{t('forum.noPermissionToPost')}</CardContent></Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

function PostNodeView({
  node, depth, canPost, canMarkSolution, currentUserId, isOriginalPoster, onReply, onMarkSolution,
}: {
  node: PostNode_
  depth: number
  canPost: boolean
  canMarkSolution: boolean
  currentUserId: string | null
  isOriginalPoster: boolean
  onReply: (postId: string) => void
  onMarkSolution: (postId: string, isSolution: boolean) => void
}) {
  const { t } = useI18n()
  const { post } = node
  const isMine = currentUserId === post.userId
  return (
    <div className={cn(depth > 0 && 'ml-4 sm:ml-6 border-l-2 border-border pl-3 sm:pl-4')}>
      <div className={cn('rounded-lg border p-3', post.isSolution ? 'border-emerald-500/40 bg-emerald-500/5' : depth === 0 ? 'bg-card' : 'bg-accent/20')}>
        <div className="flex items-start gap-2.5">
          <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[11px] bg-primary/10 text-primary">{initials(post.authorName)}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{post.authorName}</span>
              {isOriginalPoster && <UiBadge variant="secondary" className="text-[9px] px-1 py-0">{t('forum.opBadge')}</UiBadge>}
              {isMine && <UiBadge variant="outline" className="text-[9px] px-1 py-0">{t('forum.youBadge')}</UiBadge>}
              {post.isSolution && <UiBadge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 gap-0.5"><CheckCircle2 className="h-2.5 w-2.5" /> {t('forum.solutionBadge')}</UiBadge>}
              <span className="text-[11px] text-muted-foreground ml-auto">{fmtDateTime(post.createdAt)}</span>
            </div>
            <div className="text-sm mt-1.5 whitespace-pre-wrap break-words">{post.body}</div>
            <div className="flex items-center gap-2 mt-2">
              {canPost && <Button variant="ghost" size="sm" className="h-6 text-[11px] text-muted-foreground" onClick={() => onReply(post.id)}><Reply className="h-3 w-3 mr-0.5" /> {t('forum.replyBtn')}</Button>}
              {canMarkSolution && !post.isSolution && depth > 0 && <Button variant="ghost" size="sm" className="h-6 text-[11px] text-emerald-700 dark:text-emerald-300 hover:text-emerald-800" onClick={() => onMarkSolution(post.id, false)}><CheckCircle2 className="h-3 w-3 mr-0.5" /> {t('forum.markAsSolution')}</Button>}
              {canMarkSolution && post.isSolution && <Button variant="ghost" size="sm" className="h-6 text-[11px] text-muted-foreground" onClick={() => onMarkSolution(post.id, true)}>{t('forum.unmark')}</Button>}
            </div>
          </div>
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <PostNodeView key={child.post.id} node={child} depth={depth + 1} canPost={canPost} canMarkSolution={canMarkSolution} currentUserId={currentUserId} isOriginalPoster={false} onReply={onReply} onMarkSolution={onMarkSolution} />
          ))}
        </div>
      )}
    </div>
  )
}

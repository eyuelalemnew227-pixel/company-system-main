import * as React from 'react'
import { Head, Link, router } from '@inertiajs/react'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, PlayCircle, FileText, FileType,
  Headphones, Image as ImageIcon, Presentation, Clock, ListChecks, Award,
  ExternalLink, Loader2, BookOpen, Zap, ChevronLeft,
} from 'lucide-react'
import axios from 'axios'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Progress } from '@/Components/ui/progress'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface LessonData {
  id: string
  courseId: string
  title: string
  type: string
  content: string
  filePath: string | null
  durationMinutes: number
  siblings: Array<{ id: string; title: string; type: string; durationMinutes: number; isCompleted: boolean }>
  course: { id: string; title: string }
}
interface CompleteResponse {
  progress: number
  completedLessons: number
  totalLessons: number
  courseCompleted: boolean
  pointsAwarded: number
  nextLessonId: string | null
}

const LESSON_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: PlayCircle, text: FileText, pdf: FileType, audio: Headphones, gallery: ImageIcon, ppt: Presentation,
}

function toEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1` : null
}

export default function LessonShow({ lesson, enrollmentId }: { lesson: LessonData; enrollmentId: string | null }) {
  const { t } = useI18n()
  const [completing, setCompleting] = React.useState(false)

  const completedLessons = lesson.siblings.filter((s) => s.isCompleted).length
  const totalLessons = lesson.siblings.length
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const currentIsCompleted = lesson.siblings.find((s) => s.id === lesson.id)?.isCompleted || false
  const idx = lesson.siblings.findIndex((s) => s.id === lesson.id)
  const prevLesson = idx > 0 ? lesson.siblings[idx - 1] : null
  const nextLesson = idx >= 0 && idx < lesson.siblings.length - 1 ? lesson.siblings[idx + 1] : null

  async function handleMarkComplete() {
    if (!enrollmentId) return
    setCompleting(true)
    try {
      const { data } = await axios.post<CompleteResponse>(`/lessons/${lesson.id}/complete`, { enrollment_id: enrollmentId })
      if (data.pointsAwarded > 0) {
        toast.success(t('lesson.lessonCompleteToast').replace('{points}', String(data.pointsAwarded)), { icon: <Zap className="h-4 w-4 text-amber-500" /> })
      } else {
        toast.success(t('lesson.markedComplete'))
      }
      if (data.courseCompleted) toast.success(t('lesson.courseCompleteToast'), { duration: 5000 })

      setTimeout(() => {
        if (data.nextLessonId) router.visit(`/lessons/${data.nextLessonId}`)
        else router.visit(`/courses/${lesson.courseId}`)
      }, 800)
    } catch {
      toast.error(t('lesson.couldNotSaveProgress'))
    } finally {
      setCompleting(false)
    }
  }

  return (
    <AppLayout>
      <Head title={lesson.title} />
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground w-fit">
            <Link href={`/courses/${lesson.courseId}`}><ChevronLeft className="h-4 w-4" /><BookOpen className="h-3.5 w-3.5" />{lesson.course.title}</Link>
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <ListChecks className="h-3.5 w-3.5 text-primary" />{completedLessons}/{totalLessons} {t('course.lessons')}
            </div>
            <div className="w-32 sm:w-48"><Progress value={progressPercent} className="h-1.5" /></div>
            <span className="text-xs font-medium text-primary shrink-0">{progressPercent}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{t('lesson.lessonPrefix')} {idx + 1} {t('quiz.of')} {lesson.siblings.length}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{lesson.type}</Badge>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.durationMinutes}m</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{lesson.title}</h1>
                  </div>
                  {currentIsCompleted && <Badge className="bg-emerald-600 text-white border-emerald-600"><CheckCircle2 className="h-3 w-3" /> {t('lesson.done')}</Badge>}
                </div>
                <LessonContent lesson={lesson} />
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <Button variant="outline" asChild={!!prevLesson} disabled={!prevLesson} className="w-full sm:w-auto">
                {prevLesson ? <Link href={`/lessons/${prevLesson.id}`}><ArrowLeft className="h-4 w-4" /> {t('quiz.previous')}</Link> : <span><ArrowLeft className="h-4 w-4" /> {t('quiz.previous')}</span>}
              </Button>

              {enrollmentId ? (
                <Button onClick={handleMarkComplete} disabled={completing || currentIsCompleted} className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto">
                  {completing ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('user.saving')}</> : currentIsCompleted ? <><CheckCircle2 className="h-4 w-4" /> {t('lesson.completed')}</> : <><CheckCircle2 className="h-4 w-4" /> {t('lesson.markCompleteContinue')}<ArrowRight className="h-4 w-4" /></>}
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground text-center sm:text-right">{t('lesson.enrollToTrack')}</div>
              )}

              <Button variant="outline" asChild={!!nextLesson} disabled={!nextLesson} className="w-full sm:w-auto">
                {nextLesson ? <Link href={`/lessons/${nextLesson.id}`}>{t('quiz.next')} <ArrowRight className="h-4 w-4" /></Link> : <span>{t('quiz.next')} <ArrowRight className="h-4 w-4" /></span>}
              </Button>
            </div>
          </div>

          <Card className="lg:sticky lg:top-4 h-fit">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />{t('lesson.courseOutline')}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ol className="max-h-[60vh] overflow-y-auto divide-y">
                {lesson.siblings.map((s, i) => {
                  const Icon = LESSON_ICONS[s.type] || FileText
                  const isCurrent = s.id === lesson.id
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/lessons/${s.id}`}
                        className={cn('w-full flex items-start gap-2.5 p-3 text-left transition-colors', isCurrent ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-accent border-l-2 border-transparent')}
                      >
                        <div className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5', s.isCompleted ? 'bg-emerald-500/15 text-emerald-600' : isCurrent ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                          {s.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
                            {isCurrent && <Badge className="text-[9px] h-4 px-1.5 bg-primary text-primary-foreground">{t('lesson.now')}</Badge>}
                          </div>
                          <p className={cn('text-xs font-medium leading-snug line-clamp-2', isCurrent ? 'text-primary' : 'text-foreground')}>{s.title}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5"><Clock className="h-2.5 w-2.5" />{s.durationMinutes}m</div>
                        </div>
                        {!s.isCompleted && !isCurrent && <Circle className="h-3 w-3 text-muted-foreground/50 shrink-0 mt-1" />}
                      </Link>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        </div>

        {progressPercent === 100 && (
          <Card className="bg-amber-500/5 border-amber-500/30">
            <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="h-14 w-14 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0"><Award className="h-7 w-7 text-amber-600" /></div>
              <div className="flex-1">
                <h3 className="font-bold">{t('lesson.courseCompleteTitle')}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{t('lesson.courseCompleteDesc').replace('{title}', lesson.course.title)}</p>
              </div>
              <Button asChild className="bg-amber-600 hover:bg-amber-700 shrink-0"><Link href="/certificates"><Award className="h-4 w-4" /> {t('lesson.viewCertificate')}</Link></Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

function LessonContent({ lesson }: { lesson: LessonData }) {
  const { t } = useI18n()
  if (lesson.type === 'video') {
    const embedUrl = toEmbedUrl(lesson.content)
    if (!embedUrl) {
      return (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6 text-center">
          <PlayCircle className="h-10 w-10 text-amber-600 mx-auto mb-2" />
          <p className="font-medium">{t('lesson.videoUnavailable')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('lesson.noYoutubeUrl')}</p>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black shadow-lg">
          <iframe src={embedUrl} title={lesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 w-full h-full" />
        </div>
      </div>
    )
  }
  if (lesson.type === 'text') {
    return <div className="whitespace-pre-wrap text-sm leading-relaxed">{lesson.content || t('lesson.noContentText')}</div>
  }
  const url = lesson.filePath || lesson.content
  if (lesson.type === 'pdf') {
    if (!url) return <NoFileState type={t('lesson.pdfType')} />
    return (
      <div className="space-y-3">
        <div className="rounded-lg border bg-muted/30 p-6 text-center">
          <FileType className="h-12 w-12 text-primary mx-auto mb-3" />
          <p className="font-medium">{lesson.title}</p>
          <Button asChild className="mt-4"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> {t('lesson.openPdf')}</a></Button>
        </div>
      </div>
    )
  }
  if (lesson.type === 'audio') {
    if (!url) return <NoFileState type={t('lesson.audioType')} />
    return <audio controls src={url} className="w-full">{t('lesson.audioNotSupported')}</audio>
  }
  if (lesson.type === 'gallery') {
    if (!url) return <NoFileState type={t('lesson.galleryType')} />
    return <img src={url} alt={lesson.title} className="w-full h-auto rounded-lg border" />
  }
  if (lesson.type === 'ppt') {
    if (!url) return <NoFileState type={t('lesson.presentationType')} />
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center">
        <Presentation className="h-12 w-12 text-primary mx-auto mb-3" />
        <p className="font-medium">{lesson.title}</p>
        <Button asChild className="mt-4"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> {t('lesson.openSlides')}</a></Button>
      </div>
    )
  }
  return <div className="whitespace-pre-wrap text-sm leading-relaxed">{lesson.content || t('lesson.noContentGeneric')}</div>
}

function NoFileState({ type }: { type: string }) {
  const { t } = useI18n()
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6 text-center">
      <FileText className="h-10 w-10 text-amber-600 mx-auto mb-2" />
      <p className="font-medium">{t('lesson.noFileAttached').replace('{type}', type)}</p>
    </div>
  )
}

import * as React from 'react'
import { Head, Link, router } from '@inertiajs/react'
import {
  ArrowLeft, BookOpen, Clock, BarChart3, User as UserIcon, CheckCircle2,
  PlayCircle, FileText, FileType, Headphones, Image as ImageIcon, Presentation,
  Award, Calendar, Sparkles, GraduationCap, ListChecks, Pencil,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { EmptyState } from '@/Components/lms/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Progress } from '@/Components/ui/progress'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CourseDetail {
  id: string
  title: string
  description: string
  thumbnail: string | null
  durationHours: number
  difficulty: string
  passingScore: number
  isFeatured: boolean
  isMandatory: boolean
  enrollmentType: string
  maxAttempts: number
  deadlineDays: number
  status: string
  category: { id: string; name: string; icon: string | null } | null
  instructor: { id: string; name: string; email: string } | null
  hasCertificate: boolean
  lessons: Array<{ id: string; title: string; type: string; durationMinutes: number }>
  quizzes: Array<{ id: string; title: string; timeLimitMinutes: number; passMark: number; maxAttempts: number }>
  enrollment: {
    id: string
    status: string
    progressPercent: number
    deadline: string | null
    completionDate: string | null
    enrolledAt: string
    completedLessons: number
    totalLessons: number
    lessonProgress: Array<{ lessonId: string; isCompleted: boolean }>
  } | null
}

const LESSON_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: PlayCircle, text: FileText, pdf: FileType, audio: Headphones, gallery: ImageIcon, ppt: Presentation,
}

function difficultyColor(d: string): string {
  switch (d) {
    case 'beginner': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
    case 'intermediate': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
    case 'advanced': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

function formatDeadline(d: string | null): { text: string; urgent: boolean } {
  if (!d) return { text: 'No deadline', urgent: false }
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (days <= 0) return { text: 'Overdue', urgent: true }
  if (days <= 3) return { text: `${days} day${days === 1 ? '' : 's'} left`, urgent: true }
  return { text: new Date(d).toLocaleDateString(), urgent: false }
}

export default function CourseShow({ course, canEdit }: { course: CourseDetail; canEdit: boolean }) {
  const { t } = useI18n()
  const [enrolling, setEnrolling] = React.useState(false)
  const isEnrolled = !!course.enrollment
  const isCompleted = course.enrollment?.status === 'completed'
  const deadlineInfo = formatDeadline(course.enrollment?.deadline || null)

  function handleEnroll() {
    setEnrolling(true)
    router.post(`/courses/${course.id}/enroll`, {}, {
      onError: () => toast.error('Could not enroll in this course'),
      onFinish: () => setEnrolling(false),
    })
  }

  function firstIncompleteLesson(): string | null {
    if (!course.enrollment) return null
    const completedIds = new Set(course.enrollment.lessonProgress.filter((lp) => lp.isCompleted).map((lp) => lp.lessonId))
    const next = course.lessons.find((l) => !completedIds.has(l.id)) || course.lessons[0]
    return next?.id || null
  }

  return (
    <AppLayout>
      <Head title={course.title} />
      <div className="space-y-5">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href="/courses"><ArrowLeft className="h-4 w-4" />{t('common.back')} to Catalog</Link>
        </Button>

        <Card className="overflow-hidden">
          <div className="relative h-44 sm:h-52 bg-gradient-to-br from-primary/20 via-amber-500/15 to-primary/5 flex items-center justify-center">
            <span className="text-7xl sm:text-8xl">{course.thumbnail || '🎓'}</span>
            <div className="absolute top-4 right-4 flex gap-2 flex-wrap justify-end">
              {course.isFeatured && <Badge className="bg-amber-500 text-white border-amber-500"><Sparkles className="h-3 w-3" /> Featured</Badge>}
              {course.isMandatory && <Badge variant="destructive">Required</Badge>}
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {course.category && (
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      {course.category.icon && <span>{course.category.icon}</span>}{course.category.name}
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn('capitalize', difficultyColor(course.difficulty))}><BarChart3 className="h-3 w-3" />{course.difficulty}</Badge>
                  <Badge variant="secondary" className="capitalize">{course.status}</Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{course.title}</h1>
                <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">{course.description}</p>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link href={`/courses/${course.id}/edit`}><Pencil className="h-4 w-4" />{t('common.edit')}</Link>
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-3">
              {course.instructor && <span className="flex items-center gap-1.5"><UserIcon className="h-4 w-4 text-primary" />{course.instructor.name}</span>}
              <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-primary" />{course.lessons.length} {t('course.lessons')}</span>
              {course.durationHours > 0 && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" />{course.durationHours}h</span>}
              {course.hasCertificate && <span className="flex items-center gap-1.5"><Award className="h-4 w-4 text-amber-600" />Certificate available</span>}
            </div>

            {isEnrolled && (
              <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-1.5">
                    {isCompleted ? (<><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Course completed 🎉</>) : (<><ListChecks className="h-4 w-4 text-primary" /> Your progress</>)}
                  </span>
                  <span className="text-muted-foreground">{course.enrollment!.completedLessons}/{course.enrollment!.totalLessons} lessons · {course.enrollment!.progressPercent}%</span>
                </div>
                <Progress value={course.enrollment!.progressPercent} className="h-2" />
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {!isEnrolled ? (
                <Button onClick={handleEnroll} disabled={enrolling} size="lg" className="bg-amber-600 hover:bg-amber-700">
                  {enrolling ? 'Enrolling...' : (<><GraduationCap className="h-4 w-4" />{t('course.enroll')}</>)}
                </Button>
              ) : isCompleted ? (
                <Button variant="outline" size="lg" asChild>
                  <Link href={firstIncompleteLesson() ? `/lessons/${firstIncompleteLesson()}` : '#'}><BookOpen className="h-4 w-4" /> Review Course</Link>
                </Button>
              ) : (
                <Button size="lg" asChild className="bg-primary">
                  <Link href={firstIncompleteLesson() ? `/lessons/${firstIncompleteLesson()}` : '#'}>
                    <PlayCircle className="h-4 w-4" />
                    {course.enrollment!.progressPercent > 0 ? t('course.continue') : t('course.start')}
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />Course Content
                  <Badge variant="secondary" className="ml-1 text-xs">{course.lessons.length} lessons</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {course.lessons.length === 0 ? (
                  <div className="px-6 pb-6"><EmptyState icon={BookOpen} title="No lessons yet" description="Lessons will appear here once the instructor adds them." /></div>
                ) : (
                  <ol className="divide-y">
                    {course.lessons.map((l, idx) => {
                      const Icon = LESSON_ICONS[l.type] || FileText
                      const lp = course.enrollment?.lessonProgress.find((p) => p.lessonId === l.id)
                      const isDone = !!lp?.isCompleted
                      return (
                        <li key={l.id}>
                          {isEnrolled ? (
                            <Link href={`/lessons/${l.id}`} className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-accent">
                              <LessonRow l={l} idx={idx} Icon={Icon} isDone={isDone} isEnrolled={isEnrolled} />
                            </Link>
                          ) : (
                            <div
                              onClick={() => toast.info('Enroll to access lessons')}
                              className="w-full flex items-center gap-3 p-4 text-left transition-colors cursor-not-allowed opacity-70"
                            >
                              <LessonRow l={l} idx={idx} Icon={Icon} isDone={isDone} isEnrolled={isEnrolled} />
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                )}
              </CardContent>
            </Card>

            {course.quizzes.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4 text-amber-600" />Assessments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {course.quizzes.map((q) => (
                    <div key={q.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{q.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{q.timeLimitMinutes}m · Pass {q.passMark}% · Max {q.maxAttempts} attempts</p>
                      </div>
                      <Button size="sm" variant="outline" asChild disabled={!isEnrolled}>
                        <Link href={`/quizzes/${q.id}/take`}>{t('quiz.start')}</Link>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Course Info</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label={t('course.category')} value={course.category?.name || '—'} />
                <Row label={t('course.difficulty')} value={<Badge variant="outline" className={cn('capitalize', difficultyColor(course.difficulty))}>{course.difficulty}</Badge>} />
                <Row label={t('course.duration')} value={course.durationHours > 0 ? `${course.durationHours} hours` : 'Self-paced'} />
                <Row label="Passing Score" value={`${course.passingScore}%`} />
                <Row label="Max Attempts" value={course.maxAttempts} />
                <Row label="Enrollment" value={<span className="capitalize">{course.enrollmentType}</span>} />
              </CardContent>
            </Card>

            {course.enrollment && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-amber-600" />Your Enrollment</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Status" value={<Badge variant={isCompleted ? 'default' : 'secondary'} className="capitalize">{course.enrollment.status}</Badge>} />
                  <Row label="Enrolled" value={new Date(course.enrollment.enrolledAt).toLocaleDateString()} />
                  {course.enrollment.completionDate && <Row label="Completed" value={new Date(course.enrollment.completionDate).toLocaleDateString()} />}
                  {course.enrollment.deadline && <Row label="Deadline" value={<Badge variant={deadlineInfo.urgent ? 'destructive' : 'outline'}>{deadlineInfo.text}</Badge>} />}
                </CardContent>
              </Card>
            )}

            {course.hasCertificate && (
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0"><Award className="h-5 w-5 text-amber-600" /></div>
                  <div>
                    <p className="font-semibold text-sm">Certificate Available</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{isCompleted ? "You've completed this course — view your certificate." : 'Complete this course to earn a verifiable certificate.'}</p>
                    {isCompleted && <Link href="/certificates" className="text-xs text-amber-700 dark:text-amber-400 hover:underline mt-1 inline-block">View Certificate →</Link>}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function LessonRow({ l, idx, Icon, isDone, isEnrolled }: { l: CourseDetail['lessons'][number]; idx: number; Icon: React.ComponentType<{ className?: string }>; isDone: boolean; isEnrolled: boolean }) {
  return (
    <>
      <div className={cn('h-9 w-9 rounded-md flex items-center justify-center shrink-0', isDone ? 'bg-emerald-500/15 text-emerald-600' : 'bg-primary/10 text-primary')}>
        {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">#{idx + 1}</span>
          <span className="font-medium text-sm truncate">{l.title}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <Badge variant="outline" className="text-[10px] capitalize">{l.type}</Badge>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{l.durationMinutes}m</span>
        </div>
      </div>
      {isEnrolled && <span className="text-xs text-primary font-medium shrink-0">{isDone ? 'Done' : 'Start'}</span>}
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

import * as React from 'react'
import { Head, Link } from '@inertiajs/react'
import {
  FileQuestion, Plus, Clock, ListChecks, Target, Trophy,
  CheckCircle2, XCircle, Sparkles, BookOpen,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, StatCard, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/Components/ui/tabs'
import { Progress } from '@/Components/ui/progress'
import { cn } from '@/lib/utils'

interface QuizListItem {
  id: string
  title: string
  courseId: string
  course: { id: string; title: string; thumbnail: string | null }
  timeLimitMinutes: number
  passMark: number
  maxAttempts: number
  randomizeQuestions?: boolean
  questionCount: number
  attemptsUsed: number
  attempts: Array<{ id: string; score: number; passed: boolean; submittedAt: string; timeTakenSeconds: number }>
  bestScore: number | null
  passed: boolean
}

export default function QuizzesIndex({ quizzes, canCreate, canAiGenerate }: { quizzes: QuizListItem[]; canCreate: boolean; canAiGenerate: boolean }) {
  const { t } = useI18n()
  const grouped = React.useMemo(() => {
    const map = new Map<string, { courseId: string; courseTitle: string; items: QuizListItem[] }>()
    for (const q of quizzes) {
      if (!map.has(q.courseId)) map.set(q.courseId, { courseId: q.courseId, courseTitle: q.course?.title || t('quiz.uncategorized'), items: [] })
      map.get(q.courseId)!.items.push(q)
    }
    return Array.from(map.values())
  }, [quizzes])

  const myAttempts = React.useMemo(() => {
    const flat: Array<{ quiz: QuizListItem; attempt: QuizListItem['attempts'][number] }> = []
    for (const q of quizzes) for (const a of q.attempts) flat.push({ quiz: q, attempt: a })
    return flat.sort((a, b) => new Date(b.attempt.submittedAt).getTime() - new Date(a.attempt.submittedAt).getTime())
  }, [quizzes])

  const stats = React.useMemo(() => {
    const totalAttempts = quizzes.reduce((s, q) => s + q.attemptsUsed, 0)
    const passedCount = quizzes.filter((q) => q.passed).length
    const avgScore = quizzes.length > 0 ? Math.round(quizzes.reduce((s, q) => s + (q.bestScore ?? 0), 0) / quizzes.length) : 0
    return { total: quizzes.length, totalAttempts, passedCount, avgScore }
  }, [quizzes])

  return (
    <AppLayout>
      <Head title={t('nav.quizzes')} />
      <div>
        <ModuleHeader
          title={t('nav.quizzes')}
          description={t('quiz.subtitle')}
          icon={FileQuestion}
          actions={
            <>
              {canAiGenerate && <Button variant="outline" size="sm" asChild><Link href="/ai-quiz"><Sparkles className="h-4 w-4" /> {t('quiz.aiGeneratorShort')}</Link></Button>}
              {canCreate && <Button size="sm" asChild><Link href="/question-bank"><Plus className="h-4 w-4" /> {t('nav.questionBank')}</Link></Button>}
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label={t('quiz.totalQuizzes')} value={stats.total} icon={FileQuestion} color="primary" />
          <StatCard label={t('quiz.myAttempts')} value={stats.totalAttempts} icon={ListChecks} color="amber" />
          <StatCard label={t('quiz.passedStat')} value={stats.passedCount} icon={CheckCircle2} color="green" />
          <StatCard label={t('quiz.avgBestScore')} value={`${stats.avgScore}%`} icon={Target} color="amber" />
        </div>

        <Tabs defaultValue="available">
          <TabsList>
            <TabsTrigger value="available">{t('quiz.available')} ({quizzes.length})</TabsTrigger>
            <TabsTrigger value="attempts">{t('quiz.myAttempts')} ({myAttempts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4">
            {quizzes.length === 0 ? (
              <EmptyState icon={FileQuestion} title={t('quiz.noneYet')} description={t('quiz.noneDesc')} action={<Button asChild><Link href="/courses"><Plus className="h-4 w-4" /> {t('quiz.goToCourses')}</Link></Button>} />
            ) : (
              <div className="space-y-6">
                {grouped.map((group) => (
                  <div key={group.courseId}>
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">{group.courseTitle}</h3>
                      <Badge variant="secondary" className="text-[10px]">{group.items.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {group.items.map((q) => <QuizCard key={q.id} quiz={q} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="attempts" className="mt-4">
            {myAttempts.length === 0 ? (
              <EmptyState icon={Clock} title={t('quiz.noAttemptsYet')} description={t('quiz.attemptsWillAppear')} />
            ) : (
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="max-h-[60vh] overflow-y-auto divide-y">
                  {myAttempts.map(({ quiz, attempt }) => (
                    <Link key={attempt.id} href={`/quizzes/${quiz.id}/take`} className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors">
                      <div className={cn('h-10 w-10 rounded-md flex items-center justify-center shrink-0', attempt.passed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600')}>
                        {attempt.passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{quiz.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{quiz.course?.title}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={cn('text-lg font-bold', attempt.passed ? 'text-emerald-600' : 'text-red-600')}>{attempt.score}%</div>
                        <p className="text-[10px] text-muted-foreground">{new Date(attempt.submittedAt).toLocaleDateString()} · {Math.floor(attempt.timeTakenSeconds / 60)}m {attempt.timeTakenSeconds % 60}s</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

function QuizCard({ quiz }: { quiz: QuizListItem }) {
  const { t } = useI18n()
  const attemptsExhausted = quiz.maxAttempts > 0 && quiz.attemptsUsed >= quiz.maxAttempts
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">{quiz.title}</h4>
          {quiz.passed ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0"><CheckCircle2 className="h-3 w-3" /> {t('quiz.passedBadge')}</Badge>
          ) : quiz.attemptsUsed > 0 ? (
            <Badge variant="outline" className="text-amber-600 border-amber-500/30 shrink-0"><Trophy className="h-3 w-3" /> {t('quiz.bestPrefix')} {quiz.bestScore}%</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px]"><ListChecks className="h-3 w-3" /> {quiz.questionCount} {t('quiz.qSuffix')}</Badge>
          <Badge variant="secondary" className="text-[10px]"><Clock className="h-3 w-3" /> {quiz.timeLimitMinutes} {t('quiz.minSuffix')}</Badge>
          <Badge variant="secondary" className="text-[10px]"><Target className="h-3 w-3" /> {t('quiz.passPrefix')} {quiz.passMark}%</Badge>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{t('quiz.attempts')}</span>
            <span className="font-medium">{quiz.attemptsUsed}/{quiz.maxAttempts === 0 ? '∞' : quiz.maxAttempts}</span>
          </div>
          <Progress value={quiz.maxAttempts > 0 ? (quiz.attemptsUsed / quiz.maxAttempts) * 100 : 0} className="h-1.5" />
        </div>

        <Button className="w-full" size="sm" disabled={attemptsExhausted && !quiz.passed} asChild={!(attemptsExhausted && !quiz.passed)}>
          {attemptsExhausted && !quiz.passed ? <span>{t('quiz.noAttemptsLeft')}</span> : (
            <Link href={`/quizzes/${quiz.id}/take`}>{quiz.attemptsUsed > 0 ? t('quiz.retakeQuiz') : <><FileQuestion className="h-4 w-4" /> {t('quiz.start')}</>}</Link>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

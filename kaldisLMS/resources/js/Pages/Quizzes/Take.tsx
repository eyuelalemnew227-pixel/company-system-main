import * as React from 'react'
import { Head, Link } from '@inertiajs/react'
import axios from 'axios'
import {
  FileQuestion, Clock, ArrowLeft, ArrowRight, CheckCircle2, XCircle,
  Trophy, Award, Zap, ListChecks, Target,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Progress } from '@/Components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/Components/ui/radio-group'
import { Checkbox } from '@/Components/ui/checkbox'
import { Input } from '@/Components/ui/input'
import { Textarea } from '@/Components/ui/textarea'
import { Label } from '@/Components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/Components/ui/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type QType = 'single' | 'multiple' | 'truefalse' | 'fillblank' | 'shortanswer' | 'matching' | 'ordering'

interface QuizAnswer { id: string; text: string; sortOrder: number }
interface QuizQuestion { id: string; text: string; type: QType; points: number; explanation: string | null; sortOrder: number; answers: QuizAnswer[] }
interface QuizData {
  id: string; title: string; course: { id: string; title: string }
  timeLimitMinutes: number; passMark: number; maxAttempts: number
  randomizeQuestions: boolean; showAnswersAfter: boolean; attemptCount: number
  questions: QuizQuestion[]
}
interface GradedResponse { questionId: string; answerId: string | null; textResponse: string | null; isCorrect: boolean; correctAnswerId: string | null }
interface SubmitResult {
  attemptId: string; score: number; passed: boolean; pointsAwarded: number; timeTakenSeconds: number
  responses: GradedResponse[]; quiz: { id: string; title: string; passMark: number; showAnswersAfter: boolean }
}
type ResponseValue = { answerId?: string; textResponse?: string; selected?: string[] }

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function isAnswered(r: ResponseValue | undefined, type: QType): boolean {
  if (!r) return false
  if (type === 'fillblank' || type === 'shortanswer') return !!(r.textResponse && r.textResponse.trim().length > 0)
  if (type === 'multiple' || type === 'matching' || type === 'ordering') return Array.isArray(r.selected) && r.selected.length > 0
  return !!r.answerId
}

export default function QuizTake({ quiz }: { quiz: QuizData }) {
  const { t } = useI18n()
  const [currentIdx, setCurrentIdx] = React.useState(0)
  const [responses, setResponses] = React.useState<Record<string, ResponseValue>>({})
  const [secondsLeft, setSecondsLeft] = React.useState(quiz.timeLimitMinutes * 60)
  const [startedAt] = React.useState<number>(Date.now())
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<SubmitResult | null>(null)
  const [showConfirmSubmit, setShowConfirmSubmit] = React.useState(false)
  const [orderedQuestions] = React.useState<QuizQuestion[]>(() => {
    const qs = quiz.randomizeQuestions ? shuffle(quiz.questions) : quiz.questions
    return qs.map((q) => (['single', 'multiple', 'truefalse'].includes(q.type) && quiz.randomizeQuestions) ? { ...q, answers: shuffle(q.answers) } : q)
  })

  const doSubmit = React.useCallback(async (isTimeout = false) => {
    if (submitting) return
    setSubmitting(true)
    const payload = {
      started_at: new Date(startedAt).toISOString(),
      responses: orderedQuestions.map((q) => {
        const r = responses[q.id]
        return { question_id: q.id, answer_id: r?.answerId ?? null, text_response: r?.textResponse ?? null }
      }),
    }
    try {
      const { data } = await axios.post<SubmitResult>(`/quizzes/${quiz.id}/submit`, payload)
      if (isTimeout) toast.info(t('quiz.timeUpToast'))
      setResult(data)
      if (data.passed) toast.success(t('quiz.passedToast').replace('{score}', String(data.score)))
      else toast.error(t('quiz.failedToast').replace('{score}', String(data.score)).replace('{passMark}', String(quiz.passMark)))
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('quiz.couldNotSubmit'))
    } finally {
      setSubmitting(false)
    }
  }, [submitting, startedAt, orderedQuestions, responses, quiz])

  const doSubmitRef = React.useRef(doSubmit)
  React.useEffect(() => { doSubmitRef.current = doSubmit }, [doSubmit])

  React.useEffect(() => {
    if (result) return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id)
          setTimeout(() => doSubmitRef.current(true), 0)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [result])

  if (result) {
    return (
      <AppLayout>
        <Head title={`${quiz.title} — Results`} />
        <QuizResults result={result} quiz={quiz} questions={orderedQuestions} responses={responses} />
      </AppLayout>
    )
  }

  const totalQuestions = orderedQuestions.length
  const current = orderedQuestions[currentIdx]

  if (!current) {
    return (
      <AppLayout>
        <Head title={quiz.title} />
        <EmptyState icon={FileQuestion} title={t('quiz.noQuestionsTitle')} action={<Button asChild><Link href="/quizzes">{t('quiz.backToQuizzes')}</Link></Button>} />
      </AppLayout>
    )
  }

  const answeredCount = orderedQuestions.filter((q) => isAnswered(responses[q.id], q.type)).length
  const progressPct = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0
  const isLast = currentIdx === totalQuestions - 1
  const isFirst = currentIdx === 0
  const minutes = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const timeLow = secondsLeft <= 300 && secondsLeft > 0

  return (
    <AppLayout>
      <Head title={quiz.title} />
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Button variant="ghost" size="sm" asChild><Link href="/quizzes"><ArrowLeft className="h-4 w-4" /> {t('quiz.exit')}</Link></Button>
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-md border font-mono text-sm font-semibold', timeLow ? 'border-red-500/40 bg-red-500/10 text-red-600 animate-pulse' : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400')}>
            <Clock className="h-4 w-4" />{String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
        </div>

        <h1 className="text-xl font-bold mb-1">{quiz.title}</h1>
        <p className="text-xs text-muted-foreground mb-3">{quiz.course.title}</p>

        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium">{t('quiz.question')} {currentIdx + 1} {t('quiz.of')} {totalQuestions}</span>
            <span className="text-muted-foreground">{answeredCount}/{totalQuestions} {t('quiz.answeredSuffix')}</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        <Card>
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="flex items-start gap-3">
              <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">{current.points} {t('quiz.ptLabel')}</Badge>
              <h2 className="text-base sm:text-lg font-semibold leading-snug">{current.text}</h2>
            </div>
            <QuestionInput question={current} value={responses[current.id]} onChange={(v) => setResponses((prev) => ({ ...prev, [current.id]: v }))} />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-4 gap-2">
          <Button variant="outline" onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={isFirst}><ArrowLeft className="h-4 w-4" /> {t('quiz.previous')}</Button>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {orderedQuestions.map((q, i) => {
              const answered = isAnswered(responses[q.id], q.type)
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={cn('h-8 w-8 rounded-md text-xs font-medium border transition-colors',
                    i === currentIdx && 'border-primary bg-primary text-primary-foreground',
                    i !== currentIdx && answered && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                    i !== currentIdx && !answered && 'border-border bg-muted/30 text-muted-foreground hover:bg-muted')}
                  aria-label={`${t('quiz.goToQuestionAria')} ${i + 1}`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          {isLast ? (
            <Button onClick={() => setShowConfirmSubmit(true)} disabled={submitting}><CheckCircle2 className="h-4 w-4" /> {t('quiz.submitShort')}</Button>
          ) : (
            <Button onClick={() => setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1))}>{t('quiz.next')} <ArrowRight className="h-4 w-4" /></Button>
          )}
        </div>

        <AlertDialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('quiz.submitQuizTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('quiz.answeredPrefix')} <strong>{answeredCount}</strong> {t('quiz.of')} <strong>{totalQuestions}</strong> {t('quiz.answeredSuffixQuestions')}
                {answeredCount < totalQuestions && ` ${t('quiz.unansweredWarning')}`} {t('quiz.cannotBeUndone')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('quiz.keepWorking')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setShowConfirmSubmit(false); doSubmit(false) }} disabled={submitting}>
                {submitting ? t('quiz.submittingEllipsis') : t('quiz.submitNow')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  )
}

function QuestionInput({ question, value, onChange }: { question: QuizQuestion; value: ResponseValue | undefined; onChange: (v: ResponseValue) => void }) {
  const { t } = useI18n()
  const type = question.type

  if (type === 'single' || type === 'truefalse') {
    return (
      <RadioGroup value={value?.answerId || ''} onValueChange={(v) => onChange({ answerId: v })} className={cn('gap-2', type === 'truefalse' && 'grid grid-cols-2')}>
        {question.answers.map((a) => (
          <label key={a.id} htmlFor={a.id} className={cn('flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/40 transition-colors', value?.answerId === a.id && 'border-primary bg-primary/5')}>
            <RadioGroupItem id={a.id} value={a.id} />
            <span className="text-sm">{a.text}</span>
          </label>
        ))}
      </RadioGroup>
    )
  }

  if (type === 'multiple') {
    const selected = value?.selected || []
    const toggle = (id: string) => {
      const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
      onChange({ selected: next, answerId: next.join(',') })
    }
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground mb-1">{t('quiz.selectAllApply')}</p>
        {question.answers.map((a) => (
          <label key={a.id} className={cn('flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/40 transition-colors', selected.includes(a.id) && 'border-primary bg-primary/5')}>
            <Checkbox id={a.id} checked={selected.includes(a.id)} onCheckedChange={() => toggle(a.id)} />
            <span className="text-sm">{a.text}</span>
          </label>
        ))}
      </div>
    )
  }

  if (type === 'fillblank') {
    return (
      <div className="space-y-2">
        <Label htmlFor="fill">{t('quiz.typeYourAnswer')}</Label>
        <Input id="fill" placeholder={t('quiz.yourAnswerPlaceholder')} value={value?.textResponse || ''} onChange={(e) => onChange({ textResponse: e.target.value })} />
      </div>
    )
  }

  if (type === 'shortanswer') {
    return (
      <div className="space-y-2">
        <Label htmlFor="sa">{t('quiz.writeResponse')}</Label>
        <Textarea id="sa" placeholder={t('quiz.yourResponsePlaceholder')} rows={5} value={value?.textResponse || ''} onChange={(e) => onChange({ textResponse: e.target.value })} />
      </div>
    )
  }

  if (type === 'matching') return <MatchingInput question={question} value={value} onChange={onChange} />
  if (type === 'ordering') return <OrderingInput question={question} value={value} onChange={onChange} />
  return null
}

function MatchingInput({ question, value, onChange }: { question: QuizQuestion; value: ResponseValue | undefined; onChange: (v: ResponseValue) => void }) {
  const { t } = useI18n()
  const pairs = React.useMemo(() => question.answers.map((a) => {
    const [left, right] = a.text.split('=').map((s) => s?.trim() || '')
    return { id: a.id, left, right }
  }), [question.answers])
  const rights = React.useMemo(() => shuffle(pairs.map((p) => p.right)), [pairs])
  const selectedMap: Record<string, string> = {}
  for (const p of pairs) {
    const sel = (value?.selected || []).find((s) => s.startsWith(p.id + ':'))
    if (sel) selectedMap[p.id] = sel.split(':')[1]
  }
  const setMatch = (leftId: string, right: string) => {
    const others = (value?.selected || []).filter((s) => !s.startsWith(leftId + ':'))
    const next = right ? [...others, `${leftId}:${right}`] : others
    onChange({ selected: next, answerId: next.join(',') })
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-1">{t('quiz.matchInstructions')}</p>
      {pairs.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <div className="flex-1 p-2 rounded-md bg-muted/40 text-sm">{p.left}</div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedMap[p.id] || ''} onValueChange={(v) => setMatch(p.id, v)}>
            <SelectTrigger className="flex-1"><SelectValue placeholder={t('quiz.chooseEllipsis')} /></SelectTrigger>
            <SelectContent>{rights.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      ))}
    </div>
  )
}

function OrderingInput({ question, value, onChange }: { question: QuizQuestion; value: ResponseValue | undefined; onChange: (v: ResponseValue) => void }) {
  const { t } = useI18n()
  const n = question.answers.length
  const orderMap: Record<string, number> = {}
  for (const a of question.answers) {
    const sel = (value?.selected || []).find((s) => s.startsWith(a.id + ':'))
    if (sel) orderMap[a.id] = parseInt(sel.split(':')[1], 10)
  }
  const used = new Set(Object.values(orderMap))
  const setOrder = (aid: string, pos: number) => {
    const others = (value?.selected || []).filter((s) => !s.startsWith(aid + ':'))
    const next = pos > 0 ? [...others, `${aid}:${pos}`] : others
    onChange({ selected: next, answerId: next.join(',') })
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-1">{t('quiz.orderInstructions')}</p>
      {question.answers.map((a) => (
        <div key={a.id} className="flex items-center gap-2">
          <Select value={orderMap[a.id] ? String(orderMap[a.id]) : ''} onValueChange={(v) => setOrder(a.id, parseInt(v, 10))}>
            <SelectTrigger className="w-20"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: n }, (_, i) => i + 1).map((p) => <SelectItem key={p} value={String(p)} disabled={used.has(p) && orderMap[a.id] !== p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex-1 p-2 rounded-md bg-muted/40 text-sm">{a.text}</div>
        </div>
      ))}
    </div>
  )
}

function QuizResults({ result, quiz, questions, responses }: { result: SubmitResult; quiz: QuizData; questions: QuizQuestion[]; responses: Record<string, ResponseValue> }) {
  const { t } = useI18n()
  const passed = result.passed
  const minutes = Math.floor(result.timeTakenSeconds / 60)
  const seconds = result.timeTakenSeconds % 60
  const correctCount = result.responses.filter((r) => r.isCorrect).length

  return (
    <div className="max-w-3xl mx-auto">
      <Card className={cn('overflow-hidden border-2', passed ? 'border-emerald-500/40' : 'border-amber-500/40')}>
        <div className={cn('p-6 text-center text-white', passed ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : 'bg-gradient-to-br from-amber-600 to-amber-800')}>
          <div className="text-5xl mb-2">{passed ? '🎉' : '💪'}</div>
          <h1 className="text-2xl font-bold">{passed ? t('quiz.quizPassedTitle') : t('quiz.keepPracticing')}</h1>
          <p className="text-white/80 text-sm mt-1">{quiz.title}</p>
          <div className="text-5xl font-bold mt-4">{result.score}%</div>
          <p className="text-white/80 text-sm mt-1">{t('quiz.passMarkPrefix')} {quiz.passMark}% · {correctCount}/{questions.length} {t('quiz.correctSuffix')}</p>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-md bg-muted/40"><Trophy className="h-4 w-4 mx-auto text-amber-500 mb-1" /><div className="text-lg font-bold">{result.score}%</div><div className="text-[10px] text-muted-foreground uppercase">{t('quiz.score')}</div></div>
            <div className="text-center p-3 rounded-md bg-muted/40"><Clock className="h-4 w-4 mx-auto text-amber-500 mb-1" /><div className="text-lg font-bold">{minutes}m {seconds}s</div><div className="text-[10px] text-muted-foreground uppercase">{t('quiz.timeLabel')}</div></div>
            <div className="text-center p-3 rounded-md bg-muted/40"><Zap className="h-4 w-4 mx-auto text-amber-500 mb-1" /><div className="text-lg font-bold">+{result.pointsAwarded}</div><div className="text-[10px] text-muted-foreground uppercase">{t('quiz.pointsLabel')}</div></div>
          </div>

          {result.pointsAwarded > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
              <Award className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">{t('quiz.earnedPointsPrefix')} <strong>+{result.pointsAwarded} {t('common.points')}</strong> {result.score === 100 ? t('quiz.perfectScoreSuffix') : t('quiz.passingSuffix')}</p>
            </div>
          )}

          {quiz.showAnswersAfter ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> {t('quiz.answerReview')}</h3>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {questions.map((q, i) => {
                  const resp = result.responses.find((r) => r.questionId === q.id)
                  const userResp = responses[q.id]
                  const correct = resp?.isCorrect
                  const correctTexts = q.answers.filter((a) => a.id === resp?.correctAnswerId).map((a) => a.text)
                  const userTexts: string[] = []
                  if (userResp?.answerId) {
                    for (const aid of userResp.answerId.split(',')) {
                      const a = q.answers.find((x) => x.id === aid.trim())
                      if (a) userTexts.push(a.text)
                    }
                  }
                  if (userResp?.textResponse) userTexts.push(userResp.textResponse)
                  return (
                    <div key={q.id} className={cn('p-3 rounded-md border', correct ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5')}>
                      <div className="flex items-start gap-2">
                        {correct ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{i + 1}. {q.text}</p>
                          <div className="text-xs mt-1.5 space-y-0.5">
                            <p className="text-muted-foreground">{t('quiz.yourAnswerLabel')} <span className={correct ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-red-700 dark:text-red-400 font-medium'}>{userTexts.length > 0 ? userTexts.join(', ') : t('quiz.noAnswerPlaceholder')}</span></p>
                            {!correct && correctTexts.length > 0 && <p className="text-muted-foreground">{t('quiz.correctLabel')} <span className="text-emerald-700 dark:text-emerald-400 font-medium">{correctTexts.join(', ')}</span></p>}
                            {q.explanation && <p className="text-muted-foreground italic mt-1">💡 {q.explanation}</p>}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">{q.points} {t('quiz.ptLabel')}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground p-4 bg-muted/30 rounded-md">{t('quiz.reviewDisabled')}</div>
          )}

          <div className="flex justify-center pt-2">
            <Button asChild><Link href="/quizzes"><Target className="h-4 w-4" /> {t('quiz.backToQuizzes')}</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import * as React from 'react'
import { Head, router } from '@inertiajs/react'
import axios from 'axios'
import {
  Sparkles, Wand2, Save, FilePlus2, Trash2, Plus, Coffee,
  AlertCircle, Check, RotateCcw, Loader2, ListChecks,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
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

type QType = 'single' | 'multiple' | 'truefalse'
interface DraftAnswer { text: string; isCorrect: boolean }
interface DraftQuestion { id: string; text: string; type: QType; points: number; explanation: string; answers: DraftAnswer[] }
interface CourseOption { id: string; title: string }

export default function AiQuizIndex({ courses, canCreateQuiz }: { courses: CourseOption[]; canCreateQuiz: boolean }) {
  const { t } = useI18n()
  const [topic, setTopic] = React.useState('')
  const [difficulty, setDifficulty] = React.useState<'easy' | 'medium' | 'hard'>('medium')
  const [count, setCount] = React.useState<5 | 10 | 15>(5)
  const [qType, setQType] = React.useState<QType>('single')
  const [courseId, setCourseId] = React.useState('')

  const [questions, setQuestions] = React.useState<DraftQuestion[]>([])
  const [generating, setGenerating] = React.useState(false)
  const [generateError, setGenerateError] = React.useState<string | null>(null)

  const [savingBank, setSavingBank] = React.useState(false)
  const [creatingQuiz, setCreatingQuiz] = React.useState(false)
  const [showCreateQuiz, setShowCreateQuiz] = React.useState(false)
  const [newQuizTitle, setNewQuizTitle] = React.useState('')

  async function handleGenerate() {
    if (!topic.trim()) { toast.error(t('ai.topicRequired')); return }
    setGenerating(true)
    setGenerateError(null)
    setQuestions([])
    try {
      const { data } = await axios.post('/ai-quiz/generate', { topic: topic.trim(), difficulty, count, type: qType })
      const withIds = (data.questions as DraftQuestion[]).map((q) => ({ ...q, answers: q.answers.map((a) => ({ ...a })) }))
      setQuestions(withIds)
      toast.success(t('ai.generatedToast').replace('{count}', String(withIds.length)))
    } catch (e: any) {
      const msg = e?.response?.data?.error || t('ai.generationFailed')
      setGenerateError(msg)
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  function updateQuestion(id: string, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }
  function deleteQuestion(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id))
  }
  function addAnswer(qid: string) {
    setQuestions((qs) => qs.map((q) => q.id === qid ? { ...q, answers: [...q.answers, { text: '', isCorrect: false }] } : q))
  }
  function updateAnswer(qid: string, idx: number, patch: Partial<DraftAnswer>) {
    setQuestions((qs) => qs.map((q) => q.id !== qid ? q : { ...q, answers: q.answers.map((a, i) => i === idx ? { ...a, ...patch } : a) }))
  }
  function deleteAnswer(qid: string, idx: number) {
    setQuestions((qs) => qs.map((q) => q.id !== qid ? q : { ...q, answers: q.answers.filter((_, i) => i !== idx) }))
  }
  function toggleCorrect(qid: string, idx: number, single: boolean) {
    setQuestions((qs) => qs.map((q) => {
      if (q.id !== qid) return q
      const next = q.answers.map((a, i) => single ? { ...a, isCorrect: i === idx ? !a.isCorrect : false } : (i === idx ? { ...a, isCorrect: !a.isCorrect } : a))
      return { ...q, answers: next }
    }))
  }

  async function saveToBank() {
    if (questions.length === 0) return
    setSavingBank(true)
    let ok = 0
    let failed = 0
    for (const q of questions) {
      try {
        await axios.post('/question-bank', {
          category_id: null, text: q.text, type: q.type, difficulty, tags: topic.trim(),
          answers: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
        })
        ok++
      } catch {
        failed++
      }
    }
    setSavingBank(false)
    if (ok > 0) toast.success(t('ai.savedToBankToast').replace('{count}', String(ok)))
    if (failed > 0) toast.error(t('ai.failedToSave').replace('{count}', String(failed)))
  }

  async function createQuizFromDrafts() {
    if (!courseId) { toast.error(t('forum.selectCourseRequired')); return }
    if (!newQuizTitle.trim()) { toast.error(t('ai.quizTitleRequired')); return }
    setCreatingQuiz(true)
    try {
      await axios.post('/quizzes', {
        course_id: courseId, title: newQuizTitle.trim(), time_limit_minutes: 20, pass_mark: 70, max_attempts: 3,
        randomize_questions: true, show_answers_after: true,
        questions: questions.map((q) => ({
          text: q.text, type: q.type, points: q.points, explanation: q.explanation,
          answers: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
        })),
      })
      toast.success(t('ai.quizCreatedToast').replace('{count}', String(questions.length)))
      setShowCreateQuiz(false)
      router.visit('/quizzes')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('ai.couldNotCreateQuiz'))
    } finally {
      setCreatingQuiz(false)
    }
  }

  return (
    <AppLayout>
      <Head title={t('nav.aiQuizGenerator')} />
      <div>
        <ModuleHeader
          title={t('nav.aiQuizGenerator')}
          description={t('ai.subtitle')}
          icon={Sparkles}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-primary"><Wand2 className="h-4 w-4" /><h3 className="text-sm font-semibold">{t('ai.generatorSettings')}</h3></div>

              <div className="space-y-1.5">
                <Label htmlFor="topic">{t('quiz.ai.topic')}</Label>
                <Input id="topic" placeholder={t('ai.topicPlaceholder')} value={topic} onChange={(e) => setTopic(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">{t('ai.beSpecific')}</p>
              </div>

              <div className="space-y-1.5">
                <Label>{t('course.difficulty')}</Label>
                <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">{t('ai.easyBeginners')}</SelectItem>
                    <SelectItem value="medium">{t('ai.mediumIntermediate')}</SelectItem>
                    <SelectItem value="hard">{t('ai.hardAdvanced')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t('quiz.ai.count')}</Label>
                <Select value={String(count)} onValueChange={(v: any) => setCount(Number(v) as 5 | 10 | 15)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 {t('ai.questionsSuffix')}</SelectItem>
                    <SelectItem value="10">10 {t('ai.questionsSuffix')}</SelectItem>
                    <SelectItem value="15">15 {t('ai.questionsSuffix')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t('ai.questionTypeLabel')}</Label>
                <Select value={qType} onValueChange={(v: any) => setQType(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">{t('ai.singleChoiceDesc')}</SelectItem>
                    <SelectItem value="multiple">{t('ai.multipleChoiceDesc')}</SelectItem>
                    <SelectItem value="truefalse">{t('qbank.typeTrueFalse')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={handleGenerate} disabled={generating || !topic.trim()}>
                {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('ai.brewingQuestions')}</> : <><Sparkles className="h-4 w-4" /> {t('quiz.ai.generateBtn')}</>}
              </Button>

              {generateError && <div className="text-xs text-red-600 p-2 rounded-md bg-red-500/10 border border-red-500/20">{generateError}</div>}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            {generating ? (
              <CoffeeLoader count={count} topic={topic} />
            ) : questions.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <EmptyState icon={Coffee} title={t('ai.noneYetTitle')} description={t('ai.noneYetDesc')} />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20"><ListChecks className="h-3 w-3" /> {questions.length} {t('ai.questionsSuffix')}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{difficulty}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{qType}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}><RotateCcw className="h-3.5 w-3.5" /> {t('ai.regenerate')}</Button>
                    <Button variant="outline" size="sm" onClick={saveToBank} disabled={savingBank}>
                      {savingBank ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t('ai.saveToBank')}
                    </Button>
                    {canCreateQuiz && <Button size="sm" onClick={() => setShowCreateQuiz(true)}><FilePlus2 className="h-3.5 w-3.5" /> {t('ai.createQuizBtn')}</Button>}
                  </div>
                </div>

                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {questions.map((q, qi) => (
                    <DraftQuestionCard
                      key={q.id}
                      question={q}
                      index={qi}
                      onUpdate={(patch) => updateQuestion(q.id, patch)}
                      onDelete={() => deleteQuestion(q.id)}
                      onAddAnswer={() => addAnswer(q.id)}
                      onUpdateAnswer={(i, patch) => updateAnswer(q.id, i, patch)}
                      onDeleteAnswer={(i) => deleteAnswer(q.id, i)}
                      onToggleCorrect={(i) => toggleCorrect(q.id, i, q.type !== 'multiple')}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <AlertDialog open={showCreateQuiz} onOpenChange={setShowCreateQuiz}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('ai.createQuizConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('ai.createQuizConfirmDesc').replace('{count}', String(questions.length))}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="quiz-title">{t('ai.quizTitleLabel')}</Label>
                <Input id="quiz-title" placeholder={t('ai.quizTitlePlaceholder').replace('{topic}', topic)} value={newQuizTitle} onChange={(e) => setNewQuizTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-id">{t('cert.course')}</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="course-id" className="w-full"><SelectValue placeholder={t('forum.selectCoursePlaceholder')} /></SelectTrigger>
                  <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); createQuizFromDrafts() }} disabled={creatingQuiz || !courseId || !newQuizTitle.trim()}>
                {creatingQuiz ? t('role.creating') : t('ai.createQuizBtn')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  )
}

function CoffeeLoader({ count, topic }: { count: number; topic: string }) {
  const { t } = useI18n()
  return (
    <Card>
      <CardContent className="py-16 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="text-7xl animate-bounce">☕</div>
          <div className="absolute -top-2 -right-4 text-2xl animate-pulse">✨</div>
        </div>
        <h3 className="font-semibold mt-4 text-lg">{t('ai.brewingYourQuiz')}</h3>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
          {t('ai.askingAiPrefix')} {count} {t('ai.questionsAboutMiddle')} <span className="font-medium text-foreground">"{topic}"</span>. {t('ai.usuallyTakesSeconds')}
        </p>
      </CardContent>
    </Card>
  )
}

function DraftQuestionCard({
  question, index, onUpdate, onDelete, onAddAnswer, onUpdateAnswer, onDeleteAnswer, onToggleCorrect,
}: {
  question: DraftQuestion
  index: number
  onUpdate: (patch: Partial<DraftQuestion>) => void
  onDelete: () => void
  onAddAnswer: () => void
  onUpdateAnswer: (i: number, patch: Partial<DraftAnswer>) => void
  onDeleteAnswer: (i: number) => void
  onToggleCorrect: (i: number) => void
}) {
  const { t } = useI18n()
  const valid = question.text.trim().length > 0 && question.answers.filter((a) => a.text.trim()).length >= 2 && question.answers.some((a) => a.isCorrect)
  return (
    <Card className={cn('transition-colors', !valid && 'border-amber-500/40')}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Badge variant="outline" className="shrink-0 mt-1.5">#{index + 1}</Badge>
          <Textarea className="flex-1 font-medium" value={question.text} onChange={(e) => onUpdate({ text: e.target.value })} placeholder={t('ai.questionTextPlaceholder')} rows={2} />
          <Button variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={onDelete} aria-label={t('ai.deleteQuestionAria')}><Trash2 className="h-4 w-4" /></Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t('calendar.typeField')}</Label>
            <Select value={question.type} onValueChange={(v: any) => onUpdate({ type: v })}>
              <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">{t('ai.single')}</SelectItem>
                <SelectItem value="multiple">{t('ai.multiple')}</SelectItem>
                <SelectItem value="truefalse">{t('ai.trueFalseShort')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t('ai.pointsFieldLabel')}</Label>
            <Input type="number" min={1} max={10} value={question.points} onChange={(e) => onUpdate({ points: Math.max(1, Number(e.target.value) || 1) })} className="h-8" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-muted-foreground">{question.type === 'multiple' ? t('ai.answersCheckLabelPlural') : t('ai.answersCheckLabel')}</Label>
            {question.type !== 'truefalse' && <Button variant="ghost" size="sm" onClick={onAddAnswer} className="h-6 text-[11px]"><Plus className="h-3 w-3" /> {t('ai.addBtn')}</Button>}
          </div>
          <div className="space-y-1.5">
            {question.answers.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleCorrect(i)}
                  className={cn('h-6 w-6 rounded-md border flex items-center justify-center shrink-0 transition-colors', a.isCorrect ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600' : 'border-input hover:bg-muted/40')}
                  aria-label={a.isCorrect ? t('qbank.markedCorrect') : t('qbank.markCorrect')}
                >
                  {a.isCorrect && <Check className="h-3.5 w-3.5" />}
                </button>
                <Input value={a.text} onChange={(e) => onUpdateAnswer(i, { text: e.target.value })} placeholder={`${t('qbank.answerPlaceholder')} ${i + 1}`} className="h-8 text-sm" />
                {question.type !== 'truefalse' && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => onDeleteAnswer(i)} aria-label={t('qbank.removeAnswerAria')}><Trash2 className="h-3.5 w-3.5" /></Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{t('ai.explanationLabel')}</Label>
          <Textarea value={question.explanation} onChange={(e) => onUpdate({ explanation: e.target.value })} placeholder={t('ai.explanationPlaceholder')} rows={2} className="text-xs" />
        </div>

        {!valid && <p className="text-[11px] text-amber-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {t('ai.validationWarning')}</p>}
      </CardContent>
    </Card>
  )
}

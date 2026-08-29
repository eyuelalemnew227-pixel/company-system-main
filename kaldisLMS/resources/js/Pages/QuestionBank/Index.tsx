import * as React from 'react'
import { Head, router, useForm } from '@inertiajs/react'
import {
  Library, Plus, Search, Tag, Trash2, Pencil, Check, X,
  AlertCircle, ListChecks, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import type { StringKey } from '@/lib/i18n'
import { ModuleHeader, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Textarea } from '@/Components/ui/textarea'
import { Label } from '@/Components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/Components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/Components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/Components/ui/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type QType = 'single' | 'multiple' | 'truefalse' | 'fillblank' | 'matching' | 'shortanswer' | 'ordering'
type Difficulty = 'easy' | 'medium' | 'hard'

interface QBAnswer {
  text: string
  isCorrect: boolean
}
interface QuestionBankItem {
  id: string
  categoryId: string | null
  category: { id: string; name: string } | null
  text: string
  type: QType
  difficulty: Difficulty
  tags: string
  answers: QBAnswer[]
  createdAt: string
}
interface Category {
  id: string
  name: string
  slug: string
}
interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

const TYPE_LABEL_KEYS: Record<QType, StringKey> = {
  single: 'qbank.typeSingle',
  multiple: 'qbank.typeMultiple',
  truefalse: 'qbank.typeTrueFalse',
  fillblank: 'qbank.typeFillBlank',
  shortanswer: 'qbank.typeShortAnswer',
  matching: 'qbank.typeMatching',
  ordering: 'qbank.typeOrdering',
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  hard: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
}

export default function QuestionBankIndex({
  questions, categories, filters, canManage,
}: {
  questions: Paginated<QuestionBankItem>
  categories: Category[]
  filters: { search?: string; categoryId?: string; difficulty?: string; type?: string }
  canManage: boolean
}) {
  const { t } = useI18n()
  const [search, setSearch] = React.useState(filters.search || '')
  const [filterCategory, setFilterCategory] = React.useState(filters.categoryId || 'all')
  const [filterDifficulty, setFilterDifficulty] = React.useState(filters.difficulty || 'all')
  const [filterType, setFilterType] = React.useState(filters.type || 'all')

  const [editing, setEditing] = React.useState<QuestionBankItem | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<QuestionBankItem | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  function applyFilters(overrides: Record<string, string> = {}) {
    const params: Record<string, string> = {
      search, categoryId: filterCategory, difficulty: filterDifficulty, type: filterType,
      ...overrides,
    }
    const query: Record<string, string> = {}
    if (params.search.trim()) query.search = params.search.trim()
    if (params.categoryId !== 'all') query.categoryId = params.categoryId
    if (params.difficulty !== 'all') query.difficulty = params.difficulty
    if (params.type !== 'all') query.type = params.type

    router.get('/question-bank', query, { preserveState: true, replace: true })
  }

  React.useEffect(() => {
    const id = setTimeout(() => applyFilters(), 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    router.delete(`/question-bank/${deleteTarget.id}`, {
      preserveScroll: true,
      onSuccess: () => setDeleteTarget(null),
      onError: () => toast.error(t('qbank.couldNotDelete')),
      onFinish: () => setDeleting(false),
    })
  }

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(item: QuestionBankItem) {
    setEditing(item)
    setDialogOpen(true)
  }

  if (!canManage) {
    return (
      <AppLayout>
        <Head title={t('nav.questionBank')} />
        <ModuleHeader title={t('nav.questionBank')} icon={Library} />
        <EmptyState
          icon={AlertCircle}
          title={t('qbank.accessRequired')}
          description={t('qbank.accessRequiredDesc')}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Head title={t('nav.questionBank')} />

      <ModuleHeader
        title={t('nav.questionBank')}
        description={t('qbank.subtitle')}
        icon={Library}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t('qbank.addQuestion')}
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('qbank.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); applyFilters({ categoryId: v }) }}>
              <SelectTrigger className="w-full"><SelectValue placeholder={t('qbank.allCategories')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('qbank.allCategories')}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={(v) => { setFilterDifficulty(v); applyFilters({ difficulty: v }) }}>
              <SelectTrigger className="w-full"><SelectValue placeholder={t('qbank.allDifficulties')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('qbank.allDifficulties')}</SelectItem>
                <SelectItem value="easy">{t('qbank.easy')}</SelectItem>
                <SelectItem value="medium">{t('qbank.medium')}</SelectItem>
                <SelectItem value="hard">{t('qbank.hard')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); applyFilters({ type: v }) }}>
              <SelectTrigger className="w-full"><SelectValue placeholder={t('qbank.allTypes')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('qbank.allTypes')}</SelectItem>
                {(Object.keys(TYPE_LABEL_KEYS) as QType[]).map((k) => (
                  <SelectItem key={k} value={k}>{t(TYPE_LABEL_KEYS[k])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {questions.data.length === 0 ? (
        <EmptyState
          icon={Library}
          title={t('qbank.noneFound')}
          description={t('qbank.addFirstOrAdjust')}
          action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('qbank.addQuestion')}</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {questions.data.map((q) => (
              <QuestionCard
                key={q.id}
                item={q}
                onEdit={() => openEdit(q)}
                onDelete={() => setDeleteTarget(q)}
              />
            ))}
          </div>

          {questions.last_page > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                {t('qbank.pagePrefix')} {questions.current_page} {t('qbank.ofWord')} {questions.last_page} · {questions.total} {t('qbank.questionsWord')}
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline" size="sm"
                  disabled={questions.current_page <= 1}
                  onClick={() => router.get('/question-bank', { ...filters, page: questions.current_page - 1 }, { preserveState: true })}
                >
                  <ChevronLeft className="h-4 w-4" /> {t('qbank.prev')}
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={questions.current_page >= questions.last_page}
                  onClick={() => router.get('/question-bank', { ...filters, page: questions.current_page + 1 }, { preserveState: true })}
                >
                  {t('qbank.next')} <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <QuestionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        categories={categories}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('qbank.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('qbank.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}

function QuestionCard({
  item, onEdit, onDelete,
}: {
  item: QuestionBankItem
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const tags = item.tags ? item.tags.split(',').map((s) => s.trim()).filter(Boolean) : []
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug flex-1">{item.text}</p>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} aria-label={t('common.edit')}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete} aria-label={t('common.delete')}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            <ListChecks className="h-3 w-3" /> {t(TYPE_LABEL_KEYS[item.type])}
          </Badge>
          <Badge variant="outline" className={cn('text-[10px]', DIFFICULTY_COLORS[item.difficulty])}>
            {item.difficulty}
          </Badge>
          {item.category && (
            <Badge variant="outline" className="text-[10px]">{item.category.name}</Badge>
          )}
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              <Tag className="h-2.5 w-2.5" /> {tag}
            </Badge>
          ))}
        </div>

        <div className="space-y-1 border-t pt-2">
          {item.answers.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {a.isCorrect ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={cn(a.isCorrect && 'font-medium text-emerald-700 dark:text-emerald-400')}>
                {a.text}
              </span>
            </div>
          ))}
          {item.answers.length === 0 && (
            <p className="text-xs text-muted-foreground italic">{t('qbank.noAnswers')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Create / Edit Dialog ----------
function QuestionDialog({
  open, onOpenChange, editing, categories,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: QuestionBankItem | null
  categories: Category[]
}) {
  const { t } = useI18n()
  const isNew = !editing
  const { data, setData, post, put, processing, errors, reset, transform } = useForm<{
    category_id: string
    text: string
    type: QType
    difficulty: Difficulty
    tags: string
    answers: QBAnswer[]
  }>({
    category_id: 'none',
    text: '',
    type: 'single',
    difficulty: 'medium',
    tags: '',
    answers: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ],
  })

  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setData({
        category_id: editing.categoryId || 'none',
        text: editing.text,
        type: editing.type,
        difficulty: editing.difficulty,
        tags: editing.tags || '',
        answers: editing.answers.length > 0 ? editing.answers.map((a) => ({ ...a })) : [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
        ],
      })
    } else {
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const isText = data.type === 'fillblank' || data.type === 'shortanswer'

  function updateAnswer(i: number, patch: Partial<QBAnswer>) {
    setData('answers', data.answers.map((a, idx) => idx === i ? { ...a, ...patch } : a))
  }
  function addAnswer() {
    setData('answers', [...data.answers, { text: '', isCorrect: false }])
  }
  function removeAnswer(i: number) {
    setData('answers', data.answers.filter((_, idx) => idx !== i))
  }
  function toggleCorrect(i: number, single: boolean) {
    setData('answers', data.answers.map((a, idx) => {
      if (single) return { ...a, isCorrect: idx === i ? !a.isCorrect : false }
      return idx === i ? { ...a, isCorrect: !a.isCorrect } : a
    }))
  }

  function switchType(type: QType) {
    const wasText = isText
    const willBeText = type === 'fillblank' || type === 'shortanswer'
    if (willBeText && !wasText) {
      setData((d) => ({ ...d, type, answers: [{ text: '', isCorrect: true }] }))
    } else if (!willBeText && wasText) {
      setData((d) => ({ ...d, type, answers: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }))
    } else {
      setData('type', type)
    }
  }

  function handleSave() {
    if (!data.text.trim()) { toast.error(t('qbank.questionTextRequired')); return }
    if (isText) {
      if (!data.answers[0]?.text.trim()) { toast.error(t('qbank.correctAnswerRequired')); return }
    } else {
      if (data.answers.filter((a) => a.text.trim()).length < 2) {
        toast.error(t('qbank.atLeast2Answers'))
        return
      }
      if (!data.answers.some((a) => a.isCorrect && a.text.trim())) {
        toast.error(t('qbank.atLeastOneCorrect'))
        return
      }
    }

    transform((d) => ({
      category_id: d.category_id === 'none' ? null : d.category_id,
      text: d.text.trim(),
      type: d.type,
      difficulty: d.difficulty,
      tags: d.tags.trim(),
      answers: d.answers
        .filter((a) => a.text.trim())
        .map((a) => ({ text: a.text.trim(), isCorrect: a.isCorrect })),
    } as any))

    const options = {
      preserveScroll: true,
      onSuccess: () => onOpenChange(false),
      onError: () => toast.error(t('qbank.couldNotSaveQuestion')),
    }

    if (isNew) {
      post('/question-bank', options)
    } else {
      put(`/question-bank/${editing!.id}`, options)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? t('qbank.addDialogTitle') : t('qbank.editDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('qbank.dialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-text">{t('qbank.questionTextLabel')}</Label>
            <Textarea
              id="q-text"
              value={data.text}
              onChange={(e) => setData('text', e.target.value)}
              placeholder={t('qbank.questionPlaceholder')}
              rows={3}
            />
            {errors.text && <p className="text-xs text-destructive">{errors.text}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t('calendar.typeField')}</Label>
              <Select value={data.type} onValueChange={(v) => switchType(v as QType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABEL_KEYS) as QType[]).map((k) => (
                    <SelectItem key={k} value={k}>{t(TYPE_LABEL_KEYS[k])}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('course.difficulty')}</Label>
              <Select value={data.difficulty} onValueChange={(v) => setData('difficulty', v as Difficulty)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{t('qbank.easy')}</SelectItem>
                  <SelectItem value="medium">{t('qbank.medium')}</SelectItem>
                  <SelectItem value="hard">{t('qbank.hard')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('sop.colCategory')}</Label>
              <Select value={data.category_id} onValueChange={(v) => setData('category_id', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder={t('user.none')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('user.none')}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-tags">{t('qbank.tagsLabel')}</Label>
            <Input
              id="q-tags"
              value={data.tags}
              onChange={(e) => setData('tags', e.target.value)}
              placeholder={t('qbank.tagsPlaceholder')}
            />
          </div>

          {!isText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('qbank.answersLabel')}</Label>
                <Button variant="ghost" size="sm" onClick={addAnswer} className="h-7 text-xs">
                  <Plus className="h-3 w-3" /> {t('qbank.addAnswer')}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {data.type === 'multiple' ? t('qbank.checkAllCorrect') : t('qbank.checkSingleCorrect')}
              </p>
              <div className="space-y-1.5">
                {data.answers.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCorrect(i, data.type !== 'multiple')}
                      className={cn(
                        'h-8 w-8 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                        a.isCorrect
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600'
                          : 'border-input hover:bg-muted/40'
                      )}
                      aria-label={a.isCorrect ? t('qbank.markedCorrect') : t('qbank.markCorrect')}
                    >
                      {a.isCorrect && <Check className="h-4 w-4" />}
                    </button>
                    <Input
                      value={a.text}
                      onChange={(e) => updateAnswer(i, { text: e.target.value })}
                      placeholder={`${t('qbank.answerPlaceholder')} ${i + 1}`}
                      className="h-9"
                    />
                    {data.answers.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => removeAnswer(i)}
                        aria-label={t('qbank.removeAnswerAria')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isText && (
            <div className="space-y-1.5">
              <Label htmlFor="q-correct-answer">{t('qbank.correctAnswerLabel')}</Label>
              <Input
                id="q-correct-answer"
                value={data.answers[0]?.text || ''}
                onChange={(e) => setData('answers', [{ text: e.target.value, isCorrect: true }])}
                placeholder={t('qbank.correctAnswerPlaceholder')}
              />
              <p className="text-[11px] text-muted-foreground">
                {t('qbank.correctAnswerNote')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={processing}>
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isNew ? t('qbank.addToBank') : t('settings.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

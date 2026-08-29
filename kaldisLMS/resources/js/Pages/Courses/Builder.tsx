import * as React from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import {
  ArrowLeft, Save, Plus, Trash2, ArrowUp, ArrowDown, PlayCircle, FileText, FileType,
  Headphones, Image as ImageIcon, Presentation, BookOpen, Youtube,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader } from '@/Components/lms/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Switch } from '@/Components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { toast } from 'sonner'

interface Category { id: string; name: string }
interface Lesson {
  id?: string
  title: string
  type: string
  content: string
  durationMinutes: number
  isDownloadable: boolean
}
interface CourseFormData {
  id?: string
  title: string
  description: string
  categoryId: string
  difficulty: string
  durationHours: number
  passingScore: number
  isFeatured: boolean
  isMandatory: boolean
  status: string
  enrollmentType: string
  maxAttempts: number
  deadlineDays: number
}

const LESSON_TYPES = [
  { value: 'video', label: 'Video', icon: PlayCircle },
  { value: 'text', label: 'Text', icon: FileText },
  { value: 'pdf', label: 'PDF', icon: FileType },
  { value: 'audio', label: 'Audio', icon: Headphones },
  { value: 'gallery', label: 'Gallery', icon: ImageIcon },
  { value: 'ppt', label: 'Presentation', icon: Presentation },
]

function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

export default function CourseBuilder({
  course, lessons: initialLessons, categories,
}: {
  course: CourseFormData | null
  lessons: Lesson[]
  categories: Category[]
}) {
  const { t } = useI18n()
  const isEdit = !!course

  const { data, setData, post, put, processing, transform } = useForm<CourseFormData & { lessons: Lesson[] }>({
    id: course?.id,
    title: course?.title || '',
    description: course?.description || '',
    categoryId: course?.categoryId || '',
    difficulty: course?.difficulty || 'beginner',
    durationHours: course?.durationHours ?? 2,
    passingScore: course?.passingScore ?? 70,
    isFeatured: course?.isFeatured ?? false,
    isMandatory: course?.isMandatory ?? false,
    status: course?.status || 'draft',
    enrollmentType: course?.enrollmentType || 'open',
    maxAttempts: course?.maxAttempts ?? 3,
    deadlineDays: course?.deadlineDays ?? 30,
    lessons: initialLessons.length ? initialLessons : [],
  })

  function setField<K extends keyof CourseFormData>(key: K, value: CourseFormData[K]) {
    setData(key as any, value as any)
  }

  function addLesson() {
    setData('lessons', [...data.lessons, { title: `New Lesson ${data.lessons.length + 1}`, type: 'text', content: '', durationMinutes: 10, isDownloadable: false }])
  }
  function updateLesson(idx: number, patch: Partial<Lesson>) {
    setData('lessons', data.lessons.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }
  function removeLesson(idx: number) {
    setData('lessons', data.lessons.filter((_, i) => i !== idx))
  }
  function moveLesson(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= data.lessons.length) return
    const next = [...data.lessons]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setData('lessons', next)
  }

  function handleSave() {
    if (!data.title.trim()) { toast.error('Title is required'); return }
    if (data.title.trim().length < 3) { toast.error('Title must be at least 3 characters'); return }
    for (let i = 0; i < data.lessons.length; i++) {
      const l = data.lessons[i]
      if (!l.title.trim()) { toast.error(`Lesson ${i + 1} is missing a title`); return }
      if (l.type === 'video' && !extractYouTubeId(l.content)) { toast.error(`Lesson "${l.title}" needs a valid YouTube URL`); return }
    }

    transform((d) => ({
      title: d.title.trim(),
      description: d.description,
      category_id: d.categoryId || null,
      difficulty: d.difficulty,
      duration_hours: Number(d.durationHours),
      passing_score: Number(d.passingScore),
      is_featured: d.isFeatured,
      is_mandatory: d.isMandatory,
      status: d.status,
      enrollment_type: d.enrollmentType,
      max_attempts: Number(d.maxAttempts),
      deadline_days: Number(d.deadlineDays),
      lessons: d.lessons.map((l) => ({
        id: l.id, title: l.title.trim(), type: l.type, content: l.content,
        duration_minutes: Number(l.durationMinutes) || 0, is_downloadable: l.isDownloadable,
      })),
    } as any))

    const options = { onError: () => toast.error('Could not save course — check the form for errors.') }
    if (isEdit) {
      put(`/courses/${course!.id}`, options)
    } else {
      post('/courses', options)
    }
  }

  return (
    <AppLayout>
      <Head title={isEdit ? 'Edit Course' : 'Course Builder'} />
      <div className="space-y-5">
        <ModuleHeader
          title={isEdit ? 'Edit Course' : 'Course Builder'}
          description={isEdit ? 'Update course content and lessons' : 'Create a new course with lessons'}
          icon={BookOpen}
          actions={
            <>
              <Button variant="ghost" asChild disabled={processing}>
                <Link href={isEdit ? `/courses/${course!.id}` : '/courses'}><ArrowLeft className="h-4 w-4" />{t('common.cancel')}</Link>
              </Button>
              <Button onClick={handleSave} disabled={processing} className="bg-amber-600 hover:bg-amber-700">
                <Save className="h-4 w-4" />{processing ? 'Saving...' : 'Save Course'}
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Course Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                  <Input id="title" value={data.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Espresso Fundamentals" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={data.description} onChange={(e) => setField('description', e.target.value)} rows={4} placeholder="What will learners take away from this course?" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={data.categoryId || 'none'} onValueChange={(v) => setField('categoryId', v === 'none' ? '' : v)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— No category —</SelectItem>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select value={data.difficulty} onValueChange={(v) => setField('difficulty', v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="durationHours">Duration (hrs)</Label>
                    <Input id="durationHours" type="number" min={0} step={0.5} value={data.durationHours} onChange={(e) => setField('durationHours', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="passingScore">Pass %</Label>
                    <Input id="passingScore" type="number" min={0} max={100} value={data.passingScore} onChange={(e) => setField('passingScore', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maxAttempts">Max Attempts</Label>
                    <Input id="maxAttempts" type="number" min={1} value={data.maxAttempts} onChange={(e) => setField('maxAttempts', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deadlineDays">Deadline (days)</Label>
                    <Input id="deadlineDays" type="number" min={0} value={data.deadlineDays} onChange={(e) => setField('deadlineDays', Number(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Enrollment Type</Label>
                  <Select value={data.enrollmentType} onValueChange={(v) => setField('enrollmentType', v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open — anyone can enroll</SelectItem>
                      <SelectItem value="approval">Approval — requires manager approval</SelectItem>
                      <SelectItem value="invite">Invite — invitation only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />Lessons
                    <Badge variant="secondary" className="text-xs">{data.lessons.length}</Badge>
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={addLesson}><Plus className="h-4 w-4" />{t('course.addLesson')}</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.lessons.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">No lessons yet. Click "Add Lesson" to start building your course content.</div>
                ) : (
                  data.lessons.map((l, idx) => (
                    <LessonEditor
                      key={l.id || `new-${idx}`}
                      lesson={l}
                      index={idx}
                      total={data.lessons.length}
                      onChange={(patch) => updateLesson(idx, patch)}
                      onRemove={() => removeLesson(idx)}
                      onMove={(dir) => moveLesson(idx, dir)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Publishing</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={data.status} onValueChange={(v) => setField('status', v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft (hidden)</SelectItem>
                      <SelectItem value="published">Published (visible)</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="isFeatured" className="cursor-pointer">Featured</Label>
                    <p className="text-xs text-muted-foreground">Show on dashboard highlight</p>
                  </div>
                  <Switch id="isFeatured" checked={data.isFeatured} onCheckedChange={(v) => setField('isFeatured', v)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="isMandatory" className="cursor-pointer">Mandatory</Label>
                    <p className="text-xs text-muted-foreground">Required for all employees</p>
                  </div>
                  <Switch id="isMandatory" checked={data.isMandatory} onCheckedChange={(v) => setField('isMandatory', v)} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4 flex items-start gap-3">
                <Youtube className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-sm">Private YouTube Integration</p>
                  <p className="text-muted-foreground">Video lessons use YouTube URLs (e.g. <code className="text-amber-700 dark:text-amber-400">watch?v=</code> or <code className="text-amber-700 dark:text-amber-400">youtu.be/</code>).</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function LessonEditor({
  lesson, index, total, onChange, onRemove, onMove,
}: {
  lesson: Lesson
  index: number
  total: number
  onChange: (patch: Partial<Lesson>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const TypeIcon = LESSON_TYPES.find((t) => t.value === lesson.type)?.icon || FileText
  const ytId = lesson.type === 'video' ? extractYouTubeId(lesson.content) : null

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 mt-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move up">
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move down">
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 grid gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{index + 1}</span>
            <TypeIcon className="h-3.5 w-3.5 text-primary" />
            <Badge variant="outline" className="text-[10px] capitalize">{lesson.type}</Badge>
          </div>
          <Input value={lesson.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Lesson title" className="h-8 text-sm" />
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
            <Select value={lesson.type} onValueChange={(v) => onChange({ type: v })}>
              <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LESSON_TYPES.map((tp) => <SelectItem key={tp.value} value={tp.value}>{tp.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input type="number" min={0} value={lesson.durationMinutes} onChange={(e) => onChange({ durationMinutes: Number(e.target.value) })} className="h-8 text-sm" />
              <span className="text-xs text-muted-foreground shrink-0">min</span>
            </div>
          </div>
          {lesson.type === 'video' && (
            <div className="space-y-1.5">
              <Label className="text-xs">YouTube URL</Label>
              <Input value={lesson.content} onChange={(e) => onChange({ content: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="h-8 text-sm" />
              {ytId ? (
                <div className="aspect-video w-full max-w-xs rounded overflow-hidden border bg-muted">
                  <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt={lesson.title} className="w-full h-full object-cover" />
                </div>
              ) : lesson.content ? <p className="text-xs text-amber-600">Invalid YouTube URL</p> : null}
            </div>
          )}
          {lesson.type === 'text' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Content</Label>
              <Textarea value={lesson.content} onChange={(e) => onChange({ content: e.target.value })} placeholder="Lesson content..." rows={4} className="text-sm" />
            </div>
          )}
          {(lesson.type === 'pdf' || lesson.type === 'audio' || lesson.type === 'gallery' || lesson.type === 'ppt') && (
            <div className="space-y-1.5">
              <Label className="text-xs">File path / URL</Label>
              <Input value={lesson.content} onChange={(e) => onChange({ content: e.target.value })} placeholder="https://... or /files/..." className="h-8 text-sm" />
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0" aria-label="Remove lesson">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

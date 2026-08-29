import * as React from 'react'
import { Head, Link, router } from '@inertiajs/react'
import {
  BookOpen, Search, Plus, Clock, BarChart3, User as UserIcon,
  CheckCircle2, Sparkles, GraduationCap, Filter, X,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CourseListItem {
  id: string
  title: string
  slug: string
  description: string
  thumbnail: string | null
  durationHours: number
  difficulty: string
  isFeatured: boolean
  isMandatory: boolean
  deadlineDays: number
  publishedAt: string | null
  category: { id: string; name: string; slug: string; icon: string | null } | null
  instructor: { id: string; name: string } | null
  lessonsCount: number
  enrolled: boolean
  enrollment: { id: string; status: string; progressPercent: number } | null
}
interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
}

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

function difficultyColor(d: string): string {
  switch (d) {
    case 'beginner': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
    case 'intermediate': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
    case 'advanced': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

function thumbEmoji(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('coffee') || lower.includes('brew') || lower.includes('espresso')) return '☕'
  if (lower.includes('service') || lower.includes('customer')) return '🤝'
  if (lower.includes('safety') || lower.includes('compliance')) return '🦺'
  if (lower.includes('manage') || lower.includes('leader')) return '📊'
  if (lower.includes('sell') || lower.includes('market')) return '📈'
  if (lower.includes('food') || lower.includes('sop')) return '🥗'
  return '🎓'
}

export default function CoursesIndex({
  courses, categories, filters, canCreate,
}: {
  courses: CourseListItem[]
  categories: Category[]
  filters: { search?: string; category?: string; difficulty?: string }
  canCreate: boolean
}) {
  const { t } = useI18n()
  const [search, setSearch] = React.useState(filters.search || '')
  const [activeCategory, setActiveCategory] = React.useState(filters.category || '')
  const [activeDifficulty, setActiveDifficulty] = React.useState(filters.difficulty || '')
  const [enrollingId, setEnrollingId] = React.useState<string | null>(null)

  function applyFilters(overrides: Record<string, string> = {}) {
    const params: Record<string, string> = { search, category: activeCategory, difficulty: activeDifficulty, ...overrides }
    const query: Record<string, string> = {}
    if (params.search.trim()) query.search = params.search.trim()
    if (params.category) query.category = params.category
    if (params.difficulty) query.difficulty = params.difficulty
    router.get('/courses', query, { preserveState: true, replace: true })
  }

  React.useEffect(() => {
    const id = setTimeout(() => applyFilters(), 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function handleEnroll(course: CourseListItem) {
    setEnrollingId(course.id)
    router.post(`/courses/${course.id}/enroll`, {}, {
      onSuccess: () => router.visit(`/courses/${course.id}`),
      onError: () => toast.error('Could not enroll in this course'),
      onFinish: () => setEnrollingId(null),
    })
  }

  return (
    <AppLayout>
      <Head title="Courses" />
      <div className="space-y-5">
        <ModuleHeader
          title="Course Catalog"
          description="Browse courses and continue your learning journey"
          icon={BookOpen}
          actions={
            canCreate ? (
              <Button asChild className="bg-amber-600 hover:bg-amber-700">
                <Link href="/courses/create">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('course.new')}</span>
                </Link>
              </Button>
            ) : undefined
          }
        />

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('course.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1" aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
                  <Filter className="h-3 w-3" /> {t('common.filter')}:
                </span>
                <button
                  onClick={() => { setActiveCategory(''); applyFilters({ category: '' }) }}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors border', activeCategory === '' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent border-border')}
                >
                  {t('common.all')}
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setActiveCategory(c.slug); applyFilters({ category: c.slug }) }}
                    className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors border flex items-center gap-1', activeCategory === c.slug ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent border-border')}
                  >
                    {c.icon && <span>{c.icon}</span>}
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">{t('course.difficulty')}:</span>
              <button
                onClick={() => { setActiveDifficulty(''); applyFilters({ difficulty: '' }) }}
                className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors border', activeDifficulty === '' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent border-border')}
              >
                {t('common.all')}
              </button>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => { setActiveDifficulty(d.value); applyFilters({ difficulty: d.value }) }}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors border', activeDifficulty === d.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent border-border')}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">{courses.length} course{courses.length === 1 ? '' : 's'} available</p>

        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <EmptyState
                icon={BookOpen}
                title="No courses found"
                description="Try adjusting your search or filters to find what you're looking for."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} onEnroll={() => handleEnroll(c)} enrolling={enrollingId === c.id} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function CourseCard({ course, onEnroll, enrolling }: { course: CourseListItem; onEnroll: () => void; enrolling: boolean }) {
  const { t } = useI18n()
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow flex flex-col group">
      <Link
        href={`/courses/${course.id}`}
        className="relative h-32 bg-gradient-to-br from-primary/15 via-amber-500/10 to-primary/5 flex items-center justify-center text-5xl group-hover:scale-105 transition-transform"
      >
        <span>{course.thumbnail || thumbEmoji(course.title)}</span>
        {course.isFeatured && (
          <Badge className="absolute top-2 right-2 bg-amber-500 text-white border-amber-500">
            <Sparkles className="h-3 w-3" /> Featured
          </Badge>
        )}
        {course.isMandatory && (
          <Badge variant="destructive" className="absolute top-2 left-2">Required</Badge>
        )}
      </Link>
      <CardContent className="p-4 flex-1 flex flex-col gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {course.category && (
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                {course.category.icon && <span>{course.category.icon}</span>}
                {course.category.name}
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-[10px] capitalize', difficultyColor(course.difficulty))}>
              <BarChart3 className="h-2.5 w-2.5" />
              {course.difficulty}
            </Badge>
          </div>
          <Link href={`/courses/${course.id}`} className="text-left font-semibold leading-snug line-clamp-2 hover:text-primary transition-colors block">
            {course.title}
          </Link>
          <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{course.lessonsCount} {t('course.lessons')}</span>
          {course.durationHours > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.durationHours}h</span>}
          {course.instructor && <span className="flex items-center gap-1 truncate"><UserIcon className="h-3 w-3" />{course.instructor.name.split(' ')[0]}</span>}
        </div>

        {course.enrolled && course.enrollment ? (
          <Button asChild variant="default" className="w-full bg-primary">
            <Link href={`/courses/${course.id}`}>
              <CheckCircle2 className="h-4 w-4" />
              {course.enrollment.status === 'completed' ? t('course.completed') : t('course.continue')}
              {course.enrollment.status !== 'completed' && course.enrollment.progressPercent > 0 && (
                <span className="ml-1 text-xs opacity-80">({course.enrollment.progressPercent}%)</span>
              )}
            </Link>
          </Button>
        ) : (
          <Button onClick={onEnroll} disabled={enrolling} className="w-full bg-amber-600 hover:bg-amber-700">
            {enrolling ? 'Enrolling...' : (<><GraduationCap className="h-4 w-4" />{t('course.enroll')}</>)}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

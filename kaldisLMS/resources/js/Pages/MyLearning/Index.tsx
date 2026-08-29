import * as React from 'react'
import { Head, Link, router } from '@inertiajs/react'
import {
  BookOpen, Clock, BarChart3, CheckCircle2, PlayCircle, Award, Calendar,
  TrendingUp, Sparkles,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState, StatCard } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Progress } from '@/Components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/Components/ui/tabs'
import { cn } from '@/lib/utils'

interface EnrollmentItem {
  id: string
  status: string
  progressPercent: number
  deadline: string | null
  completionDate: string | null
  completedLessons: number
  totalLessons: number
  course: {
    id: string; title: string; description: string; thumbnail: string | null
    difficulty: string; durationHours: number; isMandatory: boolean
    category: { id: string; name: string } | null
    instructor: { id: string; name: string } | null
  }
}

function deadlineInfo(d: string | null): { text: string; urgent: boolean } {
  if (!d) return { text: 'No deadline', urgent: false }
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (days <= 0) return { text: 'Overdue', urgent: true }
  if (days <= 3) return { text: `${days}d left`, urgent: true }
  return { text: new Date(d).toLocaleDateString(), urgent: false }
}

const THUMBS = ['☕', '🤝', '🥗', '📊', '🦺', '📈', '🍫', '🎓']

export default function MyLearningIndex({ enrollments, status }: { enrollments: EnrollmentItem[]; status: string }) {
  const { t } = useI18n()

  const activeCount = enrollments.filter((i) => i.status === 'active').length
  const completedCount = enrollments.filter((i) => i.status === 'completed').length
  const avgProgress = enrollments.length > 0 ? Math.round(enrollments.reduce((acc, i) => acc + i.progressPercent, 0) / enrollments.length) : 0

  function changeTab(tab: string) {
    router.get('/my-learning', { status: tab }, { preserveState: true })
  }

  return (
    <AppLayout>
      <Head title="My Learning" />
      <div className="space-y-5">
        <ModuleHeader
          title="My Learning"
          description="Track your enrolled courses and progress"
          icon={BookOpen}
          actions={<Button variant="outline" asChild><Link href="/courses">Browse Catalog</Link></Button>}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="In Progress" value={activeCount} icon={PlayCircle} color="primary" />
          <StatCard label="Completed" value={completedCount} icon={CheckCircle2} color="green" />
          <StatCard label="Avg Progress" value={`${avgProgress}%`} icon={TrendingUp} color="amber" />
          <StatCard label="Total Courses" value={enrollments.length} icon={BookOpen} color="primary" />
        </div>

        <Tabs value={status} onValueChange={changeTab}>
          <TabsList>
            <TabsTrigger value="active"><PlayCircle className="h-3.5 w-3.5" />In Progress</TabsTrigger>
            <TabsTrigger value="completed"><CheckCircle2 className="h-3.5 w-3.5" />Completed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <TabsContent value={status} className="mt-4">
            {enrollments.length === 0 ? (
              <Card>
                <CardContent className="py-10">
                  <EmptyState
                    icon={BookOpen}
                    title={status === 'completed' ? 'No completed courses yet' : status === 'active' ? 'No active courses' : 'No enrollments yet'}
                    description="Browse the catalog and enroll in your first course to start learning."
                    action={<Button asChild className="bg-amber-600 hover:bg-amber-700"><Link href="/courses">Browse Courses</Link></Button>}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrollments.map((enr, idx) => <EnrollmentCard key={enr.id} enr={enr} emoji={THUMBS[idx % THUMBS.length]} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

function EnrollmentCard({ enr, emoji }: { enr: EnrollmentItem; emoji: string }) {
  const { t } = useI18n()
  const isCompleted = enr.status === 'completed'
  const di = deadlineInfo(enr.deadline)
  const progress = enr.progressPercent

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <Link href={`/courses/${enr.course.id}`} className="relative h-24 bg-gradient-to-br from-primary/15 via-amber-500/10 to-primary/5 flex items-center justify-center text-4xl">
        <span>{enr.course.thumbnail || emoji}</span>
        {enr.course.isMandatory && <Badge variant="destructive" className="absolute top-2 left-2 text-[10px]">Required</Badge>}
        {isCompleted && <Badge className="absolute top-2 right-2 bg-emerald-600 text-white border-emerald-600 text-[10px]"><CheckCircle2 className="h-3 w-3" /> Done</Badge>}
      </Link>
      <CardContent className="p-4 flex-1 flex flex-col gap-2">
        {enr.course.category && <Badge variant="outline" className="text-[10px] border-primary/30 text-primary w-fit">{enr.course.category.name}</Badge>}
        <Link href={`/courses/${enr.course.id}`} className="text-left font-semibold text-sm leading-snug line-clamp-2 hover:text-primary transition-colors">{enr.course.title}</Link>
        <p className="text-xs text-muted-foreground line-clamp-2">{enr.course.description}</p>

        <div className="space-y-1.5 mt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{enr.completedLessons}/{enr.totalLessons} lessons</span>
            <span className={cn('font-medium', progress === 100 ? 'text-emerald-600' : 'text-primary')}>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /><span className="capitalize">{enr.course.difficulty}</span></span>
          {enr.course.durationHours > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{enr.course.durationHours}h</span>}
          {!isCompleted && enr.deadline && <Badge variant={di.urgent ? 'destructive' : 'outline'} className="text-[10px]"><Calendar className="h-2.5 w-2.5" />{di.text}</Badge>}
          {isCompleted && enr.completionDate && <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-400"><Award className="h-2.5 w-2.5" />{new Date(enr.completionDate).toLocaleDateString()}</Badge>}
        </div>

        <Button asChild variant={isCompleted ? 'outline' : 'default'} size="sm" className="w-full mt-auto">
          <Link href={`/courses/${enr.course.id}`}>
            {isCompleted ? <><BookOpen className="h-4 w-4" /> Review</> : progress > 0 ? <><PlayCircle className="h-4 w-4" /> {t('course.continue')}</> : <><Sparkles className="h-4 w-4" /> {t('course.start')}</>}
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

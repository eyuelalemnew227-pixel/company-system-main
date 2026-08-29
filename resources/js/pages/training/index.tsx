import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  BookOpen,
  Award,
  FileCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Trophy,
  Users,
  PlayCircle,
  Plus
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'Overview', href: '/training/dashboard' },
];

export default function TrainingDashboard({ stats, myEnrollments = [], topLeaderboard = [], featuredCourses = [] }: any) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Training Management System" />
      <div className="space-y-8 p-4 md:p-6">
        
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 p-8 text-white shadow-xl">
          <div className="relative z-10 space-y-4 max-w-2xl">
            <Badge className="bg-amber-500/30 text-amber-100 hover:bg-amber-500/40 border-none px-3 py-1">
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-300" /> Training & Development
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Training Management System
            </h1>
            <p className="text-amber-100 text-sm md:text-base leading-relaxed">
              Empower your skills through corporate training programs, interactive quizzes, SOP compliance, digital certificates, and team leaderboards.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link href="/training/courses">
                <Button className="bg-white text-amber-950 hover:bg-amber-100 font-semibold shadow-md">
                  <BookOpen className="mr-2 h-4 w-4" /> Explore Courses
                </Button>
              </Link>
              <Link href="/training/agendas">
                <Button className="bg-purple-800 text-white hover:bg-purple-900 font-semibold shadow-md">
                  <FileCheck className="mr-2 h-4 w-4" /> Department Agendas
                </Button>
              </Link>
              <Link href="/training/schedules">
                <Button className="bg-emerald-800 text-white hover:bg-emerald-900 font-semibold shadow-md">
                  <Clock className="mr-2 h-4 w-4" /> Master Timetables
                </Button>
              </Link>
              <Link href="/training/my-learning">
                <Button variant="outline" className="border-amber-400/50 text-white hover:bg-amber-800/50 font-semibold">
                  <Award className="mr-2 h-4 w-4" /> My Learning Hub
                </Button>
              </Link>
            </div>
          </div>
          <div className="absolute right-6 -bottom-6 opacity-20 pointer-events-none hidden md:block">
            <GraduationCap className="h-72 w-72 text-white" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Published Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.total_courses || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Available in catalog</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Total Enrollments</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.total_enrollments || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all staff</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Completions</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.completed_courses || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Finished programs</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Certificates Issued</CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.total_certificates || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Verified credentials</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Active SOPs</CardTitle>
              <FileCheck className="h-4 w-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.pending_sops || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Compliance docs</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Section: My Enrollments & Top Leaderboard */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Left Column: My Current Courses */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">My In-Progress Courses</CardTitle>
                  <CardDescription>Continue where you left off</CardDescription>
                </div>
                <Link href="/training/my-learning">
                  <Button variant="ghost" size="sm" className="text-amber-700 dark:text-amber-300">
                    View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {myEnrollments.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <BookOpen className="mx-auto h-10 w-10 opacity-40 mb-2" />
                    <p className="text-sm">You are not currently enrolled in any active course.</p>
                    <Link href="/training/courses" className="mt-3 inline-block">
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                        Browse Catalog
                      </Button>
                    </Link>
                  </div>
                ) : (
                  myEnrollments.map((item: any) => (
                    <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/40 transition-all gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-semibold">
                            {item.course?.category?.name || 'General'}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="mr-1 h-3 w-3" /> {item.course?.duration_hours}h
                          </span>
                        </div>
                        <h4 className="font-semibold text-foreground text-base">{item.course?.title}</h4>
                        <div className="w-full bg-muted rounded-full h-2 max-w-xs mt-2 overflow-hidden">
                          <div
                            className="bg-amber-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${item.progress_percent || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{item.progress_percent || 0}% completed</span>
                      </div>
                      <Link href={`/training/courses/${item.course_id}`}>
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                          <PlayCircle className="mr-1.5 h-4 w-4" /> Continue
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Featured Courses Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground flex items-center">
                  <Sparkles className="mr-2 h-5 w-5 text-amber-500" /> Featured Training Programs
                </h3>
                <Link href="/training/courses" className="text-sm font-medium text-amber-600 hover:underline">
                  View Catalog
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {featuredCourses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No featured courses at the moment.</p>
                ) : (
                  featuredCourses.map((c: any) => (
                    <Card key={c.id} className="overflow-hidden hover:shadow-lg transition-all flex flex-col">
                      <div className="h-36 bg-gradient-to-br from-amber-500 to-amber-700 p-4 text-white flex flex-col justify-between">
                        <Badge className="w-max bg-black/30 border-none text-white text-xs">
                          {c.difficulty || 'Beginner'}
                        </Badge>
                        <h4 className="font-bold text-lg line-clamp-2">{c.title}</h4>
                      </div>
                      <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                          <span>{c.lessons?.length || 0} Lessons</span>
                          <Link href={`/training/courses/${c.id}`}>
                            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold">
                              View Course
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Leaderboard & Quick Tools */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center">
                  <Trophy className="mr-2 h-5 w-5 text-amber-500" /> Top Achievers
                </CardTitle>
                <CardDescription>Company Learning Leaderboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topLeaderboard.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No leaderboard data calculated yet.</p>
                ) : (
                  topLeaderboard.map((ranker: any, idx: number) => (
                    <div key={ranker.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          idx === 0 ? 'bg-amber-400 text-amber-950' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {ranker.employee?.first_name} {ranker.employee?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ranker.employee?.branch?.name || 'HQ'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-bold text-xs">
                        {ranker.points} pts
                      </Badge>
                    </div>
                  ))
                )}
                <div className="pt-2">
                  <Link href="/training/leaderboard">
                    <Button variant="outline" className="w-full text-xs font-semibold">
                      Full Leaderboard
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card className="shadow-sm border-amber-200 dark:border-amber-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/training/courses/create" className="block">
                  <Button variant="ghost" className="w-full justify-start text-xs font-medium h-9">
                    <Plus className="mr-2 h-4 w-4 text-amber-600" /> Create New Course
                  </Button>
                </Link>
                <Link href="/training/ai-quiz" className="block">
                  <Button variant="ghost" className="w-full justify-start text-xs font-medium h-9">
                    <Sparkles className="mr-2 h-4 w-4 text-purple-600" /> Generate AI Quiz
                  </Button>
                </Link>
                <Link href="/training/sop" className="block">
                  <Button variant="ghost" className="w-full justify-start text-xs font-medium h-9">
                    <FileCheck className="mr-2 h-4 w-4 text-emerald-600" /> SOP Compliance Hub
                  </Button>
                </Link>
                <Link href="/training/certificates/verify" className="block">
                  <Button variant="ghost" className="w-full justify-start text-xs font-medium h-9">
                    <Award className="mr-2 h-4 w-4 text-blue-600" /> Verify Certificate
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Kaldi's Coffee YouTube Channel Link Card */}
            <Card className="shadow-sm border-red-200 dark:border-red-950 bg-gradient-to-br from-red-50/50 to-white dark:from-red-950/20 dark:to-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-red-900 dark:text-red-200 flex items-center">
                  <PlayCircle className="mr-2 h-4 w-4 text-red-600" /> Kaldi's Coffee YouTube Channel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Access all official video training courses, barista demonstrations, and brewing tutorials directly on YouTube.
                </p>
                <a
                  href="https://www.youtube.com/@KaldisCoffeeEthiopia"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9">
                    Visit YouTube Channel ↗
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}

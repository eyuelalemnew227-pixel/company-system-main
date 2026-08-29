import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  PlayCircle,
  ShieldCheck,
  Trophy,
  Zap
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'My Learning Hub', href: '/training/my-learning' },
];

export default function MyLearning({ enrollments = [], certificates = [], badges = [], streak = null }: any) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'certificates' | 'badges'>('active');

  const activeEnrollments = enrollments.filter((e: any) => e.status === 'active');
  const completedEnrollments = enrollments.filter((e: any) => e.status === 'completed');

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="My Learning Hub" />
      <div className="space-y-8 p-4 md:p-6 max-w-6xl mx-auto">
        
        {/* Top Header & Streak Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 p-6 md:p-8 rounded-2xl text-white shadow-xl">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center">
              <Award className="mr-3 h-8 w-8 text-amber-300" /> My Learning & Achievements
            </h1>
            <p className="text-amber-100 text-sm">
              Track your active corporate training, course progress, certificates, and earned skill badges.
            </p>
          </div>

          {/* Daily Learning Streak Widget */}
          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/30 flex items-center justify-center">
              <Flame className="h-7 w-7 text-amber-300 animate-bounce" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{streak?.current_streak || 1} Days</div>
              <p className="text-xs text-amber-200">Daily Learning Streak</p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b space-x-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'active'
                ? 'border-amber-600 text-amber-600 font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Active Courses ({activeEnrollments.length})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-3 transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'completed'
                ? 'border-amber-600 text-amber-600 font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" /> Completed ({completedEnrollments.length})
          </button>

          <button
            onClick={() => setActiveTab('certificates')}
            className={`pb-3 transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'certificates'
                ? 'border-amber-600 text-amber-600 font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="h-4 w-4" /> Certificates ({certificates.length})
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`pb-3 transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'badges'
                ? 'border-amber-600 text-amber-600 font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy className="h-4 w-4" /> Badges ({badges.length})
          </button>
        </div>

        {/* Active Courses Tab */}
        {activeTab === 'active' && (
          <div className="grid gap-6 sm:grid-cols-2">
            {activeEnrollments.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <BookOpen className="mx-auto h-12 w-12 opacity-30 mb-2" />
                <p className="font-medium text-base">No active courses in progress.</p>
                <Link href="/training/courses" className="mt-3 inline-block">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                    Explore Catalog
                  </Button>
                </Link>
              </div>
            ) : (
              activeEnrollments.map((item: any) => (
                <Card key={item.id} className="shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{item.course?.category?.name || 'General'}</Badge>
                      <span className="text-xs text-muted-foreground">{item.progress_percent}% Complete</span>
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground mt-2">{item.course?.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-600 h-full rounded-full transition-all"
                        style={{ width: `${item.progress_percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                      <span>{item.course?.lessons?.length || 0} Lessons</span>
                      <Link href={`/training/courses/${item.course_id}`}>
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                          <PlayCircle className="mr-1.5 h-4 w-4" /> Resume
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Completed Tab */}
        {activeTab === 'completed' && (
          <div className="grid gap-6 sm:grid-cols-2">
            {completedEnrollments.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 opacity-30 mb-2 text-emerald-500" />
                <p className="font-medium text-base">You haven't completed any course yet.</p>
              </div>
            ) : (
              completedEnrollments.map((item: any) => (
                <Card key={item.id} className="shadow-sm border-emerald-200 dark:border-emerald-950">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-600 text-white text-xs">Completed</Badge>
                      <span className="text-xs text-muted-foreground">100% Passed</span>
                    </div>
                    <CardTitle className="text-lg font-bold mt-2">{item.course?.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/training/courses/${item.course_id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Review Content
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <div className="grid gap-6 sm:grid-cols-2">
            {certificates.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <Award className="mx-auto h-12 w-12 opacity-30 mb-2 text-purple-500" />
                <p className="font-medium text-base">No certificates earned yet. Pass a course quiz to earn your credentials!</p>
              </div>
            ) : (
              certificates.map((cert: any) => (
                <Card key={cert.id} className="shadow-md border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-purple-700 border-purple-300 font-mono text-[11px]">
                        {cert.certificate_number}
                      </Badge>
                      <ShieldCheck className="h-5 w-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg font-extrabold mt-2">{cert.course?.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Issued on: {new Date(cert.issue_date).toLocaleDateString()}
                    </p>
                    <Link href={`/training/certificates/verify?number=${cert.certificate_number}`}>
                      <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                        View Digital Certificate
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <div className="grid gap-4 sm:grid-cols-3">
            {badges.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <Trophy className="mx-auto h-12 w-12 opacity-30 mb-2 text-amber-500" />
                <p className="font-medium text-base">Earn badges by completing courses and maintaining daily streaks.</p>
              </div>
            ) : (
              badges.map((b: any) => (
                <Card key={b.id} className="text-center p-6 shadow-sm border">
                  <div className="h-16 w-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 mb-3">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <h4 className="font-bold text-base">{b.badge?.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{b.badge?.description}</p>
                </Card>
              ))
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
}

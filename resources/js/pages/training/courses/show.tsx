import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Clock,
  Award,
  Users,
  Plus,
  FileText,
  Video,
  HelpCircle,
  ArrowLeft,
  Lock,
  MessageSquare
} from 'lucide-react';
import { useState } from 'react';

export default function CourseShow({ course, isEnrolled, enrollment }: any) {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Training Management', href: '/training/dashboard' },
    { title: 'Courses', href: '/training/courses' },
    { title: course.title, href: `/training/courses/${course.id}` },
  ];

  const [showAddLessonModal, setShowAddLessonModal] = useState(false);

  const { data: lessonData, setData: setLessonData, post: postLesson, processing: lessonProcessing, reset: resetLesson } = useForm({
    title: '',
    type: 'video',
    youtube_url: '',
    content: '',
    duration_minutes: '15',
    sort_order: (course.lessons?.length || 0) + 1,
    completion_criteria: 'view',
    status: 'active',
  });

  const { post: postEnroll, processing: enrollProcessing } = useForm({});

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    postLesson(`/training/courses/${course.id}/lessons`, {
      onSuccess: () => {
        setShowAddLessonModal(false);
        resetLesson();
      },
    });
  };

  const handleEnroll = () => {
    postEnroll(`/training/courses/${course.id}/enroll`);
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={course.title} />
      <div className="space-y-8 p-4 md:p-6 max-w-6xl mx-auto">
        
        {/* Course Header Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-950 p-6 md:p-10 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-500/30 text-amber-100 border-none">
                {course.category?.name || 'General Training'}
              </Badge>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100 capitalize">
                {course.difficulty}
              </Badge>
              {course.is_mandatory && (
                <Badge className="bg-red-500 text-white font-bold text-xs uppercase">
                  Mandatory Training
                </Badge>
              )}
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">{course.title}</h1>
            <p className="text-amber-100/90 text-sm md:text-base leading-relaxed line-clamp-3">
              {course.description}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-xs text-amber-200/90 pt-2">
              <span className="flex items-center"><Clock className="mr-1.5 h-4 w-4" /> {course.duration_hours} Hours</span>
              <span className="flex items-center"><Award className="mr-1.5 h-4 w-4" /> Passing Score: {course.passing_score}%</span>
              <span className="flex items-center"><BookOpen className="mr-1.5 h-4 w-4" /> {course.lessons?.length || 0} Lessons</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 text-center w-full md:w-64 space-y-4">
            {isEnrolled ? (
              <div className="space-y-3">
                <Badge className="bg-emerald-500 text-white w-full py-1 text-xs justify-center font-bold">
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Enrolled
                </Badge>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-amber-100">
                    <span>Progress</span>
                    <span>{enrollment?.progress_percent || 0}%</span>
                  </div>
                  <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all"
                      style={{ width: `${enrollment?.progress_percent || 0}%` }}
                    />
                  </div>
                </div>
                {course.lessons && course.lessons.length > 0 && (
                  <Link href={`/training/lessons/${course.lessons[0].id}`}>
                    <Button className="w-full bg-white text-amber-950 hover:bg-amber-100 font-bold">
                      <PlayCircle className="mr-2 h-4 w-4" /> Resume Course
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={handleEnroll}
                  disabled={enrollProcessing}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold text-base py-6 shadow"
                >
                  Enroll Now
                </Button>
                <p className="text-[11px] text-amber-200">Instant access to all lessons & quiz</p>
              </div>
            )}
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Left 2 Columns: Curriculum & Lessons */}
          <div className="lg:col-span-2 space-y-6">
            
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">Course Curriculum</CardTitle>
                  <CardDescription>Lessons & Modules required for completion</CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddLessonModal(true)}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add Lesson
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {course.lessons?.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <BookOpen className="mx-auto h-10 w-10 opacity-30" />
                    <p className="text-sm">No lessons added to this course yet.</p>
                  </div>
                ) : (
                  course.lessons.map((lesson: any, index: number) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/40 transition-all gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 font-bold text-xs">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{lesson.title}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {lesson.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center">
                            <Clock className="mr-1 h-3 w-3" /> {lesson.duration_minutes} minutes
                          </p>
                        </div>
                      </div>

                      {isEnrolled ? (
                        <Link href={`/training/lessons/${lesson.id}`}>
                          <Button size="sm" variant="secondary" className="font-semibold">
                            <PlayCircle className="mr-1.5 h-4 w-4 text-amber-600" /> View Lesson
                          </Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="ghost" disabled className="text-xs text-muted-foreground">
                          <Lock className="mr-1 h-3.5 w-3.5" /> Enrol to Access
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Course Quizzes */}
            {course.quizzes && course.quizzes.length > 0 && (
              <Card className="shadow-sm border-purple-200 dark:border-purple-900">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center">
                    <HelpCircle className="mr-2 h-5 w-5 text-purple-600" /> End-of-Course Assessment
                  </CardTitle>
                  <CardDescription>Pass the test to earn your certificate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {course.quizzes.map((quiz: any) => (
                    <div key={quiz.id} className="flex items-center justify-between p-4 rounded-xl border bg-purple-50/50 dark:bg-purple-950/20">
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{quiz.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Pass Mark: {quiz.pass_mark}% • Time Limit: {quiz.time_limit_minutes} mins
                        </p>
                      </div>
                      {isEnrolled ? (
                        <Link href={`/training/quizzes/${quiz.id}/take`}>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                            Take Quiz
                          </Button>
                        </Link>
                      ) : (
                        <Badge variant="outline">Enrol to take quiz</Badge>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          </div>

          {/* Right Column: Instructor & Details */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">Course Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Instructor</span>
                  <span className="font-semibold text-foreground">{course.instructor?.name || 'Training Dept'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Difficulty</span>
                  <span className="font-semibold text-foreground capitalize">{course.difficulty}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Enrollment Type</span>
                  <span className="font-semibold text-foreground capitalize">{course.enrollment_type}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Max Quiz Attempts</span>
                  <span className="font-semibold text-foreground">{course.max_attempts} attempts</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Deadline Window</span>
                  <span className="font-semibold text-foreground">{course.deadline_days} Days</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4 text-amber-600" /> Course Discussion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Join the course forum to post questions and collaborate with colleagues.
                </p>
                <Link href="/training/forums">
                  <Button variant="outline" className="w-full text-xs font-semibold">
                    Open Community Forum
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Modal: Add Lesson */}
        {showAddLessonModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-2xl bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Add Lesson to Course</CardTitle>
                <CardDescription>Create text, video, or document content module.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddLesson} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="l_title">Lesson Title *</Label>
                    <Input
                      id="l_title"
                      value={lessonData.title}
                      onChange={(e) => setLessonData('title', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="l_type">Content Type</Label>
                      <select
                        id="l_type"
                        value={lessonData.type}
                        onChange={(e) => setLessonData('type', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="text">Rich Text / Reading</option>
                        <option value="video">Video Stream</option>
                        <option value="pdf">PDF Document</option>
                        <option value="ppt">Presentation Slides</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="l_duration">Duration (Minutes)</Label>
                      <Input
                        id="l_duration"
                        type="number"
                        value={lessonData.duration_minutes}
                        onChange={(e) => setLessonData('duration_minutes', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="l_youtube">YouTube Video URL (Kaldi's Coffee Channel)</Label>
                    <Input
                      id="l_youtube"
                      type="url"
                      placeholder="e.g. https://www.youtube.com/watch?v=L_LUpnjgPso or https://youtu.be/..."
                      value={lessonData.youtube_url}
                      onChange={(e) => setLessonData('youtube_url', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="l_content">Lesson Instructions / Overview</Label>
                    <Textarea
                      id="l_content"
                      rows={4}
                      value={lessonData.content}
                      onChange={(e) => setLessonData('content', e.target.value)}
                      placeholder="Enter detailed lesson instruction material..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <Button type="button" variant="ghost" onClick={() => setShowAddLessonModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={lessonProcessing} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                      Save Lesson
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </AppLayout>
  );
}

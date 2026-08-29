import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  FileText,
  Video,
  Download
} from 'lucide-react';

export default function LessonShow({ course, lesson, enrollment, progress }: any) {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Training Management', href: '/training/dashboard' },
    { title: 'Courses', href: '/training/courses' },
    { title: course.title, href: `/training/courses/${course.id}` },
    { title: lesson.title, href: `/training/lessons/${lesson.id}` },
  ];

  const { post: completePost, processing } = useForm({
    time_spent: 120,
  });

  const isCompleted = progress?.is_completed || false;

  const handleMarkComplete = () => {
    completePost(`/training/lessons/${lesson.id}/complete`);
  };

  const currentIdx = course.lessons?.findIndex((l: any) => l.id === lesson.id) ?? 0;
  const prevLesson = course.lessons?.[currentIdx - 1];
  const nextLesson = course.lessons?.[currentIdx + 1];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`${lesson.title} - ${course.title}`} />
      <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-semibold">
                Lesson {currentIdx + 1} of {course.lessons?.length || 1}
              </Badge>
              <Badge className="bg-amber-100 text-amber-900 border-none text-xs capitalize">
                {lesson.type}
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{lesson.title}</h1>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <Clock className="mr-1 h-3.5 w-3.5" /> Estimated duration: {lesson.duration_minutes} minutes
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/training/courses/${course.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Course Overview
              </Button>
            </Link>

            {isCompleted ? (
              <Badge className="bg-emerald-600 text-white font-bold py-1.5 px-3">
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Completed
              </Badge>
            ) : (
              <Button
                onClick={handleMarkComplete}
                disabled={processing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark as Complete
              </Button>
            )}
          </div>
        </div>

        {/* Lesson Viewer Box */}
        <Card className="shadow-md overflow-hidden border">
          <CardContent className="p-6 md:p-10 space-y-6">
            
            {/* Embedded YouTube Player if YouTube URL or Video type */}
            {(lesson.youtube_embed_url || lesson.type === 'video') && (
              <div className="space-y-2">
                <div className="w-full aspect-video rounded-xl overflow-hidden border shadow-lg bg-black">
                  {lesson.youtube_embed_url ? (
                    <iframe
                      src={lesson.youtube_embed_url}
                      title={lesson.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white p-6">
                      <Video className="h-16 w-16 text-amber-500 mb-3 animate-pulse" />
                      <h3 className="font-bold text-lg">{lesson.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">Kaldi's Coffee Video Training Module</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span className="flex items-center text-red-600 font-semibold">
                    <Video className="mr-1.5 h-3.5 w-3.5" /> Kaldi's Coffee YouTube Channel Video
                  </span>
                  {lesson.youtube_url && (
                    <a
                      href={lesson.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-amber-600 font-medium"
                    >
                      Watch on YouTube ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Rich Text / Document Content */}
            <div className="prose dark:prose-invert max-w-none space-y-4 leading-relaxed text-foreground text-sm md:text-base">
              {lesson.content ? (
                <div className="whitespace-pre-wrap">{lesson.content}</div>
              ) : (
                <p className="text-muted-foreground italic">
                  Review the training material carefully before completing this module.
                </p>
              )}
            </div>

            {/* Downloadable Attachment Section */}
            {lesson.file_path && (
              <div className="p-4 rounded-xl border bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold">Supplementary File Attachment</p>
                    <p className="text-xs text-muted-foreground">Download for reference</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="font-semibold">
                  <Download className="mr-1.5 h-4 w-4" /> Download
                </Button>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Bottom Stepper Navigation */}
        <div className="flex items-center justify-between pt-4">
          {prevLesson ? (
            <Link href={`/training/lessons/${prevLesson.id}`}>
              <Button variant="outline" className="font-semibold">
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous: {prevLesson.title}
              </Button>
            </Link>
          ) : <div />}

          {nextLesson ? (
            <Link href={`/training/lessons/${nextLesson.id}`}>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                Next: {nextLesson.title} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link href={`/training/courses/${course.id}`}>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Back to Course <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

      </div>
    </AppLayout>
  );
}

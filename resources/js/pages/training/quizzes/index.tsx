import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileQuestion, Plus, Clock, Award, PlayCircle } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'Quizzes & Tests', href: '/training/quizzes' },
];

export default function QuizzesIndex({ quizzes, courses = [] }: any) {
  const [showModal, setShowModal] = useState(false);

  const { data, setData, post, processing, reset } = useForm({
    course_id: '',
    title: '',
    time_limit_minutes: '30',
    pass_mark: '70',
    max_attempts: '3',
    status: 'active',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/training/quizzes', {
      onSuccess: () => {
        setShowModal(false);
        reset();
      },
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Quizzes & Assessments" />
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center">
              <FileQuestion className="mr-3 h-6 w-6 text-amber-600" /> Quizzes & Assessments
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive course quizzes, time limits, passing thresholds, and auto-scoring.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Create Quiz
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes?.data?.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <FileQuestion className="mx-auto h-12 w-12 opacity-30 mb-2" />
              <p className="font-medium text-base">No active quizzes created yet.</p>
            </div>
          ) : (
            quizzes?.data?.map((quiz: any) => (
              <Card key={quiz.id} className="shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{quiz.course?.title || 'General'}</Badge>
                    <Badge className="bg-emerald-600 text-white text-[10px] uppercase">Active</Badge>
                  </div>
                  <CardTitle className="text-lg font-bold mt-2">{quiz.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex justify-between text-xs text-muted-foreground border-t pt-3">
                    <span className="flex items-center"><Clock className="mr-1 h-3.5 w-3.5" /> {quiz.time_limit_minutes} mins</span>
                    <span className="flex items-center"><Award className="mr-1 h-3.5 w-3.5" /> Pass: {quiz.pass_mark}%</span>
                  </div>

                  <Link href={`/training/quizzes/${quiz.id}/take`}>
                    <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                      <PlayCircle className="mr-2 h-4 w-4" /> Start Quiz
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Modal: Create Quiz */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-2xl bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Create New Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Associated Course *</Label>
                    <select
                      value={data.course_id}
                      onChange={(e) => setData('course_id', e.target.value)}
                      className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select Course</option>
                      {courses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quiz Title *</Label>
                    <Input
                      value={data.title}
                      onChange={(e) => setData('title', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Time Limit (Mins)</Label>
                      <Input
                        type="number"
                        value={data.time_limit_minutes}
                        onChange={(e) => setData('time_limit_minutes', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pass Mark (%)</Label>
                      <Input
                        type="number"
                        value={data.pass_mark}
                        onChange={(e) => setData('pass_mark', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button type="submit" disabled={processing} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                      Save Assessment
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

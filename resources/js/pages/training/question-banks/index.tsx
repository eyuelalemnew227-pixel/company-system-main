import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Plus, Trash2, Search } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'Question Bank', href: '/training/question-banks' },
];

export default function QuestionBankIndex({ questions, categories = [] }: any) {
  const [showModal, setShowModal] = useState(false);

  const { data, setData, post, processing, reset, delete: destroy } = useForm({
    category_id: '',
    text: '',
    type: 'single',
    difficulty: 'medium',
    tags: '',
    answer_data: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/training/question-banks', {
      onSuccess: () => {
        setShowModal(false);
        reset();
      },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Delete this question from bank?')) {
      destroy(`/training/question-banks/${id}`);
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Question Bank Manager" />
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center">
              <HelpCircle className="mr-3 h-6 w-6 text-amber-600" /> Question Bank Repository
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage reusable questions for automated quiz assembly and AI generation.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Add Question
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-4">
            {questions?.data?.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <HelpCircle className="mx-auto h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No questions in bank yet.</p>
              </div>
            ) : (
              questions?.data?.map((q: any) => (
                <div key={q.id} className="flex items-start justify-between p-4 rounded-xl border bg-card hover:bg-accent/30 transition-all">
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[11px] capitalize">{q.type}</Badge>
                      <Badge className={`text-[10px] text-white capitalize ${
                        q.difficulty === 'easy' ? 'bg-emerald-600' : q.difficulty === 'medium' ? 'bg-amber-600' : 'bg-red-600'
                      }`}>
                        {q.difficulty}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{q.category?.name || 'General'}</span>
                    </div>
                    <p className="font-semibold text-sm text-foreground">{q.text}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(q.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Modal: Add Question */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-2xl bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Add Question to Bank</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Text *</Label>
                    <Textarea
                      rows={3}
                      value={data.text}
                      onChange={(e) => setData('text', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <select
                        value={data.type}
                        onChange={(e) => setData('type', e.target.value)}
                        className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="single">Single Choice</option>
                        <option value="multiple">Multiple Choice</option>
                        <option value="truefalse">True / False</option>
                        <option value="shortanswer">Short Answer</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <select
                        value={data.difficulty}
                        onChange={(e) => setData('difficulty', e.target.value)}
                        className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button type="submit" disabled={processing} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                      Save Question
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

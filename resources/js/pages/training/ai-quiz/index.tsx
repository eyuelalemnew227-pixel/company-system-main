import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Bot, CheckCircle2, HelpCircle } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'AI Quiz Generator', href: '/training/ai-quiz' },
];

export default function AiQuizGenerator({ courses = [] }: any) {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState('medium');
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/training/ai-quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: JSON.stringify({ topic, count, difficulty }),
      });

      const resData = await response.json();
      if (resData.questions) {
        setGeneratedQuestions(resData.questions);
      }
    } catch (err) {
      console.error('Failed to generate AI quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="AI Quiz Generator" />
      <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
        
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-900 p-6 md:p-8 text-white shadow-xl flex items-center justify-between">
          <div className="space-y-2">
            <Badge className="bg-purple-500/30 text-purple-200 border-none">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Learning Suite
            </Badge>
            <h1 className="text-2xl md:text-3xl font-extrabold">AI Quiz Generator</h1>
            <p className="text-purple-100 text-sm">
              Instantly generate course assessment questions and flashcards using AI topic intelligence.
            </p>
          </div>
          <Bot className="h-20 w-20 text-purple-300 opacity-40 hidden sm:block" />
        </div>

        {/* Generator Form */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Generator Settings</CardTitle>
            <CardDescription>Specify training topic or subject area for question extraction.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic / Subject *</Label>
                <Input
                  id="topic"
                  placeholder="e.g. Espresso Machine Maintenance & Daily Backflushing SOP"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="count">Number of Questions</Label>
                  <select
                    id="count"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 text-base"
              >
                {loading ? (
                  <span className="flex items-center">
                    <Sparkles className="mr-2 h-5 w-5 animate-spin" /> Generating AI Questions...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Sparkles className="mr-2 h-5 w-5" /> Generate AI Questions Now
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Output Generated Questions */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-foreground flex items-center">
              <CheckCircle2 className="mr-2 h-5 w-5 text-emerald-600" /> Generated Quiz Questions
            </h3>

            {generatedQuestions.map((q: any, idx: number) => (
              <Card key={idx} className="p-4 border border-purple-200 dark:border-purple-900 shadow-sm">
                <h4 className="font-bold text-sm text-foreground">
                  Q{idx + 1}: {q.text}
                </h4>
                <div className="grid gap-2 mt-3 sm:grid-cols-2">
                  {q.answers?.map((ans: any, aIdx: number) => (
                    <div
                      key={aIdx}
                      className={`p-2.5 rounded-lg border text-xs font-medium ${
                        ans.is_correct
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {ans.text} {ans.is_correct && '✓ (Correct)'}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  );
}

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function TakeQuiz({ quiz, previousAttemptsCount = 0 }: any) {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Training Management', href: '/training/dashboard' },
    { title: 'Quizzes', href: '/training/quizzes' },
    { title: quiz.title, href: `/training/quizzes/${quiz.id}/take` },
  ];

  const questions = quiz.questions || [];
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});
  const [secondsRemaining, setSecondsRemaining] = useState((quiz.time_limit_minutes || 30) * 60);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOptionSelect = (questionId: number, answerId: number) => {
    const updated = { ...userAnswers, [questionId]: answerId };
    setUserAnswers(updated);
  };

  const handleSubmitQuiz = () => {
    setSubmitting(true);
    router.post(`/training/quizzes/${quiz.id}/submit`, {
      responses: userAnswers,
      time_taken_seconds: (quiz.time_limit_minutes || 30) * 60 - secondsRemaining,
    }, {
      onFinish: () => setSubmitting(false),
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQuestion = questions[currentQIndex];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Quiz: ${quiz.title}`} />
      <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
        
        {/* Top Quiz Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-card shadow-sm gap-4">
          <div>
            <Badge variant="outline" className="text-xs">{quiz.course?.title}</Badge>
            <h1 className="text-xl font-extrabold text-foreground mt-1">{quiz.title}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-mono font-bold text-amber-600 text-lg bg-amber-50 dark:bg-amber-950/50 px-4 py-2 rounded-lg border border-amber-200">
              <Clock className="h-5 w-5 animate-pulse" /> {formatTime(secondsRemaining)}
            </div>

            <Button
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Submit Quiz
            </Button>
          </div>
        </div>

        {/* Question Stepper Progress */}
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          {questions.map((q: any, idx: number) => (
            <button
              key={q.id}
              onClick={() => setCurrentQIndex(idx)}
              className={`h-9 w-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                currentQIndex === idx
                  ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500'
                  : userAnswers[q.id]
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Current Question Card */}
        {currentQuestion ? (
          <Card className="shadow-md border">
            <CardHeader>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Question {currentQIndex + 1} of {questions.length}</span>
                <span>Points: {currentQuestion.points || 1}</span>
              </div>
              <CardTitle className="text-lg font-bold text-foreground mt-2">
                {currentQuestion.text}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {currentQuestion.answers?.map((ans: any) => {
                  const isSelected = userAnswers[currentQuestion.id] === ans.id;
                  return (
                    <div
                      key={ans.id}
                      onClick={() => handleOptionSelect(currentQuestion.id, ans.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-500'
                          : 'hover:bg-accent/40 border-border'
                      }`}
                    >
                      <span className="text-sm font-medium text-foreground">{ans.text}</span>
                      <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-muted-foreground'
                      }`}>
                        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  disabled={currentQIndex === 0}
                  onClick={() => setCurrentQIndex(currentQIndex - 1)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>

                {currentQIndex < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQIndex(currentQIndex + 1)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitQuiz}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Finish & Submit <CheckCircle2 className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-center text-muted-foreground py-12">No questions loaded in quiz.</p>
        )}

      </div>
    </AppLayout>
  );
}

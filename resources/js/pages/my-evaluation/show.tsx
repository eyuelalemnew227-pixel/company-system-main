import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { useMemo, useState } from 'react';

type Period = { id: number; evaluation_period_name: string };
type Evaluatee = { user_id?: number | null; name: string; email?: string | null };
type Question = { id: number; question_text: string };

export default function MyEvaluationShow({ evaluation, evaluationPeriods, evaluatees, evaluableType, alreadyEvaluatedByPeriod, questions }: {
  evaluation: { id: number; name?: string };
  evaluationPeriods: Period[];
  evaluatees: { id: number; label: string }[];
  evaluableType: 'employee' | 'department' | 'branch' | 'other';
  alreadyEvaluatedByPeriod: Record<string, number[]>;
  questions: Question[];
}) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  const pendingEvaluatees = useMemo(() => {
    const periodKey = selectedPeriodId || '';
    const alreadyForPeriod = new Set((alreadyEvaluatedByPeriod?.[periodKey] || []));
    const list = Array.isArray(evaluatees) ? evaluatees : [];
    return list.filter((e) => !alreadyForPeriod.has(e.id));
  }, [evaluatees, alreadyEvaluatedByPeriod, selectedPeriodId]);

  const { data, setData, post, processing, errors, reset } = useForm({
    evaluation_period_id: '',
    evaluable_type: evaluableType,
    evaluate_id: '',
    comment: '',
    question_responses: [] as { question_id: number; score: number }[],
  });

  const onSelectEvaluatee = (val: string) => {
    setSelectedUserId(val);
    setData('evaluate_id', val);
  };

  const onSelectPeriod = (val: string) => {
    setSelectedPeriodId(val);
    setData('evaluation_period_id', val);
  };

  const initResponsesIfEmpty = () => {
    if (!data.question_responses.length) {
      setData('question_responses', questions.map((q) => ({ question_id: q.id, score: 3 })));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/my-evaluation/${evaluation.id}`);
  };

  return (
    <AppLayout>
      <Head title={evaluation.name || 'Evaluate'} />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{evaluation.name || 'Evaluation'}</h1>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Fill Evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Evaluation Period</Label>
                  <Select value={selectedPeriodId} onValueChange={onSelectPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select active period" />
                    </SelectTrigger>
                    <SelectContent>
                      {evaluationPeriods.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.evaluation_period_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <InputError message={errors.evaluation_period_id as any} />
                </div>

                <div className="space-y-2">
                  <Label>Evaluate ({evaluableType})</Label>
                  <Select value={selectedUserId} onValueChange={(v) => { onSelectEvaluatee(v); initResponsesIfEmpty(); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select evaluate" />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingEvaluatees.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id.toString()}>
                          {ev.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <InputError message={errors.evaluate_id as any} />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Questions</Label>
                {(questions || []).map((q, idx) => (
                  <div key={q.id} className="flex items-center justify-between rounded border p-3">
                    <div className="pr-4">{q.question_text}</div>
                    <Select
                      value={(data.question_responses[idx]?.score ?? 3).toString()}
                      onValueChange={(v) => {
                        const next = [...data.question_responses];
                        next[idx] = { question_id: q.id, score: parseInt(v) };
                        setData('question_responses', next);
                      }}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Score" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Poor</SelectItem>
                        <SelectItem value="2">2 - Fair</SelectItem>
                        <SelectItem value="3">3 - Good</SelectItem>
                        <SelectItem value="4">4 - Very Good</SelectItem>
                        <SelectItem value="5">5 - Excellent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <InputError message={errors.question_responses as any} />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={processing}>Submit</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}



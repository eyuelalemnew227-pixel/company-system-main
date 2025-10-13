import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MyResultsShow({ response }: { response: any }) {
  const avg = response.question_responses.length
    ? (
        response.question_responses.reduce((acc: number, r: any) => acc + (r.score || 0), 0) /
        response.question_responses.length
      ).toFixed(2)
    : null;

  return (
    <AppLayout>
      <Head title="Evaluation Result" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{response.evaluation?.name || 'Evaluation Result'}</h1>
        </div>

        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm text-gray-700">
              <div>Evaluation Period: {response.evaluation_period || 'N/A'}</div>
              <div>Evaluator: {response.evaluator || 'N/A'}</div>
              <div>Average Score: {avg ?? 'N/A'}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Question Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {response.question_responses.map((qr: any, idx: number) => (
                <div key={idx} className="flex items-start justify-between rounded border p-3">
                  <div className="pr-4">{qr.question_text}</div>
                  <div className="font-medium">{qr.score}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}



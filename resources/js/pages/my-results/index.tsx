import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MyResultsIndex({ items }: { items: any[] }) {
  return (
    <AppLayout>
      <Head title="My Evaluation Results" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Evaluation Results</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submissions About Me</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-gray-500">No evaluations yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <div className="font-medium">{it.evaluation?.name || `Evaluation #${it.evaluation?.id}`}</div>
                      <div className="text-sm text-gray-600">
                        Period: {it.evaluation_period || 'N/A'} · Evaluator: {it.evaluator || 'N/A'} · Avg Score: {it.average_score ?? 'N/A'}
                      </div>
                    </div>
                    <Button asChild variant="outline">
                      <Link href={`/my-results/${it.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}



import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Item = {
  id: number;
  evaluation: { id: number; name?: string | null };
  evaluable_type: 'employee' | 'department' | 'branch' | 'other';
  evaluate_label: string;
  evaluation_period?: string | null;
  is_editable: boolean;
  created_at?: string | null;
};

export default function MyEvaluationHistory({ items }: { items: Item[] }) {
  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to cancel/delete this evaluation?')) {
      router.delete(`/my-evaluation/response/${id}`);
    }
  };
  return (
    <AppLayout>
      <Head title="My Evaluation History" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Evaluation History</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-gray-500">No submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <div className="font-medium">{it.evaluation.name || `Evaluation #${it.evaluation.id}`}</div>
                      <div className="text-sm text-gray-600">{it.evaluable_type} · {it.evaluate_label} · {it.evaluation_period || 'No period'} · {it.created_at}</div>
                    </div>
                    {it.is_editable && (
                      <div className="space-x-2">
                        <Button asChild variant="outline">
                          <Link href={`/my-evaluation/response/${it.id}/edit`}>Edit</Link>
                        </Button>
                        <Button variant="destructive" onClick={() => handleDelete(it.id)}>Cancel</Button>
                      </div>
                    )}
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



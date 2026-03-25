import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';

type Department = { id: number; name: string };

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Ticket Settings', href: '/ticket-main-categories' },
  { title: 'Main Categories', href: '/ticket-main-categories' },
  { title: 'Create', href: '/ticket-main-categories/create' },
];

export default function TicketMainCategoryCreate({ departments }: { departments: Department[] }) {
  const { data, setData, post, processing, errors } = useForm({
    department_id: '',
    name: '',
    is_active: true,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/ticket-main-categories');
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Create Main Category" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Create Main Category</CardTitle>
            <Button asChild variant="outline">
              <Link href="/ticket-main-categories">Back</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Department</Label>
              <select
                className="w-full rounded border px-3 py-2"
                value={data.department_id}
                onChange={(e) => setData('department_id', e.target.value)}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.department_id && <p className="text-sm text-red-600">{errors.department_id}</p>}
            </div>

            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={data.name} onChange={(e) => setData('name', e.target.value)} />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={data.is_active} onCheckedChange={(v) => setData('is_active', v)} />
              <Label>Active</Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button disabled={processing} onClick={submit}>
              Save
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}

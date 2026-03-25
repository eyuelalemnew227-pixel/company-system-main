import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';

type MainCategory = { id: number; name: string; department?: { name: string } };
type SubCategory = {
  id: number;
  ticket_main_category_id: number;
  name: string;
  is_active: boolean;
};

const breadcrumbsBase: BreadcrumbItem[] = [
  { title: 'Ticket Settings', href: '/ticket-main-categories' },
  { title: 'Sub Categories', href: '/ticket-sub-categories' },
];

export default function TicketSubCategoryEdit({ subCategory, mainCategories }: { subCategory: SubCategory; mainCategories: MainCategory[] }) {
  const { data, setData, put, processing, errors } = useForm({
    ticket_main_category_id: subCategory.ticket_main_category_id.toString(),
    name: subCategory.name,
    is_active: subCategory.is_active,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    put(`/ticket-sub-categories/${subCategory.id}`);
  };

  return (
    <AppLayout breadcrumbs={[...breadcrumbsBase, { title: 'Edit', href: `/ticket-sub-categories/${subCategory.id}/edit` }]}>
      <Head title="Edit Sub Category" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Edit Sub Category</CardTitle>
            <Button asChild variant="outline">
              <Link href="/ticket-sub-categories">Back</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Main Category</Label>
              <select
                className="w-full rounded border px-3 py-2"
                value={data.ticket_main_category_id}
                onChange={(e) => setData('ticket_main_category_id', e.target.value)}
              >
                <option value="">Select main category</option>
                {mainCategories.map((mc) => (
                  <option key={mc.id} value={mc.id}>
                    {mc.name} {mc.department?.name ? `(${mc.department.name})` : ''}
                  </option>
                ))}
              </select>
              {errors.ticket_main_category_id && <p className="text-sm text-red-600">{errors.ticket_main_category_id}</p>}
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

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';

type Department = { id: number; name: string };
type MainCategory = { id: number; name: string };
type SubCategory = { id: number; name: string; main_category?: { name: string } };
type Asset = {
  id: number;
  department_id: number;
  ticket_main_category_id?: number | null;
  ticket_sub_category_id?: number | null;
  name: string;
  article_code?: string | null;
  bar_code?: string | null;
  is_active: boolean;
};

const breadcrumbsBase: BreadcrumbItem[] = [
  { title: 'Ticket Settings', href: '/ticket-main-categories' },
  { title: 'Assets', href: '/ticket-assets' },
];

export default function TicketAssetEdit({
  asset,
  departments,
  mainCategories,
  subCategories,
}: {
  asset: Asset;
  departments: Department[];
  mainCategories: MainCategory[];
  subCategories: SubCategory[];
}) {
  const { data, setData, put, processing, errors } = useForm({
    department_id: asset.department_id.toString(),
    ticket_main_category_id: asset.ticket_main_category_id ? asset.ticket_main_category_id.toString() : '',
    ticket_sub_category_id: asset.ticket_sub_category_id ? asset.ticket_sub_category_id.toString() : '',
    name: asset.name,
    article_code: asset.article_code ?? '',
    bar_code: asset.bar_code ?? '',
    is_active: asset.is_active,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    put(`/ticket-assets/${asset.id}`);
  };

  return (
    <AppLayout breadcrumbs={[...breadcrumbsBase, { title: 'Edit', href: `/ticket-assets/${asset.id}/edit` }]}>
      <Head title="Edit Asset" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Edit Asset</CardTitle>
            <Button asChild variant="outline">
              <Link href="/ticket-assets">Back</Link>
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
              <Label>Main Category</Label>
              <select
                className="w-full rounded border px-3 py-2"
                value={data.ticket_main_category_id}
                onChange={(e) => setData('ticket_main_category_id', e.target.value)}
              >
                <option value="">None</option>
                {mainCategories.map((mc) => (
                  <option key={mc.id} value={mc.id}>
                    {mc.name}
                  </option>
                ))}
              </select>
              {errors.ticket_main_category_id && <p className="text-sm text-red-600">{errors.ticket_main_category_id}</p>}
            </div>

            <div className="space-y-1">
              <Label>Sub Category (optional)</Label>
              <select
                className="w-full rounded border px-3 py-2"
                value={data.ticket_sub_category_id}
                onChange={(e) => setData('ticket_sub_category_id', e.target.value)}
              >
                <option value="">None</option>
                {subCategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name} {sc.main_category?.name ? `(${sc.main_category.name})` : ''}
                  </option>
                ))}
              </select>
              {errors.ticket_sub_category_id && <p className="text-sm text-red-600">{errors.ticket_sub_category_id}</p>}
            </div>

            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={data.name} onChange={(e) => setData('name', e.target.value)} />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <Label>Article Code</Label>
              <Input value={data.article_code} onChange={(e) => setData('article_code', e.target.value)} />
              {errors.article_code && <p className="text-sm text-red-600">{errors.article_code}</p>}
            </div>

            <div className="space-y-1">
              <Label>Bar Code</Label>
              <Input value={data.bar_code} onChange={(e) => setData('bar_code', e.target.value)} />
              {errors.bar_code && <p className="text-sm text-red-600">{errors.bar_code}</p>}
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

import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { useEffect } from 'react';

type Item = {
  id: number;
  name: string;
  is_active: boolean;
  department?: { name: string };
  created_at: string;
};

type PageProps = {
  categories: {
    data: Item[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number;
    to: number;
  };
  flash: { message?: string };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Ticket Settings', href: '/ticket-main-categories' }, { title: 'Main Categories', href: '/ticket-main-categories' }];

export default function TicketMainCategoriesIndex() {
  const { categories, flash } = usePage<PageProps>().props;

  useEffect(() => {
    if (flash?.message) toast.success(flash.message);
  }, [flash?.message]);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Ticket Main Categories" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle>Main Categories</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/ticket-sub-categories">Sub Categories</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/ticket-assets">Assets</Link>
              </Button>
            </div>
            <Button asChild>
              <Link href="/ticket-main-categories/create">Add Main Category</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-slate-500 dark:bg-slate-700">
                <TableRow>
                  <TableHead className="font-bold text-white">Name</TableHead>
                  <TableHead className="font-bold text-white">Department</TableHead>
                  <TableHead className="font-bold text-white">Active</TableHead>
                  <TableHead className="font-bold text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.data.map((c) => (
                  <TableRow key={c.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.department?.name ?? '—'}</TableCell>
                    <TableCell>{c.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/ticket-main-categories/${c.id}/edit`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination total={categories.total} from={categories.from} to={categories.to} links={categories.links} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

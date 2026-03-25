import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

type Item = {
  id: number;
  name: string;
  is_active: boolean;
  main_category?: { name: string; department?: { name: string } };
};

type PageProps = {
  subCategories: {
    data: Item[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number;
    to: number;
  };
  flash: { message?: string };
};

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Ticket Settings', href: '/ticket-main-categories' },
  { title: 'Sub Categories', href: '/ticket-sub-categories' },
];

export default function TicketSubCategoriesIndex() {
  const { subCategories, flash } = usePage<PageProps>().props;

  useEffect(() => {
    if (flash?.message) toast.success(flash.message);
  }, [flash?.message]);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Ticket Sub Categories" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle>Sub Categories</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/ticket-main-categories">Main Categories</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/ticket-assets">Assets</Link>
              </Button>
            </div>
            <Button asChild>
              <Link href="/ticket-sub-categories/create">Add Sub Category</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-slate-500 dark:bg-slate-700">
                <TableRow>
                  <TableHead className="font-bold text-white">Name</TableHead>
                  <TableHead className="font-bold text-white">Main Category</TableHead>
                  <TableHead className="font-bold text-white">Department</TableHead>
                  <TableHead className="font-bold text-white">Active</TableHead>
                  <TableHead className="font-bold text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subCategories.data.map((c) => (
                  <TableRow key={c.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.main_category?.name}</TableCell>
                    <TableCell>{c.main_category?.department?.name ?? '—'}</TableCell>
                    <TableCell>{c.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/ticket-sub-categories/${c.id}/edit`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination total={subCategories.total} from={subCategories.from} to={subCategories.to} links={subCategories.links} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

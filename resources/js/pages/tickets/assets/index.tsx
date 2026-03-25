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
  article_code?: string | null;
  is_active: boolean;
  department?: { name: string };
  main_category?: { name: string };
  sub_category?: { name: string };
};

type PageProps = {
  assets: {
    data: Item[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number;
    to: number;
  };
  flash: { message?: string };
};

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Ticket Settings', href: '/ticket-settings' },
  { title: 'Assets', href: '/ticket-assets' },
];

export default function TicketAssetsIndex() {
  const { assets, flash } = usePage<PageProps>().props;

  useEffect(() => {
    if (flash?.message) toast.success(flash.message);
  }, [flash?.message]);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Ticket Assets" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle>Assets</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/ticket-main-categories">Main Categories</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/ticket-sub-categories">Sub Categories</Link>
              </Button>
            </div>
            <Button asChild>
              <Link href="/ticket-assets/create">Add Asset</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-slate-500 dark:bg-slate-700">
                <TableRow>
                  <TableHead className="font-bold text-white">Name</TableHead>
                  <TableHead className="font-bold text-white">Department</TableHead>
                  <TableHead className="font-bold text-white">Main Category</TableHead>
                  <TableHead className="font-bold text-white">Sub Category</TableHead>
                  <TableHead className="font-bold text-white">Article Code</TableHead>
                  <TableHead className="font-bold text-white">Active</TableHead>
                  <TableHead className="font-bold text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.data.map((a) => (
                  <TableRow key={a.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                    <TableCell>{a.name}</TableCell>
                    <TableCell>{a.department?.name ?? '—'}</TableCell>
                    <TableCell>{a.main_category?.name ?? '—'}</TableCell>
                    <TableCell>{a.sub_category?.name ?? '—'}</TableCell>
                    <TableCell>{a.article_code ?? '—'}</TableCell>
                    <TableCell>{a.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/ticket-assets/${a.id}/edit`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination total={assets.total} from={assets.from} to={assets.to} links={assets.links} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

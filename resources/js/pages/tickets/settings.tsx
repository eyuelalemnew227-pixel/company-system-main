import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

type Paginator<T> = {
  data: T[];
  links: { url: string | null; label: string; active: boolean }[];
  total: number;
  from: number;
  to: number;
};

type MainCategory = {
  id: number;
  name: string;
  is_active: boolean;
  department?: { name: string };
};

type SubCategory = {
  id: number;
  name: string;
  is_active: boolean;
  main_category?: { name: string; department?: { name: string } };
};

type Asset = {
  id: number;
  name: string;
  article_code?: string | null;
  is_active: boolean;
  department?: { name: string };
  main_category?: { name: string };
  sub_category?: { name: string };
};

type PageProps = {
  mainCategories: Paginator<MainCategory>;
  subCategories: Paginator<SubCategory>;
  assets: Paginator<Asset>;
  flash: { message?: string };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Ticket Settings', href: '/ticket-settings' }];

export default function TicketSettings() {
  const { mainCategories, subCategories, assets, flash } = usePage<PageProps>().props;
  const [tab, setTab] = useState('main');

  useEffect(() => {
    if (flash?.message) toast.success(flash.message);
  }, [flash?.message]);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Ticket Settings" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Ticket Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="main">Main Categories</TabsTrigger>
                <TabsTrigger value="sub">Sub Categories</TabsTrigger>
                <TabsTrigger value="assets">Assets</TabsTrigger>
              </TabsList>

              <TabsContent value="main" className="space-y-3">
                <div className="flex justify-end">
                  <Button asChild>
                    <Link href="/ticket-main-categories/create">Add Main Category</Link>
                  </Button>
                </div>
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
                {mainCategories.data.map((c) => (
                  <TableRow key={c.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.department?.name ?? '—'}</TableCell>
                    <TableCell>{c.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/ticket-main-categories/${c.id}/edit`}>Edit</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="ml-2"
                        onClick={() => confirmDelete(`/ticket-main-categories/${c.id}`)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                  </TableBody>
                </Table>
                <TablePagination total={mainCategories.total} from={mainCategories.from} to={mainCategories.to} links={mainCategories.links} />
              </TabsContent>

              <TabsContent value="sub" className="space-y-3">
                <div className="flex justify-end">
                  <Button asChild>
                    <Link href="/ticket-sub-categories/create">Add Sub Category</Link>
                  </Button>
                </div>
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
                      <Button
                        size="sm"
                        variant="destructive"
                        className="ml-2"
                        onClick={() => confirmDelete(`/ticket-sub-categories/${c.id}`)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                  </TableBody>
                </Table>
                <TablePagination total={subCategories.total} from={subCategories.from} to={subCategories.to} links={subCategories.links} />
              </TabsContent>

              <TabsContent value="assets" className="space-y-3">
                <div className="flex justify-end">
                  <Button asChild>
                    <Link href="/ticket-assets/create">Add Asset</Link>
                  </Button>
                </div>
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
                      <Button
                        size="sm"
                        variant="destructive"
                        className="ml-2"
                        onClick={() => confirmDelete(`/ticket-assets/${a.id}`)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                  </TableBody>
                </Table>
                <TablePagination total={assets.total} from={assets.from} to={assets.to} links={assets.links} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
  const confirmDelete = (url: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      router.delete(url);
    }
  };

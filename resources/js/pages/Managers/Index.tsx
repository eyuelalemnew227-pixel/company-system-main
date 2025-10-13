import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { ManagersPaginated, Manager } from '@/types/managers'; // Adjust import path
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Managers',
    href: '/managers',
  },
];

export default function Managers({ managers }: { managers: ManagersPaginated }) {
  const { flash } = usePage<{ flash: { message?: string } }>().props;
  const initialSearch = ((usePage().props as any)?.request?.search) ?? '';
  const [search, setSearch] = useState<string>(initialSearch);
  const { can } = usePermission();

  useEffect(() => {
    if (flash.message) {
      toast.success(flash.message);
    }
  }, [flash.message]);

  function handleSearch() {
    router.get('/managers', { search: search ?? '' }, { preserveState: true, replace: true });
  }

  function deleteManager(id: number) {
    if (confirm('Are you sure you want to delete this manager?')) {
      router.delete(`/managers/${id}`);
    }
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Managers" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Managers Management</CardTitle>
            <div className="ml-4 flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search managers..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
              <Button variant="secondary" onClick={handleSearch}>Search</Button>
            </div>
            <CardAction>
              {can('create managers') && (
                <Link href="/managers/create">
                  <Button variant="default">Add New</Button>
                </Link>
              )}
            </CardAction>
          </CardHeader>
          <hr />
          <CardContent>
            <Table>
              <TableHeader className="bg-slate-500 dark:bg-slate-700">
                <TableRow>
                  <TableHead className="font-bold text-white">ID</TableHead>
                  <TableHead className="font-bold text-white">Manager Name</TableHead>
                  <TableHead className="font-bold text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers.data
                  .map((manager: Manager, index: number) => (
                  <TableRow key={manager.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                    <TableCell>{index + managers.from}</TableCell>
                    <TableCell>
                      {`${manager.employee.first_name} ${manager.employee.last_name}`}
                    </TableCell>
                    <TableCell>
                      {can('update managers') && (
                        <Link href={`/managers/${manager.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                      )}
                      {can('delete managers') && (
                        <Button
                          className="m-2"
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteManager(manager.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {managers.data.length > 0 ? (
            <TablePagination
              total={managers.total}
              from={managers.from}
              to={managers.to}
              links={managers.links}
            />
          ) : (
            <div className="flex h-full items-center justify-center">No Results Found!</div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { User } from '@/types/users';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Users',
        href: '/users',
    },
];

export default function Users({ users, request }: { users: User, request?: { search?: string } }) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const [search, setSearch] = useState<string>(request?.search ?? '');
    const { can } = usePermission();

    useEffect(() => {
        if (flash.message) {
            toast.success(flash.message);
        }
    }, [flash.message]);

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/users', { search }, { preserveState: true, replace: true });
    }

    function deleteUser(id: number) {
        if (confirm('Are you sure you want to delete this user?')) {
            router.delete(`/users/${id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Users Management</CardTitle>
                        <form className="ml-4 flex gap-2" onSubmit={submitSearch}>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search users or employees..."
                            />
                            <Button type="submit" variant="outline">Search</Button>
                        </form>
                        <CardAction>
                            {can('create users') && (
                                <Link href={'/users/create'}>
                                    <Button variant={'default'}>Add New</Button>
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
                                    <TableHead className="font-bold text-white">Employee Code</TableHead>
                                    <TableHead className="font-bold text-white">Employee Name</TableHead>
                                    <TableHead className="font-bold text-white">User Name</TableHead>
                                    <TableHead className="font-bold text-white">Email</TableHead>
                                    <TableHead className="font-bold text-white">Roles</TableHead>
                                    <TableHead className="font-bold text-white">Created At</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {users.data
                                .map((user, index) => (
                                    <TableRow key={user.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{user.employee?.employee_code || 'N/A'}</TableCell>
                                        <TableCell>
                                            {user.employee ? `${user.employee.first_name} ${user.employee.last_name}` : 'N/A'}
                                        </TableCell>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell className="flex flex-wrap items-center gap-2">
                                            {user.roles.map((role, index) => (
                                                <Badge variant={'outline'} key={index}>
                                                    {role}
                                                </Badge>
                                            ))}
                                        </TableCell>
                                        <TableCell>{user.created_at}</TableCell>
                                        <TableCell>
                                            {can('update users') && (
                                                <Link href={`/users/${user.id}/edit`}>
                                                    <Button variant={'outline'} size={'sm'}>
                                                        Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {can('delete users') && (
                                                <Button
                                                    className="m-2"
                                                    variant={'destructive'}
                                                    size={'sm'}
                                                    onClick={() => deleteUser(user.id)}
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
                    {users.data.length > 0 ? (
                        <TablePagination total={users.total} from={users.from} to={users.to} links={users.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center">No Results Found!</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
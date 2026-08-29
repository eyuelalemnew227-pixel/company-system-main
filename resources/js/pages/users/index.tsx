import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { User } from '@/types/users';
import { Branch } from '@/types/branches';
import { Department } from '@/types/departments';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Users',
        href: '/users',
    },
];

export default function Users({ users, branches, departments, roles, request }: { users: User, branches: Branch[], departments: Department[], roles: string[], request?: { search?: string, branch_id?: string, department_id?: string, role?: string } }) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const [search, setSearch] = useState<string>(request?.search ?? '');
    const [selectedBranch, setSelectedBranch] = useState<string>(request?.branch_id ?? 'all');
    const [selectedDepartment, setSelectedDepartment] = useState<string>(request?.department_id ?? 'all');
    const [selectedRole, setSelectedRole] = useState<string>(request?.role ?? 'all');
    const { can } = usePermission();

    useEffect(() => {
        if (flash.message) {
            toast.success(flash.message);
        }
    }, [flash.message]);

    // Filter departments based on selected branch
    const filteredDepartments = useMemo(() => {
        if (selectedBranch === 'all') {
            return departments;
        }
        const branch = branches.find(b => b.id.toString() === selectedBranch);
        return branch && branch.departments ? branch.departments : departments;
    }, [selectedBranch, branches, departments]);

    function handleBranchChange(value: string) {
        setSelectedBranch(value);
        setSelectedDepartment('all');
        
        // Apply filter automatically
        const params: any = {};
        if (search) params.search = search;
        if (value !== 'all') params.branch_id = value;
        if (selectedRole !== 'all') params.role = selectedRole;
        router.get('/users', params, { preserveState: true, replace: true });
    }

    function handleDepartmentChange(value: string) {
        setSelectedDepartment(value);
        
        // Apply filter automatically
        const params: any = {};
        if (search) params.search = search;
        if (selectedBranch !== 'all') params.branch_id = selectedBranch;
        if (value !== 'all') params.department_id = value;
        if (selectedRole !== 'all') params.role = selectedRole;
        router.get('/users', params, { preserveState: true, replace: true });
    }

    function handleRoleChange(value: string) {
        setSelectedRole(value);
        
        // Apply filter automatically
        const params: any = {};
        if (search) params.search = search;
        if (selectedBranch !== 'all') params.branch_id = selectedBranch;
        if (selectedDepartment !== 'all') params.department_id = selectedDepartment;
        if (value !== 'all') params.role = value;
        router.get('/users', params, { preserveState: true, replace: true });
    }

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        const params: any = {};
        if (search) params.search = search;
        if (selectedBranch !== 'all') params.branch_id = selectedBranch;
        if (selectedDepartment !== 'all') params.department_id = selectedDepartment;
        if (selectedRole !== 'all') params.role = selectedRole;
        router.get('/users', params, { preserveState: true, replace: true });
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
                    <CardHeader>
                        <div className="flex items-start justify-between mb-4">
                            <CardTitle>Users Management</CardTitle>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        if (search) params.set('search', search);
                                        if (selectedBranch !== 'all') params.set('branch_id', selectedBranch);
                                        if (selectedDepartment !== 'all') params.set('department_id', selectedDepartment);
                                        if (selectedRole !== 'all') params.set('role', selectedRole);
                                        window.location.href = `/users/export${params.toString() ? `?${params.toString()}` : ''}`;
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    📥 Export CSV
                                </Button>
                                {can('create users') && (
                                    <Link href={'/users/create'}>
                                        <Button variant={'default'}>Add New</Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <form className="flex gap-2" onSubmit={submitSearch}>
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search users or employees..."
                                    className="max-w-xs"
                                />
                                <Button type="submit" variant="outline">Search</Button>
                            </form>
                            <div className="flex gap-2">
                                <Select value={selectedBranch} onValueChange={handleBranchChange}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Filter by Branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Branches</SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select 
                                    value={selectedDepartment} 
                                    onValueChange={handleDepartmentChange}
                                    disabled={selectedBranch === 'all'}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Filter by Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {filteredDepartments.map((dept: any) => {
                                            const id = typeof dept === 'object' && dept !== null ? dept.id : dept;
                                            const name = typeof dept === 'object' && dept !== null ? dept.name : dept;
                                            return (
                                                <SelectItem key={id} value={String(id)}>
                                                    {name}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedRole} onValueChange={handleRoleChange}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Filter by Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        {roles.map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {role}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <hr />
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-slate-500 dark:bg-slate-700">
                                <TableRow>
                                    <TableHead className="font-bold text-white">ID</TableHead>
                                    <TableHead className="font-bold text-white">Employee Code</TableHead>
                                    <TableHead className="font-bold text-white">Employee Full Name</TableHead>
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
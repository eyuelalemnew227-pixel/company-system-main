import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Employee } from '@/types/employees';
import { Branch } from '@/types/branches';
import { Department } from '@/types/departments';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Employees',
        href: '/employees',
    },
];

export default function Employees({ employees, branches, departments, request }: { employees: { data: Employee[], total: number, from: number, to: number, links: any[] }, branches: Branch[], departments: Department[], request?: { search?: string, branch_id?: string, department_id?: string, status?: string } }) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const [search, setSearch] = useState<string>(request?.search ?? '');
    const [selectedBranch, setSelectedBranch] = useState<string>(request?.branch_id ?? 'all');
    const [selectedDepartment, setSelectedDepartment] = useState<string>(request?.department_id ?? 'all');
    const [selectedStatus, setSelectedStatus] = useState<string>(request?.status ?? 'all');
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

    function handleFilterChange() {
        const params: any = {};
        if (search) params.search = search;
        if (selectedBranch !== 'all') params.branch_id = selectedBranch;
        if (selectedDepartment !== 'all') params.department_id = selectedDepartment;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        
        router.get('/employees', params, { preserveState: true, replace: true });
    }

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        handleFilterChange();
    }

    function handleBranchChange(value: string) {
        setSelectedBranch(value);
        setSelectedDepartment('all');
        
        // Apply filter automatically
        const params: any = {};
        if (search) params.search = search;
        if (value !== 'all') params.branch_id = value;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        router.get('/employees', params, { preserveState: true, replace: true });
    }

    function handleDepartmentChange(value: string) {
        setSelectedDepartment(value);
        
        // Apply filter automatically
        const params: any = {};
        if (search) params.search = search;
        if (selectedBranch !== 'all') params.branch_id = selectedBranch;
        if (value !== 'all') params.department_id = value;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        router.get('/employees', params, { preserveState: true, replace: true });
    }

    function handleStatusChange(value: string) {
        setSelectedStatus(value);
        
        // Apply filter automatically
        const params: any = {};
        if (search) params.search = search;
        if (selectedBranch !== 'all') params.branch_id = selectedBranch;
        if (selectedDepartment !== 'all') params.department_id = selectedDepartment;
        if (value !== 'all') params.status = value;
        router.get('/employees', params, { preserveState: true, replace: true });
    }

    function deleteEmployee(id: number) {
        if (confirm('Are you sure you want to delete this employee?')) {
            router.delete(`/employees/${id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employees" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between mb-4">
                            <CardTitle>Employees Management</CardTitle>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        if (search) params.set('search', search);
                                        if (selectedBranch !== 'all') params.set('branch_id', selectedBranch);
                                        if (selectedDepartment !== 'all') params.set('department_id', selectedDepartment);
                                        if (selectedStatus !== 'all') params.set('status', selectedStatus);
                                        window.location.href = `/employees/export${params.toString() ? `?${params.toString()}` : ''}`;
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    📥 Export CSV
                                </Button>
                                {can('create employees') && (
                                    <Link href="/employees/create">
                                        <Button variant="default">Add New</Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <form className="flex gap-2" onSubmit={submitSearch}>
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search employees..."
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
                                <Select value={selectedStatus} onValueChange={handleStatusChange}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Filter by Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="terminated">Terminated</SelectItem>
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
                                    <TableHead className="font-bold text-white">Image</TableHead>
                                    <TableHead className="font-bold text-white">Employee Code</TableHead>
                                    <TableHead className="font-bold text-white">Full Name</TableHead>
                                    <TableHead className="font-bold text-white">Branch</TableHead>
                                    <TableHead className="font-bold text-white">Department</TableHead>
                                    <TableHead className="font-bold text-white">Position</TableHead>
                                    <TableHead className="font-bold text-white">Status</TableHead>
                                    <TableHead className="font-bold text-white">Created At</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees.data.map((employee, index) => (
                                    <TableRow key={employee.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>
                                                {employee.image_path ? (
                                                    <img
                                                        src={`/storage/${employee.image_path}`}
                                                        alt={`${employee.first_name}'s photo`}
                                                        className="h-10 w-10 object-cover rounded-full"
                                                    />
                                                ) : (
                                                    'N/A'
                                                )}
                                            </TableCell>
                                            <TableCell>{employee.employee_code}</TableCell>
                                            <TableCell>{`${employee.first_name} ${employee.last_name}`}</TableCell>
                                        <TableCell>{employee.branch || 'N/A'}</TableCell>
                                        <TableCell>{employee.department || 'N/A'}</TableCell>
                                        <TableCell>{employee.position || 'N/A'}</TableCell>
                                        <TableCell>{employee.status}</TableCell>
                                        <TableCell>{employee.created_at}</TableCell>
                                        <TableCell>
                                            {can('update employees') && (
                                                <Link href={`/employees/${employee.id}/edit`}>
                                                    <Button variant="outline" size="sm">
                                                        Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {can('delete employees') && (
                                                <Button
                                                    className="m-2"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => deleteEmployee(employee.id)}
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
                    {employees.data.length > 0 ? (
                        <TablePagination
                            total={employees.total}
                            from={employees.from}
                            to={employees.to}
                            links={employees.links}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center">No Results Found!</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
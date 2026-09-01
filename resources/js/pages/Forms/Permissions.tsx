import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ShieldAlert, CheckSquare, Save } from 'lucide-react';
import TablePagination from '@/components/table-pagination';

export default function Permissions({ form, users, branches, filters }: { form: any, users: any, branches: any[], filters: any }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Form Builder', href: '/forms' },
        { title: form.title, href: `/forms/${form.id}/edit` },
        { title: 'Access Control', href: `/forms/${form.id}/permissions` },
    ];

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id || 'all');
    const [selectedDepartment, setSelectedDepartment] = useState(filters.department_id || 'all');

    // Bulk Select State
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

    // Bulk Permissions Payload
    const [bulkPermissions, setBulkPermissions] = useState({
        can_edit_schema: false,
        can_manage_access: false,
        can_fill_submissions: false,
        can_view_submissions: false,
        can_edit_submissions: false,
        can_delete_submissions: false,
    });

    const filteredDepartments = useMemo(() => {
        if (selectedBranch === 'all') return [];
        const branch = branches.find(b => b.id.toString() === selectedBranch);
        return branch ? branch.departments : [];
    }, [selectedBranch, branches]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery !== filters.search) updateFilters();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const updateFilters = (branch = selectedBranch, dept = selectedDepartment) => {
        router.get(`/forms/${form.id}/permissions`, {
            search: searchQuery,
            branch_id: branch,
            department_id: dept
        }, { preserveState: true, preserveScroll: true });
    };

    const handleBranchChange = (value: string) => {
        setSelectedBranch(value);
        setSelectedDepartment('all'); // reset dept
        updateFilters(value, 'all');
    };

    const handleDepartmentChange = (value: string) => {
        setSelectedDepartment(value);
        updateFilters(selectedBranch, value);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedUsers(users.data.map((u: any) => u.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const handleSelectUser = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedUsers([...selectedUsers, id]);
        } else {
            setSelectedUsers(selectedUsers.filter(userId => userId !== id));
        }
    };

    const handleBulkSave = () => {
        if (selectedUsers.length === 0) return;

        router.post(`/forms/${form.id}/permissions`, {
            user_ids: selectedUsers,
            permissions: bulkPermissions
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setSelectedUsers([]); // clear selection after success
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Permissions - ${form.title}`} />
            <div className="max-w-7xl mx-auto space-y-6 pb-24">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Bulk Access Control</h2>
                        <p className="text-muted-foreground">Select employees below and assign specific capabilities for "{form.title}".</p>
                    </div>
                </div>

                <div className="flex gap-4 items-center bg-gray-50 p-4 border rounded-lg">
                    <div className="relative w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search employees..."
                            className="pl-9 bg-white"
                        />
                    </div>
                    <Select value={selectedBranch} onValueChange={handleBranchChange}>
                        <SelectTrigger className="w-[200px] bg-white">
                            <SelectValue placeholder="Branch" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Branches</SelectItem>
                            {branches.map(b => (
                                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedDepartment} onValueChange={handleDepartmentChange} disabled={selectedBranch === 'all'}>
                        <SelectTrigger className="w-[200px] bg-white">
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {filteredDepartments.map((d: any) => (
                                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Card>
                    <CardHeader className="border-b bg-gray-50/50 py-3">
                        <CardTitle className="text-sm flex items-center justify-between font-medium">
                            <span>{users.total} Employees Found</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b">
                                    <tr>
                                        <th className="px-6 py-4 w-12 text-center">
                                            <Checkbox
                                                checked={selectedUsers.length > 0 && selectedUsers.length === users.data.length}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </th>
                                        <th className="px-6 py-4 font-medium min-w-[200px]">Employee</th>
                                        <th className="px-4 py-4 font-medium text-center text-[10px]">Manage Access</th>
                                        <th className="px-4 py-4 font-medium text-center text-[10px]">Edit Schema</th>
                                        <th className="px-4 py-4 font-medium text-center text-[10px]">Fill Form</th>
                                        <th className="px-4 py-4 font-medium text-center text-[10px]">View Sub.</th>
                                        <th className="px-4 py-4 font-medium text-center text-[10px]">Edit Sub.</th>
                                        <th className="px-4 py-4 font-medium text-center text-[10px]">Del Sub.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-gray-700">
                                    {users.data.map((user: any) => (
                                        <tr key={user.id} className={`hover:bg-amber-50/30 transition-colors ${selectedUsers.includes(user.id) ? 'bg-amber-50/50' : ''}`}>
                                            <td className="px-6 py-4 text-center">
                                                <Checkbox
                                                    checked={selectedUsers.includes(user.id)}
                                                    onCheckedChange={(val) => handleSelectUser(user.id, val as boolean)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-semibold text-gray-900">{user.name} <span className="text-xs text-gray-400 font-normal">({user.employee_code || 'No Code'})</span></div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {user.can_manage_access ? <CheckSquare className="w-4 h-4 mx-auto text-green-600" /> : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {user.can_edit_schema ? <CheckSquare className="w-4 h-4 mx-auto text-green-600" /> : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {user.can_fill_submissions ? <CheckSquare className="w-4 h-4 mx-auto text-green-600" /> : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {user.can_view_submissions ? <CheckSquare className="w-4 h-4 mx-auto text-green-600" /> : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {user.can_edit_submissions ? <CheckSquare className="w-4 h-4 mx-auto text-green-600" /> : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {user.can_delete_submissions ? <CheckSquare className="w-4 h-4 mx-auto text-green-600" /> : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {users.data.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                No employees found matching your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {users.data.length > 0 && (
                            <div className="p-4 border-t">
                                <TablePagination total={users.total} from={users.from} to={users.to} links={users.links} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sticky Bulk Action Bar */}
                {selectedUsers.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 transform transition-all">
                        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="text-sm font-semibold whitespace-nowrap bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full">
                                {selectedUsers.length} Users Selected
                            </div>

                            <div className="flex flex-wrap items-center gap-6 border-l pl-6 border-r pr-6 mx-auto">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                    <Checkbox checked={bulkPermissions.can_manage_access} onCheckedChange={(v) => setBulkPermissions({ ...bulkPermissions, can_manage_access: !!v })} /> Manage Access
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                    <Checkbox checked={bulkPermissions.can_edit_schema} onCheckedChange={(v) => setBulkPermissions({ ...bulkPermissions, can_edit_schema: !!v })} /> Edit Schema
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                    <Checkbox checked={bulkPermissions.can_fill_submissions} onCheckedChange={(v) => setBulkPermissions({ ...bulkPermissions, can_fill_submissions: !!v })} /> Fill Form
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                    <Checkbox checked={bulkPermissions.can_view_submissions} onCheckedChange={(v) => setBulkPermissions({ ...bulkPermissions, can_view_submissions: !!v })} /> View Submissions
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                    <Checkbox checked={bulkPermissions.can_edit_submissions} onCheckedChange={(v) => setBulkPermissions({ ...bulkPermissions, can_edit_submissions: !!v })} /> Edit Submissions
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-red-600">
                                    <Checkbox checked={bulkPermissions.can_delete_submissions} onCheckedChange={(v) => setBulkPermissions({ ...bulkPermissions, can_delete_submissions: !!v })} /> Delete Submissions
                                </label>
                            </div>

                            <Button onClick={handleBulkSave} size="lg" className="bg-amber-600 hover:bg-amber-700 min-w-[200px]">
                                <Save className="w-4 h-4 mr-2" />
                                Apply to Selected
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

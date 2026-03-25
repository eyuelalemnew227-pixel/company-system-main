import TablePagination from '@/components/table-pagination';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PaginationData } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Building2, Briefcase, Mail, Phone, PhoneCall, Sparkles, UserRound, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

type DirectoryEmployee = {
    id: number;
    name: string;
    employee_code: string;
    phone: string | null;
    email: string | null;
    branch: string | null;
    department: string | null;
    position: string | null;
    avatar: string | null;
};

type Option = { id: number; name: string; title?: string };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Employee Directory', href: '/directory' }];

export default function EmployeeDirectory({
    employees,
    branches,
    departments,
    positions,
    filters,
}: {
    employees: PaginationData<DirectoryEmployee>;
    branches: Option[];
    departments: Option[];
    positions: Option[];
    filters?: { search?: string; branch_id?: string; department_id?: string; position_id?: string };
}) {
    const [search, setSearch] = useState<string>(filters?.search ?? '');
    const [branchId, setBranchId] = useState<string>(filters?.branch_id ?? 'all');
    const [departmentId, setDepartmentId] = useState<string>(filters?.department_id ?? 'all');
    const [positionId, setPositionId] = useState<string>(filters?.position_id ?? 'all');

    const filteredDepartments = useMemo(() => departments, [departments]);
    const activeFilters = useMemo(
        () =>
            [
                branchId !== 'all' ? { label: 'Branch', value: branches.find((b) => b.id.toString() === branchId)?.name } : null,
                departmentId !== 'all' ? { label: 'Department', value: departments.find((d) => d.id.toString() === departmentId)?.name } : null,
                positionId !== 'all'
                    ? { label: 'Position', value: positions.find((p) => p.id.toString() === positionId)?.title ?? positions.find((p) => p.id.toString() === positionId)?.name }
                    : null,
            ].filter(Boolean) as { label: string; value?: string }[],
        [branchId, departmentId, positionId, branches, departments, positions],
    );

    const applyFilters = (override?: Partial<{ search: string; branch_id: string; department_id: string; position_id: string }>) => {
        const params: Record<string, string> = {};
        const merged = {
            search,
            branch_id: branchId,
            department_id: departmentId,
            position_id: positionId,
            ...override,
        };

        if (merged.search) params.search = merged.search;
        if (merged.branch_id && merged.branch_id !== 'all') params.branch_id = merged.branch_id;
        if (merged.department_id && merged.department_id !== 'all') params.department_id = merged.department_id;
        if (merged.position_id && merged.position_id !== 'all') params.position_id = merged.position_id;

        router.get('/directory', params, { replace: true, preserveScroll: true, preserveState: true });
    };

    const resetFilters = () => {
        setSearch('');
        setBranchId('all');
        setDepartmentId('all');
        setPositionId('all');
        router.get('/directory', {}, { replace: true, preserveScroll: true, preserveState: true });
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employee Directory" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 p-[1px] shadow-xl">
                    <div className="flex flex-col gap-4 rounded-2xl bg-slate-900 px-6 py-5 text-white md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-100">
                                <Sparkles className="h-4 w-4" />
                                <span>People</span>
                            </div>
                            <h1 className="text-2xl font-bold leading-tight md:text-3xl">Find and reach any teammate</h1>
                            <p className="text-sm text-cyan-100/80">
                                {employees.total} people listed
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="bg-white/10 text-white ring-1 ring-white/30">
                                <UserRound className="h-3 w-3" />
                                Contact ready
                            </Badge>
                            <Badge variant="secondary" className="bg-white/10 text-white ring-1 ring-white/30">
                                Realtime
                            </Badge>
                            <Button variant="secondary" onClick={resetFilters} className="bg-white text-slate-900 hover:bg-white/90">
                                Reset filters
                            </Button>
                        </div>
                    </div>
                </div>

                <Card className="border-none bg-white/80 shadow-xl backdrop-blur dark:bg-slate-900/70">
                    <CardHeader className="space-y-3">
                        <CardTitle className="text-lg font-semibold">Directory search</CardTitle>
                        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <div className="md:col-span-2">
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name or employee code"
                                    className="h-11"
                                />
                            </div>
                            <Select
                                value={branchId}
                                onValueChange={(value) => {
                                    setBranchId(value);
                                    applyFilters({ branch_id: value, department_id: 'all' });
                                    setDepartmentId('all');
                                }}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All branches</SelectItem>
                                    {branches.map((branch) => (
                                        <SelectItem key={branch.id} value={branch.id.toString()}>
                                            {branch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={departmentId}
                                onValueChange={(value) => {
                                    setDepartmentId(value);
                                    applyFilters({ department_id: value });
                                }}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All departments</SelectItem>
                                    {filteredDepartments.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id.toString()}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={positionId}
                                onValueChange={(value) => {
                                    setPositionId(value);
                                    applyFilters({ position_id: value });
                                }}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Position" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All positions</SelectItem>
                                    {positions.map((pos) => (
                                        <SelectItem key={pos.id} value={pos.id.toString()}>
                                            {pos.title ?? pos.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="md:col-span-4 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={resetFilters}>
                                    Clear
                                </Button>
                                <Button type="submit">Apply</Button>
                            </div>
                        </form>

                        {activeFilters.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {activeFilters.map((chip) => (
                                    <Badge key={chip.label} variant="outline" className="gap-2">
                                        <span className="text-xs font-semibold">{chip.label}:</span>
                                        <span>{chip.value || 'Any'}</span>
                                        <button
                                            type="button"
                                            className="rounded-full p-1 hover:bg-muted"
                                            onClick={() => {
                                                if (chip.label === 'Branch') setBranchId('all');
                                                if (chip.label === 'Department') setDepartmentId('all');
                                                if (chip.label === 'Position') setPositionId('all');
                                                applyFilters({
                                                    branch_id: chip.label === 'Branch' ? 'all' : branchId,
                                                    department_id: chip.label === 'Department' ? 'all' : departmentId,
                                                    position_id: chip.label === 'Position' ? 'all' : positionId,
                                                });
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {employees.data.length === 0 ? (
                            <div className="rounded-lg border border-dashed bg-muted/40 p-10 text-center text-muted-foreground">
                                No employees match these filters. Try clearing filters or searching a different name.
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {employees.data.map((employee) => (
                                    <Card
                                        key={employee.id}
                                        className="h-full border-none bg-white/90 shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/80"
                                    >
                                        <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                            <Avatar className="h-12 w-12 ring-2 ring-indigo-100 dark:ring-indigo-900">
                                                <AvatarImage src={employee.avatar ?? undefined} alt={employee.name} />
                                                <AvatarFallback className="uppercase bg-indigo-50 text-indigo-900 dark:bg-indigo-900/50 dark:text-white">
                                                    {employee.name
                                                        .split(' ')
                                                        .map((part) => part.charAt(0))
                                                        .join('')
                                                        .slice(0, 2) || 'NA'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1">
                                                <CardTitle className="text-base leading-tight">{employee.name}</CardTitle>
                                                <p className="text-xs text-muted-foreground">Code: {employee.employee_code}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {employee.branch && <Badge variant="secondary">{employee.branch}</Badge>}
                                                    {employee.department && <Badge variant="outline">{employee.department}</Badge>}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                            <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone" value={employee.phone}>
                                                <ContactActions type="phone" value={employee.phone} />
                                            </ContactRow>
                                            <ContactRow icon={<Mail className="h-4 w-4" />} label="Email" value={employee.email}>
                                                <ContactActions type="email" value={employee.email} />
                                            </ContactRow>
                                            <ContactRow icon={<Building2 className="h-4 w-4" />} label="Branch" value={employee.branch} />
                                            <ContactRow icon={<Briefcase className="h-4 w-4" />} label="Department" value={employee.department} />
                                            <ContactRow icon={<Briefcase className="h-4 w-4" />} label="Position" value={employee.position} />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {employees.total > employees.data.length && (
                            <TablePagination links={employees.links} total={employees.total} from={employees.from} to={employees.to} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function ContactRow({ icon, label, value, children }: { icon: React.ReactNode; label: string; value: string | null; children?: React.ReactNode }) {
    const display = value && value.trim().length > 0 ? value : 'Not provided';
    return (
        <div className="flex items-start gap-3 rounded-lg bg-muted/40 px-3 py-2">
            <div className="mt-0.5 text-muted-foreground">{icon}</div>
            <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                <p className="text-sm">{display}</p>
            </div>
            {children}
        </div>
    );
}

function ContactActions({ type, value }: { type: 'phone' | 'email'; value: string | null }) {
    if (!value) return null;
    const href = type === 'phone' ? `tel:${value}` : `mailto:${value}`;
    const label = type === 'phone' ? 'Call' : 'Email';
    const Icon = type === 'phone' ? PhoneCall : Mail;
    return (
        <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href={href} className="flex items-center gap-1">
                <Icon className="h-4 w-4" />
                {label}
            </a>
        </Button>
    );
}

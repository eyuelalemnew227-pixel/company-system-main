import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AppLayout from '@/layouts/app-layout';
import { groupPermissionsList } from '@/lib/permission-categories';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, EmployeeOption } from '@/types';
import { RolesWithPermissionsMap } from '@/types/role_permission';
import { Head, Link, useForm } from '@inertiajs/react';
import { Check, ChevronsUpDown, ShieldCheck } from 'lucide-react';
import React, { useMemo } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Create User',
        href: '/users/create',
    },
];

export default function CreateUsers({
    roles,
    rolesWithPermissions,
    employees,
}: {
    roles: string[];
    rolesWithPermissions?: RolesWithPermissionsMap;
    employees: EmployeeOption[];
}) {
    const { data, setData, post, errors, processing } = useForm({
        employee_id: '',
        name: '',
        email: '',
        password: '',
        roles: [] as string[],
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        post('/users');
    }

    // Compute permissions preview for selected roles
    const grantedPermissionsSummary = useMemo(() => {
        if (!data.roles || data.roles.length === 0) return null;

        const allGrantedPerms = new Set<string>();
        data.roles.forEach((roleName) => {
            const roleMeta = rolesWithPermissions?.[roleName];
            if (roleMeta?.permissions) {
                roleMeta.permissions.forEach((p) => allGrantedPerms.add(p));
            }
        });

        const permsList = Array.from(allGrantedPerms);
        const grouped = groupPermissionsList(permsList);

        return {
            total: permsList.length,
            grouped,
        };
    }, [data.roles, rolesWithPermissions]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create User" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <div>
                            <CardTitle>Create User</CardTitle>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Assign user account details and role permissions
                            </p>
                        </div>
                        <CardAction>
                            <Link href={'/users'}>
                                <Button variant={'outline'}>Go Back</Button>
                            </Link>
                        </CardAction>
                    </CardHeader>
                    <hr />
                    <CardContent className="pt-4">
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-1 md:col-span-2">
                                    <Label htmlFor="employee_id">Employee <span className="text-destructive">*</span></Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={false}
                                                className="mt-1.5 w-full justify-between"
                                            >
                                                {data.employee_id
                                                    ? employees.find((emp) => emp.id.toString() === data.employee_id)?.name
                                                    : 'Select employee...'}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput placeholder="Search employees..." />
                                                <CommandList>
                                                    <CommandEmpty>No employees found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {employees.map((employee) => (
                                                            <CommandItem
                                                                key={employee.id}
                                                                value={`${employee.employee_code} ${employee.name}`}
                                                                onSelect={() => setData('employee_id', employee.id.toString())}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        'mr-2 h-4 w-4',
                                                                        data.employee_id === employee.id.toString() ? 'opacity-100' : 'opacity-0'
                                                                    )}
                                                                />
                                                                {employee.employee_code} - {employee.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <InputError message={errors.employee_id} />
                                </div>

                                <div>
                                    <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        aria-invalid={!!errors.name}
                                        placeholder="Enter user name"
                                        className="mt-1.5"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div>
                                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        aria-invalid={!!errors.email}
                                        placeholder="Enter email"
                                        className="mt-1.5"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        aria-invalid={!!errors.password}
                                        placeholder="Enter password"
                                        className="mt-1.5"
                                    />
                                    <InputError message={errors.password} />
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <Label className="text-base font-semibold">Select Assignable Roles</Label>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                    {roles.map((role) => {
                                        const isChecked = data.roles.includes(role);
                                        const elemId = `role-${role.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                                        return (
                                            <label
                                                key={role}
                                                htmlFor={elemId}
                                                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all select-none ${
                                                    isChecked
                                                        ? 'border-primary bg-primary/5 shadow-xs'
                                                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
                                                }`}
                                            >
                                                <Checkbox
                                                    id={elemId}
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            if (!data.roles.includes(role)) {
                                                                setData('roles', [...data.roles, role]);
                                                            }
                                                        } else {
                                                            setData('roles', data.roles.filter((r) => r !== role));
                                                        }
                                                    }}
                                                />
                                                <span className="cursor-pointer font-semibold text-sm">
                                                    {role}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <InputError message={errors.roles} />
                            </div>

                            {/* Granted Role Permissions Preview */}
                            {grantedPermissionsSummary && (
                                <Card className="border-primary/30 bg-slate-50/50 p-4 dark:bg-slate-900/40">
                                    <div className="flex items-center justify-between mb-3 border-b pb-2">
                                        <div className="flex items-center gap-2 font-semibold text-sm">
                                            <ShieldCheck className="h-4 w-4 text-primary" />
                                            Role Permission Preview ({grantedPermissionsSummary.total} Permissions Granted)
                                        </div>
                                        <Badge variant="default">
                                            {data.roles.length} {data.roles.length === 1 ? 'Role' : 'Roles'} Selected
                                        </Badge>
                                    </div>
                                    <div className="space-y-3">
                                        {Object.entries(grantedPermissionsSummary.grouped).map(([category, perms]) => (
                                            <div key={category} className="text-xs">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    {category} ({perms.length}):
                                                </span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {perms.map((p) => (
                                                        <Badge key={p} variant="outline" className="text-[10px] bg-white dark:bg-slate-950">
                                                            {p}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button size={'lg'} type="submit" disabled={processing}>
                                    Create User
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
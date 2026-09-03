import CategorizedPermissionSelector from '@/components/CategorizedPermissionSelector';
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
import { GroupedPermissions, RolesWithPermissionsMap } from '@/types/role_permission';
import { UserRole } from '@/types/users';
import { Head, Link, useForm } from '@inertiajs/react';
import { Check, ChevronsUpDown, ShieldCheck } from 'lucide-react';
import React, { useMemo } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Edit User',
        href: '/users',
    },
];

interface EditUserProps {
    roles: string[];
    rolesWithPermissions?: RolesWithPermissionsMap;
    employees: EmployeeOption[];
    user: UserRole & { direct_permissions?: string[] };
    allPermissions?: string[];
    groupedPermissions?: GroupedPermissions;
}

export default function EditUser({
    roles,
    rolesWithPermissions,
    employees,
    user,
    allPermissions = [],
    groupedPermissions,
}: EditUserProps) {
    const { data, setData, put, errors, processing } = useForm({
        employee_id: user.employee_id?.toString() || '',
        name: user.name,
        email: user.email,
        password: '',
        is_active: (user.is_active ?? true) as boolean,
        roles: user.roles || [],
        direct_permissions: user.direct_permissions || [],
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        put(`/users/${user.id}`);
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
            <Head title="Edit User" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <div>
                            <CardTitle>Edit User: {user.name}</CardTitle>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Modify user information and assigned module roles
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
                                    <Label htmlFor="password">New Password (leave blank to keep current)</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        aria-invalid={!!errors.password}
                                        placeholder="Enter new password"
                                        className="mt-1.5"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="col-span-1 md:col-span-2 pt-1">
                                    <label
                                        htmlFor="is_active"
                                        className={cn(
                                            "flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition-all select-none",
                                            data.is_active
                                                ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20"
                                                : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                                        )}
                                    >
                                        <Checkbox
                                            id="is_active"
                                            checked={data.is_active}
                                            onCheckedChange={(checked) => setData('is_active', !!checked)}
                                        />
                                        <div>
                                            <span className="font-semibold text-sm text-foreground flex items-center gap-2">
                                                Active Account Status
                                                {data.is_active ? (
                                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]">Active</Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                                                )}
                                            </span>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Active users can log in to the system. Uncheck to disable access for this account.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <Label className="text-base font-semibold">Assigned Roles</Label>
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
                                            Effective User Permissions Preview ({grantedPermissionsSummary.total} Permissions Granted)
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

                            {/* Direct User Extra Permissions */}
                            {allPermissions.length > 0 && (
                                <div className="space-y-3 pt-4 border-t">
                                    <div>
                                        <Label className="text-base font-semibold">Direct Specific Permissions (Optional)</Label>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Grant specific individual module permissions directly to this user (e.g. Telecom Management or Online Training) without changing their assigned roles.
                                        </p>
                                    </div>
                                    <CategorizedPermissionSelector
                                        allPermissions={allPermissions}
                                        groupedPermissions={groupedPermissions}
                                        selectedPermissions={data.direct_permissions}
                                        onChange={(perms) => setData('direct_permissions', perms)}
                                    />
                                    <InputError message={errors.direct_permissions} />
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button size={'lg'} type="submit" disabled={processing}>
                                    Update User
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
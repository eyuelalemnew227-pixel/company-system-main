import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { formatPermissionLabel, groupPermissionsList } from '@/lib/permission-categories';
import { type BreadcrumbItem } from '@/types';
import { GroupedPermissions } from '@/types/role_permission';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Edit3,
    Filter,
    Grid,
    Loader2,
    Search,
    Shield,
    XCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface MatrixRole {
    id: number;
    name: string;
    permissions: string[];
}

interface MatrixProps {
    roles: MatrixRole[];
    allPermissions: string[];
    groupedPermissions?: GroupedPermissions;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Roles',
        href: '/roles',
    },
    {
        title: 'Comparison Matrix',
        href: '/roles/matrix',
    },
];

export default function RolesMatrix({ roles, allPermissions, groupedPermissions: serverGrouped }: MatrixProps) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const { can } = usePermission();

    const [search, setSearch] = useState('');
    const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
    const [togglingKey, setTogglingKey] = useState<string | null>(null);

    useEffect(() => {
        if (flash.message) {
            toast.success(flash.message);
            setTogglingKey(null);
        }
    }, [flash.message]);

    const categoryGroups = useMemo(() => {
        if (serverGrouped && Object.keys(serverGrouped).length > 0) {
            return serverGrouped;
        }
        return groupPermissionsList(allPermissions);
    }, [allPermissions, serverGrouped]);

    const categories = useMemo(() => Object.keys(categoryGroups), [categoryGroups]);

    // Visible roles filter
    const visibleRoles = useMemo(() => {
        if (selectedRoleFilter === 'ALL') return roles;
        return roles.filter((r) => r.name === selectedRoleFilter);
    }, [roles, selectedRoleFilter]);

    // Filtered permissions by search and module filter
    const filteredCategoryGroups = useMemo(() => {
        const result: GroupedPermissions = {};
        const query = search.trim().toLowerCase();

        categories.forEach((cat) => {
            if (selectedModuleFilter !== 'ALL' && selectedModuleFilter !== cat) {
                return;
            }

            const perms = categoryGroups[cat] || [];
            const matching = perms.filter((p) => {
                if (!query) return true;
                return p.toLowerCase().includes(query) || cat.toLowerCase().includes(query);
            });

            if (matching.length > 0) {
                result[cat] = matching;
            }
        });

        return result;
    }, [categoryGroups, categories, search, selectedModuleFilter]);

    const togglePermission = (roleId: number, permission: string, currentGranted: boolean) => {
        const key = `${roleId}:${permission}`;
        setTogglingKey(key);

        router.post(
            '/roles/matrix/toggle',
            {
                role_id: roleId,
                permission: permission,
                grant: !currentGranted,
            },
            {
                preserveScroll: true,
                onFinish: () => setTogglingKey(null),
            }
        );
    };

    const toggleCollapseCategory = (cat: string) => {
        setCollapsedCategories((prev) => ({
            ...prev,
            [cat]: !prev[cat],
        }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Role-Permission Matrix" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card className="border shadow-xs">
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/70 p-4 dark:bg-slate-900/60">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Grid className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold tracking-tight">Role-Permission Comparison Matrix</CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    Compare and toggle permissions across all system roles side-by-side.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/roles">
                                <Button variant="outline">Back to Roles List</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <hr />

                    {/* Toolbar Controls */}
                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {/* Search filter */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search permission or module..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 bg-white dark:bg-slate-950"
                                />
                            </div>

                            {/* Module filter */}
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                                <select
                                    value={selectedModuleFilter}
                                    onChange={(e) => setSelectedModuleFilter(e.target.value)}
                                    className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring dark:bg-slate-950"
                                >
                                    <option value="ALL">All Modules ({categories.length})</option>
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat} ({categoryGroups[cat]?.length || 0})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Role Filter */}
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                                <select
                                    value={selectedRoleFilter}
                                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                                    className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring dark:bg-slate-950"
                                >
                                    <option value="ALL">All Roles ({roles.length})</option>
                                    {roles.map((r) => (
                                        <option key={r.name} value={r.name}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Matrix Table */}
                        <div className="relative overflow-x-auto rounded-lg border bg-white dark:bg-slate-950">
                            <Table className="w-full border-collapse text-left">
                                <TableHeader className="sticky top-0 z-20 bg-slate-800 text-white shadow-md">
                                    <TableRow className="hover:bg-slate-800">
                                        <TableHead className="w-80 min-w-[240px] font-bold text-white bg-slate-800 border-r border-slate-700 p-3">
                                            Module / Permission ({allPermissions.length})
                                        </TableHead>

                                        {visibleRoles.map((role) => {
                                            const grantedCount = role.permissions.length;
                                            return (
                                                <TableHead
                                                    key={role.id}
                                                    className="min-w-[140px] text-center font-bold text-white bg-slate-800 border-r border-slate-700 p-3"
                                                >
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <div className="flex items-center gap-1">
                                                            <Shield className="h-3.5 w-3.5 text-primary-foreground" />
                                                            <span className="truncate max-w-[130px]" title={role.name}>
                                                                {role.name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-700 text-white">
                                                                {grantedCount} perms
                                                            </Badge>
                                                            {can('update roles') && (
                                                                <Link href={`/roles/${role.id}/edit`}>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-5 w-5 p-0 text-slate-300 hover:text-white"
                                                                        title="Edit role"
                                                                    >
                                                                        <Edit3 className="h-3 w-3" />
                                                                    </Button>
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableHead>
                                            );
                                        })}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.keys(filteredCategoryGroups).length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={visibleRoles.length + 1}
                                                className="h-32 text-center text-muted-foreground"
                                            >
                                                No permissions match your filter.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        Object.entries(filteredCategoryGroups).map(([cat, perms]) => {
                                            const isCollapsed = !!collapsedCategories[cat];

                                            return (
                                                <React.Fragment key={cat}>
                                                    {/* Category Header Row */}
                                                    <TableRow
                                                        onClick={() => toggleCollapseCategory(cat)}
                                                        className="bg-slate-100 hover:bg-slate-200/80 cursor-pointer select-none dark:bg-slate-900 dark:hover:bg-slate-800"
                                                    >
                                                        <TableCell
                                                            colSpan={visibleRoles.length + 1}
                                                            className="font-bold text-slate-900 dark:text-slate-100 p-3 border-y border-slate-200 dark:border-slate-800"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    {isCollapsed ? (
                                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                                    ) : (
                                                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                                    )}
                                                                    <span>{cat}</span>
                                                                    <Badge variant="outline" className="text-xs bg-white dark:bg-slate-950">
                                                                        {perms.length} Permissions
                                                                    </Badge>
                                                                </div>
                                                                <span className="text-[11px] font-normal text-muted-foreground">
                                                                    {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Permission Item Rows */}
                                                    {!isCollapsed &&
                                                        perms.map((permission) => (
                                                            <TableRow
                                                                key={permission}
                                                                className="hover:bg-slate-50 border-b border-slate-100 dark:hover:bg-slate-900/50 dark:border-slate-800/60"
                                                            >
                                                                <TableCell className="border-r border-slate-200 dark:border-slate-800 p-2.5 pl-6">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                                                                            {formatPermissionLabel(permission)}
                                                                        </span>
                                                                        <span className="font-mono text-[10px] text-muted-foreground">
                                                                            {permission}
                                                                        </span>
                                                                    </div>
                                                                </TableCell>

                                                                {visibleRoles.map((role) => {
                                                                    const isGranted = role.permissions.includes(permission);
                                                                    const isToggling = togglingKey === `${role.id}:${permission}`;

                                                                    return (
                                                                        <TableCell
                                                                            key={role.id}
                                                                            className="text-center border-r border-slate-200 dark:border-slate-800 p-2"
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                disabled={!can('update roles') || isToggling}
                                                                                onClick={() => togglePermission(role.id, permission, isGranted)}
                                                                                className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                                                                                    isGranted
                                                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:hover:bg-emerald-900'
                                                                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-600 dark:hover:bg-slate-800'
                                                                                } ${!can('update roles') ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                                                                title={`${isGranted ? 'Revoke' : 'Grant'} '${permission}' for ${role.name}`}
                                                                            >
                                                                                {isToggling ? (
                                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                                ) : isGranted ? (
                                                                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                                                                                ) : (
                                                                                    <XCircle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                                                                                )}
                                                                            </button>
                                                                        </TableCell>
                                                                    );
                                                                })}
                                                            </TableRow>
                                                        ))}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

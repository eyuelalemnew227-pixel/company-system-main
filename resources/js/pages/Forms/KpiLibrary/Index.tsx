import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Target,
    Plus,
    Search,
    Edit,
    Trash2,
    FileText,
    Check,
    ChevronsUpDown,
    X,
    Filter,
    ArrowLeft,
    Briefcase,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleOption {
    id: number;
    name: string;
}

interface MasterKpiOption {
    id: number;
    name: string;
    description?: string | null;
}

interface FormOption {
    id: number;
    title: string;
    status: string;
}

interface KpiItem {
    id: number;
    role_id?: number | null;
    role?: { id: number; name: string } | null;
    kpi_item_id?: number | null;
    name: string;
    weight: number;
    description?: string | null;
    created_at: string;
    creator?: { id: number; name: string } | null;
    forms: FormOption[];
}

interface Props {
    kpis: {
        data: KpiItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters: {
        search?: string;
        role_id?: string;
        form_id?: string;
    };
    roles: RoleOption[];
    masterKpis: MasterKpiOption[];
    availableForms: FormOption[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Form Builder', href: '/forms' },
    { title: 'KPI Library', href: '/kpi-libraries' },
];

function getCsrfToken(): string {
    const match = document.cookie.match(new RegExp('(^|;\\s*)XSRF-TOKEN=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : '';
}

export default function Index({ kpis, filters, roles = [], masterKpis = [], availableForms = [] }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role_id || 'all');
    const [formFilter, setFormFilter] = useState(filters.form_id || 'all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingKpi, setEditingKpi] = useState<KpiItem | null>(null);
    const [kpiToDelete, setKpiToDelete] = useState<KpiItem | null>(null);

    // Dynamic Role & KPI options state (allows instant updates when adding on-the-fly)
    const [localRoles, setLocalRoles] = useState<RoleOption[]>(roles);
    const [localMasterKpis, setLocalMasterKpis] = useState<MasterKpiOption[]>(masterKpis);

    // Inline Quick Add state for Role
    const [isAddingRole, setIsAddingRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [roleLoading, setRoleLoading] = useState(false);
    const [roleError, setRoleError] = useState('');

    // Inline Quick Add state for Master KPI
    const [isAddingKpi, setIsAddingKpi] = useState(false);
    const [newKpiName, setNewKpiName] = useState('');
    const [newKpiDescription, setNewKpiDescription] = useState('');
    const [kpiLoading, setKpiLoading] = useState(false);
    const [kpiError, setKpiError] = useState('');

    // Multi-select dropdown state for forms
    const [formDropdownOpen, setFormDropdownOpen] = useState(false);
    const [formSearchQuery, setFormSearchQuery] = useState('');
    const formDropdownRef = useRef<HTMLDivElement>(null);

    // Sync props with state if props update
    useEffect(() => {
        setLocalRoles(roles);
    }, [roles]);

    useEffect(() => {
        setLocalMasterKpis(masterKpis);
    }, [masterKpis]);

    // Close form selection dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formDropdownRef.current && !formDropdownRef.current.contains(event.target as Node)) {
                setFormDropdownOpen(false);
            }
        };

        if (formDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [formDropdownOpen]);

    // Inertia form for create / edit
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        role_id: '' as string,
        kpi_item_id: '' as string,
        name: '',
        weight: '',
        description: '',
        form_ids: [] as number[],
    });

    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditingKpi(null);
        setIsAddingRole(false);
        setIsAddingKpi(false);
        setRoleError('');
        setKpiError('');
        setNewRoleName('');
        setNewKpiName('');
        setNewKpiDescription('');
        setFormSearchQuery('');
        setFormDropdownOpen(false);
        setIsCreateOpen(true);
    };

    const openEditModal = (kpi: KpiItem) => {
        clearErrors();
        setEditingKpi(kpi);
        setIsAddingRole(false);
        setIsAddingKpi(false);
        setRoleError('');
        setKpiError('');
        setData({
            role_id: kpi.role_id ? String(kpi.role_id) : '',
            kpi_item_id: kpi.kpi_item_id ? String(kpi.kpi_item_id) : '',
            name: kpi.name,
            weight: kpi.weight !== null && kpi.weight !== undefined ? String(kpi.weight) : '',
            description: kpi.description || '',
            form_ids: kpi.forms ? kpi.forms.map((f) => f.id) : [],
        });
        setFormSearchQuery('');
        setFormDropdownOpen(false);
        setIsCreateOpen(true);
    };

    // Quick-Add Role Handler
    const handleQuickAddRole = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newRoleName.trim();
        if (!trimmed) return;

        setRoleLoading(true);
        setRoleError('');
        try {
            const res = await fetch('/kpi-libraries/quick-role', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ name: trimmed }),
            });
            const json = await res.json();
            if (json.success && json.role) {
                setLocalRoles((prev) => {
                    if (prev.some((r) => r.id === json.role.id)) return prev;
                    return [...prev, json.role].sort((a, b) => a.name.localeCompare(b.name));
                });
                setData('role_id', String(json.role.id));
                setNewRoleName('');
                setIsAddingRole(false);
            } else {
                setRoleError(json.message || 'Failed to create role.');
            }
        } catch (err: any) {
            setRoleError(err.message || 'Network error occurred while creating role.');
        } finally {
            setRoleLoading(false);
        }
    };

    // Quick-Add KPI Handler
    const handleQuickAddKpi = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newKpiName.trim();
        if (!trimmed) return;

        setKpiLoading(true);
        setKpiError('');
        try {
            const res = await fetch('/kpi-libraries/quick-kpi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    name: trimmed,
                    description: newKpiDescription.trim() || undefined,
                }),
            });
            const json = await res.json();
            if (json.success && json.kpi) {
                setLocalMasterKpis((prev) => {
                    if (prev.some((k) => k.id === json.kpi.id)) return prev;
                    return [...prev, json.kpi].sort((a, b) => a.name.localeCompare(b.name));
                });
                setData((prev) => ({
                    ...prev,
                    kpi_item_id: String(json.kpi.id),
                    name: json.kpi.name,
                    description: prev.description ? prev.description : (json.kpi.description || ''),
                }));
                setNewKpiName('');
                setNewKpiDescription('');
                setIsAddingKpi(false);
            } else {
                setKpiError(json.message || 'Failed to create KPI.');
            }
        } catch (err: any) {
            setKpiError(err.message || 'Network error occurred while creating KPI.');
        } finally {
            setKpiLoading(false);
        }
    };

    // When selecting a KPI from the dropdown
    const handleKpiDropdownSelect = (val: string) => {
        if (!val) {
            setData((prev) => ({ ...prev, kpi_item_id: '', name: '' }));
            return;
        }

        const found = localMasterKpis.find((k) => String(k.id) === val);
        if (found) {
            setData((prev) => ({
                ...prev,
                kpi_item_id: String(found.id),
                name: found.name,
                description: prev.description ? prev.description : (found.description || ''),
            }));
        } else {
            setData((prev) => ({ ...prev, kpi_item_id: '', name: val }));
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingKpi) {
            put(`/kpi-libraries/${editingKpi.id}`, {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    setEditingKpi(null);
                    reset();
                },
            });
        } else {
            post('/kpi-libraries', {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    reset();
                },
            });
        }
    };

    const confirmDelete = () => {
        if (!kpiToDelete) return;
        router.delete(`/kpi-libraries/${kpiToDelete.id}`, {
            onSuccess: () => setKpiToDelete(null),
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/kpi-libraries',
            {
                search: search || undefined,
                role_id: roleFilter !== 'all' ? roleFilter : undefined,
                form_id: formFilter !== 'all' ? formFilter : undefined,
            },
            { preserveState: true }
        );
    };

    const handleRoleFilterChange = (val: string) => {
        setRoleFilter(val);
        router.get(
            '/kpi-libraries',
            {
                search: search || undefined,
                role_id: val !== 'all' ? val : undefined,
                form_id: formFilter !== 'all' ? formFilter : undefined,
            },
            { preserveState: true }
        );
    };

    const handleFormFilterChange = (val: string) => {
        setFormFilter(val);
        router.get(
            '/kpi-libraries',
            {
                search: search || undefined,
                role_id: roleFilter !== 'all' ? roleFilter : undefined,
                form_id: val !== 'all' ? val : undefined,
            },
            { preserveState: true }
        );
    };

    const handleResetFilters = () => {
        setSearch('');
        setRoleFilter('all');
        setFormFilter('all');
        router.get('/kpi-libraries', {}, { preserveState: true });
    };

    const toggleFormSelection = (formId: number) => {
        if (data.form_ids.includes(formId)) {
            setData(
                'form_ids',
                data.form_ids.filter((id) => id !== formId)
            );
        } else {
            setData('form_ids', [...data.form_ids, formId]);
        }
    };

    const selectAllForms = () => {
        setData(
            'form_ids',
            availableForms.map((f) => f.id)
        );
    };

    const deselectAllForms = () => {
        setData('form_ids', []);
    };

    // Filter available forms based on search query in modal
    const filteredModalForms = availableForms.filter((f) =>
        f.title.toLowerCase().includes(formSearchQuery.toLowerCase())
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="KPI Library - Form Builder" />

            <div className="max-w-7xl mx-auto space-y-6 pb-16">
                {/* Standard Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">KPI Library</h2>
                        <p className="text-muted-foreground text-sm">
                            Manage Key Performance Indicators by Role, set evaluation weights, and associate them with operational forms.
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Button variant="outline" asChild className="bg-white">
                            <Link href="/forms">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Forms
                            </Link>
                        </Button>
                        <Button
                            onClick={openCreateModal}
                            className="bg-amber-900 hover:bg-amber-800 text-white font-semibold shadow-sm"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add KPI
                        </Button>
                    </div>
                </div>

                {/* Search & Filter Toolbar */}
                <Card className="border-amber-900/10 shadow-sm bg-white">
                    <CardContent className="p-4">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="flex flex-col md:flex-row items-stretch md:items-center gap-3"
                        >
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by KPI name, description, or role..."
                                    className="pl-10 bg-white"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {/* Role Filter */}
                                <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                                    <SelectTrigger className="w-[190px] bg-white text-sm">
                                        <Briefcase className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                        <SelectValue placeholder="Filter by Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="unassigned">General (No Role)</SelectItem>
                                        {localRoles.map((r) => (
                                            <SelectItem key={r.id} value={String(r.id)}>
                                                {r.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Form Filter */}
                                <Select value={formFilter} onValueChange={handleFormFilterChange}>
                                    <SelectTrigger className="w-[200px] bg-white text-sm">
                                        <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                        <SelectValue placeholder="Filter by form" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Linked Forms</SelectItem>
                                        {availableForms.map((f) => (
                                            <SelectItem key={f.id} value={String(f.id)}>
                                                {f.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button type="submit" variant="default" className="bg-amber-900 hover:bg-amber-800">
                                    Search
                                </Button>

                                {(filters.search ||
                                    (filters.role_id && filters.role_id !== 'all') ||
                                    (filters.form_id && filters.form_id !== 'all')) && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleResetFilters}
                                        className="text-gray-500 hover:text-gray-900"
                                    >
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* KPI List Table */}
                <Card className="border-amber-900/10 shadow-sm overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-amber-900/5 text-amber-950 font-bold border-b border-amber-900/10 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="py-4 px-6">Role</th>
                                    <th className="py-4 px-6">KPI Indicator</th>
                                    <th className="py-4 px-6 text-center w-28">Weight</th>
                                    <th className="py-4 px-6">Description</th>
                                    <th className="py-4 px-6">Related Forms</th>
                                    <th className="py-4 px-6 text-right w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {kpis.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-muted-foreground">
                                            <div className="mx-auto rounded-full bg-amber-50 p-4 w-fit mb-3">
                                                <Target className="h-8 w-8 text-amber-500" />
                                            </div>
                                            <p className="text-base font-semibold text-gray-900">No KPIs found</p>
                                            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                                                {filters.search || filters.role_id || filters.form_id
                                                    ? 'No KPIs matched your search filters. Try clearing the filter to see all items.'
                                                    : 'Your KPI library is currently empty. Click "Add KPI" to create your first performance indicator.'}
                                            </p>
                                            <Button
                                                onClick={openCreateModal}
                                                className="mt-4 bg-amber-900 hover:bg-amber-800"
                                            >
                                                <Plus className="mr-2 h-4 w-4" /> Add KPI
                                            </Button>
                                        </td>
                                    </tr>
                                ) : (
                                    kpis.data.map((kpi) => (
                                        <tr key={kpi.id} className="hover:bg-amber-50/30 transition-colors group">
                                            {/* Role Column */}
                                            <td className="py-4 px-6 align-top">
                                                {kpi.role ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100/70 text-amber-900 border border-amber-200">
                                                        <Briefcase className="w-3 h-3 mr-1.5 text-amber-700" />
                                                        {kpi.role.name}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-gray-500 bg-gray-100 italic">
                                                        General (All Roles)
                                                    </span>
                                                )}
                                            </td>

                                            {/* KPI Name Column */}
                                            <td className="py-4 px-6 align-top">
                                                <div className="flex items-start space-x-3">
                                                    <div className="p-2 rounded-lg bg-amber-100/70 border border-amber-200/80 text-amber-800 mt-0.5 shrink-0 group-hover:scale-105 transition-transform">
                                                        <Target className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-gray-900 text-base block">
                                                            {kpi.name}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            Created {new Date(kpi.created_at).toLocaleDateString()}
                                                            {kpi.creator ? ` by ${kpi.creator.name}` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Weight Column */}
                                            <td className="py-4 px-6 align-top text-center">
                                                <Badge
                                                    variant="secondary"
                                                    className="px-3 py-1 bg-amber-100/80 text-amber-900 font-bold border border-amber-200 rounded-full text-xs"
                                                >
                                                    {kpi.weight !== null && kpi.weight !== undefined
                                                        ? Number(kpi.weight).toLocaleString()
                                                        : '0'}
                                                </Badge>
                                            </td>

                                            {/* Description Column */}
                                            <td className="py-4 px-6 align-top max-w-xs text-gray-600">
                                                {kpi.description ? (
                                                    <p className="line-clamp-2 text-sm leading-relaxed" title={kpi.description}>
                                                        {kpi.description}
                                                    </p>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No description provided</span>
                                                )}
                                            </td>

                                            {/* Related Forms Column */}
                                            <td className="py-4 px-6 align-top">
                                                {!kpi.forms || kpi.forms.length === 0 ? (
                                                    <span className="text-xs text-muted-foreground italic">No forms linked</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1.5 max-w-md">
                                                        {kpi.forms.map((form) => (
                                                            <Link
                                                                key={form.id}
                                                                href={`/forms/${form.id}`}
                                                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-amber-100 hover:text-amber-900 text-gray-800 border border-gray-200 hover:border-amber-300 transition-colors"
                                                            >
                                                                <FileText className="w-3 h-3 mr-1 text-amber-700 shrink-0" />
                                                                <span className="truncate max-w-[150px]">{form.title}</span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-6 align-top text-right">
                                                <div className="flex items-center justify-end space-x-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditModal(kpi)}
                                                        className="h-8 w-8 p-0 text-gray-600 hover:text-amber-900 hover:bg-amber-100"
                                                        title="Edit KPI"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setKpiToDelete(kpi)}
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        title="Delete KPI"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {kpis.last_page > 1 && (
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                                Page {kpis.current_page} of {kpis.last_page} ({kpis.total} items)
                            </span>
                            <div className="flex space-x-1">
                                {kpis.links.map((link, idx) => (
                                    <Button
                                        key={idx}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        className={cn(
                                            'h-8 px-3 text-xs',
                                            link.active ? 'bg-amber-900 hover:bg-amber-800' : ''
                                        )}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                {/* Create & Edit Modal */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="max-w-xl bg-white max-h-[90vh] overflow-y-auto">
                        <form onSubmit={handleFormSubmit}>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-amber-950 flex items-center">
                                    <Target className="mr-2 h-5 w-5 text-amber-700" />
                                    {editingKpi ? 'Edit KPI Indicator' : 'Create New KPI Indicator'}
                                </DialogTitle>
                                <DialogDescription>
                                    Assign a Role, select or define a KPI, enter evaluation weight, and link related operational forms.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-5 py-5">
                                {/* 1. Role Selection + Add Role Button */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="kpi-role" className="font-semibold text-gray-900 flex items-center gap-1.5">
                                            <Briefcase className="w-4 h-4 text-amber-800" />
                                            Target Role / Position
                                        </Label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsAddingRole(!isAddingRole);
                                                setRoleError('');
                                            }}
                                            className="inline-flex items-center text-xs font-semibold text-amber-800 hover:text-amber-950 hover:underline"
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1" />
                                            {isAddingRole ? 'Close' : 'Add Role'}
                                        </button>
                                    </div>

                                    {/* Inline Add Role Form */}
                                    {isAddingRole ? (
                                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2 animate-in fade-in-50">
                                            <div className="text-xs font-bold text-amber-950">Add New Role</div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={newRoleName}
                                                    onChange={(e) => setNewRoleName(e.target.value)}
                                                    placeholder="e.g. Barista Lead, Assistant Store Manager..."
                                                    className="bg-white text-sm"
                                                    autoFocus
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={handleQuickAddRole}
                                                    disabled={roleLoading || !newRoleName.trim()}
                                                    size="sm"
                                                    className="bg-amber-900 hover:bg-amber-800 text-white shrink-0"
                                                >
                                                    {roleLoading ? 'Saving...' : 'Save Role'}
                                                </Button>
                                            </div>
                                            {roleError && <p className="text-xs text-red-600 font-medium">{roleError}</p>}
                                        </div>
                                    ) : (
                                        <Select
                                            value={data.role_id || 'none'}
                                            onValueChange={(val) => setData('role_id', val === 'none' ? '' : val)}
                                        >
                                            <SelectTrigger className="w-full bg-white text-sm">
                                                <SelectValue placeholder="Select target role (optional)..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">General / All Roles (No specific role)</SelectItem>
                                                {localRoles.map((r) => (
                                                    <SelectItem key={r.id} value={String(r.id)}>
                                                        {r.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {errors.role_id && (
                                        <p className="text-xs text-red-600 font-medium">{errors.role_id}</p>
                                    )}
                                </div>

                                {/* 2. KPI Indicator Selection + Add KPI Button */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="kpi-name" className="font-semibold text-gray-900 flex items-center gap-1.5">
                                            <Target className="w-4 h-4 text-amber-800" />
                                            KPI Indicator <span className="text-red-500">*</span>
                                        </Label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsAddingKpi(!isAddingKpi);
                                                setKpiError('');
                                            }}
                                            className="inline-flex items-center text-xs font-semibold text-amber-800 hover:text-amber-950 hover:underline"
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1" />
                                            {isAddingKpi ? 'Close' : 'Add KPI'}
                                        </button>
                                    </div>

                                    {/* Inline Add KPI Form */}
                                    {isAddingKpi ? (
                                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2 animate-in fade-in-50">
                                            <div className="text-xs font-bold text-amber-950">Add Master KPI to Library</div>
                                            <Input
                                                value={newKpiName}
                                                onChange={(e) => setNewKpiName(e.target.value)}
                                                placeholder="e.g. Daily Quality Compliance Score"
                                                className="bg-white text-sm"
                                                autoFocus
                                            />
                                            <Input
                                                value={newKpiDescription}
                                                onChange={(e) => setNewKpiDescription(e.target.value)}
                                                placeholder="Default context or formula description (optional)..."
                                                className="bg-white text-xs"
                                            />
                                            <div className="flex items-center justify-end gap-2 pt-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsAddingKpi(false)}
                                                    className="text-xs"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={handleQuickAddKpi}
                                                    disabled={kpiLoading || !newKpiName.trim()}
                                                    size="sm"
                                                    className="bg-amber-900 hover:bg-amber-800 text-white text-xs"
                                                >
                                                    {kpiLoading ? 'Saving...' : 'Save & Select'}
                                                </Button>
                                            </div>
                                            {kpiError && <p className="text-xs text-red-600 font-medium">{kpiError}</p>}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {/* KPI Dropdown from Master KPIs */}
                                            {localMasterKpis.length > 0 && (
                                                <Select
                                                    value={data.kpi_item_id || ''}
                                                    onValueChange={handleKpiDropdownSelect}
                                                >
                                                    <SelectTrigger className="w-full bg-white text-sm">
                                                        <SelectValue placeholder="Select from KPI catalog..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {localMasterKpis.map((k) => (
                                                            <SelectItem key={k.id} value={String(k.id)}>
                                                                {k.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}

                                            {/* Direct Input (allows fine-tuning title or manual typing) */}
                                            <Input
                                                id="kpi-name"
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
                                                placeholder="e.g., Daily Quality Compliance Score"
                                                className="bg-white text-sm"
                                                required
                                            />
                                        </div>
                                    )}
                                    {errors.name && (
                                        <p className="text-xs text-red-600 font-medium">{errors.name}</p>
                                    )}
                                </div>

                                {/* 3. Weight Value */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="kpi-weight" className="font-semibold text-gray-900 flex items-center justify-between">
                                        <span>Weight Value</span>
                                        <span className="text-xs text-muted-foreground font-normal">e.g., 20 or 15.5</span>
                                    </Label>
                                    <Input
                                        id="kpi-weight"
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={data.weight}
                                        onChange={(e) => setData('weight', e.target.value)}
                                        placeholder="0.00"
                                        className="bg-white"
                                    />
                                    {errors.weight && (
                                        <p className="text-xs text-red-600 font-medium">{errors.weight}</p>
                                    )}
                                </div>

                                {/* 4. Description */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="kpi-description" className="font-semibold text-gray-900">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="kpi-description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Add context, formula, or scoring expectations for this KPI..."
                                        rows={3}
                                        className="bg-white"
                                    />
                                    {errors.description && (
                                        <p className="text-xs text-red-600 font-medium">{errors.description}</p>
                                    )}
                                </div>

                                {/* 5. Related Forms Multi-Select Dropdown */}
                                <div className="space-y-2" ref={formDropdownRef}>
                                    <div className="flex items-center justify-between">
                                        <Label className="font-semibold text-gray-900">
                                            Related Forms / Checklists
                                        </Label>
                                        <div className="space-x-2 text-xs">
                                            <button
                                                type="button"
                                                onClick={selectAllForms}
                                                className="text-amber-700 hover:underline font-medium"
                                            >
                                                Select All ({availableForms.length})
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                type="button"
                                                onClick={deselectAllForms}
                                                className="text-gray-500 hover:underline"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    {/* Dropdown Input/Trigger Box */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setFormDropdownOpen((prev) => !prev)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2.5 bg-white border rounded-md shadow-sm text-sm text-left transition-all",
                                                formDropdownOpen
                                                    ? "border-amber-800 ring-2 ring-amber-800/20"
                                                    : "border-gray-300 hover:border-gray-400"
                                            )}
                                        >
                                            <span className={data.form_ids.length === 0 ? 'text-gray-400' : 'text-gray-900 font-medium'}>
                                                {data.form_ids.length === 0
                                                    ? 'Click to select related forms...'
                                                    : `${data.form_ids.length} form${data.form_ids.length > 1 ? 's' : ''} selected`}
                                            </span>
                                            <ChevronsUpDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                                        </button>

                                        {/* Dropdown Menu Container (in-dialog, direct clicks) */}
                                        {formDropdownOpen && (
                                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-lg border border-gray-200 shadow-2xl overflow-hidden">
                                                {/* Search header inside dropdown */}
                                                <div className="p-2 border-b border-gray-100 bg-gray-50/80">
                                                    <div className="relative">
                                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={formSearchQuery}
                                                            onChange={(e) => setFormSearchQuery(e.target.value)}
                                                            placeholder="Search forms by name..."
                                                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:border-amber-700"
                                                            autoFocus
                                                        />
                                                        {formSearchQuery && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormSearchQuery('')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Scrollable list of options */}
                                                <div className="max-h-52 overflow-y-auto divide-y divide-gray-50 p-1">
                                                    {filteredModalForms.length === 0 ? (
                                                        <div className="py-6 text-center text-xs text-gray-500">
                                                            No matching forms found.
                                                        </div>
                                                    ) : (
                                                        filteredModalForms.map((form) => {
                                                            const isSelected = data.form_ids.includes(form.id);
                                                            return (
                                                                <div
                                                                    key={form.id}
                                                                    onClick={() => toggleFormSelection(form.id)}
                                                                    className={cn(
                                                                        "flex items-center px-3 py-2 rounded-md text-sm cursor-pointer select-none transition-colors",
                                                                        isSelected
                                                                            ? "bg-amber-50/80 hover:bg-amber-100/70"
                                                                            : "hover:bg-gray-100/70"
                                                                    )}
                                                                >
                                                                    <div
                                                                        className={cn(
                                                                            "w-4 h-4 rounded border mr-2.5 flex items-center justify-center shrink-0 transition-colors",
                                                                            isSelected
                                                                                ? "bg-amber-800 border-amber-800 text-white"
                                                                                : "border-gray-300 bg-white"
                                                                        )}
                                                                    >
                                                                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                                    </div>
                                                                    <span className="font-medium text-gray-800 flex-1 truncate">
                                                                        {form.title}
                                                                    </span>
                                                                    {form.status && (
                                                                        <span className="text-[10px] uppercase font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-2 shrink-0">
                                                                            {form.status}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {/* Footer quick action */}
                                                <div className="p-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                                                    <span>{data.form_ids.length} of {availableForms.length} selected</span>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setFormDropdownOpen(false)}
                                                        className="h-6 px-2 text-xs text-amber-800 font-semibold hover:bg-amber-100"
                                                    >
                                                        Done
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected Badges */}
                                    {data.form_ids.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                                            {data.form_ids.map((fId) => {
                                                const formObj = availableForms.find((f) => f.id === fId);
                                                if (!formObj) return null;
                                                return (
                                                    <Badge
                                                        key={fId}
                                                        variant="secondary"
                                                        className="bg-amber-100/80 text-amber-900 border border-amber-200 text-xs py-1 px-2.5 flex items-center space-x-1"
                                                    >
                                                        <span className="truncate max-w-[200px]">{formObj.title}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleFormSelection(fId)}
                                                            className="ml-1 text-amber-700 hover:text-amber-950 p-0.5 rounded-full hover:bg-amber-200"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {errors.form_ids && (
                                        <p className="text-xs text-red-600 font-medium">{errors.form_ids}</p>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="pt-2 border-t border-gray-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreateOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-amber-900 hover:bg-amber-800 text-white font-bold"
                                >
                                    {processing ? 'Saving...' : editingKpi ? 'Update KPI' : 'Save KPI'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Alert */}
                <AlertDialog open={!!kpiToDelete} onOpenChange={(open) => !open && setKpiToDelete(null)}>
                    <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-red-700 flex items-center">
                                <Trash2 className="mr-2 h-5 w-5" /> Delete KPI Indicator
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete{' '}
                                <strong className="text-gray-900 font-semibold">{kpiToDelete?.name}</strong>?
                                This action cannot be undone and will detach this KPI from all associated forms.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={confirmDelete}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                            >
                                Delete KPI
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}

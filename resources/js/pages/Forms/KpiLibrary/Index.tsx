import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Target,
    Plus,
    Search,
    Edit,
    Trash2,
    FileText,
    Scale,
    Layers,
    ExternalLink,
    Check,
    ChevronsUpDown,
    X,
    Filter,
    ArrowLeft,
    FileQuestion,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormOption {
    id: number;
    title: string;
    status: string;
}

interface KpiItem {
    id: number;
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
        form_id?: string;
    };
    metrics: {
        total_kpis: number;
        total_weight: number;
        linked_forms_count: number;
    };
    availableForms: FormOption[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Form Builder', href: '/forms' },
    { title: 'KPI Library', href: '/kpi-libraries' },
];

export default function Index({ kpis, filters, metrics, availableForms }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [formFilter, setFormFilter] = useState(filters.form_id || 'all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingKpi, setEditingKpi] = useState<KpiItem | null>(null);
    const [kpiToDelete, setKpiToDelete] = useState<KpiItem | null>(null);

    // Multi-select popover state for create/edit modal
    const [formSelectOpen, setFormSelectOpen] = useState(false);

    // Inertia form for create / edit
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        weight: '',
        description: '',
        form_ids: [] as number[],
    });

    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditingKpi(null);
        setIsCreateOpen(true);
    };

    const openEditModal = (kpi: KpiItem) => {
        clearErrors();
        setEditingKpi(kpi);
        setData({
            name: kpi.name,
            weight: kpi.weight !== null && kpi.weight !== undefined ? String(kpi.weight) : '',
            description: kpi.description || '',
            form_ids: kpi.forms ? kpi.forms.map((f) => f.id) : [],
        });
        setIsCreateOpen(true);
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
                form_id: val !== 'all' ? val : undefined,
            },
            { preserveState: true }
        );
    };

    const handleResetFilters = () => {
        setSearch('');
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="KPI Library - Form Builder" />

            <div className="max-w-7xl mx-auto space-y-8 pb-16">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 p-6 sm:p-8 rounded-2xl shadow-md text-white">
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <span className="p-2 bg-amber-700/50 rounded-xl border border-amber-600/50 text-amber-200">
                                <Target className="h-6 w-6" />
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">KPI Library</h1>
                        </div>
                        <p className="text-amber-200/80 text-sm sm:text-base max-w-2xl pt-1">
                            Define Key Performance Indicators with weights and link them to operational forms and checklists.
                        </p>
                    </div>
                    <div className="flex items-center space-x-3 pt-2 sm:pt-0">
                        <Button
                            variant="outline"
                            asChild
                            className="bg-amber-950/40 border-amber-700/60 text-amber-100 hover:bg-amber-800/60 hover:text-white"
                        >
                            <Link href="/forms">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Forms
                            </Link>
                        </Button>
                        <Button
                            onClick={openCreateModal}
                            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold shadow-md hover:shadow-lg transition-all"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add KPI
                        </Button>
                    </div>
                </div>

                {/* Metrics Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <Card className="border-amber-900/10 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold text-amber-900/80">
                                Total KPIs in Library
                            </CardTitle>
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
                                <Target className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-amber-950">
                                {metrics.total_kpis}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Configured indicators</p>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-900/10 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold text-emerald-900/80">
                                Cumulative Weight
                            </CardTitle>
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
                                <Scale className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-emerald-950">
                                {Number(metrics.total_weight).toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Total weight across library</p>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-900/10 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold text-blue-900/80">
                                Linked Forms
                            </CardTitle>
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-800">
                                <Layers className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-blue-950">
                                {metrics.linked_forms_count}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Unique checklists connected</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & Filter Toolbar */}
                <Card className="border-amber-900/10 shadow-sm bg-white">
                    <CardContent className="p-4 sm:p-5">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="flex flex-col md:flex-row items-stretch md:items-center gap-3"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search KPIs by name or description..."
                                    className="pl-10 bg-white"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Select value={formFilter} onValueChange={handleFormFilterChange}>
                                    <SelectTrigger className="w-[240px] bg-white text-sm">
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

                                {(filters.search || (filters.form_id && filters.form_id !== 'all')) && (
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
                                    <th className="py-4 px-6">KPI Name</th>
                                    <th className="py-4 px-6 text-center w-28">Weight</th>
                                    <th className="py-4 px-6">Description</th>
                                    <th className="py-4 px-6">Related Forms</th>
                                    <th className="py-4 px-6 text-right w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {kpis.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center text-muted-foreground">
                                            <div className="mx-auto rounded-full bg-amber-50 p-4 w-fit mb-3">
                                                <Target className="h-8 w-8 text-amber-500" />
                                            </div>
                                            <p className="text-base font-semibold text-gray-900">No KPIs found</p>
                                            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                                                {filters.search || filters.form_id
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

                                            <td className="py-4 px-6 align-top max-w-xs text-gray-600">
                                                {kpi.description ? (
                                                    <p className="line-clamp-2 text-sm leading-relaxed" title={kpi.description}>
                                                        {kpi.description}
                                                    </p>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No description provided</span>
                                                )}
                                            </td>

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
                    <DialogContent className="max-w-xl bg-white">
                        <form onSubmit={handleFormSubmit}>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-amber-950 flex items-center">
                                    <Target className="mr-2 h-5 w-5 text-amber-700" />
                                    {editingKpi ? 'Edit KPI Indicator' : 'Create New KPI Indicator'}
                                </DialogTitle>
                                <DialogDescription>
                                    Define the name, evaluation weight, and link this indicator to relevant forms.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-5 py-5">
                                {/* Name */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="kpi-name" className="font-semibold text-gray-900">
                                        KPI Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="kpi-name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="e.g., Daily Quality Compliance Score"
                                        className="bg-white"
                                        required
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-red-600 font-medium">{errors.name}</p>
                                    )}
                                </div>

                                {/* Weight */}
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

                                {/* Description */}
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

                                {/* Related Forms Multi-Select */}
                                <div className="space-y-2">
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
                                                Select All
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

                                    {/* Multi-selection dropdown popover */}
                                    <Popover open={formSelectOpen} onOpenChange={setFormSelectOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between bg-white border text-left font-normal min-h-[42px] h-auto py-2"
                                            >
                                                {data.form_ids.length === 0 ? (
                                                    <span className="text-muted-foreground">Select related forms...</span>
                                                ) : (
                                                    <span className="font-medium text-gray-800">
                                                        {data.form_ids.length} form{data.form_ids.length > 1 ? 's' : ''} selected
                                                    </span>
                                                )}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[450px] p-0 bg-white shadow-lg" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search forms by title..." />
                                                <CommandList className="max-h-64">
                                                    <CommandEmpty>No forms found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {availableForms.map((form) => {
                                                            const isSelected = data.form_ids.includes(form.id);
                                                            return (
                                                                <CommandItem
                                                                    key={form.id}
                                                                    onSelect={() => toggleFormSelection(form.id)}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <div
                                                                        className={cn(
                                                                            'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                                                                            isSelected
                                                                                ? 'bg-amber-800 text-white border-amber-800'
                                                                                : 'opacity-50 [&_svg]:invisible'
                                                                        )}
                                                                    >
                                                                        <Check className="h-3 w-3" />
                                                                    </div>
                                                                    <span className="font-medium text-gray-800 flex-1">
                                                                        {form.title}
                                                                    </span>
                                                                    {form.status && (
                                                                        <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-2">
                                                                            {form.status}
                                                                        </span>
                                                                    )}
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>

                                    {/* Selected Form Badges */}
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
                                                        <span>{formObj.title}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleFormSelection(fId)}
                                                            className="ml-1 text-amber-700 hover:text-amber-950"
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

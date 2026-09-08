import { type BreadcrumbItem, type PaginationData } from '@/types';
import { type SocialMediaSource } from '@/types/pre-order';
import { Head, router, useForm } from '@inertiajs/react';
import { PlusIcon, SearchIcon, PencilIcon, Trash2Icon, Share2Icon, Sparkles } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Social Media Sources', href: '/settings/social-media-sources' },
];

type Props = {
    sources: PaginationData<SocialMediaSource>;
    filters: {
        search?: string;
        status?: string;
    };
};

export default function Index({ sources, filters }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<SocialMediaSource | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const createForm = useForm<{
        name: string;
        is_active: boolean;
        display_order: number;
    }>({
        name: '',
        is_active: true,
        display_order: 0,
    });

    const editForm = useForm<{
        name: string;
        is_active: boolean;
        display_order: number;
    }>({
        name: '',
        is_active: true,
        display_order: 0,
    });

    const handleSearch = () => {
        router.get('/settings/social-media-sources', { search }, { preserveState: true });
    };

    const handleCreate: FormEventHandler = (e) => {
        e.preventDefault();
        createForm.post(route('social-media-sources.store'), {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEdit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!editingSource) return;

        editForm.put(route('social-media-sources.update', editingSource.id), {
            onSuccess: () => {
                setIsEditOpen(false);
                setEditingSource(null);
                editForm.reset();
            },
        });
    };

    const openEditDialog = (source: SocialMediaSource) => {
        setEditingSource(source);
        editForm.setData({
            name: source.name,
            is_active: source.is_active,
            display_order: source.display_order ?? 0,
        });
        setIsEditOpen(true);
    };

    const handleToggleStatus = (source: SocialMediaSource) => {
        router.patch(route('social-media-sources.toggle-status', source.id), {}, { preserveState: true });
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this Social Media Source?')) {
            router.delete(route('social-media-sources.destroy', id));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Social Media Sources (MiniApp)" />

            <div className="container mx-auto p-6 space-y-6">
                {/* Header with Create Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-transparent p-4 rounded-xl border">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-600/15 rounded-lg text-purple-600 dark:text-purple-400">
                            <Share2Icon className="size-6" />
                        </div>
                        <div>
                            <Heading
                                title="Social Media Sources (MiniApp)"
                                description="Manage 'How did you hear about us' marketing channels shown to customers in the Telegram MiniApp"
                            />
                        </div>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm">
                        <PlusIcon className="mr-2 size-4" />
                        Add Social Media Source
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search social media sources (e.g. Facebook, Instagram, TikTok)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="pl-10"
                        />
                    </div>
                    <Button onClick={handleSearch} variant="secondary">Search</Button>
                </div>

                {/* Sources Table */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead className="w-16">#</TableHead>
                                <TableHead>Source Name</TableHead>
                                <TableHead>Display Order</TableHead>
                                <TableHead>Status (Enable / Disable)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sources.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No social media sources found. Click "Add Social Media Source" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sources.data.map((src, index) => (
                                    <TableRow key={src.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-xs text-muted-foreground font-mono">
                                            {src.display_order ?? index + 1}
                                        </TableCell>
                                        <TableCell className="font-semibold text-foreground flex items-center gap-2">
                                            <Sparkles className="size-3.5 text-purple-500" />
                                            {src.name}
                                        </TableCell>
                                        <TableCell className="text-sm font-mono text-muted-foreground">
                                            {src.display_order}
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(src)}
                                                className="inline-flex items-center gap-2 group cursor-pointer focus:outline-none"
                                                title="Click to toggle status (Enable/Disable)"
                                            >
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all shadow-sm ${
                                                        src.is_active
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                                                            : 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                                                    }`}
                                                >
                                                    {src.is_active ? '✓ Enabled' : '✕ Disabled'}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground underline opacity-70 group-hover:opacity-100 transition-opacity">
                                                    Click to {src.is_active ? 'Disable' : 'Enable'}
                                                </span>
                                            </button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditDialog(src)}
                                                >
                                                    <PencilIcon className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(src.id)}
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2Icon className="size-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Social Media Source</DialogTitle>
                        <DialogDescription>
                            Create a new hearing source (e.g., Facebook, TikTok, Instagram) for MiniApp pre-orders.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Source Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g., TikTok Ads, Telegram Channel, Google Search"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                required
                            />
                            <InputError message={createForm.errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="display_order">Display Order</Label>
                            <Input
                                id="display_order"
                                type="number"
                                placeholder="0"
                                value={createForm.data.display_order}
                                onChange={(e) => createForm.setData('display_order', parseInt(e.target.value) || 0)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={createForm.data.is_active ? 'Active' : 'Inactive'}
                                onValueChange={(value) => createForm.setData('is_active', value === 'Active')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">Enabled (Show in MiniApp)</SelectItem>
                                    <SelectItem value="Inactive">Disabled (Hide from MiniApp)</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={createForm.errors.is_active} />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createForm.processing} className="bg-purple-600 hover:bg-purple-700 text-white">
                                Save Source
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Social Media Source</DialogTitle>
                        <DialogDescription>
                            Update the title, status, or sorting order for this social media source.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit_name">Source Name</Label>
                            <Input
                                id="edit_name"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                required
                            />
                            <InputError message={editForm.errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit_display_order">Display Order</Label>
                            <Input
                                id="edit_display_order"
                                type="number"
                                value={editForm.data.display_order}
                                onChange={(e) => editForm.setData('display_order', parseInt(e.target.value) || 0)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit_status">Status</Label>
                            <Select
                                value={editForm.data.is_active ? 'Active' : 'Inactive'}
                                onValueChange={(value) => editForm.setData('is_active', value === 'Active')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">Enabled (Show in MiniApp)</SelectItem>
                                    <SelectItem value="Inactive">Disabled (Hide from MiniApp)</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={editForm.errors.is_active} />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editForm.processing} className="bg-purple-600 hover:bg-purple-700 text-white">
                                Update Source
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

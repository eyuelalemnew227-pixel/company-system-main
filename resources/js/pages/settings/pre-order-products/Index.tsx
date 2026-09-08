import { type BreadcrumbItem, type PaginationData } from '@/types';
import { type PreOrderProduct } from '@/types/pre-order';
import { Head, router, useForm } from '@inertiajs/react';
import { PlusIcon, SearchIcon, PencilIcon, Trash2Icon } from 'lucide-react';
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
    { title: 'Pre-Order Products', href: '/settings/pre-order-products' },
];

type Props = {
    products: PaginationData<PreOrderProduct>;
    filters: {
        search?: string;
        status?: string;
    };
    userPermissions: string[];
};

export default function Index({ products, filters, userPermissions }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<PreOrderProduct | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const createForm = useForm({
        product_name: '',
        unit_price: '',
        original_price: '',
        walkin_price: '',
        status: 'Active' as 'Active' | 'Inactive',
        has_discount: false as boolean,
    });

    const editForm = useForm({
        product_name: '',
        unit_price: '',
        original_price: '',
        walkin_price: '',
        status: 'Active' as 'Active' | 'Inactive',
        has_discount: false as boolean,
    });

    const handleSearch = () => {
        router.get('/settings/pre-order-products', { search }, { preserveState: true });
    };

    const handleCreate: FormEventHandler = (e) => {
        e.preventDefault();
        createForm.post(route('pre-order-products.store'), {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEdit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!editingProduct) return;

        editForm.put(route('pre-order-products.update', editingProduct.id), {
            onSuccess: () => {
                setIsEditOpen(false);
                setEditingProduct(null);
                editForm.reset();
            },
        });
    };

    const openEditDialog = (product: PreOrderProduct) => {
        setEditingProduct(product);
        editForm.setData({
            product_name: product.product_name,
            unit_price: product.unit_price,
            original_price: product.original_price ?? '',
            walkin_price: product.walkin_price,
            status: product.status,
            has_discount: product.has_discount ?? false,
        });
        setIsEditOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this product?')) {
            router.delete(route('pre-order-products.destroy', id));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pre-Order Products" />

            <div className="container mx-auto p-6 space-y-6">
                {/* Header with Create Button */}
                <div className="flex items-center justify-between">
                        <Heading
                            title="Pre-Order Products"
                            description="Manage products available for pre-orders"
                        />
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <PlusIcon className="mr-2 size-4" />
                        Add Product
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="flex gap-2">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10"
                            />
                    </div>
                    <Button onClick={handleSearch}>Search</Button>
                </div>

                {/* Products Table */}
                <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Pre-Order Price</TableHead>
                                    <TableHead>Original Price (MiniApp)</TableHead>
                                    <TableHead>Walk-in Price</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            No products found. Click "Add Product" to create one.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    products.data.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">
                                                {product.has_discount ? (
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <span>{product.product_name}</span>
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                            <svg className="w-2.5 h-2.5 shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M17.707 9.293l-7-7A.997.997 0 0010 2H4a2 2 0 00-2 2v6c0 .266.105.52.293.707l7 7a1 1 0 001.414 0l7-7a1 1 0 000-1.414zM6.5 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" clipRule="evenodd" />
                                                            </svg>
                                                            <span>Discounted</span>
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span>{product.product_name}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-semibold text-emerald-700 dark:text-emerald-400">{product.unit_price} ETB</TableCell>
                                            <TableCell className="font-mono text-muted-foreground">{product.original_price ? `${product.original_price} ETB` : '-'}</TableCell>
                                            <TableCell>{product.walkin_price} ETB</TableCell>
                                            <TableCell>
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                                        product.status === 'Active'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                                    }`}
                                                >
                                                    {product.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditDialog(product)}
                                                    >
                                                        <PencilIcon className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(product.id)}
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
                            <DialogTitle>Add New Product</DialogTitle>
                            <DialogDescription>Create a new pre-order product</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="product_name">Product Name</Label>
                                <Input
                                    id="product_name"
                                    value={createForm.data.product_name}
                                    onChange={(e) => createForm.setData('product_name', e.target.value)}
                                    required
                                />
                                <InputError message={createForm.errors.product_name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="unit_price">Pre-Order Price (ETB)</Label>
                                <Input
                                    id="unit_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={createForm.data.unit_price}
                                    onChange={(e) => createForm.setData('unit_price', e.target.value)}
                                    required
                                />
                                <InputError message={createForm.errors.unit_price} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="original_price">Original Price (ETB) <span className="text-xs text-muted-foreground font-normal">(Shown with strikethrough in MiniApp)</span></Label>
                                <Input
                                    id="original_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g. 1500"
                                    value={createForm.data.original_price}
                                    onChange={(e) => createForm.setData('original_price', e.target.value)}
                                />
                                <InputError message={createForm.errors.original_price} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="walkin_price">Walk-in Price (ETB)</Label>
                                <Input
                                    id="walkin_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={createForm.data.walkin_price}
                                    onChange={(e) => createForm.setData('walkin_price', e.target.value)}
                                    required
                                />
                                <InputError message={createForm.errors.walkin_price} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={createForm.data.status}
                                    onValueChange={(value) => createForm.setData('status', value as 'Active' | 'Inactive')}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={createForm.errors.status} />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    id="has_discount"
                                    type="checkbox"
                                    checked={createForm.data.has_discount}
                                    onChange={(e) => createForm.setData('has_discount', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-rose-600 accent-rose-600 cursor-pointer"
                                />
                                <Label htmlFor="has_discount" className="cursor-pointer select-none">
                                    Apply Discount
                                </Label>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createForm.processing}>
                                    Create Product
                                </Button>
                            </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Product</DialogTitle>
                            <DialogDescription>Update product details</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEdit} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit_product_name">Product Name</Label>
                                <Input
                                    id="edit_product_name"
                                    value={editForm.data.product_name}
                                    onChange={(e) => editForm.setData('product_name', e.target.value)}
                                    required
                                />
                                <InputError message={editForm.errors.product_name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit_unit_price">Pre-Order Price (ETB)</Label>
                                <Input
                                    id="edit_unit_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editForm.data.unit_price}
                                    onChange={(e) => editForm.setData('unit_price', e.target.value)}
                                    required
                                    disabled={!userPermissions.includes('update pre-order product regular price')}
                                    className={!userPermissions.includes('update pre-order product regular price') ? 'bg-muted' : ''}
                                />
                                <InputError message={editForm.errors.unit_price} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit_original_price">Original Price (ETB) <span className="text-xs text-muted-foreground font-normal">(Shown with strikethrough in MiniApp)</span></Label>
                                <Input
                                    id="edit_original_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g. 1500"
                                    value={editForm.data.original_price}
                                    onChange={(e) => editForm.setData('original_price', e.target.value)}
                                />
                                <InputError message={editForm.errors.original_price} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit_walkin_price">Walk-in Price (ETB)</Label>
                                <Input
                                    id="edit_walkin_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editForm.data.walkin_price}
                                    onChange={(e) => editForm.setData('walkin_price', e.target.value)}
                                    required
                                    disabled={!userPermissions.includes('update pre-order product walkin price')}
                                    className={!userPermissions.includes('update pre-order product walkin price') ? 'bg-muted' : ''}
                                />
                                <InputError message={editForm.errors.walkin_price} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit_status">Status</Label>
                                <Select
                                    value={editForm.data.status}
                                    onValueChange={(value) => editForm.setData('status', value as 'Active' | 'Inactive')}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={editForm.errors.status} />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    id="edit_has_discount"
                                    type="checkbox"
                                    checked={editForm.data.has_discount}
                                    onChange={(e) => editForm.setData('has_discount', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-rose-600 accent-rose-600 cursor-pointer"
                                />
                                <Label htmlFor="edit_has_discount" className="cursor-pointer select-none">
                                    Apply Discount
                                </Label>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={editForm.processing}>
                                    Update Product
                                </Button>
                            </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

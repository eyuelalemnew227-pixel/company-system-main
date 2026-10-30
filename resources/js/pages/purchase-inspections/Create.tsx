import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Plus,
    Trash2,
    CheckCircle2,
    XCircle,
    Store,
    Calendar,
    Save,
    Send,
    Layers,
    Package,
    AlertTriangle,
} from 'lucide-react';
import type { PageProps } from '@/types';
import { toast } from 'sonner';

type Product = {
    id: number;
    child_category_id: number;
    product_name: string;
    product_code: string;
    measurement: string | number | null;
    unit_cost?: string | number | null;
};

type ChildCategory = {
    id: number;
    child_name: string;
    products: Product[];
};

type InspectionItemInput = {
    child_category_id: number;
    child_category_name: string;
    product_id: number;
    product_name: string;
    product_code: string;
    main_store_balance: string | number;
    inspected_quantity: string | number;
    unit_of_measure: string;
    status: 'pass' | 'fail';
    remarks: string;
};

type Props = PageProps & {
    childCategories: ChildCategory[];
    defaultStore: string;
    todayDate: string;
    currentUser: { id: number; name: string };
};

export default function Create({ childCategories, defaultStore, todayDate, currentUser }: Props) {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');

    const { data, setData, post, processing, errors } = useForm({
        inspection_date: todayDate || new Date().toISOString().slice(0, 10),
        store_name: defaultStore || 'M/Store',
        notes: '',
        action: 'draft' as 'draft' | 'submit',
        items: [] as InspectionItemInput[],
    });

    // Available products in selected category
    const availableProducts = useMemo(() => {
        if (!selectedCategoryId) return [];
        const cat = childCategories.find((c) => String(c.id) === selectedCategoryId);
        return cat ? cat.products : [];
    }, [childCategories, selectedCategoryId]);

    // Add a single product to inspection items
    const handleAddProduct = () => {
        if (!selectedProductId) {
            toast.error('Please choose a product to add.');
            return;
        }

        const product = availableProducts.find((p) => String(p.id) === selectedProductId);
        if (!product) return;

        // Check if already in items
        if (data.items.some((item) => item.product_id === product.id)) {
            toast.warning(`"${product.product_name}" is already in the inspection list.`);
            return;
        }

        const cat = childCategories.find((c) => c.id === product.child_category_id);

        const newItem: InspectionItemInput = {
            child_category_id: product.child_category_id,
            child_category_name: cat?.child_name ?? '',
            product_id: product.id,
            product_name: product.product_name,
            product_code: product.product_code || '',
            main_store_balance: '0',
            inspected_quantity: '0',
            unit_of_measure: product.measurement ? String(product.measurement) : 'pcs',
            status: 'pass',
            remarks: '',
        };

        setData('items', [...data.items, newItem]);
        setSelectedProductId('');
        toast.success(`Added ${product.product_name}`);
    };

    // Add all products of selected category
    const handleAddEntireCategory = () => {
        if (!selectedCategoryId) {
            toast.error('Please select a category first.');
            return;
        }

        const cat = childCategories.find((c) => String(c.id) === selectedCategoryId);
        if (!cat || !cat.products.length) {
            toast.info('No products available in this category.');
            return;
        }

        const existingIds = new Set(data.items.map((i) => i.product_id));
        const toAdd: InspectionItemInput[] = [];

        cat.products.forEach((p) => {
            if (!existingIds.has(p.id)) {
                toAdd.push({
                    child_category_id: p.child_category_id,
                    child_category_name: cat.child_name,
                    product_id: p.id,
                    product_name: p.product_name,
                    product_code: p.product_code || '',
                    main_store_balance: '0',
                    inspected_quantity: '0',
                    unit_of_measure: p.measurement ? String(p.measurement) : 'pcs',
                    status: 'pass',
                    remarks: '',
                });
            }
        });

        if (toAdd.length === 0) {
            toast.info('All products in this category are already added.');
            return;
        }

        setData('items', [...data.items, ...toAdd]);
        toast.success(`Added ${toAdd.length} products from ${cat.child_name}`);
    };

    const handleRemoveItem = (index: number) => {
        const next = [...data.items];
        next.splice(index, 1);
        setData('items', next);
    };

    const handleItemChange = (index: number, field: keyof InspectionItemInput, value: any) => {
        const next = [...data.items];
        next[index] = { ...next[index], [field]: value };
        setData('items', next);
    };

    const handleSubmit = (actionType: 'draft' | 'submit') => {
        if (data.items.length === 0) {
            toast.error('Please add at least one product to the inspection.');
            return;
        }

        // Validate that balances and quantities are filled
        for (let i = 0; i < data.items.length; i++) {
            const item = data.items[i];
            if (item.main_store_balance === '' || Number.isNaN(Number(item.main_store_balance))) {
                toast.error(`Please enter valid Main Store Balance for "${item.product_name}".`);
                return;
            }
            if (item.inspected_quantity === '' || Number.isNaN(Number(item.inspected_quantity))) {
                toast.error(`Please enter valid Inspected Quantity for "${item.product_name}".`);
                return;
            }
        }

        data.action = actionType;
        post(route('purchase-inspections.store'), {
            onError: (errs) => {
                const firstErr = Object.values(errs)[0];
                toast.error(firstErr as string);
            },
        });
    };

    // Calculate totals
    const totalItems = data.items.length;
    const passedCount = data.items.filter((i) => i.status === 'pass').length;
    const failedCount = data.items.filter((i) => i.status === 'fail').length;

    return (
        <AppLayout>
            <Head title="New Purchase Inspection" />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0">
                            <Link href={route('purchase-inspections.index')}>
                                <ArrowLeft className="w-5 h-5 text-gray-500" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                                New Purchase Inspection
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                Log purchase inspection results, balance verification with Main Store, and item conditions.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={processing}
                            onClick={() => handleSubmit('draft')}
                            className="flex items-center gap-2 text-slate-700 dark:text-slate-200"
                        >
                            <Save className="w-4 h-4 text-slate-500" />
                            Save as Draft
                        </Button>

                        <Button
                            type="button"
                            disabled={processing}
                            onClick={() => handleSubmit('submit')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm"
                        >
                            <Send className="w-4 h-4" />
                            Submit Inspection
                        </Button>
                    </div>
                </div>

                {/* Inspection Header Form */}
                <Card className="shadow-sm border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Store className="w-4 h-4 text-indigo-600" />
                            Inspection Details
                        </CardTitle>
                        <CardDescription>
                            General inspection information and target store location.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                                    Inspector
                                </label>
                                <Input
                                    type="text"
                                    value={currentUser.name}
                                    disabled
                                    className="bg-slate-50 dark:bg-slate-800 text-gray-600"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                                    Inspection Date <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    type="date"
                                    value={data.inspection_date}
                                    onChange={(e) => setData('inspection_date', e.target.value)}
                                    className="h-10 text-sm"
                                    required
                                />
                                {errors.inspection_date && (
                                    <p className="text-xs text-rose-500 mt-1">{errors.inspection_date}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                                    Store Location <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    type="text"
                                    value={data.store_name}
                                    onChange={(e) => setData('store_name', e.target.value)}
                                    placeholder="e.g. M/Store"
                                    className="h-10 text-sm"
                                    required
                                />
                                {errors.store_name && (
                                    <p className="text-xs text-rose-500 mt-1">{errors.store_name}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                                    Inspection Notes / Memo
                                </label>
                                <Input
                                    type="text"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="e.g. Supplier invoice ref, batch note"
                                    className="h-10 text-sm"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Product Selection Panel */}
                <Card className="shadow-sm border bg-slate-50/50 dark:bg-slate-900/40">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-600" />
                            Add Products to Inspection
                        </CardTitle>
                        <CardDescription>
                            Select products by Child Category to inspect and fill main store balances.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row items-end gap-3 flex-wrap">
                            <div className="w-full sm:w-64">
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                                    1. Child Category
                                </label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={selectedCategoryId}
                                    onChange={(e) => {
                                        setSelectedCategoryId(e.target.value);
                                        setSelectedProductId('');
                                    }}
                                >
                                    <option value="">-- Choose Category --</option>
                                    {childCategories.map((c) => (
                                        <option key={c.id} value={String(c.id)}>
                                            {c.child_name} ({c.products.length} items)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="w-full sm:w-80">
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                                    2. Product / Item
                                </label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                    value={selectedProductId}
                                    disabled={!selectedCategoryId || availableProducts.length === 0}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                >
                                    <option value="">
                                        {!selectedCategoryId
                                            ? 'Select a category first'
                                            : availableProducts.length === 0
                                            ? 'No products in this category'
                                            : '-- Choose Product --'}
                                    </option>
                                    {availableProducts.map((p) => (
                                        <option key={p.id} value={String(p.id)}>
                                            {p.product_code ? `[${p.product_code}] ` : ''}
                                            {p.product_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Button
                                type="button"
                                onClick={handleAddProduct}
                                disabled={!selectedProductId}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 h-10"
                            >
                                <Plus className="w-4 h-4" />
                                Add Item
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddEntireCategory}
                                disabled={!selectedCategoryId || availableProducts.length === 0}
                                className="flex items-center gap-1.5 h-10 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                            >
                                <Layers className="w-4 h-4" />
                                Add All In Category
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Inspection Items Table */}
                <Card className="shadow-sm border">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Package className="w-4 h-4 text-indigo-600" />
                                Inspected Items ({totalItems})
                            </CardTitle>
                            <CardDescription>
                                Fill the balance confirmed with Main Store, received quantity, and pass/fail condition.
                            </CardDescription>
                        </div>

                        {totalItems > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                                    Passed: {passedCount}
                                </span>
                                {failedCount > 0 && (
                                    <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-medium">
                                        Failed: {failedCount}
                                    </span>
                                )}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-y font-semibold">
                                    <tr>
                                        <th className="py-3 px-3 w-12 text-center">#</th>
                                        <th className="py-3 px-3 min-w-[140px]">Category</th>
                                        <th className="py-3 px-3 min-w-[200px]">Product</th>
                                        <th className="py-3 px-3 w-40">
                                            Main Store Balance
                                            <span className="block text-[10px] text-gray-500 font-normal">
                                                (Asked from M/Store)
                                            </span>
                                        </th>
                                        <th className="py-3 px-3 w-36">
                                            Inspected Qty
                                            <span className="block text-[10px] text-gray-500 font-normal">
                                                (Received count)
                                            </span>
                                        </th>
                                        <th className="py-3 px-3 w-28">UOM</th>
                                        <th className="py-3 px-3 w-32 text-center">Condition</th>
                                        <th className="py-3 px-3 min-w-[160px]">Remarks / Note</th>
                                        <th className="py-3 px-3 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {data.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-12 text-center text-gray-400">
                                                <div className="flex flex-col items-center justify-center gap-1.5">
                                                    <AlertTriangle className="w-8 h-8 text-amber-500/70" />
                                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                                        No items added to this inspection yet.
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        Choose a category and products above to start inspecting.
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        data.items.map((item, idx) => (
                                            <tr
                                                key={item.product_id}
                                                className={`transition-colors ${
                                                    item.status === 'fail'
                                                        ? 'bg-rose-50/40 dark:bg-rose-950/20'
                                                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-900/40'
                                                }`}
                                            >
                                                <td className="py-3 px-3 text-center text-gray-400 font-mono text-xs">
                                                    {idx + 1}
                                                </td>

                                                <td className="py-3 px-3">
                                                    <Badge variant="outline" className="text-xs font-normal bg-white dark:bg-slate-900">
                                                        {item.child_category_name}
                                                    </Badge>
                                                </td>

                                                <td className="py-3 px-3">
                                                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {item.product_name}
                                                    </div>
                                                    {item.product_code && (
                                                        <div className="text-[11px] font-mono text-gray-400">
                                                            {item.product_code}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3 px-3">
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        value={item.main_store_balance}
                                                        onChange={(e) =>
                                                            handleItemChange(idx, 'main_store_balance', e.target.value)
                                                        }
                                                        placeholder="0.00"
                                                        className="h-9 font-mono text-sm bg-white dark:bg-slate-900 border-indigo-200 focus:border-indigo-500"
                                                        required
                                                    />
                                                </td>

                                                <td className="py-3 px-3">
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        value={item.inspected_quantity}
                                                        onChange={(e) =>
                                                            handleItemChange(idx, 'inspected_quantity', e.target.value)
                                                        }
                                                        placeholder="0.00"
                                                        className="h-9 font-mono text-sm bg-white dark:bg-slate-900"
                                                        required
                                                    />
                                                </td>

                                                <td className="py-3 px-3">
                                                    <Input
                                                        type="text"
                                                        value={item.unit_of_measure}
                                                        onChange={(e) =>
                                                            handleItemChange(idx, 'unit_of_measure', e.target.value)
                                                        }
                                                        placeholder="e.g. kg, pcs"
                                                        className="h-9 text-xs"
                                                    />
                                                </td>

                                                <td className="py-3 px-3 text-center">
                                                    <div className="inline-flex rounded-md shadow-sm">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleItemChange(idx, 'status', 'pass')}
                                                            className={`px-2.5 py-1 text-xs font-semibold rounded-l-md border transition-all ${
                                                                item.status === 'pass'
                                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                                    : 'bg-white dark:bg-slate-900 text-gray-600 border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            Pass
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleItemChange(idx, 'status', 'fail')}
                                                            className={`px-2.5 py-1 text-xs font-semibold rounded-r-md border-t border-r border-b border-l-0 transition-all ${
                                                                item.status === 'fail'
                                                                    ? 'bg-rose-600 text-white border-rose-600'
                                                                    : 'bg-white dark:bg-slate-900 text-gray-600 border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            Fail
                                                        </button>
                                                    </div>
                                                </td>

                                                <td className="py-3 px-3">
                                                    <Input
                                                        type="text"
                                                        value={item.remarks}
                                                        onChange={(e) =>
                                                            handleItemChange(idx, 'remarks', e.target.value)
                                                        }
                                                        placeholder="Inspection note..."
                                                        className="h-9 text-xs"
                                                    />
                                                </td>

                                                <td className="py-3 px-3 text-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveItem(idx)}
                                                        className="h-8 w-8 p-0 text-gray-400 hover:text-rose-600"
                                                        title="Remove item"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Bottom Submit Toolbar */}
                {data.items.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-sm">
                        <div className="text-xs text-gray-500">
                            Total Items: <span className="font-semibold text-gray-900 dark:text-gray-100">{totalItems}</span>{' '}
                            | Passed:{' '}
                            <span className="font-semibold text-emerald-600">{passedCount}</span> | Failed:{' '}
                            <span className="font-semibold text-rose-600">{failedCount}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                                onClick={() => handleSubmit('draft')}
                                className="flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save as Draft
                            </Button>

                            <Button
                                type="button"
                                disabled={processing}
                                onClick={() => handleSubmit('submit')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm"
                            >
                                <Send className="w-4 h-4" />
                                Submit Inspection
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

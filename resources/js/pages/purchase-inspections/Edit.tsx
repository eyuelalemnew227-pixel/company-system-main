import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSidebar } from '@/components/ui/sidebar';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Layers,
    Save,
    RefreshCw,
    Search,
    Globe,
    Boxes,
    Lock,
    Store,
    CheckSquare,
    CalendarClock,
    XCircle,
} from 'lucide-react';
import type { PageProps, BreadcrumbItem } from '@/types';
import type { ApiCategory, ApiItem, InspectionItemInput, InspectionTabType, PurchaseInspectionFormData } from './Create';

const CONDITION_COLOR_CLASSES: Record<string, string> = {
    none: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    pass: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
    fail: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
};

function conditionColorClass(status: string) {
    return CONDITION_COLOR_CLASSES[status] ?? 'border-slate-300 bg-slate-100 text-slate-700';
}

function conditionLabel(status: string) {
    if (status === 'fail') return 'FAIL';
    if (status === 'pass') return 'PASS';
    return 'NONE';
}

function CollapseSidebarOnMount() {
    const { open, setOpen, isMobile, setOpenMobile } = useSidebar();

    useEffect(() => {
        if (isMobile) {
            setOpenMobile(false);
            return;
        }

        const wasOpen = open;
        setOpen(false);

        return () => setOpen(wasOpen);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

type Props = PageProps & {
    inspection: {
        id: number;
        reference_no: string;
        inspection_date: string;
        store_name: string;
        status: string;
        rejection_reason?: string | null;
        items: Array<{
            id: number;
            tab_type?: InspectionTabType;
            category_name: string;
            item_code: string;
            item_name: string;
            unit_of_measure: string;
            article_id?: string;
            wac?: number;
            main_store_balance: string | number;
            inspected_quantity: string | number | null;
            expiry_date?: string | null;
            status: 'pass' | 'fail';
            remarks?: string | null;
        }>;
    };
    apiCategories: ApiCategory[];
    totalApiItems: number;
    lastFetched?: string;
};

export default function EditPurchaseInspection({
    inspection,
    apiCategories = [],
    totalApiItems = 0,
    lastFetched,
}: Props) {
    const [categories, setCategories] = useState<ApiCategory[]>(apiCategories);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
    const [selectedItemCode, setSelectedItemCode] = useState<string>('');
    const [globalSearch, setGlobalSearch] = useState<string>('');
    const [activeTab, setActiveTab] = useState<InspectionTabType>('custody_accuracy');

    const initialItems: InspectionItemInput[] = inspection.items.map((item) => ({
        id: item.id,
        client_id: `existing_${item.id}_${Math.random().toString(36).substring(2, 7)}`,
        tab_type: (item.tab_type as InspectionTabType) || 'custody_accuracy',
        category_name: item.category_name || 'Uncategorized',
        item_code: item.item_code || '',
        item_name: item.item_name || `Item #${item.id}`,
        unit_of_measure: item.unit_of_measure || 'Pcs',
        article_id: item.article_id,
        wac: item.wac,
        main_store_balance: item.main_store_balance ?? 0,
        inspected_quantity: item.inspected_quantity !== null && item.inspected_quantity !== undefined ? item.inspected_quantity : '',
        expiry_date: item.expiry_date ? String(item.expiry_date).slice(0, 10) : '',
        status: (item.status as 'none' | 'pass' | 'fail') || 'none',
        remarks: item.remarks ?? '',
    }));

    const { data, setData, put, processing, errors, transform } = useForm<PurchaseInspectionFormData>({
        inspection_date: inspection.inspection_date,
        store_name: inspection.store_name,
        items: initialItems,
    });

    const activeTabLabel = useMemo(() => {
        switch (activeTab) {
            case 'custody_accuracy':
                return 'Custody Accuracy';
            case 'expiry_control':
                return 'Expiry Control';
            case 'store_condition':
                return 'Store Condition';
        }
    }, [activeTab]);

    const handleRefreshApi = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch('/purchase-inspections/api-items?refresh=1');
            if (!res.ok) throw new Error('Failed to refresh');
            const result = await res.json();
            if (result.grouped) {
                setCategories(result.grouped);
                toast.success(`Refreshed ${result.total_count} items from Kaldis API!`);
            }
        } catch (err) {
            toast.error('Could not refresh from API. Using current data.');
        } finally {
            setIsRefreshing(false);
        }
    };

    const categoryItems = useMemo(() => {
        if (!selectedCategoryName) return [];
        const cat = categories.find((c) => c.name === selectedCategoryName);
        return cat ? cat.items : [];
    }, [categories, selectedCategoryName]);

    const allItems = useMemo(() => {
        return categories.flatMap((c) => c.items);
    }, [categories]);

    const globalSearchResults = useMemo(() => {
        const q = globalSearch.trim().toLowerCase();
        if (!q) return [];
        return allItems
            .filter(
                (item) =>
                    item.article_name.toLowerCase().includes(q) ||
                    item.article_code.toLowerCase().includes(q) ||
                    item.category.toLowerCase().includes(q)
            )
            .slice(0, 10);
    }, [allItems, globalSearch]);

    const custodyItems = useMemo(
        () => data.items.filter((i) => i.tab_type === 'custody_accuracy'),
        [data.items]
    );
    const expiryItems = useMemo(
        () => data.items.filter((i) => i.tab_type === 'expiry_control'),
        [data.items]
    );
    const conditionItems = useMemo(
        () => data.items.filter((i) => i.tab_type === 'store_condition'),
        [data.items]
    );

    const addItemToActiveTab = (item: ApiItem) => {
        if (data.items.some((i) => i.tab_type === activeTab && i.item_code === item.article_code)) {
            toast.warning(`"${item.article_name}" is already in ${activeTabLabel}.`);
            return;
        }

        const newItem: InspectionItemInput = {
            client_id: Math.random().toString(36).substring(2, 9),
            tab_type: activeTab,
            category_name: item.category,
            item_code: item.article_code,
            item_name: item.article_name,
            unit_of_measure: item.uom || 'Pcs',
            article_id: item.article_id,
            wac: item.wac,
            main_store_balance: item.total_balance,
            inspected_quantity: '',
            expiry_date: '',
            status: 'none',
            remarks: '',
        };

        setData('items', [...data.items, newItem]);
        toast.success(`Added to ${activeTabLabel}: ${item.article_name}`);
    };

    const handleAddSelectedItem = () => {
        if (!selectedItemCode) {
            toast.error('Please choose an item to add.');
            return;
        }

        const item = categoryItems.find((i) => i.article_code === selectedItemCode);
        if (!item) return;

        addItemToActiveTab(item);
        setSelectedItemCode('');
    };

    const handleAddEntireCategory = () => {
        if (!selectedCategoryName) {
            toast.error('Please select a category first.');
            return;
        }

        const cat = categories.find((c) => c.name === selectedCategoryName);
        if (!cat || !cat.items.length) {
            toast.info('No items available in this category.');
            return;
        }

        const existingCodes = new Set(
            data.items.filter((i) => i.tab_type === activeTab).map((i) => i.item_code)
        );
        const toAdd: InspectionItemInput[] = [];

        cat.items.forEach((item) => {
            if (!existingCodes.has(item.article_code)) {
                toAdd.push({
                    client_id: Math.random().toString(36).substring(2, 9),
                    tab_type: activeTab,
                    category_name: item.category,
                    item_code: item.article_code,
                    item_name: item.article_name,
                    unit_of_measure: item.uom || 'Pcs',
                    article_id: item.article_id,
                    wac: item.wac,
                    main_store_balance: item.total_balance,
                    inspected_quantity: '',
                    expiry_date: '',
                    status: 'none',
                    remarks: '',
                });
            }
        });

        if (toAdd.length === 0) {
            toast.info(`All items in this category are already in ${activeTabLabel}.`);
            return;
        }

        setData('items', [...data.items, ...toAdd]);
        toast.success(`Added ${toAdd.length} items from ${cat.name} to ${activeTabLabel}`);
    };

    const handleRemoveItem = (clientId: string) => {
        setData('items', data.items.filter((i) => i.client_id !== clientId));
    };

    const handleItemChange = (clientId: string, field: keyof InspectionItemInput, value: any) => {
        const next = data.items.map((item) => {
            if (item.client_id === clientId) {
                const updated = { ...item, [field]: value };
                if (field === 'expiry_date' && value) {
                    const exp = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (exp < today) {
                        updated.status = 'fail';
                    }
                }
                return updated;
            }
            return item;
        });
        setData('items', next);
    };

    // Calculate valid items for submission (items with condition NONE are NOT stored)
    const getValidInspectionItems = () => {
        return data.items.filter((item) => {
            // Only store items where condition is PASS or FAIL (NONE is never stored)
            if (item.status !== 'pass' && item.status !== 'fail') {
                return false;
            }

            if (item.tab_type === 'custody_accuracy') {
                return item.inspected_quantity !== '' && item.inspected_quantity !== null && item.inspected_quantity !== undefined;
            }
            if (item.tab_type === 'expiry_control') {
                return Boolean(item.expiry_date);
            }
            if (item.tab_type === 'store_condition') {
                return true;
            }
            return false;
        });
    };

    const submitForm = () => {
        const validItems = getValidInspectionItems();

        if (validItems.length === 0) {
            toast.error(
                'Please evaluate at least one item with PASS or FAIL condition before saving (items set to NONE are not stored).'
            );
            return;
        }

        transform((currentData) => ({
            ...currentData,
            items: validItems,
        }));

        put(route('purchase-inspections.update', inspection.id), {
            preserveScroll: true,
            onError: (errs) => {
                const firstError = Object.values(errs)[0];
                toast.error(typeof firstError === 'string' ? firstError : 'Validation failed.');
            },
        });
    };

    const validItems = getValidInspectionItems();
    const custodyInspectedCount = custodyItems.filter(
        (i) => i.inspected_quantity !== '' && i.inspected_quantity !== null && i.inspected_quantity !== undefined
    ).length;
    const expiryDatedCount = expiryItems.filter((i) => Boolean(i.expiry_date)).length;
    const conditionCount = conditionItems.length;

    const totalValidCount = validItems.length;
    const passedCount = validItems.filter((i) => i.status === 'pass').length;
    const failedCount = validItems.filter((i) => i.status === 'fail').length;

    const renderCatalogSelectorToolbar = () => (
        <div className="space-y-3 rounded-lg border border-amber-200/80 p-4 bg-amber-50/40">
            <div>
                <div className="text-sm font-semibold text-amber-950 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-amber-700" />
                        <span>Add Products from Catalog to:</span>
                        <Badge className="bg-amber-700 text-white text-xs py-0.5 px-2 font-semibold">
                            {activeTabLabel} Tab
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5 space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">1. Select Category ({categories.length})</Label>
                        <Select
                            value={selectedCategoryName}
                            onValueChange={(val) => {
                                setSelectedCategoryName(val);
                                setSelectedItemCode('');
                            }}
                        >
                            <SelectTrigger className="w-full bg-white h-9 text-xs">
                                <SelectValue placeholder="-- Select API Category --" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                                {categories.map((c) => (
                                    <SelectItem key={c.name} value={c.name}>
                                        {c.name} ({c.items.length} items)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="sm:col-span-4 space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">2. Select Item / Article</Label>
                        <Select
                            value={selectedItemCode}
                            onValueChange={(val) => setSelectedItemCode(val)}
                            disabled={!selectedCategoryName || categoryItems.length === 0}
                        >
                            <SelectTrigger className="w-full bg-white h-9 text-xs">
                                <SelectValue
                                    placeholder={
                                        !selectedCategoryName
                                            ? 'Select category first'
                                            : categoryItems.length === 0
                                            ? 'No items available'
                                            : '-- Choose Item --'
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                                {categoryItems.map((item) => (
                                    <SelectItem key={item.article_code} value={item.article_code}>
                                        [{item.article_code}] {item.article_name} (Bal: {item.total_balance} {item.uom})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="sm:col-span-3 flex gap-2">
                        <Button
                            type="button"
                            variant="default"
                            onClick={handleAddSelectedItem}
                            disabled={!selectedItemCode}
                            className="flex-1 bg-amber-700 hover:bg-amber-800 text-white h-9 text-xs shadow-xs"
                        >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add Item
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddEntireCategory}
                            disabled={!selectedCategoryName || categoryItems.length === 0}
                            title={`Add all items in this category to ${activeTabLabel}`}
                            className="border-amber-300 text-amber-900 hover:bg-amber-100/60 h-9 px-3"
                        >
                            <Layers className="h-4 w-4 mr-1 text-amber-700" />
                            <span className="hidden md:inline text-xs">All</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quick Search */}
            <div className="pt-3 border-t border-amber-200/60">
                <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Or Quick Search across all {allItems.length} items to add to {activeTabLabel}:
                </Label>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <Input
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        placeholder="Type to find e.g. Dettol, Ambo, Cup, 1001..."
                        className="pl-9 h-9 bg-white text-xs border-amber-200 focus:border-amber-400"
                    />
                    {globalSearch && (
                        <button
                            type="button"
                            onClick={() => setGlobalSearch('')}
                            className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-700"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {globalSearchResults.length > 0 && (
                    <div className="mt-2 bg-white rounded-lg border border-amber-200 shadow-md p-1.5 max-h-56 overflow-y-auto divide-y divide-gray-100">
                        {globalSearchResults.map((result) => {
                            const isAlreadyAdded = data.items.some(
                                (i) => i.tab_type === activeTab && i.item_code === result.article_code
                            );
                            return (
                                <div
                                    key={result.article_code}
                                    className="flex items-center justify-between p-2 hover:bg-amber-50/70 rounded transition-colors text-xs"
                                >
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900">
                                            {result.article_name}
                                        </div>
                                        <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                                            <span className="font-mono bg-gray-100 px-1 rounded">
                                                {result.article_code}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] py-0 px-1 border-gray-200">
                                                {result.category}
                                            </Badge>
                                            <span>Balance: <strong className="text-amber-800">{result.total_balance} {result.uom}</strong></span>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={isAlreadyAdded ? 'secondary' : 'default'}
                                        disabled={isAlreadyAdded}
                                        onClick={() => {
                                            addItemToActiveTab(result);
                                            setGlobalSearch('');
                                        }}
                                        className={`h-7 px-2.5 text-xs ${
                                            isAlreadyAdded
                                                ? 'opacity-60'
                                                : 'bg-amber-700 hover:bg-amber-800 text-white'
                                        }`}
                                    >
                                        {isAlreadyAdded ? `Added in ${activeTabLabel}` : `+ Add to ${activeTabLabel}`}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Purchase Inspections', href: '/purchase-inspections' },
        { title: `Edit: ${inspection.reference_no}`, href: `/purchase-inspections/${inspection.id}/edit`, className: 'text-[1.3125rem] font-semibold' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Inspection ${inspection.reference_no}`} />
            <CollapseSidebarOnMount />
            <div className="flex h-full flex-1 flex-col gap-1 overflow-x-auto rounded-xl px-4 pt-0 pb-4">
                {/* Top Card: Header Details & API Info */}
                <Card className="py-0 shadow-sm border-slate-200 dark:border-slate-700">
                    <CardHeader className="px-6 pt-3 pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                        Edit Purchase Inspection
                                    </CardTitle>
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {inspection.reference_no}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                    Update products across Custody Accuracy, Expiry Control, and Store Condition tabs below.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefreshApi}
                                    disabled={isRefreshing}
                                    className="border-slate-300 hover:bg-slate-100 text-slate-800 text-xs h-8 shrink-0 dark:border-slate-700 dark:text-slate-300"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    {isRefreshing ? 'Refreshing API...' : 'Refresh API Data'}
                                </Button>
                                <Link href={route('purchase-inspections.show', inspection.id)}>
                                    <Button variant="outline" size="sm" className="h-8 text-xs shrink-0">
                                        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                                        View Details
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Inspection Parameters */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t mt-3">
                            <div className="space-y-1">
                                <Label className="text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                                    Inspection Date (Locked)
                                </Label>
                                <Input
                                    type="date"
                                    value={data.inspection_date}
                                    disabled
                                    readOnly
                                    className="h-8 text-xs bg-slate-100 text-slate-700 font-semibold cursor-not-allowed dark:bg-slate-800 dark:text-slate-300"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Store / Location</Label>
                                <Input
                                    type="text"
                                    value={data.store_name || 'M/Store (Branch 11836)'}
                                    disabled
                                    className="h-8 text-xs bg-slate-100 text-slate-700 font-semibold dark:bg-slate-800 dark:text-slate-300"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Status</Label>
                                <div>
                                    <Badge
                                        className={`capitalize px-2.5 py-0.5 text-xs font-semibold ${
                                            inspection.status === 'draft'
                                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                : 'bg-red-100 text-red-800 border-red-300'
                                        }`}
                                    >
                                        {inspection.status}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Tab Navigation (Exact CEO View Trapezoid Style) */}
                <div className="relative mt-2 pt-0 overflow-visible">
                    {/* Solid Line underneath */}
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#5f738a] dark:bg-slate-400 z-0"></div>

                    <div className="relative flex items-end pl-6 sm:pl-8 z-10">
                        {[
                            { id: 'custody_accuracy', label: 'Custody Accuracy', count: custodyItems.length, icon: CheckSquare },
                            { id: 'expiry_control', label: 'Expiry Control', count: expiryItems.length, icon: CalendarClock },
                            { id: 'store_condition', label: 'Store Condition', count: conditionItems.length, icon: Store },
                        ].map((tab, index) => {
                            const isActive = activeTab === tab.id;
                            const zIndex = isActive ? 40 : 30 - index;
                            const TabIcon = tab.icon;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(tab.id as any);
                                        setSelectedItemCode('');
                                    }}
                                    className={cn(
                                        "relative px-6 sm:px-7 py-2.5 text-[12px] font-bold tracking-wider uppercase transition-colors group outline-none -mr-3 flex items-center gap-2",
                                        isActive ? "text-white dark:text-slate-900" : "text-[#5f738a] hover:text-[#4b5b6d] dark:text-slate-300 dark:hover:text-white"
                                    )}
                                    style={{ zIndex }}
                                >
                                    <div
                                        className={cn(
                                            "absolute inset-0 -top-1 origin-bottom [transform:perspective(100px)_rotateX(20deg)] rounded-t-[10px] -z-10 transition-all",
                                            isActive
                                                ? "bg-[#5f738a] dark:bg-slate-400 shadow-none"
                                                : "bg-[#eaedf1] dark:bg-slate-800 shadow-[0_-2px_8px_rgba(0,0,0,0.15)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.5)]"
                                        )}
                                    ></div>
                                    <TabIcon className="w-4 h-4 shrink-0" />
                                    <span>{tab.label}</span>
                                    <span
                                        className={cn(
                                            "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                                            isActive
                                                ? "bg-white/20 text-white dark:bg-slate-900/30 dark:text-slate-900"
                                                : "bg-[#5f738a]/15 text-[#5f738a] dark:bg-slate-700 dark:text-slate-200"
                                        )}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Inspection Area Card */}
                <Card className="mt-0 border-t-0 rounded-t-none shadow-sm border-slate-200 dark:border-slate-700">
                    <CardContent className="p-4 sm:p-6 space-y-5">
                        {/* TAB 1: CUSTODY ACCURACY */}
                        {activeTab === 'custody_accuracy' && (
                            <div className="space-y-4">
                                {renderCatalogSelectorToolbar()}

                                <div className="space-y-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                <span>Custody Accuracy Products</span>
                                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-900 border-amber-300">
                                                    {custodyInspectedCount} of {custodyItems.length} Inspected
                                                </Badge>
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Verify physical count against M/Store Balance. Condition dropdown appears once Inspected Qty is entered.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-md border overflow-x-auto shadow-2xs">
                                        <Table>
                                            <TableHeader className="bg-slate-700 text-white">
                                                <TableRow className="hover:bg-slate-700 border-none">
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-12 text-center">#</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap min-w-[140px]">Category</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap min-w-[200px]">Item / Article</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-24 text-center">UOM</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-36 text-right">
                                                        M/Store Balance
                                                    </TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-36 text-right">
                                                        Inspected Qty *
                                                    </TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-24 text-center">Variance</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-36 text-center">
                                                        Condition
                                                    </TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap min-w-[160px]">Remarks</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-12 text-center"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {custodyItems.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                                                            No items in Custody Accuracy yet. Choose a category and item above to add products to this tab.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    custodyItems.map((item, idx) => {
                                                        const bal = Number(item.main_store_balance) || 0;
                                                        const hasInspected =
                                                            item.inspected_quantity !== '' &&
                                                            item.inspected_quantity !== null &&
                                                            item.inspected_quantity !== undefined;
                                                        const inspected = hasInspected ? Number(item.inspected_quantity) : 0;
                                                        const variance = Math.round((inspected - bal) * 100) / 100;

                                                        return (
                                                            <TableRow
                                                                key={item.client_id}
                                                                className={item.status === 'fail' && hasInspected ? 'bg-red-50/60' : 'odd:bg-slate-50/70'}
                                                            >
                                                                <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                                    {idx + 1}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline" className="font-medium text-xs bg-white text-slate-700">
                                                                        {item.category_name}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="font-semibold text-gray-900">{item.item_name}</div>
                                                                    <div className="text-xs font-mono text-muted-foreground">
                                                                        {item.item_code}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center text-xs font-medium text-gray-600">
                                                                    {item.unit_of_measure || 'Pcs'}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <span className="font-mono font-semibold text-gray-900 px-2 py-1 bg-slate-100 rounded border border-slate-200 text-xs inline-block">
                                                                        {Number(item.main_store_balance || 0).toLocaleString(undefined, {
                                                                            minimumFractionDigits: 0,
                                                                            maximumFractionDigits: 2,
                                                                        })}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Input
                                                                        type="number"
                                                                        step="any"
                                                                        min="0"
                                                                        placeholder="Enter qty"
                                                                        value={item.inspected_quantity}
                                                                        onChange={(e) =>
                                                                            handleItemChange(item.client_id, 'inspected_quantity', e.target.value)
                                                                        }
                                                                        className="w-full text-right font-mono font-semibold h-8 bg-white border-amber-300 focus-visible:ring-amber-500"
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center font-mono text-xs">
                                                                    {!hasInspected ? (
                                                                        <span className="text-muted-foreground font-mono">—</span>
                                                                    ) : variance === 0 ? (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                            0
                                                                        </span>
                                                                    ) : variance > 0 ? (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                                            +{variance}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                                            {variance}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center w-36">
                                                                    {!hasInspected ? (
                                                                        <span className="text-muted-foreground font-mono text-xs">—</span>
                                                                    ) : (
                                                                        <Select
                                                                            value={item.status || 'none'}
                                                                            onValueChange={(val) =>
                                                                                handleItemChange(item.client_id, 'status', val as 'none' | 'pass' | 'fail')
                                                                            }
                                                                        >
                                                                            <SelectTrigger
                                                                                className={cn(
                                                                                    'h-7 w-28 rounded-full border px-2.5 text-[11px] font-bold shadow-xs mx-auto focus:ring-0',
                                                                                    conditionColorClass(item.status || 'none'),
                                                                                )}
                                                                            >
                                                                                <SelectValue>{conditionLabel(item.status || 'none')}</SelectValue>
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem
                                                                                    value="none"
                                                                                    className="my-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 focus:bg-slate-200"
                                                                                >
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <span className="size-1.5 rounded-full bg-slate-500" />
                                                                                        NONE
                                                                                    </div>
                                                                                </SelectItem>
                                                                                <SelectItem
                                                                                    value="pass"
                                                                                    className="my-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200 focus:bg-green-100"
                                                                                >
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <span className="size-1.5 rounded-full bg-green-600" />
                                                                                        PASS
                                                                                    </div>
                                                                                </SelectItem>
                                                                                <SelectItem
                                                                                    value="fail"
                                                                                    className="my-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 focus:bg-red-100"
                                                                                >
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <span className="size-1.5 rounded-full bg-red-600" />
                                                                                        FAIL
                                                                                    </div>
                                                                                </SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    )}
                                                                </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="text"
                                                                    value={item.remarks}
                                                                    onChange={(e) =>
                                                                        handleItemChange(item.client_id, 'remarks', e.target.value)
                                                                    }
                                                                    placeholder="Optional remarks..."
                                                                    className="w-full h-8 text-xs bg-white"
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleRemoveItem(item.client_id)}
                                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                                                                    title="Remove item"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    )}

                        {/* ========================================================== */}
                        {/* TAB 2: EXPIRY CONTROL                                       */}
                        {/* ========================================================== */}
                        {activeTab === 'expiry_control' && (
                            <div className="space-y-4">
                                {renderCatalogSelectorToolbar()}

                                <div className="space-y-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                <span>Expiry Control Products</span>
                                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-900 border-amber-300">
                                                    {expiryDatedCount} of {expiryItems.length} Dated
                                                </Badge>
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Record expiry date for each product. Expired or near-expiry items are automatically tagged.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-md border overflow-x-auto shadow-2xs">
                                        <Table>
                                            <TableHeader className="bg-slate-700 text-white">
                                                <TableRow className="hover:bg-slate-700 border-none">
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-12 text-center">#</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap min-w-[140px]">Category</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap min-w-[200px]">Item / Article</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-24 text-center">UOM</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-44 text-left">
                                                        Expiry Date *
                                                    </TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-36 text-center">Shelf Life Status</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-36 text-center">
                                                        Condition
                                                    </TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap min-w-[160px]">Remarks / Batch #</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-12 text-center"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {expiryItems.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                                            No items in Expiry Control yet. Choose a category and item above to add products to this tab.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    expiryItems.map((item, idx) => {
                                                        const hasExpiry = Boolean(item.expiry_date);
                                                        let shelfLifeBadge = null;

                                                        if (hasExpiry && item.expiry_date) {
                                                            const exp = new Date(item.expiry_date);
                                                            const today = new Date();
                                                            today.setHours(0, 0, 0, 0);
                                                            const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                                                            if (diffDays < 0) {
                                                                shelfLifeBadge = (
                                                                    <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[11px]">
                                                                        Expired ({Math.abs(diffDays)}d ago)
                                                                    </Badge>
                                                                );
                                                            } else if (diffDays <= 30) {
                                                                shelfLifeBadge = (
                                                                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[11px]">
                                                                        Expires in {diffDays}d
                                                                    </Badge>
                                                                );
                                                            } else {
                                                                shelfLifeBadge = (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px]">
                                                                        Valid ({diffDays}d left)
                                                                    </Badge>
                                                                );
                                                            }
                                                        }

                                                        return (
                                                            <TableRow
                                                                key={item.client_id}
                                                                className={item.status === 'fail' ? 'bg-red-50/60' : 'odd:bg-slate-50/70'}
                                                            >
                                                                <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                                    {idx + 1}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline" className="font-medium text-xs bg-white text-slate-700">
                                                                        {item.category_name}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="font-semibold text-gray-900">{item.item_name}</div>
                                                                    <div className="text-xs font-mono text-muted-foreground">
                                                                        {item.item_code}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center text-xs font-medium text-gray-600">
                                                                    {item.unit_of_measure || 'Pcs'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="date"
                                                                        value={item.expiry_date || ''}
                                                                        onChange={(e) =>
                                                                            handleItemChange(item.client_id, 'expiry_date', e.target.value)
                                                                        }
                                                                        className="w-full h-8 text-xs bg-white border-amber-300 focus-visible:ring-amber-500"
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {shelfLifeBadge || (
                                                                        <span className="text-muted-foreground text-xs italic">Set date</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center w-36">
                                                                    <Select
                                                                        value={item.status || 'none'}
                                                                        onValueChange={(val) =>
                                                                            handleItemChange(item.client_id, 'status', val as 'none' | 'pass' | 'fail')
                                                                        }
                                                                    >
                                                                        <SelectTrigger
                                                                            className={cn(
                                                                                'h-7 w-28 rounded-full border px-2.5 text-[11px] font-bold shadow-xs mx-auto focus:ring-0',
                                                                                conditionColorClass(item.status || 'none'),
                                                                            )}
                                                                        >
                                                                            <SelectValue>{conditionLabel(item.status || 'none')}</SelectValue>
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem
                                                                                value="none"
                                                                                className="my-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 focus:bg-slate-200"
                                                                            >
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="size-1.5 rounded-full bg-slate-500" />
                                                                                    NONE
                                                                                </div>
                                                                            </SelectItem>
                                                                            <SelectItem
                                                                                value="pass"
                                                                                className="my-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200 focus:bg-green-100"
                                                                            >
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="size-1.5 rounded-full bg-green-600" />
                                                                                    PASS
                                                                                </div>
                                                                            </SelectItem>
                                                                            <SelectItem
                                                                                value="fail"
                                                                                className="my-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 focus:bg-red-100"
                                                                            >
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="size-1.5 rounded-full bg-red-600" />
                                                                                    FAIL
                                                                                </div>
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="text"
                                                                        value={item.remarks}
                                                                        onChange={(e) =>
                                                                            handleItemChange(item.client_id, 'remarks', e.target.value)
                                                                        }
                                                                        placeholder="Batch #, packaging note..."
                                                                        className="w-full h-8 text-xs bg-white"
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleRemoveItem(item.client_id)}
                                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                                                                        title="Remove item"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ========================================================== */}
                        {/* TAB 3: STORE CONDITION                                      */}
                        {/* ========================================================== */}
                        {activeTab === 'store_condition' && (
                            <div className="space-y-4">
                                {renderCatalogSelectorToolbar()}

                                <div className="space-y-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                <span>Store Condition Products</span>
                                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-900 border-amber-300">
                                                    {conditionCount} Products Evaluated
                                                </Badge>
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Evaluate cleanliness, packaging integrity, and storage defects for each product.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-md border overflow-x-auto shadow-2xs">
                                        <Table>
                                            <TableHeader className="bg-slate-700 text-white">
                                                <TableRow className="hover:bg-slate-700 border-none">
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-12 text-center">#</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap min-w-[140px]">Category</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap min-w-[220px]">Item / Article</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-24 text-center">UOM</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-36 text-center">
                                                        Condition
                                                    </TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap min-w-[200px]">Remarks / Physical Findings</TableHead>
                                                    <TableHead className="font-bold text-white whitespace-nowrap w-12 text-center"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {conditionItems.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                            No items in Store Condition yet. Choose a category and item above to add products to this tab.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    conditionItems.map((item, idx) => {
                                                        return (
                                                            <TableRow
                                                                key={item.client_id}
                                                                className={item.status === 'fail' ? 'bg-red-50/60' : 'odd:bg-slate-50/70'}
                                                            >
                                                                <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                                    {idx + 1}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline" className="font-medium text-xs bg-white text-slate-700">
                                                                        {item.category_name}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="font-semibold text-gray-900">{item.item_name}</div>
                                                                    <div className="text-xs font-mono text-muted-foreground">
                                                                        {item.item_code}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center text-xs font-medium text-gray-600">
                                                                    {item.unit_of_measure || 'Pcs'}
                                                                </TableCell>
                                                                <TableCell className="text-center w-36">
                                                                    <Select
                                                                        value={item.status || 'none'}
                                                                        onValueChange={(val) =>
                                                                            handleItemChange(item.client_id, 'status', val as 'none' | 'pass' | 'fail')
                                                                        }
                                                                    >
                                                                        <SelectTrigger
                                                                            className={cn(
                                                                                'h-7 w-28 rounded-full border px-2.5 text-[11px] font-bold shadow-xs mx-auto focus:ring-0',
                                                                                conditionColorClass(item.status || 'none'),
                                                                            )}
                                                                        >
                                                                            <SelectValue>{conditionLabel(item.status || 'none')}</SelectValue>
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem
                                                                                value="none"
                                                                                className="my-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 focus:bg-slate-200"
                                                                            >
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="size-1.5 rounded-full bg-slate-500" />
                                                                                    NONE
                                                                                </div>
                                                                            </SelectItem>
                                                                            <SelectItem
                                                                                value="pass"
                                                                                className="my-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200 focus:bg-green-100"
                                                                            >
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="size-1.5 rounded-full bg-green-600" />
                                                                                    PASS
                                                                                </div>
                                                                            </SelectItem>
                                                                            <SelectItem
                                                                                value="fail"
                                                                                className="my-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 focus:bg-red-100"
                                                                            >
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="size-1.5 rounded-full bg-red-600" />
                                                                                    FAIL
                                                                                </div>
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="text"
                                                                        value={item.remarks}
                                                                        onChange={(e) =>
                                                                            handleItemChange(item.client_id, 'remarks', e.target.value)
                                                                        }
                                                                        placeholder="Describe cleanliness, carton status, storage defects..."
                                                                        className="w-full h-8 text-xs bg-white"
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleRemoveItem(item.client_id)}
                                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                                                                        title="Remove item"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Overall Inspection Stats Footer */}
                        {data.items.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <div className="space-y-0.5">
                                    <div className="text-[11px] font-semibold text-slate-500 uppercase">Custody Accuracy</div>
                                    <div className="text-sm font-bold text-slate-900">
                                        {custodyInspectedCount} / {custodyItems.length} Inspected
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[11px] font-semibold text-slate-500 uppercase">Expiry Control</div>
                                    <div className="text-sm font-bold text-slate-900">
                                        {expiryDatedCount} / {expiryItems.length} Dated
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[11px] font-semibold text-slate-500 uppercase">Store Condition</div>
                                    <div className="text-sm font-bold text-slate-900">
                                        {conditionCount} Evaluated
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[11px] font-semibold text-slate-500 uppercase">Verification Result</div>
                                    <div className="flex items-center gap-2 text-sm font-bold">
                                        <span className="text-emerald-700">{passedCount} Passed</span>
                                        {failedCount > 0 && <span className="text-rose-700">| {failedCount} Failed</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t">
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span className="inline-block size-2 rounded-full bg-slate-400" />
                                <span>Items with condition <strong>NONE</strong> are not stored. Only <strong>PASS</strong> and <strong>FAIL</strong> are saved.</span>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <Button
                                    type="button"
                                    onClick={() => submitForm()}
                                    disabled={processing || totalValidCount === 0}
                                    className="w-full sm:w-auto bg-amber-700 hover:bg-amber-800 text-white shadow-xs"
                                >
                                    <Save className="mr-1.5 h-4 w-4" />
                                    Update Inspection ({totalValidCount} Items)
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

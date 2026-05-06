import { type BreadcrumbItem, type PaginationData, type SharedData } from '@/types';
import { type PreOrder, type OrderType, type CollectionDay } from '@/types/pre-order';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { PlusIcon, SearchIcon, EyeIcon, PencilIcon, Trash2Icon, ArrowUpDown, ArrowUp, ArrowDown, CopyIcon, MessageSquareIcon, DownloadIcon, FileTextIcon, TableIcon, ChevronDownIcon, ImageIcon, ExternalLink } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { ActionSuccessModal } from '@/components/pre-order/action-success-modal';

import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    { title: 'Pre-Orders', href: '/pre-orders' },
];

type Props = {
    preOrders: PaginationData<PreOrder>;
    branches: Array<{ id: number; name: string }>;
    collectionDays: CollectionDay[];
    holidays: Array<{ id: number; name: string; status?: string }>;
    orderTypes: OrderType[];
    paidProductsCount: number;
    operatorStats: {
        total: number;
        paid: number;
        pending: number;
    };
    operators: Array<{ id: number; name: string }>;
    filters: {
        search?: string;
        status?: string | string[];
        branch_id?: string | string[];
        collection_day_id?: string | string[];
        holiday_id?: string | string[];
        order_type_id?: string | string[];
        created_by?: string | string[];
        late_payment?: string;
        source?: string;
        sort?: string;
        direction?: 'asc' | 'desc';
    };
    userPermissions: string[];
    smsTemplate?: {
        name: string;
        content: string;
    };
};

const statusColors = {
    Pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    Paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    Collected: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function Index({ preOrders, branches, collectionDays, holidays, orderTypes, operators, paidProductsCount, operatorStats, filters, userPermissions, smsTemplate }: Props) {
    const { auth, flash, errors } = usePage<SharedData>().props;
    const currentUserId = auth.user.id;

    // Permission checks - require explicit permissions
    const canViewAllOrders = userPermissions?.includes('view all pre-orders');
    const canViewOrderDetails = userPermissions?.includes('view pre-order details');
    const canCreateOrders = userPermissions?.includes('create all pre-orders') ||
        userPermissions?.includes('create walkin pre-orders') ||
        userPermissions?.includes('create regular pre-orders');
    const canUpdateOrders = userPermissions?.includes('update all pre-orders') ||
        userPermissions?.includes('update walkin pre-orders') ||
        userPermissions?.includes('update regular pre-orders') ||
        userPermissions?.includes('update pre-orders'); // Legacy fallback
    const canEditOwnOrders = userPermissions?.includes('edit own pre-orders');
    const canEditOtherUsersOrders = userPermissions?.includes('edit other users pre-orders');
    const canDeleteOrders = userPermissions?.includes('delete pre-orders');
    const canSendBulkSms = userPermissions?.includes('send bulk sms reminders');
    const canCopyTelegram = userPermissions?.includes('copy pre-order telegram message');
    const canViewAuditTrail = userPermissions?.includes('view pre-order audit trail');
    const canEditCollectedOrders = userPermissions?.includes('edit collected pre-orders');
    const canViewAllHolidays = userPermissions?.includes('view all holidays');

    const canEditOrder = (order: PreOrder) => {
        // If order is collected, strictly require the collected edit permission
        if (order.status === 'Collected' && !canEditCollectedOrders) {
            return false;
        }

        const isOwn = order.created_by === currentUserId;
        const isWalkin = order.order_type?.name === 'Walkin Customer';

        // Check for broad update permissions
        const hasGlobalEdit = userPermissions?.includes('update all pre-orders') ||
            userPermissions?.includes('edit other users pre-orders') ||
            userPermissions?.includes('update pre-orders');

        if (hasGlobalEdit) return true;

        // "Edit Own" allows editing their own orders regardless of type
        if (isOwn && userPermissions?.includes('edit own pre-orders')) return true;

        // Specific type update permissions
        return isWalkin
            ? userPermissions?.includes('update walkin pre-orders')
            : userPermissions?.includes('update regular pre-orders');
    };
    const ensureArray = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (val === 'all') return [];
        return [val.toString()];
    };

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState<string[]>(ensureArray(filters.status));
    const [branchId, setBranchId] = useState<string[]>(ensureArray(filters.branch_id));
    const [collectionDayId, setCollectionDayId] = useState<string[]>(ensureArray(filters.collection_day_id));
    const [holidayId, setHolidayId] = useState<string[]>(ensureArray(filters.holiday_id));
    const [createdBy, setCreatedBy] = useState<string[]>(ensureArray(filters.created_by));
    const [latePayment, setLatePayment] = useState(filters.late_payment || 'all');
    const [source, setSource] = useState<string[]>(ensureArray(filters.source));

    const sourceOptions: MultiSelectOption[] = [
        { value: 'telegram', label: 'Telegram Bot' },
        { value: 'walkin', label: 'Walk-in' },
        { value: 'operator', label: 'Operator' },
    ];

    const [successModal, setSuccessModal] = useState({
        isOpen: false,
        title: '',
        description: ''
    });

    const statusOptions: MultiSelectOption[] = [
        { value: 'Pending', label: 'Pending' },
        { value: 'Paid', label: 'Paid' },
        { value: 'Collected', label: 'Collected' },
        { value: 'Cancelled', label: 'Cancelled' },
    ];

    const branchOptions = useMemo(() => branches.map(b => ({ value: b.id.toString(), label: b.name })), [branches]);
    const dayOptions = useMemo(() => collectionDays.map(d => ({ value: d.id.toString(), label: d.name })), [collectionDays]);
    const holidayOptions = useMemo(() => holidays.map(h => ({
        value: h.id.toString(),
        label: h.status && h.status !== 'Active' ? `${h.name} (Inactive)` : h.name,
    })), [holidays]);
    const operatorOptions = useMemo(() => operators.map(o => ({ value: o.id.toString(), label: o.name })), [operators]);

    const handleSort = (field: string) => {
        const currentSort = filters.sort;
        const currentDirection = filters.direction || 'desc';

        let newDirection: 'asc' | 'desc' = 'desc';
        if (currentSort === field) {
            newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        }

        const params: any = { ...filters, sort: field, direction: newDirection };
        router.get('/pre-orders', params, { preserveState: true, replace: true });
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (filters.sort !== field) {
            return <ArrowUpDown className="ml-2 size-4" />;
        }
        return filters.direction === 'asc' ?
            <ArrowUp className="ml-2 size-4" /> :
            <ArrowDown className="ml-2 size-4" />;
    };

    const hasActiveFilters = !!(search || status.length || branchId.length || collectionDayId.length || holidayId.length || createdBy.length || source.length || latePayment !== 'all');

    const resetFilters = () => {
        setSearch('');
        setStatus([]);
        setBranchId([]);
        setCollectionDayId([]);
        setHolidayId([]);
        setCreatedBy([]);
        setLatePayment('all');
        setSource([]);
    };

    const handleFilter = () => {
        const params: any = {};
        if (search) params.search = search;
        if (status.length > 0) params.status = status;
        if (branchId.length > 0) params.branch_id = branchId;
        if (collectionDayId.length > 0) params.collection_day_id = collectionDayId;
        if (holidayId.length > 0) params.holiday_id = holidayId;
        if (createdBy.length > 0) params.created_by = createdBy;
        if (latePayment !== 'all') params.late_payment = latePayment;
        if (source.length > 0) params.source = source;

        // Keep current sort/direction
        if (filters.sort) params.sort = filters.sort;
        if (filters.direction) params.direction = filters.direction;

        router.get('/pre-orders', params, {
            preserveState: true,
            replace: true
        });
    };

    useEffect(() => {
        if (flash.success) {
            setSuccessModal({
                isOpen: true,
                title: 'Success',
                description: flash.success
            });
        }
        if (flash.error) {
            toast.error(flash.error);
        }
        if (errors && Object.keys(errors).length > 0) {
            const firstError = Object.values(errors)[0];
            toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
        }
    }, [flash.success, flash.error, errors]);

    // Live search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            handleFilter();
        }, 500);

        return () => clearTimeout(timer);
    }, [search, status, branchId, collectionDayId, holidayId, createdBy, latePayment, source]);

    const handleDelete = (id: number, orderNumber: string) => {
        if (confirm(`Are you sure you want to delete order ${orderNumber}?`)) {
            router.delete(route('pre-orders.destroy', id), {
                onSuccess: () => {
                    setSuccessModal({
                        isOpen: true,
                        title: 'Order Deleted',
                        description: `Order ${orderNumber} has been successfully deleted.`
                    });
                },
                onError: (err) => {
                    const message = Object.values(err).flat().join(', ');
                    toast.error(message || 'Failed to delete order');
                }
            });
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Message copied to clipboard!');
        } catch (err) {
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
                toast.success('Message copied to clipboard!');
            } catch (fallbackErr) {
                toast.error('Failed to copy message');
            }

            document.body.removeChild(textArea);
        }
    };

    const generateTelegramMessage = (preOrder: PreOrder): string => {
        const products = preOrder.items?.map((item: any) => {
            return `${item.product?.product_name || 'Unknown'} (${item.quantity})`;
        }).join(', ') || 'None';

        const isWalkin = preOrder.order_type?.name === 'Walkin Customer';
        const discountType = isWalkin ? 'ቅርንጫፍ ደንበኛ' : 'ሸገር ገበታ';
        const orderMethod = isWalkin ? 'ከቅርንጫፍ ያዘዙት' : 'ደውለው ያዘዙት';

        // Use template if available, otherwise fallback to hardcoded message
        if (smsTemplate && smsTemplate.content) {
            let message = smsTemplate.content;

            const replacements: Record<string, string> = {
                '{client_name}': preOrder.client_name,
                '{first_name}': preOrder.first_name,
                '{last_name}': preOrder.surname || '',
                '{order_method}': orderMethod,
                '{order_number}': preOrder.order_number,
                '{products}': products,
                '{collection_day}': preOrder.collection_day?.name || 'N/A',
                '{collection_branch}': preOrder.collection_branch?.name || 'N/A',
                '{discount_type}': discountType,
                '{total_amount}': `ETB ${Number(preOrder.total_amount).toLocaleString()}`,
                '{phone_number}': preOrder.phone_number,
            };

            Object.keys(replacements).forEach(key => {
                message = message.replace(new RegExp(key, 'g'), replacements[key]);
            });

            return message;
        }

        // Fallback hardcoded message
        let message = `ውድ ደምበኛችን ${preOrder.client_name}\n\n`;
        message += "እንኳን ለዒድ አልፊጥር በሰላም አደረስዎ!\n\n";
        message += "ከካልዲስ ኮፊ የበዓል ቶርታ ስላዘዙ በጣም እናመሰግናለን። ክፍያዎት ደርስዎናል። የትዕዛዝዎ ዝርዝር መረጃ ከስር ያለውን ይመስላል፡\n\n";
        message += `የተጠቀሙት የቅናሽ አይነት፡ ${discountType}\n\n`;
        message += `ያዘዙት ቶርታ፡ ${products}\n\n`;
        message += `ጠቅላላ ዋጋ፡ ETB ${Number(preOrder.total_amount).toLocaleString()}\n\n`;
        message += `ቶርታውን የሚወስዱበት ቅርንጫፍ፡ ${preOrder.collection_branch?.name || 'N/A'}\n`;
        if (preOrder.collection_branch?.location) {
            message += `አድራሻ  ፡ ${preOrder.collection_branch.location}\n\n`;
        } else {
            message += "\n";
        }
        message += `ቶርታውን የሚወስዱበት ቀን፡ ${preOrder.collection_day?.name || 'N/A'}\n\n`;
        message += "ካልዲስን ስለመረጡ እናመሰግናለን።\n\n";
        message += "መልካም በዓል";

        return message;
    };

    // Bulk SMS functionality
    const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    const handleSelectOrder = (orderId: number) => {
        setSelectedOrders(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(preOrders.data.map((order: PreOrder) => order.id));
        }
        setSelectAll(!selectAll);
    };

    const handleBulkSmsReminder = () => {
        const pendingOrders = selectedOrders.filter(orderId => {
            const order = preOrders.data.find((o: PreOrder) => o.id === orderId);
            return order?.status === 'Pending';
        });

        if (pendingOrders.length === 0) {
            toast.error('Please select at least one pending order for SMS reminders.');
            return;
        }

        if (!confirm(`Send SMS reminders to ${pendingOrders.length} pending order(s)?`)) {
            return;
        }

        router.post('/pre-orders/send-bulk-sms-reminders',
            { order_ids: pendingOrders },
            {
                onSuccess: (page: any) => {
                    toast.success(page.props.success as string);
                    setSelectedOrders([]);
                    setSelectAll(false);

                    // Show detailed results if available
                    if (page.props.sms_results && Array.isArray(page.props.sms_results)) {
                        (page.props.sms_results as string[]).forEach(result => {
                            if (result.startsWith('✅')) {
                                toast.success(result);
                            } else if (result.startsWith('❌')) {
                                toast.error(result);
                            } else {
                                toast.info(result);
                            }
                        });
                    }
                },
                onError: (errors: any) => {
                    const errorMessage = Object.values(errors).flat().join(', ');
                    toast.error(errorMessage);
                }
            }
        );
    };

    // Check if current selection includes pending orders
    const hasPendingOrders = selectedOrders.some(orderId => {
        const order = preOrders.data.find((o: PreOrder) => o.id === orderId);
        return order?.status === 'Pending';
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pre-Orders" />

            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Heading title="Pre-Orders" description="Manage customer pre-orders" />
                    {canCreateOrders && (
                        <Link href="/pre-orders/create">
                            <Button>
                                <PlusIcon className="mr-2 size-4" />
                                New Pre-Order
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                                My Total Orders
                            </CardTitle>
                            <TableIcon className="size-4 text-blue-500" />
                        </CardHeader>
                        <CardContent className="pb-4 px-4">
                            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                {operatorStats.total.toLocaleString()}
                            </div>
                            <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-medium">
                                Lifetime performance
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800">
                        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                My Paid Orders
                            </CardTitle>
                            <PlusIcon className="size-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent className="pb-4 px-4">
                            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                                {operatorStats.paid.toLocaleString()}
                            </div>
                            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                                Successfully converted
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                                My Pending Orders
                            </CardTitle>
                            <MessageSquareIcon className="size-4 text-amber-500" />
                        </CardHeader>
                        <CardContent className="pb-4 px-4">
                            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                                {operatorStats.pending.toLocaleString()}
                            </div>
                            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium">
                                Awaiting payment/action
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800">
                        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                                System Paid Products
                            </CardTitle>
                            <FileTextIcon className="size-4 text-purple-500" />
                        </CardHeader>
                        <CardContent className="pb-4 px-4">
                            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                {paidProductsCount.toLocaleString()}
                            </div>
                            <p className="text-[10px] text-purple-600/80 dark:text-purple-400/80 font-medium">
                                Total production volume
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Search</span>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by order #, name, phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Status</span>
                        <MultiSelect
                            options={statusOptions}
                            selected={status}
                            onChange={setStatus}
                            placeholder="All Statuses"
                            className="w-[200px]"
                            showSelectedLabels={false}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Collection Branches</span>
                        <MultiSelect
                            options={branchOptions}
                            selected={branchId}
                            onChange={setBranchId}
                            placeholder="All Branches"
                            className="w-[200px]"
                            showSelectedLabels={false}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Collection Days</span>
                        <MultiSelect
                            options={dayOptions}
                            selected={collectionDayId}
                            onChange={setCollectionDayId}
                            placeholder="All Days"
                            className="w-[180px]"
                            showSelectedLabels={false}
                        />
                    </div>

                    {canViewAllHolidays && (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Holidays</span>
                            <MultiSelect
                                options={holidayOptions}
                                selected={holidayId}
                                onChange={setHolidayId}
                                placeholder="All Holidays"
                                className="w-[180px]"
                                showSelectedLabels={false}
                            />
                        </div>
                    )}

                    {canViewAllOrders && operators.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Operators</span>
                            <MultiSelect
                                options={operatorOptions}
                                selected={createdBy}
                                onChange={setCreatedBy}
                                placeholder="All Operators"
                                className="w-[180px]"
                                showSelectedLabels={false}
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Source</span>
                        <MultiSelect
                            options={sourceOptions}
                            selected={source}
                            onChange={setSource}
                            placeholder="All Sources"
                            className="w-[180px]"
                            showSelectedLabels={false}
                        />
                    </div>

                    {canViewAuditTrail && (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Late Payment</span>
                            <Select value={latePayment} onValueChange={setLatePayment}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Late Payment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="1">Yes</SelectItem>
                                    <SelectItem value="0">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}


                    {/* Reset Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors self-end"
                        >
                            <span className="text-base leading-none">&times;</span>
                            Reset Filters
                        </button>
                    )}

                    {/* Export Dropdown - Show only if user has permission to view all pre-orders */}
                    {canViewAllOrders && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <DownloadIcon className="mr-2 size-4" />
                                    Export
                                    <ChevronDownIcon className="ml-2 size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                    const params = new URLSearchParams();
                                    if (search) params.append('search', search);

                                    // Handle array parameters
                                    status.forEach(v => params.append('status[]', v));
                                    branchId.forEach(v => params.append('branch_id[]', v));
                                    collectionDayId.forEach(v => params.append('collection_day_id[]', v));
                                    holidayId.forEach(v => params.append('holiday_id[]', v));
                                    createdBy.forEach(v => params.append('created_by[]', v));

                                    if (latePayment !== 'all') params.append('late_payment', latePayment);
                                    source.forEach(v => params.append('source[]', v));
                                    if (filters?.sort) params.append('sort', filters.sort);
                                    if (filters?.direction) params.append('direction', filters.direction);
                                    params.append('format', 'pdf');

                                    window.location.href = `/pre-orders/export?${params.toString()}`;
                                }}>
                                    <FileTextIcon className="mr-2 size-4" />
                                    Export as PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    const params = new URLSearchParams();
                                    if (search) params.append('search', search);

                                    // Handle array parameters
                                    status.forEach(v => params.append('status[]', v));
                                    branchId.forEach(v => params.append('branch_id[]', v));
                                    collectionDayId.forEach(v => params.append('collection_day_id[]', v));
                                    holidayId.forEach(v => params.append('holiday_id[]', v));
                                    createdBy.forEach(v => params.append('created_by[]', v));

                                    if (latePayment !== 'all') params.append('late_payment', latePayment);
                                    if (filters?.sort) params.append('sort', filters.sort);
                                    if (filters?.direction) params.append('direction', filters.direction);
                                    params.append('format', 'excel');

                                    window.location.href = `/pre-orders/export?${params.toString()}`;
                                }}>
                                    <TableIcon className="mr-2 size-4" />
                                    Export as Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Bulk SMS Controls - Show only if user has permission to view all pre-orders AND (send bulk SMS OR cancel pre-orders) */}
                {canViewAllOrders && (canSendBulkSms || userPermissions?.includes('cancel pre-orders')) && selectedOrders.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                {selectedOrders.length} order(s) selected
                                {hasPendingOrders && (
                                    <span className="ml-1">
                                        ({selectedOrders.filter(id => {
                                            const order = preOrders.data.find((o: PreOrder) => o.id === id);
                                            return order?.status === 'Pending';
                                        }).length} pending)
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            {hasPendingOrders && canSendBulkSms && (
                                <Button
                                    onClick={handleBulkSmsReminder}
                                    disabled={!hasPendingOrders}
                                    variant="outline"
                                    className="flex items-center gap-2"
                                >
                                    <MessageSquareIcon className="size-4" />
                                    Send Payment Reminders
                                </Button>
                            )}
                            {hasPendingOrders && userPermissions?.includes('cancel pre-orders') && (
                                <Button
                                    onClick={() => {
                                        const pendingOrders = selectedOrders.filter(orderId => {
                                            const order = preOrders.data.find((o: PreOrder) => o.id === orderId);
                                            return order?.status === 'Pending';
                                        });

                                        if (pendingOrders.length === 0) return;

                                        if (!confirm(`Are you sure you want to CANCEL ${pendingOrders.length} pending order(s)? This will also send cancellation SMS to customers.`)) {
                                            return;
                                        }

                                        router.post('/pre-orders/bulk-cancel',
                                            { order_ids: pendingOrders },
                                            {
                                                onSuccess: (page: any) => {
                                                    toast.success(page.props.success as string);
                                                    setSelectedOrders([]);
                                                    setSelectAll(false);

                                                    // Show detailed results if available
                                                    if (page.props.sms_results && Array.isArray(page.props.sms_results)) {
                                                        (page.props.sms_results as string[]).forEach(result => {
                                                            if (result.startsWith('✅')) {
                                                                toast.success(result);
                                                            } else if (result.startsWith('❌')) {
                                                                toast.error(result);
                                                            } else {
                                                                toast.info(result);
                                                            }
                                                        });
                                                    }
                                                },
                                                onError: (errors: any) => {
                                                    const errorMessage = Object.values(errors).flat().join(', ');
                                                    toast.error(errorMessage);
                                                }
                                            }
                                        );
                                    }}
                                    disabled={!hasPendingOrders}
                                    variant="destructive"
                                    className="flex items-center gap-2"
                                >
                                    <Trash2Icon className="size-4" />
                                    Send Order Cancelled
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedOrders([]);
                                    setSelectAll(false);
                                }}
                            >
                                Clear Selection
                            </Button>
                        </div>
                    </div>
                )}

                {/* Orders Table */}
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {canViewAllOrders && (
                                    <TableHead className="w-[50px]">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectAll}
                                                onChange={handleSelectAll}
                                                className="rounded border-gray-300"
                                            />
                                        </div>
                                    </TableHead>
                                )}
                                <TableHead
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleSort('order_number')}
                                >
                                    <div className="flex items-center">
                                        Order #
                                        <SortIcon field="order_number" />
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleSort('first_name')}
                                >
                                    <div className="flex items-center">
                                        First Name
                                        <SortIcon field="first_name" />
                                    </div>
                                </TableHead>
                                <TableHead>Father Name</TableHead>
                                <TableHead>Surname</TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleSort('phone_number')}
                                >
                                    <div className="flex items-center">
                                        Phone
                                        <SortIcon field="phone_number" />
                                    </div>
                                </TableHead>
                                <TableHead>Order Type</TableHead>
                                <TableHead>Payment Method</TableHead>
                                <TableHead>Voucher Code</TableHead>
                                <TableHead>Transaction Reference</TableHead>
                                <TableHead>Payment Slip</TableHead>
                                <TableHead>Collection Branch</TableHead>
                                <TableHead>Registering Branch</TableHead>
                                <TableHead>Collection Day</TableHead>
                                <TableHead>Products</TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center">
                                        Status
                                        <SortIcon field="status" />
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleSort('total_amount')}
                                >
                                    <div className="flex items-center">
                                        Total Amount
                                        <SortIcon field="total_amount" />
                                    </div>
                                </TableHead>
                                {canViewAuditTrail && (
                                    <TableHead>Late Payment</TableHead>
                                )}
                                {canViewAuditTrail && (
                                    <>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('created_at')}
                                        >
                                            <div className="flex items-center">
                                                Date
                                                <SortIcon field="created_at" />
                                            </div>
                                        </TableHead>
                                        <TableHead>Created By</TableHead>
                                        <TableHead>Updated By</TableHead>
                                    </>
                                )}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {preOrders.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={
                                        (canViewAllOrders ? 16 : 15) + (canViewAuditTrail ? 3 : 0)
                                    } className="text-center text-muted-foreground">
                                        No pre-orders found. Click "New Pre-Order" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                preOrders.data.map((order: PreOrder) => (
                                    <TableRow key={order.id}>
                                        {canViewAllOrders && (
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrders.includes(order.id)}
                                                    onChange={() => handleSelectOrder(order.id)}
                                                    className="rounded border-gray-300"
                                                    disabled={order.status !== 'Pending'}
                                                    title={order.status === 'Pending' ? 'Select for SMS reminder' : 'Only pending orders can receive SMS reminders'}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell className="font-medium">{order.order_number}</TableCell>
                                        <TableCell>{order.first_name}</TableCell>
                                        <TableCell>{order.father_name || '-'}</TableCell>
                                        <TableCell>{order.surname || '-'}</TableCell>
                                        <TableCell>{order.phone_number}</TableCell>
                                        <TableCell>{order.order_type?.name}</TableCell>
                                        <TableCell>{order.payment_method || '-'}</TableCell>
                                        <TableCell>{order.voucher_code || '-'}</TableCell>
                                        <TableCell>{order.transaction_reference || '-'}</TableCell>
                                        <TableCell>
                                            {(() => {
                                                const filename = order.payment_slip || order.transaction_reference?.match(/slip_[\w.-]+\.(?:jpg|jpeg|png)/i)?.[0];
                                                return filename ? (
                                                    <a
                                                        href={`https://preorder.kaldisbunnaet.com//uploads/${filename}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                    >
                                                        <ImageIcon className="size-4" />
                                                        <span className="text-xs font-medium">View Slip</span>
                                                        <ExternalLink className="size-3" />
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell>{order.collection_branch?.name}</TableCell>
                                        <TableCell>{order.registering_branch?.name || '-'}</TableCell>
                                        <TableCell>{order.collection_day?.name}</TableCell>
                                        <TableCell>
                                            {order.items && order.items.length > 0 ? (
                                                <div className="text-xs">
                                                    {order.items.map((item: any, idx: number) => (
                                                        <span key={idx}>
                                                            {item.product?.product_name || 'Unknown'} ({item.quantity})
                                                            {idx < order.items!.length - 1 && ', '}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColors[order.status as keyof typeof statusColors]
                                                    }`}
                                            >
                                                {order.status}
                                            </span>
                                            {order.status === 'Pending' && canViewAllOrders && (
                                                <span className="ml-2 text-xs text-blue-600" title="Can receive SMS reminder">
                                                    SMS
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>ETB {order.total_amount}</TableCell>
                                        {canViewAuditTrail && (
                                            <TableCell>
                                                {order.late_payment ? (
                                                    <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200">
                                                        Yes
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                        )}
                                        {canViewAuditTrail && (
                                            <>
                                                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>{order.creator?.name || '-'}</TableCell>
                                                <TableCell>{order.updater?.name || '-'}</TableCell>
                                            </>
                                        )}
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {canViewOrderDetails && (
                                                    <Link href={`/pre-orders/${order.id}`}>
                                                        <Button variant="ghost" size="sm">
                                                            <EyeIcon className="size-4" />
                                                        </Button>
                                                    </Link>
                                                )}
                                                {canEditOrder(order) && (
                                                    <Link href={`/pre-orders/${order.id}/edit`}>
                                                        <Button variant="ghost" size="sm">
                                                            <PencilIcon className="size-4" />
                                                        </Button>
                                                    </Link>
                                                )}
                                                {order.status === 'Paid' && canCopyTelegram && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copyToClipboard(generateTelegramMessage(order))}
                                                        title="Copy Telegram message"
                                                    >
                                                        <CopyIcon className="size-4" />
                                                    </Button>
                                                )}
                                                {canDeleteOrders && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(order.id, order.order_number)}
                                                    >
                                                        <Trash2Icon className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {preOrders.links && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Showing {preOrders.from || 0} to {preOrders.to || 0} of {preOrders.total} orders
                        </div>
                        <div className="flex gap-2">
                            {preOrders.links.map((link: any, index: number) => {
                                if (!link.url) {
                                    return (
                                        <Button key={index} variant="outline" size="sm" disabled>
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        </Button>
                                    );
                                }
                                return (
                                    <Link key={index} href={link.url} preserveState>
                                        <Button variant={link.active ? 'default' : 'outline'} size="sm">
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        </Button>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                <ActionSuccessModal
                    isOpen={successModal.isOpen}
                    onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
                    title={successModal.title}
                    description={successModal.description}
                />
            </div>
        </AppLayout>
    );
}

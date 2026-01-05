import { type BreadcrumbItem, type PaginationData, type SharedData } from '@/types';
import { type PreOrder, type OrderType, type CollectionDay } from '@/types/pre-order';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { PlusIcon, SearchIcon, EyeIcon, PencilIcon, Trash2Icon, ArrowUpDown, ArrowUp, ArrowDown, CopyIcon, MessageSquareIcon, DownloadIcon, FileTextIcon, TableIcon, ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
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
    orderTypes: OrderType[];
    filters: {
        search?: string;
        status?: string;
        branch_id?: string;
        collection_day_id?: string;
        order_type_id?: string;
        late_payment?: string;
        sort?: string;
        direction?: 'asc' | 'desc';
    };
    userPermissions: string[];
};

const statusColors = {
    Pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    Paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    Collected: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function Index({ preOrders, branches, collectionDays, orderTypes, filters, userPermissions }: Props) {
    const { auth } = usePage<SharedData>().props;
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
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [branchId, setBranchId] = useState(filters.branch_id || 'all');
    const [collectionDayId, setCollectionDayId] = useState(filters.collection_day_id || 'all');
    const [latePayment, setLatePayment] = useState(filters.late_payment || 'all');

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

    const handleFilter = () => {
        const params: any = {};
        if (search) params.search = search;
        if (status !== 'all') params.status = status;
        if (branchId !== 'all') params.branch_id = branchId;
        if (collectionDayId !== 'all') params.collection_day_id = collectionDayId;
        if (latePayment !== 'all') params.late_payment = latePayment;

        router.get('/pre-orders', params, { preserveState: true });
    };

    const handleDelete = (id: number, orderNumber: string) => {
        if (confirm(`Are you sure you want to delete order ${orderNumber}?`)) {
            router.delete(route('pre-orders.destroy', id));
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

        let message = `ውድ ደምበኛችን ${preOrder.client_name}\n\n`;
        message += "እንኳን ለብርሃነ ልደቱ በሰላም አደረስዎ!\n\n";
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
        message += "መልካም ገና";

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

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by order #, client name, phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                            className="pl-10"
                        />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Collected">Collected</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={branchId} onValueChange={setBranchId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Branch" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Collection Branches</SelectItem>
                            {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                    {branch.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={collectionDayId} onValueChange={setCollectionDayId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Collection Day" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Days</SelectItem>
                            {collectionDays.map((day) => (
                                <SelectItem key={day.id} value={day.id.toString()}>
                                    {day.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {canViewAuditTrail && (
                        <Select value={latePayment} onValueChange={setLatePayment}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Late Payment" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="1">Yes</SelectItem>
                                <SelectItem value="0">No</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    <Button onClick={handleFilter}>Filter</Button>

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
                                    if (status !== 'all') params.append('status', status);
                                    if (branchId !== 'all') params.append('branch_id', branchId);
                                    if (collectionDayId !== 'all') params.append('collection_day_id', collectionDayId);
                                    if (latePayment !== 'all') params.append('late_payment', latePayment);
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
                                    if (status !== 'all') params.append('status', status);
                                    if (branchId !== 'all') params.append('branch_id', branchId);
                                    if (collectionDayId !== 'all') params.append('collection_day_id', collectionDayId);
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
                                    onClick={() => handleSort('client_name')}
                                >
                                    <div className="flex items-center">
                                        Client Name
                                        <SortIcon field="client_name" />
                                    </div>
                                </TableHead>
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
                                        (canViewAllOrders ? 13 : 12) + (canViewAuditTrail ? 3 : 0)
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
                                        <TableCell>{order.client_name}</TableCell>
                                        <TableCell>{order.phone_number}</TableCell>
                                        <TableCell>{order.order_type?.name}</TableCell>
                                        <TableCell>{order.payment_method || '-'}</TableCell>
                                        <TableCell>{order.voucher_code || '-'}</TableCell>
                                        <TableCell>{order.transaction_reference || '-'}</TableCell>
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
            </div>
        </AppLayout>
    );
}

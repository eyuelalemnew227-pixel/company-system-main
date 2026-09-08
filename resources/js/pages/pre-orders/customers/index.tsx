import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    Users,
    Download,
    Search,
    ShoppingBag,
    DollarSign,
    Crown,
    Award,
    Trophy,
    Eye,
    Phone,
    Calendar,
    Loader2,
    Filter,
    ExternalLink
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import TablePagination from '@/components/table-pagination';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Pre-Orders', href: '/pre-orders' },
    { title: 'Pre-Order Customers', href: '/pre-orders/customers' },
];

type CustomerRow = {
    id: number;
    chat_id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    order_count?: number;
    total_spent?: number;
    last_order_date?: string | null;
    created_at: string;
};

type TopCustomer = {
    rank: number;
    full_name: string;
    phone_number: string;
    username?: string | null;
    order_count: number;
    total_spent: number;
    last_order_date?: string | null;
};

type OrderItem = {
    id: number;
    quantity: number;
    unit_price: string;
    product?: {
        product_name: string;
    };
};

type CustomerOrder = {
    id: number;
    order_number: string;
    status: string;
    total_amount: string;
    created_at: string;
    collection_branch?: { name: string };
    collection_day?: { name: string };
    items?: OrderItem[];
};

type Props = {
    customers: {
        data: CustomerRow[];
        total: number;
        from?: number;
        to?: number;
        links?: Array<{ url: string | null; label: string; active: boolean }>;
    };
    top_customers?: TopCustomer[];
    stats: {
        total_customers: number;
        total_orders: number;
        total_revenue: number;
    };
    filters: {
        search?: string;
        per_page?: string;
        tier?: string;
    };
};

export default function PreOrderCustomersPage({ customers, top_customers = [], stats, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '15');
    const [tier, setTier] = useState(filters.tier || 'all');

    // Customer history modal state
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
    const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const handleSearch = (newPerPage?: string, newTier?: string) => {
        const targetPerPage = newPerPage !== undefined ? newPerPage : perPage;
        const targetTier = newTier !== undefined ? newTier : tier;

        router.get(
            '/pre-orders/customers',
            {
                search: search || undefined,
                per_page: targetPerPage,
                tier: targetTier !== 'all' ? targetTier : undefined
            },
            { preserveState: true, replace: true }
        );
    };

    const handleTierChange = (newTier: string) => {
        setTier(newTier);
        handleSearch(perPage, newTier);
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        window.location.href = `/pre-orders/customers/export?${params.toString()}`;
    };

    const openCustomerOrders = async (phone: string, name: string) => {
        if (!phone) return;
        setSelectedPhone(phone);
        setSelectedCustomerName(name);
        setIsHistoryOpen(true);
        setLoadingOrders(true);
        setCustomerOrders([]);

        try {
            const cleanPhone = phone.replace(/[^0-9+]/g, '');
            const res = await fetch(`/pre-orders/customers/${encodeURIComponent(cleanPhone)}/orders`);
            const data = await res.json();
            if (data.success) {
                setCustomerOrders(data.orders || []);
            }
        } catch (e) {
            console.error('Failed to load customer orders:', e);
        } finally {
            setLoadingOrders(false);
        }
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) {
            return (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-amber-950 font-extrabold shadow-md">
                    👑 1
                </div>
            );
        }
        if (rank === 2) {
            return (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-900 font-extrabold shadow-md">
                    🥈 2
                </div>
            );
        }
        if (rank === 3) {
            return (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-amber-100 font-extrabold shadow-md">
                    🥉 3
                </div>
            );
        }
        return (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs">
                #{rank}
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pre-Order Telegram Customers" />
            <div className="container mx-auto space-y-6 p-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-2.5 text-white shadow-md">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Pre-Order Customers</h1>
                            <p className="text-sm text-muted-foreground">
                                Telegram customers directory, top buyers showcase, and order analytics.
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleExport} variant="outline" className="gap-2 shadow-sm">
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                </div>

                {/* Metrics Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Registered Telegram Users</CardTitle>
                            <Users className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-extrabold">{stats.total_customers.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">Bot users directory</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Bot Orders</CardTitle>
                            <ShoppingBag className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-extrabold">{stats.total_orders.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">Placed via Telegram MiniApp</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Bot Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400">
                                ETB {stats.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Paid / Completed orders</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Top Customers Showcase */}
                {top_customers.length > 0 && (
                    <Card className="border border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-r from-amber-50/40 via-white to-amber-50/20 dark:from-slate-950 dark:to-amber-950/20 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    <CardTitle className="text-lg font-bold text-amber-950 dark:text-amber-200">
                                        Top Pre-Order Customers (VIP Showcase)
                                    </CardTitle>
                                </div>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 font-bold">
                                    Leaderboard
                                </Badge>
                            </div>
                            <CardDescription>
                                High-value buyers ranked by total amount spent on Pre-Orders.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                {top_customers.map((cust) => (
                                    <div
                                        key={cust.rank}
                                        onClick={() => handleSearch(perPage, 'all')}
                                        className="relative group rounded-xl border border-amber-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs hover:shadow-md transition-all cursor-pointer hover:border-amber-400"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            {getRankBadge(cust.rank)}
                                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                                ETB {cust.total_spent.toLocaleString()}
                                            </span>
                                        </div>

                                        <h4 className="font-bold text-xs truncate text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400">
                                            {cust.full_name}
                                        </h4>
                                        <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                                            📞 {cust.phone_number}
                                        </p>

                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                {cust.order_count} {cust.order_count === 1 ? 'Order' : 'Orders'}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-1.5 text-[10px] text-amber-700 dark:text-amber-400 hover:bg-amber-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openCustomerOrders(cust.phone_number, cust.full_name);
                                                }}
                                            >
                                                <Eye className="h-3 w-3 mr-1" /> View
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Search & Tier Filters */}
                <Card className="shadow-xs">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            
                            {/* Search Input */}
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by customer name, username, phone, or chat ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>

                            {/* Customer Tier Filters */}
                            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                                <Button
                                    variant={tier === 'all' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleTierChange('all')}
                                    className="text-xs"
                                >
                                    All Users
                                </Button>
                                <Button
                                    variant={tier === 'active' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleTierChange('active')}
                                    className="text-xs"
                                >
                                    Active Buyers
                                </Button>
                                <Button
                                    variant={tier === 'vip' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleTierChange('vip')}
                                    className="text-xs"
                                >
                                    👑 VIP Buyers
                                </Button>
                            </div>

                            {/* Per Page Select */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        setPerPage(e.target.value);
                                        handleSearch(e.target.value);
                                    }}
                                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-slate-900"
                                >
                                    <option value="15">15 per page</option>
                                    <option value="25">25 per page</option>
                                    <option value="50">50 per page</option>
                                    <option value="100">100 per page</option>
                                    <option value="500">500 per page</option>
                                </select>
                                <Button onClick={() => handleSearch()} variant="secondary">Search</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="shadow-xs">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer Name</TableHead>
                                    <TableHead>Telegram Username</TableHead>
                                    <TableHead>Phone Number</TableHead>
                                    <TableHead>Orders Count</TableHead>
                                    <TableHead>Total Spent</TableHead>
                                    <TableHead>Last Order Date</TableHead>
                                    <TableHead>First Joined</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No Telegram customers found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customers.data.map((cust) => {
                                        const fullName = `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || 'Customer';
                                        return (
                                            <TableRow key={cust.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 flex items-center justify-center font-bold text-xs">
                                                            {cust.first_name ? cust.first_name[0].toUpperCase() : 'C'}
                                                        </div>
                                                        <span>{fullName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {cust.username ? (
                                                        <a
                                                            href={`https://t.me/${cust.username}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1"
                                                        >
                                                            @{cust.username} <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm font-mono">
                                                    {cust.phone_number || '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 font-bold">
                                                        {cust.order_count ?? 0} Orders
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                    ETB {(cust.total_spent ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {cust.last_order_date ? new Date(cust.last_order_date).toLocaleDateString() : '—'}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(cust.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openCustomerOrders(cust.phone_number || '', fullName)}
                                                        disabled={!cust.phone_number}
                                                        className="h-8 gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" /> History
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <TablePagination
                        from={customers.from}
                        to={customers.to}
                        total={customers.total}
                        links={customers.links}
                    />
                </Card>

            </div>

            {/* Customer Order History Dialog */}
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-amber-600" />
                            Order History for {selectedCustomerName}
                        </DialogTitle>
                        <DialogDescription>
                            Showing pre-orders linked to phone <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{selectedPhone}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {loadingOrders ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                            <p className="text-sm text-muted-foreground">Fetching customer orders...</p>
                        </div>
                    ) : customerOrders.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground space-y-1">
                            <ShoppingBag className="h-10 w-10 mx-auto text-slate-300" />
                            <p className="font-semibold">No orders found</p>
                            <p className="text-xs text-muted-foreground">No pre-orders recorded under this phone number yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {customerOrders.map((ord) => (
                                <div key={ord.id} className="rounded-xl border p-3.5 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-sm text-amber-900 dark:text-amber-200">
                                                {ord.order_number}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] uppercase font-bold ${
                                                    ord.status === 'Paid' || ord.status === 'Collected' || ord.status === 'Approved'
                                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                        : ord.status === 'Cancelled'
                                                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                                                        : 'bg-amber-100 text-amber-800 border-amber-300'
                                                }`}
                                            >
                                                {ord.status}
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(ord.created_at).toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <div>
                                            <span className="text-muted-foreground">Branch:</span>{' '}
                                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                {ord.collection_branch?.name || 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Date:</span>{' '}
                                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                {ord.collection_day?.name || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    {ord.items && ord.items.length > 0 && (
                                        <div className="border-t pt-2 mt-2 space-y-1">
                                            <p className="text-[10px] font-bold uppercase text-slate-400">Ordered Items</p>
                                            {ord.items.map((it) => (
                                                <div key={it.id} className="flex justify-between text-xs">
                                                    <span>{it.product?.product_name || 'Item'} × {it.quantity}</span>
                                                    <span className="font-mono text-slate-700 dark:text-slate-300">
                                                        ETB {(parseFloat(it.unit_price) * it.quantity).toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center border-t pt-2 mt-1">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Total Amount</span>
                                        <span className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                                            ETB {parseFloat(ord.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Users, Download, Search, ShoppingBag, DollarSign, Phone, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

type Props = {
    customers: {
        data: CustomerRow[];
        total: number;
    };
    stats: {
        total_customers: number;
        total_orders: number;
        total_revenue: number;
    };
    filters: {
        search?: string;
    };
};

export default function PreOrderCustomersPage({ customers, stats, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = () => {
        router.get('/pre-orders/customers', { search: search || undefined }, { preserveState: true, replace: true });
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        window.location.href = `/pre-orders/customers/export?${params.toString()}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pre-Order Telegram Customers" />
            <div className="container mx-auto space-y-6 p-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Pre-Order Customers</h1>
                            <p className="text-sm text-muted-foreground">
                                Telegram customers who interact with the Telegram Pre-Order Bot & MiniApp.
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleExport} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                </div>

                {/* Metrics */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Registered Telegram Users</CardTitle>
                            <Users className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_customers}</div>
                            <p className="text-xs text-muted-foreground mt-1">Bot users directory</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Bot Orders</CardTitle>
                            <ShoppingBag className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_orders}</div>
                            <p className="text-xs text-muted-foreground mt-1">Placed via Telegram MiniApp</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Bot Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">ETB {stats.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground mt-1">Paid / Completed orders</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by customer name, username, phone, or chat ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            <Button onClick={handleSearch} variant="secondary">Search</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No Telegram customers found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customers.data.map((cust) => (
                                        <TableRow key={cust.id}>
                                            <TableCell className="font-medium">
                                                {cust.first_name} {cust.last_name}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {cust.username ? (
                                                    <span className="text-blue-600 dark:text-blue-400">@{cust.username}</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {cust.phone_number || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900">
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
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

            </div>
        </AppLayout>
    );
}

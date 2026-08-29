import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Star, Download, Search, Filter, Trash2, MessageSquare, ThumbsUp, Truck, Coffee, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Pre-Orders', href: '/pre-orders' },
    { title: 'Customer Feedback', href: '/pre-orders/feedback' },
];

type FeedbackRow = {
    id: number;
    chat_id: string | null;
    branch: { id: number; name: string } | null;
    delivery_rating: number | null;
    torta_rating: number | null;
    service_rating: number | null;
    written_feedback: string | null;
    created_at: string;
};

type Props = {
    feedbacks: {
        data: FeedbackRow[];
        links: any[];
        total: number;
    };
    branches: { id: number; name: string }[];
    stats: {
        total_count: number;
        overall_avg: number;
        delivery_avg: number;
        torta_avg: number;
        service_avg: number;
    };
    filters: {
        search?: string;
        branch_id?: string;
        rating?: string;
        start_date?: string;
        end_date?: string;
    };
};

export default function CustomerFeedbackPage({ feedbacks, branches, stats, filters }: Props) {
    const { flash } = usePage<SharedData>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id || 'all');
    const [rating, setRating] = useState(filters.rating || 'all');

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const handleFilter = () => {
        router.get('/pre-orders/feedback', {
            search: search || undefined,
            branch_id: branchId !== 'all' ? branchId : undefined,
            rating: rating !== 'all' ? rating : undefined,
        }, { preserveState: true, replace: true });
    };

    const handleDelete = (id: number) => {
        if (!confirm('Are you sure you want to delete this customer feedback entry?')) return;
        router.delete(`/pre-orders/feedback/${id}`);
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (branchId !== 'all') params.append('branch_id', branchId);
        window.location.href = `/pre-orders/feedback/export?${params.toString()}`;
    };

    const renderStars = (score: number | null) => {
        if (!score) return <span className="text-muted-foreground text-xs">N/A</span>;
        return (
            <div className="flex items-center gap-0.5 text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= score ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                ))}
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pre-Order Customer Feedback" />
            <div className="container mx-auto space-y-6 p-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                            <Star className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Customer Feedback</h1>
                            <p className="text-sm text-muted-foreground">
                                Customer ratings and feedback collected from Telegram Pre-Order Bot.
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleExport} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                </div>

                {/* Summary Metrics Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Overall Rating</CardTitle>
                            <ThumbsUp className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{stats.overall_avg} / 5.0</div>
                            <p className="text-xs text-muted-foreground mt-1">Based on {stats.total_count} responses</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Delivery & Speed</CardTitle>
                            <Truck className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.delivery_avg} / 5.0</div>
                            <p className="text-xs text-muted-foreground mt-1">Pickup speed rating</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Torta & Product</CardTitle>
                            <Coffee className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.torta_avg} / 5.0</div>
                            <p className="text-xs text-muted-foreground mt-1">Cake/Torta taste quality</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Staff Service</CardTitle>
                            <UserCheck className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.service_avg} / 5.0</div>
                            <p className="text-xs text-muted-foreground mt-1">Branch staff politeness</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search feedback, chat ID, branch..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-8"
                                        onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                                    />
                                </div>
                            </div>

                            <Select value={branchId} onValueChange={(val) => setBranchId(val)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Branches" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Branches</SelectItem>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={rating} onValueChange={(val) => setRating(val)}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="All Ratings" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Ratings</SelectItem>
                                    <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Stars</SelectItem>
                                    <SelectItem value="4">⭐⭐⭐⭐ 4 Stars</SelectItem>
                                    <SelectItem value="3">⭐⭐⭐ 3 Stars</SelectItem>
                                    <SelectItem value="2">⭐⭐ 2 Stars</SelectItem>
                                    <SelectItem value="1">⭐ 1 Star</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button onClick={handleFilter} variant="secondary" className="gap-2">
                                <Filter className="h-4 w-4" /> Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Feedback Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Delivery Speed</TableHead>
                                    <TableHead>Torta Quality</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead className="w-[30%]">Written Feedback</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {feedbacks.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No customer feedback records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    feedbacks.data.map((fb) => (
                                        <TableRow key={fb.id}>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {new Date(fb.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {fb.branch?.name || 'General / Unknown'}
                                            </TableCell>
                                            <TableCell>{renderStars(fb.delivery_rating)}</TableCell>
                                            <TableCell>{renderStars(fb.torta_rating)}</TableCell>
                                            <TableCell>{renderStars(fb.service_rating)}</TableCell>
                                            <TableCell className="text-sm">
                                                {fb.written_feedback ? (
                                                    <span className="italic text-slate-700 dark:text-slate-300">"{fb.written_feedback}"</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">No written comments</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700"
                                                    onClick={() => handleDelete(fb.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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

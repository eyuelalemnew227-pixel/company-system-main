import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Send, Image as ImageIcon, Users, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Pre-Orders', href: '/pre-orders' },
    { title: 'Telegram Broadcasts', href: '/pre-orders/broadcasts' },
];

type BroadcastRow = {
    id: number;
    title: string;
    message: string;
    image_path: string | null;
    sent_count: number;
    creator: { id: number; name: string } | null;
    created_at: string;
};

type Props = {
    broadcasts: {
        data: BroadcastRow[];
    };
    totalCustomers: number;
};

export default function PreOrderBroadcastsPage({ broadcasts, totalCustomers }: Props) {
    const { flash } = usePage<SharedData>().props;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const { data, setData, post, processing, errors, reset } = useForm<{
        title: string;
        message: string;
        image: File | null;
    }>({
        title: '',
        message: '',
        image: null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/pre-orders/broadcasts', {
            onSuccess: () => {
                reset();
                toast.success('Broadcast sent to Telegram customers!');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pre-Order Telegram Broadcasts" />
            <div className="container mx-auto space-y-6 p-6">
                
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                        <Send className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Telegram Broadcast Announcements</h1>
                        <p className="text-sm text-muted-foreground">
                            Send promotional announcements, holiday special offers, and messages to registered Telegram customers.
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    
                    {/* Create Form */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-lg">Compose New Broadcast</CardTitle>
                            <CardDescription>
                                Will be sent to all <strong>{totalCustomers}</strong> Telegram Pre-Order customers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="title">Broadcast Title</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g. Easter Special Torta Discount!"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        required
                                    />
                                    {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="message">Message Body</Label>
                                    <Textarea
                                        id="message"
                                        rows={5}
                                        placeholder="Write your announcement here..."
                                        value={data.message}
                                        onChange={(e) => setData('message', e.target.value)}
                                        required
                                    />
                                    {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="image">Optional Banner Image</Label>
                                    <Input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setData('image', e.target.files?.[0] || null)}
                                    />
                                </div>

                                <Button type="submit" disabled={processing} className="w-full gap-2">
                                    <Send className="h-4 w-4" /> {processing ? 'Sending...' : 'Send Broadcast Now'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Broadcast History */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg">Broadcast History</CardTitle>
                            <CardDescription>Previous broadcasts sent to customers</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date Sent</TableHead>
                                        <TableHead>Announcement</TableHead>
                                        <TableHead>Recipients</TableHead>
                                        <TableHead>Sent By</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {broadcasts.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No broadcast announcements sent yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        broadcasts.data.map((b) => (
                                            <TableRow key={b.id}>
                                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {new Date(b.created_at).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-sm">{b.title}</div>
                                                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{b.message}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="gap-1">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                        {b.sent_count} Users
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">
                                                    {b.creator?.name || 'Admin'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                </div>

            </div>
        </AppLayout>
    );
}

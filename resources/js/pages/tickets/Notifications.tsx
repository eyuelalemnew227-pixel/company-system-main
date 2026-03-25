import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Clock, Info, CheckCircle2, Trash2 } from 'lucide-react';

interface Notification {
    id: number;
    ticket_id?: number | null;
    title: string;
    body?: string | null;
    read_at?: string | null;
    created_at: string;
}

interface PageProps {
    notifications: Notification[];
    unreadCount: number;
}

export default function Notifications({ notifications, unreadCount }: PageProps) {
    const markAllRead = () => {
        router.post(route('ticket-notifications.mark-read'), {}, {
            onSuccess: () => router.reload()
        });
    };

    const clearAll = () => {
        if (confirm('Are you sure you want to clear all notifications?')) {
            router.delete(route('ticket-notifications.clear'), {
                onSuccess: () => router.reload()
            });
        }
    };

    const handleItemClick = (n: Notification) => {
        if (!n.read_at) {
            router.post(route('ticket-notifications.mark-read', n.id), {}, {
                preserveScroll: true
            });
        }
        if (n.ticket_id) {
            router.visit(route('tickets.show', n.ticket_id));
        }
    };

    const breadcrumbs = [
        { title: 'Dashboard', href: route('dashboard') },
        { title: 'Notifications', href: route('ticket-notifications.index') },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notifications" />

            <div className="mx-auto max-w-4xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Bell className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                            <p className="text-sm text-muted-foreground">
                                You have {unreadCount} unread notifications
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mark all as read
                        </Button>
                        <Button variant="destructive" size="sm" onClick={clearAll} disabled={notifications.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear all
                        </Button>
                    </div>
                </div>

                <Card className="border-none shadow-md overflow-hidden">
                    <CardContent className="p-0">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <h3 className="text-lg font-medium">No results found</h3>
                                <p className="text-muted-foreground mt-1 text-sm">You've cleared all your notifications or haven't received any yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-muted/50">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleItemClick(n)}
                                        className={`group relative flex items-start gap-4 p-5 transition-all hover:bg-muted/30 cursor-pointer ${!n.read_at ? "bg-primary/5" : "bg-card"}`}
                                    >
                                        <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${!n.read_at ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/50 border-muted text-muted-foreground"}`}>
                                            <Info className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-sm leading-none ${!n.read_at ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
                                                    {n.title}
                                                </p>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(n.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            {n.body && (
                                                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                                                    {n.body}
                                                </p>
                                            )}
                                        </div>
                                        {!n.read_at && (
                                            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Ticket Settings', href: '/ticket-settings' }];

type Props = {
    children: React.ReactNode;
    activeTab: 'main' | 'sub' | 'assets';
};

export default function TicketSettingsLayout({ children, activeTab }: Props) {
    const { flash } = usePage<any>().props;

    useEffect(() => {
        if (flash?.message) toast.success(flash.message);
    }, [flash?.message]);

    const tabs = [
        { id: 'main', label: 'Main Categories', href: '/ticket-settings/main-categories' },
        { id: 'sub', label: 'Sub Categories', href: '/ticket-settings/sub-categories' },
        { id: 'assets', label: 'Assets', href: '/ticket-settings/assets' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ticket Settings" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Ticket Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-6 flex gap-1 border-b pb-px">
                            {tabs.map((tab) => (
                                <Link
                                    key={tab.id}
                                    href={tab.href}
                                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {tab.label}
                                </Link>
                            ))}
                        </div>
                        {children}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

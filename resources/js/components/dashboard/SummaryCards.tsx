import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ShoppingCart, Users, Building, TrendingUp, Clock } from 'lucide-react';

interface SummaryStats {
    total_orders: number;
    unique_branches: number;
    unique_customers: number;
    total_revenue: number;
    avg_order_value: number;
    paid_orders: number;
    pending_orders: number;
    collected_orders: number;
    cancelled_orders: number;
    total_products: number;
}

interface SummaryCardsProps {
    stats: SummaryStats;
}

export default function SummaryCards({ stats }: SummaryCardsProps) {
    const cards = [
        {
            title: 'Total Orders',
            value: stats.total_orders.toLocaleString(),
            icon: ShoppingCart,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
        },
        {
            title: 'Total Products',
            value: stats.total_products.toLocaleString(),
            icon: TrendingUp, // Placeholder, will update if I can find a better one
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
        },
        {
            title: 'Total Revenue',
            value: `ETB ${stats.total_revenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
        },
        {
            title: 'Paid / Cancelled',
            value: `${stats.paid_orders.toLocaleString()} / ${stats.cancelled_orders.toLocaleString()}`,
            icon: Clock,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200',
        },
    ];

    const statusCards = [
        {
            title: 'Paid',
            value: stats.paid_orders,
            percentage: stats.total_orders > 0 ? ((stats.paid_orders / stats.total_orders) * 100).toFixed(1) : '0',
            color: 'bg-green-500',
        },
        {
            title: 'Pending',
            value: stats.pending_orders,
            percentage: stats.total_orders > 0 ? ((stats.pending_orders / stats.total_orders) * 100).toFixed(1) : '0',
            color: 'bg-yellow-500',
        },
        {
            title: 'Collected',
            value: stats.collected_orders,
            percentage: stats.total_orders > 0 ? ((stats.collected_orders / stats.total_orders) * 100).toFixed(1) : '0',
            color: 'bg-blue-500',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Main Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <Card key={index} className={`${card.bgColor} ${card.borderColor}`}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {card.title}
                                </CardTitle>
                                <Icon className={`h-4 w-4 ${card.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{card.value}</div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

        </div>
    );
}

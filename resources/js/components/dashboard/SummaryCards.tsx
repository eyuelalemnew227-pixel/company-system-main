import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ShoppingCart, Users, Building, TrendingUp, Clock, BarChart3 } from 'lucide-react';


interface SummaryStats {
    total_leads: number;
    total_orders: number;
    paid_products: number;
    total_revenue: number;
    conversion_rate: number;
    cancellation_rate: number;
    collection_rate: number;
}



interface SummaryCardsProps {
    stats: SummaryStats;
}

export default function SummaryCards({ stats }: SummaryCardsProps) {
    const cards = [
        {
            title: 'Total Leads (Custom Reached out)',
            value: stats.total_leads.toLocaleString(),
            description: 'Gross leads (All status)',
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
        },
        {
            title: 'Total Products Ordered',
            value: stats.total_orders.toLocaleString(),
            description: `${stats.paid_products.toLocaleString()} Paid / Collected`,
            icon: ShoppingCart,

            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            borderColor: 'border-indigo-200',
        },

        {
            title: 'Conversion Rate',
            value: `${stats.conversion_rate}%`,
            description: 'Paid or Collected Leads',
            icon: TrendingUp,

            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200',
        },
        {
            title: 'Cancellation Rate',
            value: `${stats.cancellation_rate}%`,
            description: 'Leads with Unpaid orders only',
            icon: Clock,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
        },
        {
            title: 'Collection Rate',
            value: `${stats.collection_rate}%`,
            description: 'Collected / Total Paid',
            icon: Building,


            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
        },
        {
            title: 'Total Revenue',
            value: `ETB ${stats.total_revenue.toLocaleString()}`,
            description: 'Revenue from Paid/Collected',
            icon: DollarSign,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
        },
    ];


    return (

        <div className="space-y-6">
            {/* Main Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {cards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <Card key={index} className={`${card.bgColor} ${card.borderColor} border-opacity-50`}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {card.title}
                                </CardTitle>
                                <Icon className={`h-4 w-4 ${card.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{card.value}</div>
                                {card.description && (
                                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                                        {card.description}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}



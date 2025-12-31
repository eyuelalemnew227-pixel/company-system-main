import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

// Components
import SummaryCards from '@/components/dashboard/SummaryCards';
import SummaryTable from '@/components/dashboard/SummaryTable';
import DashboardCharts from '@/components/dashboard/DashboardCharts';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pre-Orders Dashboard', href: '/pre-orders/dashboard' }];

type Props = {
	dashboard: {
		summary: any;
		statusDistribution: Array<any>;
		charts: {
			orderType: Array<{ name: string; value: number }>;
			product: Array<{ product_name: string; total_quantity: number; total_revenue: number }>;
			collectionDay: Array<{ collection_day: { name: string }; metrics: { total_orders: number } }>;
		};
		summaryData: Array<{
			collectionBranch: string;
			collectionDay: string;
			product: string;
			totalQuantity: number;
			totalAmount: number;
			totalOrders: number;
		}>;
	};
	filters: {
		date_from?: string;
		date_to?: string;
		branch_id?: string;
		product_id?: string;
		collection_day_id?: string;
		holiday_id?: string;
		status?: string;
		order_type_id?: string;
	};
	options: {
		branches: any[];
		collectionDays: any[];
		orderTypes: any[];
		products: any[];
		statuses: string[];
		holidays: Array<{ id: number; name: string }>;
	};
};

import { router } from '@inertiajs/react';
import { useEffect } from 'react';

export default function DashboardPage({ dashboard, filters, options }: Props) {
	useEffect(() => {
		if (window.Echo) {
			window.Echo.channel('pre-orders').listen('.pre-order.updated', (e: any) => {
				console.log('Pre-order updated event received:', e);
				router.reload({ only: ['dashboard'] });
			});

			return () => {
				window.Echo.leaveChannel('pre-orders');
			};
		}
	}, []);

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Pre-Orders Dashboard" />

			<div className="container mx-auto space-y-6 p-6">
				{/* Page Header */}
				<div>
					<div>
						<h1 className="text-3xl font-bold">Pre-Orders Dashboard</h1>
						<p className="text-muted-foreground">Essential metrics and overview for pre-orders</p>
					</div>

				</div>

				{/* Summary Cards */}
				<SummaryCards stats={dashboard.summary} />

				{/* Charts */}
				<DashboardCharts data={dashboard.charts} />

				{/* Summary Table */}
				<SummaryTable data={dashboard.summaryData} filters={filters} options={options} />
			</div>
		</AppLayout>
	);
}

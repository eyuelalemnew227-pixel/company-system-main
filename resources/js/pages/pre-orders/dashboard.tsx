import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

// Components
import SummaryCards from '@/components/dashboard/SummaryCards';
import SummaryTable from '@/components/dashboard/SummaryTable';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import DashboardFilters from '@/components/dashboard/DashboardFilters';

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

	const handleExportCsv = () => {
		if (dashboard.summaryData.length === 0) return;

		// CSV Headers
		const headers = ['Collection Branch', 'Collection Day', 'Product', 'Quantity', 'Total Amount', 'Total Orders'];
		
		const csvContent = [
			headers.join(','),
			...dashboard.summaryData.map(item => [
				item.collectionBranch,
				item.collectionDay,
				item.product,
				item.totalQuantity,
				item.totalAmount,
				item.totalOrders
			].map(cell => {
				const cellStr = String(cell);
				if (cellStr.includes(',') || cellStr.includes('"')) {
					return `"${cellStr.replace(/"/g, '""')}"`;
				}
				return cellStr;
			}).join(','))
		].join('\n');

		const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `pre_orders_summary_${new Date().toISOString().slice(0, 10)}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Pre-Orders Dashboard" />

			<div className="container mx-auto space-y-6 p-6">
				{/* Page Header */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold">Pre-Orders Dashboard</h1>
					</div>
				</div>

				{/* Filters */}
				<DashboardFilters 
					filters={filters} 
					options={options} 
					onExportCsv={handleExportCsv}
				/>

				{/* Summary Cards */}
				<SummaryCards stats={dashboard.summary} />

				{/* Charts */}
				<DashboardCharts data={dashboard.charts} />

				{/* Summary Table */}
				<SummaryTable data={dashboard.summaryData} />
			</div>
		</AppLayout>
	);
}

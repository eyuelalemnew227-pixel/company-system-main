import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

// Components
import SummaryCards from '@/components/dashboard/SummaryCards';
import SummaryTable from '@/components/dashboard/SummaryTable';
import DashboardCharts, { FunnelChartCard, OrderingTimeCard } from '@/components/dashboard/DashboardCharts';
import BreakEvenChart from '@/components/dashboard/BreakEvenChart';
import BreakEvenSummary from '@/components/dashboard/BreakEvenSummary';
import BreakEvenQuickStats from '@/components/dashboard/BreakEvenQuickStats';
import BreakEvenTrendCharts from '@/components/dashboard/BreakEvenTrendCharts';

import DashboardFilters from '@/components/dashboard/DashboardFilters';
import MatrixTable from '@/components/dashboard/MatrixTable';
import OperatorPerformance from '@/components/dashboard/OperatorPerformance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { LayoutDashboard, CalendarRange, Users, BarChart3, TrendingUp, Filter, Target } from 'lucide-react';



const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pre-Orders Dashboard', href: '/pre-orders/dashboard' }];

type Props = {
	dashboard: {
		summary: {
			total_leads: number;
			total_orders: number;
			total_revenue: number;
			conversion_rate: number;
			cancellation_rate: number;
			collection_rate: number;
		};

		statusDistribution: Array<any>;
		charts: {
			orderType: Array<{ name: string; value: number }>;
			product: Array<{ product_name: string; total_quantity: number; total_revenue: number }>;
			collectionDay: Array<{ collection_day: { name: string }; metrics: { total_orders: number } }>;
		};
		funnel: Array<{ name: string; value: number; fill: string }>;
		orderingTime: Array<{ hour: string; count: number }>;
		matrix: {
			columns: Array<string>;
			rows: Array<any>;
		};
		productTrend: {
			products: string[];
			data: any[];
		};
		branchMatrix: {
			columns: Array<string>;
			rows: Array<any>;
		};
		operatorPerformance: Array<{
			name: string;
			branch: string;
			leads: number;
			orders: number;
			items: number;
			revenue: number;
			conversion_rate: number;
		}>;
		summaryData: {
			items: Array<{
				collectionBranch: string;
				collectionDay: string;
				product: string;
				totalQuantity: number;
				totalAmount: number;
				totalOrders: number;
			}>;
			totalUniqueOrders: number;
		};
		breakEvenAnalysis: {
			breakEven: {
				ordersNeeded: number;
				contributionMargin: number;
			} | null;
			chartData: Array<{
				orders: number;
				revenue: number;
				fixedCosts: number;
				totalCosts: number;
				profit: number;
				isBreakEven?: boolean;
				isCurrent?: boolean;
			}>;
			summary: {
				fixedCosts: number;
				variableCosts: number;
				revenue: number;
				profit: number;
				breakEvenOrders: number;
				currentOrders: number;
				ordersToBreakEven: number;
				isProfitable: boolean;
				avgRevenuePerOrder: number;
				avgProductCostPerOrder: number;
				costBreakdown: {
					sms: number;
					operator: number;
					influencer: number;
					other: number;
				};
			};
			historicalTrends: Array<{
				date: string;
				cumulative_orders: number;
				cumulative_quantity: number;
				cumulative_contribution: number;
				avg_contribution: number;
			}>;
		} | null;

	};
	filters: {

		date?: string;
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
	auth: {
		user: any;
		permissions: string[];
		roles: string[];
	};
};




import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function DashboardPage({ dashboard, filters, options, auth }: Props) {
    const [activeTab, setActiveTab] = useState('overview');

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
		if (dashboard.summaryData.items.length === 0) return;

		// CSV Headers
		const headers = ['Collection Branch', 'Collection Day', 'Product', 'Quantity', 'Total Amount', 'Total Orders'];
		
		const csvContent = [
			headers.join(','),
			...dashboard.summaryData.items.map(item => [
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
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-100 rounded-lg text-blue-600">
							<BarChart3 className="w-8 h-8" />
						</div>
						<div>
							<h1 className="text-3xl font-bold tracking-tight">Pre-Order Analysis</h1>
							<p className="text-muted-foreground">Unified insights and performance tracking</p>
						</div>
					</div>
				</div>

				<Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 bg-background/95 backdrop-blur py-2 border-b">
						<TabsList className="bg-muted/50 p-1">
							<TabsTrigger value="overview" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
								<LayoutDashboard className="w-4 h-4" />
								<span>Overview</span>
							</TabsTrigger>
							<TabsTrigger value="planning" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
								<CalendarRange className="w-4 h-4" />
								<span>Planning Matrices</span>
							</TabsTrigger>
							<TabsTrigger value="analytics" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
								<TrendingUp className="w-4 h-4" />
								<span>Sales Analytics</span>
							</TabsTrigger>
							<TabsTrigger value="break-even" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
								<Target className="w-4 h-4" />
								<span>Break-Even Analysis</span>
							</TabsTrigger>
							<TabsTrigger value="operations" className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
								<Users className="w-4 h-4" />
								<span>Operations</span>
							</TabsTrigger>
						</TabsList>
						
						<div className="flex items-center gap-2">
							<div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
								<div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
								Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</div>
						</div>
					</div>

					{/* Filters */}
					<div className="py-2">
						<DashboardFilters 
							filters={filters} 
							options={options} 
							onExportCsv={handleExportCsv}
                                disableAllHolidays={activeTab === 'break-even'}
						/>
					</div>

					<TabsContent value="overview" className="space-y-6 animate-in fade-in duration-500">
						{/* Summary Cards */}
						<SummaryCards stats={dashboard.summary} />

						{/* Top row of Overview: Funnel and Ordering Time */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<FunnelChartCard funnelData={dashboard.funnel} />
							<OrderingTimeCard orderingTimeData={dashboard.orderingTime} />
						</div>
					</TabsContent>

					<TabsContent value="planning" className="space-y-6 animate-in fade-in duration-500">
						{/* Matrix Tables */}
						<div className="grid grid-cols-1 gap-8">
							<MatrixTable 
								title="Product vs Collection Day Matrix (Confirmed Sales)"
								description="Cross-tabulation of products and collection days for production planning."
								data={dashboard.matrix} 
								firstColumnLabel="Product"
							/>
							<MatrixTable 
								title="Product Sales by Each Branch"
								description="Distribution of product demand across collection branches."
								data={dashboard.branchMatrix} 
								firstColumnLabel="Branch"
							/>
						</div>
					</TabsContent>

					<TabsContent value="analytics" className="space-y-6 animate-in fade-in duration-500">
						<DashboardCharts 
							data={dashboard.charts} 
							funnelData={dashboard.funnel}
							orderingTimeData={dashboard.orderingTime}
							productTrend={dashboard.productTrend}
						/>
					</TabsContent>

					<TabsContent value="break-even" className="space-y-6 animate-in fade-in duration-500">
						{dashboard.breakEvenAnalysis ? (
							<>
								{/* Quick Stats Cards */}
								<BreakEvenQuickStats summary={dashboard.breakEvenAnalysis.summary} />
								
								{/* Break-Even Summary Cards */}
								<BreakEvenSummary summary={dashboard.breakEvenAnalysis.summary} />
								
								{/* Historical Performance Trends */}
								<BreakEvenTrendCharts 
                                    data={dashboard.breakEvenAnalysis.historicalTrends} 
                                    fixedCosts={dashboard.breakEvenAnalysis.summary.fixedCosts}
                                    breakEvenOrders={dashboard.breakEvenAnalysis.summary.breakEvenOrders}
                                />

								{/* Break-Even Projection Chart */}
								<BreakEvenChart 
									data={dashboard.breakEvenAnalysis.chartData}
									breakEvenPoint={dashboard.breakEvenAnalysis.breakEven?.ordersNeeded}
									currentOrders={dashboard.breakEvenAnalysis.summary.currentOrders}
									isProfitable={dashboard.breakEvenAnalysis.summary.isProfitable}
								/>
								
								{/* Additional Insights */}
								<Card>
									<CardHeader>
										<CardTitle>Key Insights</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<div className="text-center p-4 bg-blue-50 rounded-lg">
												<div className="text-2xl font-bold text-blue-600">
													{dashboard.breakEvenAnalysis?.breakEven?.contributionMargin ? 
														((dashboard.breakEvenAnalysis.breakEven.contributionMargin / dashboard.breakEvenAnalysis.summary.avgRevenuePerOrder) * 100).toFixed(1) : '0'
													}%
												</div>
												<div className="text-sm text-blue-800">Contribution Margin</div>
											</div>
											<div className="text-center p-4 bg-green-50 rounded-lg">
												<div className="text-2xl font-bold text-green-600">
													{dashboard.breakEvenAnalysis?.breakEven?.ordersNeeded}
												</div>
												<div className="text-sm text-green-800">Orders to Break-Even</div>
											</div>
											<div className="text-center p-4 bg-purple-50 rounded-lg">
												<div className="text-2xl font-bold text-purple-600">
													{dashboard.breakEvenAnalysis?.summary.ordersToBreakEven}
												</div>
												<div className="text-sm text-purple-800">Orders to Break-Even</div>
											</div>
										</div>
									</CardContent>
								</Card>
							</>
						) : (
							<Card>
								<CardContent className="text-center py-12">
									<Target className="w-16 h-16 mx-auto text-gray-400 mb-4" />
									<h3 className="text-lg font-semibold text-gray-600 mb-2">No Break-Even Data Available</h3>
									<p className="text-gray-500 max-w-md mx-auto">
										Please select a specific holiday and add cost data (SMS, Operator, Influencer costs) to view break-even analysis.
									</p>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					<TabsContent value="operations" className="space-y-6 animate-in fade-in duration-500">
						<div className="grid grid-cols-1 gap-6">
							<OperatorPerformance data={dashboard.operatorPerformance} />
							
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<h2 className="text-xl font-semibold">Detailed Orders Ledger</h2>
								</div>
								<SummaryTable 
									data={dashboard.summaryData.items} 
									totalOrders={dashboard.summaryData.totalUniqueOrders}
								/>


							</div>
						</div>
					</TabsContent>
				</Tabs>
			</div>

		</AppLayout>
	);
}

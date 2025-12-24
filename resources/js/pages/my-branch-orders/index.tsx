import { type BreadcrumbItem, type PaginationData } from '@/types';
import { type PreOrder } from '@/types/pre-order';
import { Link, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, DownloadIcon, PackageCheckIcon, ScrollTextIcon, SearchIcon, FileTextIcon, TableIcon, ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'My Branch Orders', href: '/my-branch-orders' }];

type Props = {
	orders: PaginationData<PreOrder>;
	collectionDays: Array<{ id: number; name: string }>;
	orderTypes: Array<{ id: number; name: string }>;
	kpis: {
		totalOrders: number;
		collectedOrders: number;
		pendingOrders: number;
		totalAmount: number;
		collectedAmount: number;
		collectionRate: number;
	};
	productStats: Array<{ product_name: string; total_quantity: number; collected_quantity: number }>;
	orderTypeStats: Array<{ name: string; total: number; collected: number; pending: number }>;
	filters: {
		search?: string;
		collection_day_id?: string;
		order_type_id?: string;
		collection_status?: string;
		sort?: string;
		direction?: 'asc' | 'desc';
	};
	userBranch: string;
};

const statusColors = {
	Pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
	Paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
	Collected: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
	Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function Index({ orders, collectionDays, orderTypes, kpis, productStats, orderTypeStats, filters = {}, userBranch }: Props) {
	const [search, setSearch] = useState(filters?.search || '');
	const [collectionDayId, setCollectionDayId] = useState(filters?.collection_day_id || 'all');
	const [orderTypeId, setOrderTypeId] = useState(filters?.order_type_id || 'all');
	const [collectionStatus, setCollectionStatus] = useState(filters?.collection_status || 'all');

	const handleSort = (field: string) => {
		const currentSort = filters?.sort;
		const currentDirection = filters?.direction || 'desc';

		let newDirection: 'asc' | 'desc' = 'desc';
		if (currentSort === field) {
			newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
		}

		const params: any = { ...filters, sort: field, direction: newDirection };
		router.get('/my-branch-orders', params, { preserveState: true, replace: true });
	};

	const SortIcon = ({ field }: { field: string }) => {
		if (filters?.sort !== field) {
			return <ArrowUpDown className="ml-2 size-4" />;
		}
		return filters?.direction === 'asc' ? <ArrowUp className="ml-2 size-4" /> : <ArrowDown className="ml-2 size-4" />;
	};

	const handleFilter = () => {
		const params: any = {};
		if (search) params.search = search;
		if (collectionDayId !== 'all') params.collection_day_id = collectionDayId;
		if (orderTypeId !== 'all') params.order_type_id = orderTypeId;
		if (collectionStatus !== 'all') params.collection_status = collectionStatus;

		router.get('/my-branch-orders', params, { preserveState: true });
	};

	const handleCollect = (orderId: number) => {
		router.post(
			route('my-branch-orders.collect', orderId),
			{},
			{
				preserveState: true,
				preserveScroll: true,
			},
		);
	};

	const handleUncollect = (orderId: number) => {
		router.post(
			route('my-branch-orders.uncollect', orderId),
			{},
			{
				preserveState: true,
				preserveScroll: true,
			},
		);
	};

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="container mx-auto max-w-7xl px-4 py-6">
				<div className="mt-6 space-y-6">
					{/* KPI - Collection Progress */}
					<div className="rounded-lg border bg-card p-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="text-3xl font-bold text-green-600">{kpis.collectionRate}%</div>
								<div>
									<div className="text-xs font-medium text-muted-foreground">Collection Rate</div>
									<div className="text-base font-medium text-muted-foreground">
										{kpis.collectedOrders} of {kpis.totalOrders} orders
									</div>
								</div>
							</div>
							<div
								className="h-12 w-12 rounded-full border-4 border-green-600 border-r-gray-200 dark:border-r-gray-700"
								style={{ transform: `rotate(${(kpis.collectionRate / 100) * 360}deg)` }}
							></div>
						</div>
					</div>

					{/* Charts */}
					<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
						{/* Product Statistics */}
						<div className="rounded-lg border bg-card p-3">
							<h3 className="mb-2 text-sm font-semibold">Top Products</h3>
							<div className="space-y-2">
								{productStats.slice(0, 5).map((product, idx) => {
									const collectedPercent = (product.collected_quantity / product.total_quantity) * 100;
									return (
										<div key={idx} className="space-y-0.5">
											<div className="flex justify-between text-[11px]">
												<span className="truncate font-medium">{product.product_name}</span>
												<span className="ml-2 flex-shrink-0 text-muted-foreground">
													{product.collected_quantity}/{product.total_quantity}
												</span>
											</div>
											<div className="h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
												<div className="h-full bg-green-600 transition-all" style={{ width: `${collectedPercent}%` }} />
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Order Type Statistics */}
						<div className="rounded-lg border bg-card p-3">
							<h3 className="mb-2 text-sm font-semibold">Orders by Type</h3>
							<div className="space-y-2">
								{(() => {
									// Group orders into Walk-in Customer and Sheger Gebeta
									const grouped = orderTypeStats.reduce(
										(acc, type) => {
											const key = type.name === 'Walkin Customer' ? 'walkin' : 'sheger';
											if (!acc[key]) {
												acc[key] = { collected: 0, pending: 0 };
											}
											acc[key].collected += type.collected;
											acc[key].pending += type.pending;
											return acc;
										},
										{} as Record<string, { collected: number; pending: number }>,
									);

									return (
										<>
											{grouped.walkin && (
												<div>
													<div className="mb-1 text-[11px] font-medium">Walk-in Customer</div>
													<div className="flex gap-1.5">
														<div className="flex-1 rounded bg-green-100 p-1.5 text-center dark:bg-green-900/30">
															<div className="text-base font-bold text-green-600">{grouped.walkin.collected}</div>
															<div className="text-[9px] text-muted-foreground">Collected</div>
														</div>
														<div className="flex-1 rounded bg-orange-100 p-1.5 text-center dark:bg-orange-900/30">
															<div className="text-base font-bold text-orange-600">{grouped.walkin.pending}</div>
															<div className="text-[9px] text-muted-foreground">Not Collected</div>
														</div>
													</div>
												</div>
											)}
											{grouped.sheger && (
												<div>
													<div className="mb-1 text-[11px] font-medium">Sheger Gebeta</div>
													<div className="flex gap-1.5">
														<div className="flex-1 rounded bg-green-100 p-1.5 text-center dark:bg-green-900/30">
															<div className="text-base font-bold text-green-600">{grouped.sheger.collected}</div>
															<div className="text-[9px] text-muted-foreground">Collected</div>
														</div>
														<div className="flex-1 rounded bg-orange-100 p-1.5 text-center dark:bg-orange-900/30">
															<div className="text-base font-bold text-orange-600">{grouped.sheger.pending}</div>
															<div className="text-[9px] text-muted-foreground">Not Collected</div>
														</div>
													</div>
												</div>
											)}
										</>
									);
								})()}
							</div>
						</div>
					</div>

					{/* Filters */}
					<div className="flex flex-wrap items-center gap-4">
						<Input
							type="text"
							placeholder="Search by order #, client name, or phone..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
							className="max-w-md"
							icon={<SearchIcon className="size-4" />}
						/>

						<Select value={collectionDayId} onValueChange={setCollectionDayId}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Collection Day" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Days</SelectItem>
								{collectionDays.map((day) => (
									<SelectItem key={day.id} value={day.id.toString()}>
										{day.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={orderTypeId} onValueChange={setOrderTypeId}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Order Type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Types</SelectItem>
								{orderTypes.map((type) => (
									<SelectItem key={type.id} value={type.id.toString()}>
										{type.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={collectionStatus} onValueChange={setCollectionStatus}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Collection Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="collected">Collected</SelectItem>
								<SelectItem value="not_collected">Not Collected</SelectItem>
							</SelectContent>
						</Select>

						<Button onClick={handleFilter}>Filter</Button>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline">
									<DownloadIcon className="mr-2 size-4" />
									Export
									<ChevronDownIcon className="ml-2 size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => {
									const params = new URLSearchParams();
									if (search) params.append('search', search);
									if (collectionDayId !== 'all') params.append('collection_day_id', collectionDayId);
									if (orderTypeId !== 'all') params.append('order_type_id', orderTypeId);
									if (collectionStatus !== 'all') params.append('collection_status', collectionStatus);
									if (filters?.sort) params.append('sort', filters.sort);
									if (filters?.direction) params.append('direction', filters.direction);
									params.append('format', 'pdf');

									window.location.href = `/my-branch-orders/export?${params.toString()}`;
								}}>
									<FileTextIcon className="mr-2 size-4" />
									Export as PDF
								</DropdownMenuItem>
								{/* <DropdownMenuItem onClick={() => {
									const params = new URLSearchParams();
									if (search) params.append('search', search);
									if (collectionDayId !== 'all') params.append('collection_day_id', collectionDayId);
									if (orderTypeId !== 'all') params.append('order_type_id', orderTypeId);
									if (collectionStatus !== 'all') params.append('collection_status', collectionStatus);
									if (filters?.sort) params.append('sort', filters.sort);
									if (filters?.direction) params.append('direction', filters.direction);
									params.append('format', 'excel');

									window.location.href = `/my-branch-orders/export?${params.toString()}`;
								}}>
									<TableIcon className="mr-2 size-4" />
									Export as Excel
								</DropdownMenuItem> */}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* Orders Table */}
					<div className="rounded-lg border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('order_number')}>
										<div className="flex items-center">
											Order #
											<SortIcon field="order_number" />
										</div>
									</TableHead>
									<TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('client_name')}>
										<div className="flex items-center">
											Client Name
											<SortIcon field="client_name" />
										</div>
									</TableHead>
									<TableHead>Phone</TableHead>
									<TableHead>Order Type</TableHead>
									<TableHead>Collection Day</TableHead>
									<TableHead>Products</TableHead>
									<TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('total_amount')}>
										<div className="flex items-center">
											Total Amount
											<SortIcon field="total_amount" />
										</div>
									</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{orders.data.length === 0 ? (
									<TableRow>
										<TableCell colSpan={8} className="text-center text-muted-foreground">
											No orders found for your branch.
										</TableCell>
									</TableRow>
								) : (
									orders.data.map((order) => {
										const isCollected = !!order.collected_at;
										return (
											<TableRow key={order.id} className={isCollected ? 'opacity-60' : ''}>
												<TableCell className={isCollected ? 'line-through' : ''}>{order.order_number}</TableCell>
												<TableCell className={isCollected ? 'line-through' : ''}>{order.client_name}</TableCell>
												<TableCell className={isCollected ? 'line-through' : ''}>{order.phone_number}</TableCell>

												<TableCell className={isCollected ? 'line-through' : ''}>
													<div className="flex items-center gap-1.5">
														{order.order_type?.name === 'Walkin Customer' ? (
															'Walk-in Customer'
														) : (
															<>
																<ScrollTextIcon className="size-4 text-blue-600 dark:text-blue-400" />
																<span>Sheger Gebeta</span>
															</>
														)}
													</div>
												</TableCell>

												<TableCell className={isCollected ? 'line-through' : ''}>{order.collection_day?.name}</TableCell>
												<TableCell className={isCollected ? 'line-through' : ''}>
													<div className="flex flex-col gap-1">
														{order.items && order.items.length > 0 ? (
															order.items.map((item, idx) => (
																<div key={idx} className="text-sm">
																	{item.product?.product_name || 'Unknown Product'} × {item.quantity}
																</div>
															))
														) : (
															<span className="text-muted-foreground">No items</span>
														)}
													</div>
												</TableCell>
												<TableCell className={isCollected ? 'line-through' : ''}>
													ETB {parseFloat(order.total_amount).toFixed(2)}
												</TableCell>
												<TableCell className="text-right">
													<div className="flex items-center justify-end gap-2">
														{isCollected ? (
															<Button
																variant="outline"
																size="sm"
																onClick={() => handleUncollect(order.id)}
																className="flex items-center gap-1 border-green-600 bg-green-600 text-white hover:bg-green-700"
															>
																<PackageCheckIcon className="size-4" />
																Collected
															</Button>
														) : (
															<Button
																variant="default"
																size="sm"
																onClick={() => handleCollect(order.id)}
																className="flex items-center gap-1"
															>
																<PackageCheckIcon className="size-4" />
																Collect
															</Button>
														)}
													</div>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{orders.links && (
						<div className="flex items-center justify-between">
							<div className="text-sm text-muted-foreground">
								Showing {orders.from || 0} to {orders.to || 0} of {orders.total} orders
							</div>
							<div className="flex gap-2">
								{orders.links.map((link, index) => {
									if (!link.url) {
										return (
											<Button key={index} variant="outline" size="sm" disabled>
												<span dangerouslySetInnerHTML={{ __html: link.label }} />
											</Button>
										);
									}
									return (
										<Link key={index} href={link.url} preserveState>
											<Button variant={link.active ? 'default' : 'outline'} size="sm">
												<span dangerouslySetInnerHTML={{ __html: link.label }} />
											</Button>
										</Link>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</div>
		</AppLayout>
	);
}

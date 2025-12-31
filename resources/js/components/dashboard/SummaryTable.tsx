import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, Search, X, Download } from 'lucide-react';
import { useMemo, useState, useEffect, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router } from '@inertiajs/react';

interface SummaryTableProps {
	data: Array<{
		collectionBranch: string;
		collectionDay: string;
		product: string;
		totalQuantity: number;
		totalAmount: number;
		totalOrders: number;
	}>;
	filters: {
		date_from?: string;
		date_to?: string;
		branch_id?: string;
		product_id?: string;
		collection_day_id?: string;
		status?: string;
		order_type_id?: string;
		holiday_id?: string;
	};
	options: {
		branches: Array<{ id: number; name: string }>;
		products: Array<{ id: number; product_name: string }>;
		collectionDays: Array<{ id: number; name: string }>;
		orderTypes: Array<{ id: number; name: string }>;
		statuses: string[];
		holidays: Array<{ id: number; name: string }>;
	};
}

interface GroupedData {
	branch: string;
	totalQuantity: number;
	totalAmount: number;
	totalOrders: number;
	items: SummaryTableProps['data'];
}

export default function SummaryTable({
	data,
	filters = {
		date_from: '',
		date_to: '',
		branch_id: 'all',
		product_id: 'all',
		collection_day_id: 'all',
		status: 'all',
		order_type_id: 'all',
		holiday_id: 'all'
	},
	options = {
		branches: [],
		products: [],
		collectionDays: [],
		orderTypes: [],
		statuses: [],
		holidays: []
	}
}: SummaryTableProps) {
	const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

	// Ensure filters has default values if partially provided
	const safeFilters = {
		date_from: filters?.date_from || '',
		date_to: filters?.date_to || '',
		branch_id: filters?.branch_id || 'all',
		product_id: filters?.product_id || 'all',
		collection_day_id: filters?.collection_day_id || 'all',
		status: filters?.status || 'all',
		order_type_id: filters?.order_type_id || 'all',
		holiday_id: filters?.holiday_id || 'all',
	};

	// Filter State
	const [filterValues, setFilterValues] = useState(safeFilters);

	// Sync local state with URL filters to ensure consistency
	// Use JSON.stringify to avoid infinite loop if filters object reference changes but values match
	useEffect(() => {
		setFilterValues(safeFilters);
	}, [JSON.stringify(filters)]);

	const safeOptions = {
		branches: options?.branches || [],
		products: options?.products || [],
		collectionDays: options?.collectionDays || [],
		orderTypes: options?.orderTypes || [],
		statuses: options?.statuses || [],
		holidays: options?.holidays || [],
	};

	const handleFilterChange = (key: string, value: string) => {
		setFilterValues((prev) => ({ ...prev, [key]: value }));
	};

	const handleSearch = () => {
		const queryParams: Record<string, any> = {};
		if (filterValues.date_from) queryParams.date_from = filterValues.date_from;
		if (filterValues.date_to) queryParams.date_to = filterValues.date_to;
		if (filterValues.branch_id && filterValues.branch_id !== 'all') queryParams.branch_id = filterValues.branch_id;
		if (filterValues.product_id && filterValues.product_id !== 'all') queryParams.product_id = filterValues.product_id;
		if (filterValues.collection_day_id && filterValues.collection_day_id !== 'all') queryParams.collection_day_id = filterValues.collection_day_id;
		if (filterValues.holiday_id && filterValues.holiday_id !== 'all') queryParams.holiday_id = filterValues.holiday_id;
		if (filterValues.status && filterValues.status !== 'all') queryParams.status = filterValues.status;
		if (filterValues.order_type_id && filterValues.order_type_id !== 'all') queryParams.order_type_id = filterValues.order_type_id;

		router.get('/pre-orders/dashboard', queryParams, {
			preserveState: true,
			replace: true,
		});
	};

	const handleReset = () => {
		setFilterValues({
			date_from: '',
			date_to: '',
			branch_id: 'all',
			product_id: 'all',
			collection_day_id: 'all',
			status: 'all',
			order_type_id: 'all',
			holiday_id: 'all',
		});
		router.get('/pre-orders/dashboard', {}, { preserveState: true });
	};

	const handleExportCsv = () => {
		if (groupedData.length === 0) return;

		// CSV Headers
		const headers = ['Collection Branch', 'Collection Day', 'Product', 'Quantity', 'Total Amount', 'Total Orders'];

		const rows: Array<Array<string | number>> = [];

		groupedData.forEach(group => {
			// Add Branch Summary Row
			rows.push([
				group.branch,
				'-', // Collection Day placeholder
				'-', // Product placeholder
				group.totalQuantity,
				group.totalAmount,
				group.totalOrders
			]);

			// Add Detail Rows if expanded
			if (expandedBranches.has(group.branch)) {
				group.items.forEach(item => {
					rows.push([
						'', // Empty Branch column for hierarchy visual
						item.collectionDay,
						item.product,
						item.totalQuantity,
						item.totalAmount,
						item.totalOrders
					]);
				});
			}
		});

		// Combine headers and rows
		const csvContent = [
			headers.join(','),
			...rows.map(row => row.map(cell => {
				// Escape quotes and wrap in quotes if contains comma
				const cellStr = String(cell);
				if (cellStr.includes(',') || cellStr.includes('"')) {
					return `"${cellStr.replace(/"/g, '""')}"`;
				}
				return cellStr;
			}).join(','))
		].join('\n');

		// Create download link
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `pre_orders_summary_${new Date().toISOString().slice(0, 10)}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-ET', {
			style: 'currency',
			currency: 'ETB',
		}).format(amount);
	};

	// Group data by branch
	const groupedData = useMemo(() => {
		const groups = new Map<string, GroupedData>();

		data?.forEach((item) => {
			const branchName = item.collectionBranch;
			if (!groups.has(branchName)) {
				groups.set(branchName, {
					branch: branchName,
					totalQuantity: 0,
					totalAmount: 0,
					totalOrders: 0,
					items: [],
				});
			}

			const group = groups.get(branchName)!;
			group.totalQuantity += item.totalQuantity;
			group.totalAmount += item.totalAmount;
			group.totalOrders += item.totalOrders;
			group.items.push(item);
		});

		return Array.from(groups.values());
	}, [data]);

	// Set default expanded state when data changes
	useEffect(() => {
		if (groupedData.length > 0) {
			setExpandedBranches(new Set(groupedData.map(g => g.branch)));
		}
	}, [data]); // Depend on data length or reference, not groupedData object creation if possible, but groupedData is useMemo so it's fine.

	const toggleBranch = (branch: string) => {
		const newExpanded = new Set(expandedBranches);
		if (newExpanded.has(branch)) {
			newExpanded.delete(branch);
		} else {
			newExpanded.add(branch);
		}
		setExpandedBranches(newExpanded);
	};

	const toggleAllBranches = () => {
		if (expandedBranches.size === groupedData.length) {
			setExpandedBranches(new Set());
		} else {
			const allBranches = new Set(groupedData.map(g => g.branch));
			setExpandedBranches(allBranches);
		}
	};

	const isAllExpanded = groupedData.length > 0 && expandedBranches.size === groupedData.length;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Orders by Collection Branch</CardTitle>
				<CardDescription>Grouped by branch. Click arrows to expand details.</CardDescription>
			</CardHeader>
			<CardContent>
				{/* Filters Section */}
				<div className="mb-6 rounded-lg bg-gray-50/50 p-4 border border-gray-100">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 items-end">
						{/* Date From */}
						<div className="space-y-2">
							<Label htmlFor="date_from" className="text-xs">Date From</Label>
							<Input type="date" id="date_from" className="h-8 text-sm" value={filterValues.date_from} onChange={(e) => handleFilterChange('date_from', e.target.value)} />
						</div>
						{/* Date To */}
						<div className="space-y-2">
							<Label htmlFor="date_to" className="text-xs">Date To</Label>
							<Input type="date" id="date_to" className="h-8 text-sm" value={filterValues.date_to} onChange={(e) => handleFilterChange('date_to', e.target.value)} />
						</div>
						{/* Branch */}
						<div className="space-y-2">
							<Label htmlFor="branch" className="text-xs">Branch</Label>
							<Select value={filterValues.branch_id} onValueChange={(val) => handleFilterChange('branch_id', val)}>
								<SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									{safeOptions.branches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
						{/* Product */}
						<div className="space-y-2">
							<Label htmlFor="product" className="text-xs">Product</Label>
							<Select value={filterValues.product_id} onValueChange={(val) => handleFilterChange('product_id', val)}>
								<SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									{safeOptions.products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.product_name}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
						{/* Collection Day */}
						<div className="space-y-2">
							<Label htmlFor="day" className="text-xs">Collection Day</Label>
							<Select value={filterValues.collection_day_id} onValueChange={(val) => handleFilterChange('collection_day_id', val)}>
								<SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									{safeOptions.collectionDays.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
						{/* Holiday */}
						<div className="space-y-2">
							<Label htmlFor="holiday" className="text-xs font-bold text-green-700">Holiday</Label>
							<Select value={filterValues.holiday_id} onValueChange={(val) => handleFilterChange('holiday_id', val)}>
								<SelectTrigger className="h-8 text-sm border-green-200 focus:ring-green-500"><SelectValue placeholder="All" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Holidays</SelectItem>
									{safeOptions.holidays.map((h) => <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
						{/* Status */}
						<div className="space-y-2">
							<Label htmlFor="status" className="text-xs">Status</Label>
							<Select value={filterValues.status} onValueChange={(val) => handleFilterChange('status', val)}>
								<SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									{safeOptions.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
						{/* Actions */}
						<div className="flex gap-2">
							<Button size="sm" onClick={handleSearch} className="flex-1 h-8"><Search className="h-3 w-3 mr-1" /> Filter</Button>
							<Button size="sm" variant="secondary" onClick={handleExportCsv} className="h-8 px-2" title="Export CSV"><Download className="h-3 w-3 mr-1" /> CSV</Button>
							<Button size="sm" variant="outline" onClick={handleReset} className="h-8 px-2" title="Reset"><X className="h-3 w-3" /></Button>
						</div>
					</div>
				</div>

				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[300px]">
									<div className="flex items-center gap-2">
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0 hover:bg-transparent"
											onClick={toggleAllBranches}
											title={isAllExpanded ? "Collapse All" : "Expand All"}
										>
											{isAllExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
										</Button>
										Collection Branch
									</div>
								</TableHead>
								<TableHead>Collection Day</TableHead>
								<TableHead>Product</TableHead>
								<TableHead className="text-right">Quantity</TableHead>
								<TableHead className="text-right">Total Amount</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{groupedData.map((group) => {
								const isExpanded = expandedBranches.has(group.branch);
								return (
									<Fragment key={group.branch}>
										{/* Branch Summary Row */}
										<TableRow
											className="cursor-pointer hover:bg-gray-50 font-semibold"
											onClick={() => toggleBranch(group.branch)}
										>
											<TableCell>
												<div className="flex items-center gap-2">
													<Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-transparent">
														{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
													</Button>
													<span className="text-base">{group.branch}</span>
												</div>
											</TableCell>
											<TableCell className="text-muted-foreground italic text-sm">-</TableCell>
											<TableCell className="text-muted-foreground italic text-sm">-</TableCell>
											<TableCell className="text-right font-bold">{group.totalQuantity.toLocaleString()}</TableCell>
											<TableCell className="text-right text-green-600 font-bold">{formatCurrency(group.totalAmount)}</TableCell>
										</TableRow>

										{/* Expanded Details */}
										{isExpanded && group.items.map((item, index) => (
											<TableRow key={`${group.branch}-${index}`} className="bg-gray-50/50 hover:bg-gray-100/50">
												<TableCell className="pl-12"></TableCell>
												<TableCell>
													<Badge variant="outline" className="border-green-200 bg-green-50 text-green-800 font-normal">
														{item.collectionDay}
													</Badge>
												</TableCell>
												<TableCell>
													<Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-800 font-normal">
														{item.product}
													</Badge>
												</TableCell>
												<TableCell className="text-right font-medium">{item.totalQuantity.toLocaleString()}</TableCell>
												<TableCell className="text-right font-medium text-green-600">{formatCurrency(item.totalAmount)}</TableCell>
											</TableRow>
										))}
									</Fragment>
								);
							})}

							{/* Grand Total Row */}
							<TableRow className="bg-gray-100 font-bold border-t-2 border-gray-200">
								<TableCell className="text-lg pl-10">Grand Total</TableCell>
								<TableCell></TableCell>
								<TableCell></TableCell>
								<TableCell className="text-right text-base">
									{groupedData.reduce((sum, group) => sum + group.totalQuantity, 0).toLocaleString()}
								</TableCell>
								<TableCell className="text-right text-lg text-green-700">
									{formatCurrency(groupedData.reduce((sum, group) => sum + group.totalAmount, 0))}
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}

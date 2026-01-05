import { Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router } from '@inertiajs/react';

interface DashboardFiltersProps {
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
	onExportCsv?: () => void;
}

export default function DashboardFilters({
	filters,
	options,
	onExportCsv
}: DashboardFiltersProps) {
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

	const [filterValues, setFilterValues] = useState(safeFilters);

	useEffect(() => {
		setFilterValues(safeFilters);
	}, [JSON.stringify(filters)]);

	const handleFilterChange = (key: string, value: string) => {
		const newFilters = { ...filterValues, [key]: value };
		setFilterValues(newFilters);
		
		// Auto-filter logic
		const queryParams: Record<string, any> = {};
		if (newFilters.date_from) queryParams.date_from = newFilters.date_from;
		if (newFilters.date_to) queryParams.date_to = newFilters.date_to;
		if (newFilters.branch_id && newFilters.branch_id !== 'all') queryParams.branch_id = newFilters.branch_id;
		if (newFilters.product_id && newFilters.product_id !== 'all') queryParams.product_id = newFilters.product_id;
		if (newFilters.collection_day_id && newFilters.collection_day_id !== 'all') queryParams.collection_day_id = newFilters.collection_day_id;
		if (newFilters.holiday_id && newFilters.holiday_id !== 'all') queryParams.holiday_id = newFilters.holiday_id;
		if (newFilters.status && newFilters.status !== 'all') queryParams.status = newFilters.status;
		if (newFilters.order_type_id && newFilters.order_type_id !== 'all') queryParams.order_type_id = newFilters.order_type_id;

		router.get('/pre-orders/dashboard', queryParams, {
			preserveState: true,
			replace: true,
		});
	};

	return (
		<div className="rounded-lg bg-white p-5 border border-gray-200 shadow-sm mb-6">
			<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 items-end">
				{/* Date From */}
				<div className="space-y-2">
					<Label htmlFor="date_from" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date From</Label>
					<Input type="date" id="date_from" className="h-10 text-sm border-gray-200 focus:ring-blue-500" value={filterValues.date_from} onChange={(e) => handleFilterChange('date_from', e.target.value)} />
				</div>
				{/* Date To */}
				<div className="space-y-2">
					<Label htmlFor="date_to" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date To</Label>
					<Input type="date" id="date_to" className="h-10 text-sm border-gray-200 focus:ring-blue-500" value={filterValues.date_to} onChange={(e) => handleFilterChange('date_to', e.target.value)} />
				</div>
				{/* Branch */}
				<div className="space-y-2">
					<Label htmlFor="branch" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Collection Branch</Label>
					<Select value={filterValues.branch_id} onValueChange={(val) => handleFilterChange('branch_id', val)}>
						<SelectTrigger className="h-10 text-sm border-gray-200"><SelectValue placeholder="All Branches" /></SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Branches</SelectItem>
							{options.branches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
						</SelectContent>
					</Select>
				</div>
				{/* Collection Day */}
				<div className="space-y-2">
					<Label htmlFor="collection_day" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Collection Day</Label>
					<Select value={filterValues.collection_day_id} onValueChange={(val) => handleFilterChange('collection_day_id', val)}>
						<SelectTrigger className="h-10 text-sm border-gray-200"><SelectValue placeholder="All Days" /></SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Days</SelectItem>
							{options.collectionDays.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
						</SelectContent>
					</Select>
				</div>
				{/* Order Type */}
				<div className="space-y-2">
					<Label htmlFor="order_type" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Order Type</Label>
					<Select value={filterValues.order_type_id} onValueChange={(val) => handleFilterChange('order_type_id', val)}>
						<SelectTrigger className="h-10 text-sm border-gray-200"><SelectValue placeholder="All Types" /></SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							{options.orderTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
						</SelectContent>
					</Select>
				</div>
				{/* Product */}
				<div className="space-y-2">
					<Label htmlFor="product" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</Label>
					<Select value={filterValues.product_id} onValueChange={(val) => handleFilterChange('product_id', val)}>
						<SelectTrigger className="h-10 text-sm border-gray-200"><SelectValue placeholder="All Products" /></SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Products</SelectItem>
							{options.products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.product_name}</SelectItem>)}
						</SelectContent>
					</Select>
				</div>
				{/* Status */}
				<div className="space-y-2">
					<Label htmlFor="status" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</Label>
					<Select value={filterValues.status} onValueChange={(val) => handleFilterChange('status', val)}>
						<SelectTrigger className="h-10 text-sm border-gray-200"><SelectValue placeholder="All Statuses" /></SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							{options.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
						</SelectContent>
					</Select>
				</div>
				{/* Holiday */}
				<div className="space-y-2">
					<Label htmlFor="holiday" className="text-xs font-bold text-green-700 uppercase tracking-wider">Holiday</Label>
					<Select value={filterValues.holiday_id} onValueChange={(val) => handleFilterChange('holiday_id', val)}>
						<SelectTrigger className="h-10 text-sm border-green-200 focus:ring-green-500"><SelectValue placeholder="All Holidays" /></SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Holidays</SelectItem>
							{options.holidays.map((h) => <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>)}
						</SelectContent>
					</Select>
				</div>
			</div>
			
			<div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
				{onExportCsv && (
					<Button 
						onClick={onExportCsv} 
						variant="outline"
						className="flex items-center gap-2 border-gray-300 hover:bg-gray-50 text-gray-700"
					>
						<Download className="h-4 w-4" /> 
						Export Summary (CSV)
					</Button>
				)}
			</div>
		</div>
	);
}

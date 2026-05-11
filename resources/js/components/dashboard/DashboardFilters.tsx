import { Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router } from '@inertiajs/react';

interface DashboardFiltersProps {
	filters: {
		date?: string;

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
	disableAllHolidays?: boolean;
}



export default function DashboardFilters({
	filters,
	options,
	onExportCsv,
	disableAllHolidays = false,
}: DashboardFiltersProps) {


	const safeFilters = {
		date: filters?.date || '',

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

	// Handle auto-switching holiday when "All" is disabled (e.g. Break-Even tab)
	useEffect(() => {
		if (disableAllHolidays && filterValues.holiday_id === 'all' && options.holidays.length > 0) {
			handleFilterChange('holiday_id', String(options.holidays[0].id));
		}
	}, [disableAllHolidays]);

	const handleFilterChange = (key: string, value: string) => {
		// When holiday changes, reset collection_day_id so a stale day from
		// another holiday does not linger and make it appear as if only that
		// holiday's data is shown.
		const newFilters = key === 'holiday_id'
			? { ...filterValues, holiday_id: value, collection_day_id: 'all' }
			: { ...filterValues, [key]: value };

		setFilterValues(newFilters);

		// Build query params — omit 'all' values except holiday_id which must
		// always be sent explicitly so it overrides the server-side default.
		const queryParams: Record<string, any> = {};
		if (newFilters.date) queryParams.date = newFilters.date;
		if (newFilters.branch_id && newFilters.branch_id !== 'all') queryParams.branch_id = newFilters.branch_id;
		if (newFilters.product_id && newFilters.product_id !== 'all') queryParams.product_id = newFilters.product_id;
		if (newFilters.collection_day_id && newFilters.collection_day_id !== 'all') queryParams.collection_day_id = newFilters.collection_day_id;
		// Always include holiday_id so 'all' explicitly overrides the backend default
		queryParams.holiday_id = newFilters.holiday_id;
		if (newFilters.status && newFilters.status !== 'all') queryParams.status = newFilters.status;
		if (newFilters.order_type_id && newFilters.order_type_id !== 'all') queryParams.order_type_id = newFilters.order_type_id;

		router.get('/pre-orders/dashboard', queryParams, {
			preserveState: true,
			replace: true,
		});
	};

	return (
		<div className="flex flex-wrap items-end gap-3">
			{/* Collection Branch */}
			<div className="flex flex-col gap-1 min-w-[140px]">
				<Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Branch</Label>
				<Select value={filterValues.branch_id} onValueChange={(val) => handleFilterChange('branch_id', val)}>
					<SelectTrigger className="h-9 text-sm border-gray-200 w-[160px]"><SelectValue placeholder="All Branches" /></SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Branches</SelectItem>
						{options.branches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
					</SelectContent>
				</Select>
			</div>

			{/* Collection Day */}
			<div className="flex flex-col gap-1">
				<Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Collection Day</Label>
				<Select value={filterValues.collection_day_id} onValueChange={(val) => handleFilterChange('collection_day_id', val)}>
					<SelectTrigger className="h-9 text-sm border-gray-200 w-[160px]"><SelectValue placeholder="All Days" /></SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Days</SelectItem>
						{options.collectionDays.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
					</SelectContent>
				</Select>
			</div>

			{/* Platform */}
			<div className="flex flex-col gap-1">
				<Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Platform</Label>
				<Select value={filterValues.order_type_id} onValueChange={(val) => handleFilterChange('order_type_id', val)}>
					<SelectTrigger className="h-9 text-sm border-gray-200 w-[140px]"><SelectValue placeholder="All" /></SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Platforms</SelectItem>
						{options.orderTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
					</SelectContent>
				</Select>
			</div>

			{/* Product */}
			<div className="flex flex-col gap-1">
				<Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Product</Label>
				<Select value={filterValues.product_id} onValueChange={(val) => handleFilterChange('product_id', val)}>
					<SelectTrigger className="h-9 text-sm border-gray-200 w-[150px]"><SelectValue placeholder="All Products" /></SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Products</SelectItem>
						{options.products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.product_name}</SelectItem>)}
					</SelectContent>
				</Select>
			</div>

			{/* Holiday */}
			<div className="flex flex-col gap-1">
				<Label className="text-[10px] font-semibold text-green-700 uppercase tracking-wider">Holiday</Label>
				<Select value={filterValues.holiday_id} onValueChange={(val) => handleFilterChange('holiday_id', val)}>
					<SelectTrigger className="h-9 text-sm border-green-200 w-[150px]"><SelectValue placeholder="All Holidays" /></SelectTrigger>
					<SelectContent>
						{!disableAllHolidays && <SelectItem value="all">All Holidays</SelectItem>}
						{options.holidays.map((h) => <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>)}
					</SelectContent>
				</Select>
			</div>

			{/* Export */}
			{onExportCsv && (
				<div className="flex flex-col gap-1">
					<Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider opacity-0">Export</Label>
					<Button
						onClick={onExportCsv}
						variant="outline"
						size="sm"
						className="h-9 flex items-center gap-2 border-gray-300 hover:bg-gray-50 text-gray-700"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</Button>
				</div>
			)}
		</div>
	);
}

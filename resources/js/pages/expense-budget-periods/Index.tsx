import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePermission } from '@/hooks/user-permissions';
import { toast } from 'sonner';
import TablePagination from '@/components/table-pagination';

type FiscalYearOption = {
	id: number;
	name: string;
};

type FiscalMonthOption = {
	id: number;
	name: string;
	fiscal_year_id: number;
};

type Paginated<T> = {
	data: T[];
	total: number;
	from: number;
	to: number;
	links: any[];
};

type ExpenseBudgetPeriodListItem = {
	id: number;
	period_name: string;
	status: 'active' | 'inactive';
	fiscal_year?: { id: number; name: string };
	fiscal_month?: { id: number; name: string };
};

type PageProps = {
	expenseBudgetPeriods: Paginated<ExpenseBudgetPeriodListItem>;
	fiscalYears: FiscalYearOption[];
	fiscalMonths: FiscalMonthOption[];
	filters: {
		search?: string;
		status?: string;
		fiscal_year_id?: string;
		fiscal_month_id?: string;
		per_page?: number;
	};
};

export default function ExpenseBudgetPeriodsIndex({ 
	expenseBudgetPeriods, 
	fiscalYears = [], 
	fiscalMonths = [],
	filters = {}
}: PageProps) {
	const { can } = usePermission();

	const [search, setSearch] = useState(filters.search ?? '');
	const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(
		(filters.status as 'active' | 'inactive') ?? 'all'
	);
	const [fiscalYearFilter, setFiscalYearFilter] = useState<'all' | string>(filters.fiscal_year_id ?? 'all');
	const [fiscalMonthFilter, setFiscalMonthFilter] = useState<'all' | string>(filters.fiscal_month_id ?? 'all');

	const filteredMonths = useMemo(() => {
		if (fiscalYearFilter === 'all') {
			return fiscalMonths;
		}
		return fiscalMonths.filter((month) => String(month.fiscal_year_id) === fiscalYearFilter);
	}, [fiscalMonths, fiscalYearFilter]);

	function handleSearch(e: React.FormEvent) {
		e.preventDefault();
		const params: Record<string, string> = {};
		if (search) params.search = search;
		if (statusFilter !== 'all') params.status = statusFilter;
		if (fiscalYearFilter !== 'all') params.fiscal_year_id = fiscalYearFilter;
		if (fiscalMonthFilter !== 'all') params.fiscal_month_id = fiscalMonthFilter;
		
		router.get('/expense-budget-periods', params, {
			preserveState: true,
			preserveScroll: true,
		});
	}

	function deleteItem(id: number) {
		if (!confirm('Delete this expense budget period?')) return;
		router.delete(route('expense-budget-periods.destroy', id), {
			preserveScroll: true,
			onSuccess: () => toast.success('Deleted successfully'),
			onError: () => toast.error('Delete failed'),
		});
	}

	return (
		<AppLayout breadcrumbs={[{ title: 'Expense Budget Periods', href: '/expense-budget-periods' }]}>
			<Head title="Expense Budget Periods" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex flex-wrap items-center justify-between gap-4">
						<CardTitle>Expense Budget Periods</CardTitle>
						<form className="ml-auto flex flex-wrap items-center gap-2" onSubmit={handleSearch}>
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search..."
							/>
							<Select
								value={statusFilter}
								onValueChange={(value) => {
									setStatusFilter(value as typeof statusFilter);
								}}
							>
								<SelectTrigger className="w-40">
									<SelectValue placeholder="Filter status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Statuses</SelectItem>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="inactive">Inactive</SelectItem>
								</SelectContent>
							</Select>
							<Select
								value={fiscalYearFilter}
								onValueChange={(value) => {
									setFiscalYearFilter(value);
								}}
							>
								<SelectTrigger className="w-48">
									<SelectValue placeholder="Filter by fiscal year" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Years</SelectItem>
									{fiscalYears.map((year) => (
										<SelectItem key={year.id} value={String(year.id)}>
											{year.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={fiscalMonthFilter}
								onValueChange={(value) => {
									setFiscalMonthFilter(value);
								}}
								disabled={fiscalYearFilter === 'all'}
							>
								<SelectTrigger className="w-48">
									<SelectValue placeholder={fiscalYearFilter === 'all' ? 'Select year first' : 'Filter by month'} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Months</SelectItem>
									{filteredMonths.map((month) => (
										<SelectItem key={month.id} value={String(month.id)}>
											{month.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button type="submit" variant="outline">
								Apply
							</Button>
						</form>
						<CardAction>
							{can('manage expense budget anytime') && (
								<Link href="/expense-budget-periods/create">
									<Button variant="default">Add New</Button>
								</Link>
							)}
						</CardAction>
					</CardHeader>
					<hr />
					<CardContent>
						<Table>
							<TableHeader className="bg-slate-500 dark:bg-slate-700">
								<TableRow>
									<TableHead className="font-bold text-white">#</TableHead>
									<TableHead className="font-bold text-white">Name</TableHead>
									<TableHead className="font-bold text-white">Fiscal Year</TableHead>
									<TableHead className="font-bold text-white">Fiscal Month</TableHead>
									<TableHead className="font-bold text-white">Status</TableHead>
									<TableHead className="font-bold text-white">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{expenseBudgetPeriods.data.map((item, idx) => (
									<TableRow key={item.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
										<TableCell>{(expenseBudgetPeriods.from ?? 0) + idx}</TableCell>
										<TableCell>{item.period_name}</TableCell>
										<TableCell>{item.fiscal_year?.name ?? 'N/A'}</TableCell>
										<TableCell>{item.fiscal_month?.name ?? 'N/A'}</TableCell>
										<TableCell>
											<Badge variant={item.status === 'active' ? 'secondary' : 'outline'}>
												{item.status}
											</Badge>
										</TableCell>
										<TableCell>
											{can('manage expense budget anytime') && (
												<>
													<Link href={`/expense-budget-periods/${item.id}/edit`}>
														<Button variant="outline" size="sm">
															Edit
														</Button>
													</Link>
													<Button
														className="m-2"
														variant="destructive"
														size="sm"
														onClick={() => deleteItem(item.id)}
													>
														Delete
													</Button>
												</>
											)}
										</TableCell>
									</TableRow>
								))}
								{expenseBudgetPeriods.data.length === 0 && (
									<TableRow>
										<TableCell colSpan={6}>No Results Found!</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
					<TablePagination
						from={expenseBudgetPeriods.from}
						to={expenseBudgetPeriods.to}
						total={expenseBudgetPeriods.total}
						links={expenseBudgetPeriods.links}
					/>
				</Card>
			</div>
		</AppLayout>
	);
}

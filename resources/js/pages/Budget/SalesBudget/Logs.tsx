import TablePagination from '@/components/table-pagination';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Sales Budgets', href: '/budget/sales-budget' },
	{ title: 'Action Logs', href: '/budget/sales-budget/logs' },
];

const MONTH_NAMES: Record<number, string> = {
	1: 'ሐምሌ',
	2: 'ነሐሴ',
	3: 'መስከረም',
	4: 'ጥቅምት',
	5: 'ህዳር',
	6: 'ታህሳስ',
	7: 'ጥር',
	8: 'የካቲት',
	9: 'መጋቢት',
	10: 'ሚያዝያ',
	11: 'ግንቦት',
	12: 'ሰኔ',
};

interface Branch {
	id: number;
	name: string;
}

interface LogEntry {
	id: number;
	action: 'created' | 'updated' | 'deleted';
	branch_name: string | null;
	ethiopian_month: number | null;
	ethiopian_year: number | null;
	old_sales_amount: string | null;
	new_sales_amount: string | null;
	old_prev_sales: string | null;
	new_prev_sales: string | null;
	notes: string | null;
	created_at: string;
	user: { name: string };
}

interface Props {
	logs: {
		data: LogEntry[];
		current_page: number;
		last_page: number;
		from: number;
		to: number;
		total: number;
		links: { url: string | null; label: string; active: boolean }[];
	};
	branches: Branch[];
	fiscalYears: FiscalYear[];
	request?: {
		action?: string;
		branch_id?: string;
		fiscal_year_id?: string;
		fiscal_month_id?: string;
	};
}

interface FiscalMonth {
	id: number;
	fiscal_year_id: number;
	name: string;
	efy_month_number: number;
}

interface FiscalYear {
	id: number;
	name: string;
}

const actionColors: Record<string, string> = {
	created: 'bg-green-100 text-green-700 border border-green-200',
	updated: 'bg-blue-100 text-blue-700 border border-blue-200',
	deleted: 'bg-red-100 text-red-700 border border-red-200',
};

export default function SalesBudgetLogs({ logs, branches, fiscalYears, fiscalMonths, request }: Props & { fiscalMonths: FiscalMonth[] }) {
	const [selectedAction, setSelectedAction] = useState(request?.action ?? '');
	const [selectedBranch, setSelectedBranch] = useState(request?.branch_id ? String(request.branch_id) : '');
	const [selectedFiscalYear, setSelectedFiscalYear] = useState(request?.fiscal_year_id ? String(request.fiscal_year_id) : '');
	const [selectedFiscalMonth, setSelectedFiscalMonth] = useState(request?.fiscal_month_id ? String(request.fiscal_month_id) : '');

	useEffect(() => {
		setSelectedAction(request?.action ?? '');
		setSelectedBranch(request?.branch_id ? String(request.branch_id) : '');
		setSelectedFiscalYear(request?.fiscal_year_id ? String(request.fiscal_year_id) : '');
		setSelectedFiscalMonth(request?.fiscal_month_id ? String(request.fiscal_month_id) : '');
	}, [request?.action, request?.branch_id, request?.fiscal_year_id, request?.fiscal_month_id]);

	useEffect(() => {
		if (!request?.fiscal_year_id && request?.fiscal_month_id) {
			const matchedMonth = fiscalMonths.find((month) => month.id.toString() === String(request.fiscal_month_id));
			if (matchedMonth) {
				setSelectedFiscalYear(matchedMonth.fiscal_year_id.toString());
			}
		}
	}, [fiscalMonths, request?.fiscal_month_id, request?.fiscal_year_id]);

	function triggerFilter(paramsOverride = {}) {
		const params: Record<string, string> = {
			...(selectedAction ? { action: selectedAction } : {}),
			...(selectedBranch ? { branch_id: selectedBranch } : {}),
			...(selectedFiscalYear ? { fiscal_year_id: selectedFiscalYear } : {}),
			...(selectedFiscalMonth ? { fiscal_month_id: selectedFiscalMonth } : {}),
			...paramsOverride,
		};
		router.get('/budget/sales-budget/logs', params, { preserveState: true, replace: true });
	}

	function handleActionChange(value: string) {
		setSelectedAction(value);
		triggerFilter({ action: value });
	}

	function handleBranchChange(value: string) {
		setSelectedBranch(value);
		triggerFilter({ branch_id: value });
	}

	function handleFiscalYearChange(value: string) {
		setSelectedFiscalYear(value);
		if (!value) {
			setSelectedFiscalMonth('');
			triggerFilter({ fiscal_year_id: value, fiscal_month_id: '' });
		} else {
			triggerFilter({ fiscal_year_id: value });
		}
	}

	function handleMonthChange(value: string) {
		setSelectedFiscalMonth(value);
		triggerFilter({ fiscal_month_id: value });
	}

	function handleResetFilters() {
		setSelectedAction('');
		setSelectedBranch('');
		setSelectedFiscalYear('');
		setSelectedFiscalMonth('');
		router.get('/budget/sales-budget/logs', {}, { preserveState: true, replace: true });
	}

	const filteredFiscalMonths = selectedFiscalYear ? fiscalMonths.filter((month) => month.fiscal_year_id.toString() === selectedFiscalYear) : [];

	const hasActiveFilters = !!selectedAction || !!selectedBranch || !!selectedFiscalYear || !!selectedFiscalMonth;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Sales Budget Logs" />

			<div className="mx-auto max-w-6xl p-6">
				{/* Header */}
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-xl font-semibold text-gray-800">Sales Budget Action Logs</h1>
						<p className="mt-1 text-sm text-gray-500">Full audit trail of all budget actions</p>
					</div>
					<span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs text-gray-500">{logs.total} total logs</span>
				</div>

				{/* Filters */}
				<div className="mb-6 flex flex-wrap items-center gap-3">
					<select
						value={selectedAction}
						onChange={(e) => handleActionChange(e.target.value)}
						className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						<option value="">All Actions</option>
						<option value="created">Created</option>
						<option value="updated">Updated</option>
						<option value="deleted">Deleted</option>
					</select>

					<select
						value={selectedBranch}
						onChange={(e) => handleBranchChange(e.target.value)}
						className="w-52 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						<option value="">All Branches</option>
						{branches.map((branch) => (
							<option key={branch.id} value={branch.id}>
								{branch.name}
							</option>
						))}
					</select>

					<select
						value={selectedFiscalYear}
						onChange={(e) => handleFiscalYearChange(e.target.value)}
						className="w-52 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						<option value="">All Years</option>
						{fiscalYears.map((year) => (
							<option key={year.id} value={year.id}>
								{year.name}
							</option>
						))}
					</select>

					<select
						value={selectedFiscalMonth}
						onChange={(e) => handleMonthChange(e.target.value)}
						disabled={!selectedFiscalYear}
						className="w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
					>
						<option value="">All Months</option>
						{filteredFiscalMonths.map((month) => (
							<option key={month.id} value={month.id}>
								{month.name}
							</option>
						))}
					</select>

					{hasActiveFilters && (
						<button
							type="button"
							onClick={handleResetFilters}
							className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
						>
							<X className="h-4 w-4" />
							Clear Filters
						</button>
					)}
				</div>

				{/* Table */}
				<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-200 bg-gray-50">
								<th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
								<th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
								<th className="px-4 py-3 text-left font-medium text-gray-600">Branch</th>
								<th className="px-4 py-3 text-left font-medium text-gray-600">Month / Year</th>
								<th className="px-4 py-3 text-left font-medium text-gray-600">Old Amount</th>
								<th className="px-4 py-3 text-left font-medium text-gray-600">New Amount</th>
								<th className="px-4 py-3 text-left font-medium text-gray-600">Done By</th>
								<th className="px-4 py-3 text-left font-medium text-gray-600">Date & Time</th>
							</tr>
						</thead>
						<tbody>
							{logs.data.length === 0 ? (
								<tr>
									<td colSpan={8} className="py-12 text-center text-gray-400">
										No action logs found.
									</td>
								</tr>
							) : (
								logs.data.map((log, index) => (
									<tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
										{/* Index */}
										<td className="px-4 py-3 text-xs text-gray-400">{logs.from + index}</td>

										{/* Action Badge */}
										<td className="px-4 py-3">
											<span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${actionColors[log.action]}`}>
												{log.action}
											</span>
										</td>

										{/* Branch */}
										<td className="px-4 py-3 font-medium text-gray-700">{log.branch_name ?? '—'}</td>

										{/* Month / Year */}
										<td className="px-4 py-3 text-gray-600">
											{log.ethiopian_month ? `${MONTH_NAMES[log.ethiopian_month]} ${log.ethiopian_year}` : '—'}
										</td>

										{/* Old Amount */}
										<td className="px-4 py-3 text-gray-500">
											{log.old_sales_amount
												? `${Number(log.old_sales_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`
												: '—'}
										</td>

										{/* New Amount */}
										<td className="px-4 py-3 font-semibold text-gray-800">
											{log.new_sales_amount
												? `${Number(log.new_sales_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`
												: '—'}
										</td>

										{/* Done By */}
										<td className="px-4 py-3 text-gray-600">{log.user?.name ?? '—'}</td>

										{/* Date & Time */}
										<td className="px-4 py-3 text-xs text-gray-400">
											{new Date(log.created_at).toLocaleString('en-US', {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
											})}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{logs.last_page > 1 && <TablePagination total={logs.total} from={logs.from} to={logs.to} links={logs.links} />}
			</div>
		</AppLayout>
	);
}


import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Sales Budgets', href: '/budget/sales-budget' },
	{ title: 'Add New Budget', href: '/budget/sales-budget/create' },
];

interface Branch {
	id: number;
	name: string;
}

interface FiscalYear {
	id: number;
	name: string;
	gregorian_start_date: string;
	gregorian_end_date: string;
}

interface FiscalMonth {
	id: number;
	fiscal_year_id: number;
	name: string;
	efy_month_number: number;
}

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

interface BudgetRow {
	branch_id: number;
	branch_name: string;
	prev_expense_budget: number;
	prev_month_name: string;
	prev_year?: string | null;
	sales_amount: string;
	existing_budget_id: number | null;
	loading: boolean;
}

interface Props {
	branches: Branch[];
	fiscalYears: FiscalYear[];
	fiscalMonths: FiscalMonth[];
	monthNames?: Record<number, string>;
}

export default function SalesBudgetCreate({ branches, fiscalYears, fiscalMonths, monthNames }: Props) {
	const { flash } = usePage<{ flash: { message?: string; error?: string } }>().props;

	// Find current fiscal year based on today's date
	function getCurrentFiscalYear() {
		const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
		const current = fiscalYears.find((fy) => {
			// We need gregorian_start_date and gregorian_end_date
			// These come from the controller
			return (fy as any).gregorian_start_date <= today && (fy as any).gregorian_end_date >= today;
		});
		// Fallback to first fiscal year if none found
		return current ?? fiscalYears[0];
	}

	const currentYear = getCurrentFiscalYear();
	const [selectedFiscalYearId, setSelectedFiscalYearId] = useState(currentYear ? currentYear.id.toString() : '');
	const [selectedFiscalMonthId, setSelectedFiscalMonthId] = useState('');
	const [ethiopianYear, setEthiopianYear] = useState(currentYear ? currentYear.name.replace('EFY ', '') : '');
	const [ethiopianMonth, setEthiopianMonth] = useState('');
	const [editingBudgetCount, setEditingBudgetCount] = useState(0);
	const [rows, setRows] = useState<BudgetRow[]>([]);
	const [processing, setProcessing] = useState(false);

	const filteredFiscalMonths = useMemo(
		() => (selectedFiscalYearId ? fiscalMonths.filter((month) => month.fiscal_year_id.toString() === selectedFiscalYearId) : fiscalMonths),
		[fiscalMonths, selectedFiscalYearId],
	);

	const selectedFiscalMonth = useMemo(
		() => fiscalMonths.find((month) => month.id.toString() === selectedFiscalMonthId),
		[fiscalMonths, selectedFiscalMonthId],
	);

	const selectedMonthNumber = selectedFiscalMonth?.efy_month_number ?? null;
	const selectedMonthLabel = selectedMonthNumber
		? monthNames?.[selectedMonthNumber] ?? MONTH_NAMES[selectedMonthNumber] ?? selectedFiscalMonth?.name ?? ''
		: '';
	const previousMonthNumber = selectedMonthNumber ? (selectedMonthNumber === 1 ? 12 : selectedMonthNumber - 1) : null;
	const previousMonthLabel = previousMonthNumber
		? monthNames?.[previousMonthNumber] ?? MONTH_NAMES[previousMonthNumber] ?? ''
		: '';

	function buildInitialRows() {
		return branches.map((branch) => ({
			branch_id: branch.id,
			branch_name: branch.name,
			prev_expense_budget: 0,
			prev_month_name: '',
			prev_year: null,
			sales_amount: '',
			existing_budget_id: null,
			loading: false,
		}));
	}

	useEffect(() => {
		if (flash?.message) toast.success(flash.message);
		if (flash?.error) toast.error(flash.error);
	}, [flash]);

	// Initialize rows from all branches
	useEffect(() => {
		setRows(buildInitialRows());
	}, [branches]);

	// When fiscal year changes → update ethiopian year
	function handleFiscalYearChange(id: string) {
		setSelectedFiscalYearId(id);
		const fy = fiscalYears.find((f) => f.id.toString() === id);
		if (fy) {
			setEthiopianYear(fy.name.replace('EFY ', ''));
		}
		setSelectedFiscalMonthId('');
		setEthiopianMonth('');
		setEditingBudgetCount(0);
		setRows(buildInitialRows());
	}

	function handleFiscalMonthChange(id: string) {
		setSelectedFiscalMonthId(id);

		const month = fiscalMonths.find((m) => m.id.toString() === id);
		const year = fiscalYears.find((fy) => fy.id.toString() === selectedFiscalYearId);

		if (month) {
			setEthiopianMonth(month.efy_month_number.toString());
		}

		if (year) {
			setEthiopianYear(year.name.replace('EFY ', ''));
		}
	}

	// Load previous expense budgets and any existing budgets for the selected period
	async function loadPeriodData(fiscalMonthId: string, year: string) {
		if (!fiscalMonthId || !year) return;

		// Set all rows to loading
		setRows((prev) => prev.map((r) => ({ ...r, loading: true })));

		try {
			const response = await fetch(`/budget/sales-budget/period-data?fiscal_year_id=${selectedFiscalYearId}&fiscal_month_id=${fiscalMonthId}`);
			const data = await response.json();
			const updated = Array.isArray(data.rows) ? data.rows : [];
			setRows(updated);
			setEditingBudgetCount(updated.filter((row: BudgetRow) => row.existing_budget_id !== null).length);
		} catch {
			setRows(buildInitialRows());
			setEditingBudgetCount(0);
		}
	}

	useEffect(() => {
		if (!selectedFiscalYearId || !selectedFiscalMonthId) return;

		let cancelled = false;

		(async () => {
			const year = fiscalYears.find((fy) => fy.id.toString() === selectedFiscalYearId);
			if (!year) return;

			await loadPeriodData(selectedFiscalMonthId, year.name.replace('EFY ', ''));
			if (cancelled) return;
		})();

		return () => {
			cancelled = true;
		};
	}, [selectedFiscalYearId, selectedFiscalMonthId, fiscalYears, branches]);

	// Update sales amount for a row
	function handleAmountChange(branchId: number, value: string) {
		setRows((prev) => prev.map((r) => (r.branch_id === branchId ? { ...r, sales_amount: value } : r)));
	}

	// Calculate total
	const total = useMemo(() => {
		return rows.reduce((sum, r) => sum + (parseFloat(r.sales_amount) || 0), 0);
	}, [rows]);

	// Submit
	function handleSubmit() {
		if (!selectedFiscalYearId || !selectedFiscalMonthId || !ethiopianYear || !ethiopianMonth) {
			toast.error('Please select fiscal year and fiscal month.');
			return;
		}
		const hasAtLeastOne = rows.some((r) => r.sales_amount !== '');
		if (!hasAtLeastOne) {
			toast.error('Please fill in sales amount for at least one branch.');
			return;
		}

		setProcessing(true);
		router.post(
			'/budget/sales-budget',
			{
				fiscal_year_id: selectedFiscalYearId,
				fiscal_month_id: selectedFiscalMonthId,
				ethiopian_year: ethiopianYear,
				ethiopian_month: ethiopianMonth,
				budgets: rows.map((r) => ({
					budget_id: r.existing_budget_id,
					branch_id: r.branch_id,
					sales_amount: r.sales_amount,
					prev_expense_budget: r.prev_expense_budget,
				})),
			},
			{
				onFinish: () => setProcessing(false),
			},
		);
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Add New Sales Budget" />

			<div className="mx-auto max-w-5xl p-6">
				{/* Page Header */}
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-xl font-semibold text-gray-800">Add New Sales Budget</h1>
						<p className="mt-1 text-sm text-gray-500">Fill in the monthly sales budget for all branches</p>
					</div>
					{/* <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600">New Voucher</span> */}
				</div>

				{/* Form Card */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					{/* Top Fields — 2 columns only */}
					<div className="mb-6 grid grid-cols-2 gap-4">
						{/* Fiscal Year Dropdown */}
						<div>
							<label className="mb-1.5 block text-sm font-medium text-gray-700">
								Fiscal Year <span className="text-red-500">*</span>
							</label>
							<select
								value={selectedFiscalYearId}
								onChange={(e) => handleFiscalYearChange(e.target.value)}
								className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
							>
								<option value="">Select fiscal year</option>
								{fiscalYears.map((fy) => (
									<option key={fy.id} value={fy.id}>
										{fy.name}
									</option>
								))}
							</select>
						</div>

						{/* Month Dropdown */}
						<div>
							<label className="mb-1.5 block text-sm font-medium text-gray-700">
								Fiscal Month <span className="text-red-500">*</span>
							</label>
							<select
								value={selectedFiscalMonthId}
								onChange={(e) => handleFiscalMonthChange(e.target.value)}
								disabled={!selectedFiscalYearId}
								className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
							>
								<option value="">{selectedFiscalYearId ? 'Select fiscal month' : 'Select fiscal year first'}</option>
								{filteredFiscalMonths.map((month) => (
									<option key={month.id} value={month.id}>
										{month.name}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Branches Table */}
					<div className="mb-6 overflow-hidden rounded-lg border border-gray-200">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-gray-200 bg-gray-50">
									<th className="w-8 px-4 py-3 text-left font-medium text-gray-600">#</th>
									<th className="w-1/3 px-4 py-3 text-left font-medium text-gray-600">Branch Name</th>
									<th className="w-1/3 px-4 py-3 text-left font-medium text-gray-600">
										Prev Month ({previousMonthLabel || '—'})
									</th>
									<th className="px-4 py-3 text-left font-medium text-gray-600">
										Current Month ({selectedMonthLabel || '—'})
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((row, index) => (
									<tr key={row.branch_id} className="border-t border-gray-100 hover:bg-gray-50">
										{/* Index */}
										<td className="px-4 py-3 text-xs text-gray-400">{index + 1}</td>

										{/* Branch Name - readonly */}
										<td className="px-4 py-3">
											<input
												type="text"
												value={row.branch_name}
												readOnly
												className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
											/>
										</td>

										{/* Prev Expense - readonly */}
										<td className="px-4 py-3">
											<input
												type="text"
												value={
													row.loading
														? 'Loading...'
														: row.prev_expense_budget.toLocaleString('en-US', {
															minimumFractionDigits: 2,
														})
												}
												readOnly
												className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400"
											/>
										</td>

										{/* Sales Amount - editable */}
										<td className="px-4 py-3">
											{row.loading ? (
												<div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">Loading...</div>
											) : row.existing_budget_id ? (
												<div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
													{row.sales_amount ? Number(row.sales_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
												</div>
											) : (
												<input
													type="number"
													placeholder="0.00"
													value={row.sales_amount}
													onChange={(e) => handleAmountChange(row.branch_id, e.target.value)}
													min="0"
													step="0.01"
													className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
												/>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Footer */}
					<div className="flex items-center justify-between">
						{/* Total */}
						<div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-4 w-4 text-amber-600"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<rect x="4" y="2" width="16" height="20" rx="2" />
								<line x1="8" y1="6" x2="16" y2="6" />
								<line x1="8" y1="10" x2="16" y2="10" />
								<line x1="8" y1="14" x2="12" y2="14" />
							</svg>
							<span className="text-sm font-semibold text-amber-800">
								Total budget: {total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
							</span>
						</div>

						{/* Buttons */}
						<div className="flex items-center gap-3">
							<button
								onClick={() => router.get('/budget/sales-budget')}
								className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								onClick={handleSubmit}
								disabled={processing || !ethiopianMonth}
								className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-4 w-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
									<polyline points="17 21 17 13 7 13 7 21" />
									<polyline points="7 3 7 8 15 8" />
								</svg>
								{processing ? 'Submitting...' : editingBudgetCount > 0 ? 'Update Budgets' : 'Submit Budget'}
							</button>
						</div>
					</div>
				</div>
			</div>
		</AppLayout>
	);
}

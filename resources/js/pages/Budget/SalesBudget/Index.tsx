import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sales Budgets', href: '/budget/sales-budget' }];

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

interface FiscalYear {
	id: number;
	name: string;
}

interface FiscalMonth {
	id: number;
	fiscal_year_id: number;
	name: string;
	efy_month_number: number;
}

interface SalesBudget {
	id: number | null;
	branch: Branch;
	ethiopian_month: number | null;
	ethiopian_year: number | null;
	sales_amount: string | null;
	prev_expense_budget: string | null;
	created_by: { name: string } | null;
	updated_by?: { name: string } | null;
	has_budget: boolean;
}

interface PaginatedSalesBudgets {
	data: SalesBudget[];
	current_page: number;
	last_page: number;
	from: number;
	to: number;
	total: number;
	links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
	budgets: PaginatedSalesBudgets;
	branches: Branch[];
	fiscalYears: FiscalYear[];
	fiscalMonths: FiscalMonth[];
	canModify: boolean;
	request?: {
		branch_id?: string;
		fiscal_year_id?: string;
		fiscal_month_id?: string;
		ethiopian_month?: string;
		show_unbudgeted?: boolean | string;
	};
}

export default function SalesBudgetIndex({ budgets, branches, fiscalYears, fiscalMonths, canModify, request }: Props) {
	const { flash } = usePage<{ flash: { message?: string; error?: string } }>().props;

	const [deleteModal, setDeleteModal] = useState<{
		open: boolean;
		id: number | null;
		branchName: string;
		month: string;
		year: number;
	}>({ open: false, id: null, branchName: '', month: '', year: 0 });

	const [selectedBranch, setSelectedBranch] = useState(request?.branch_id ?? '');
	const [openBranch, setOpenBranch] = useState(false);
	const [selectedFiscalYear, setSelectedFiscalYear] = useState(request?.fiscal_year_id ?? '');
	const [selectedFiscalMonth, setSelectedFiscalMonth] = useState(request?.fiscal_month_id ?? '');
	const [showUnbudgeted, setShowUnbudgeted] = useState(
		request?.show_unbudgeted === true || request?.show_unbudgeted === '1' || request?.show_unbudgeted === 'true',
	);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (flash?.message) toast.success(flash.message);
		if (flash?.error) toast.error(flash.error);
	}, [flash]);

	useEffect(() => {
		setSelectedBranch(request?.branch_id ?? '');
		setSelectedFiscalYear(request?.fiscal_year_id ?? '');
		setSelectedFiscalMonth(request?.fiscal_month_id ?? '');
		setShowUnbudgeted(request?.show_unbudgeted === true || request?.show_unbudgeted === '1' || request?.show_unbudgeted === 'true');
	}, [request?.branch_id, request?.fiscal_year_id, request?.fiscal_month_id, request?.show_unbudgeted]);

	useEffect(() => {
		if (!request?.fiscal_year_id && request?.fiscal_month_id) {
			const matchedMonth = fiscalMonths.find((month) => month.id.toString() === request.fiscal_month_id);
			if (matchedMonth) {
				setSelectedFiscalYear(matchedMonth.fiscal_year_id.toString());
			}
		}
	}, [fiscalMonths, request?.fiscal_month_id, request?.fiscal_year_id]);

	function handleFilterSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const params: Record<string, string> = {};

		if (selectedBranch) params.branch_id = selectedBranch;
		if (selectedFiscalYear) params.fiscal_year_id = selectedFiscalYear;
		if (selectedFiscalMonth) params.fiscal_month_id = selectedFiscalMonth;
		if (showUnbudgeted) params.show_unbudgeted = 'true';

		router.get('/budget/sales-budget', params, { preserveState: true, replace: true });
	}

	function handleResetFilters() {
		setSelectedBranch('');
		setSelectedFiscalYear('');
		setSelectedFiscalMonth('');
		setShowUnbudgeted(false);
		router.get('/budget/sales-budget', {}, { preserveState: true, replace: true });
	}

	function handleFiscalYearChange(value: string) {
		setSelectedFiscalYear(value);
		setSelectedFiscalMonth('');
	}

	function handleBranchSelect(value: string) {
		setSelectedBranch(value);
		setOpenBranch(false);
	}

	const selectedBranchOption = branches.find((branch) => String(branch.id) === selectedBranch);

	const filteredFiscalMonths = selectedFiscalYear ? fiscalMonths.filter((month) => month.fiscal_year_id.toString() === selectedFiscalYear) : [];

	function openDeleteModal(budget: SalesBudget) {
		if (!budget.id || !budget.ethiopian_month || !budget.ethiopian_year) return;
		setDeleteModal({
			open: true,
			id: budget.id,
			branchName: budget.branch.name,
			month: MONTH_NAMES[budget.ethiopian_month],
			year: budget.ethiopian_year,
		});
	}

	function closeDeleteModal() {
		setDeleteModal({ open: false, id: null, branchName: '', month: '', year: 0 });
	}

	function confirmDelete() {
		if (!deleteModal.id) return;
		setDeleting(true);
		router.delete(`/budget/sales-budget/${deleteModal.id}`, {
			onSuccess: () => {
				closeDeleteModal();
				setDeleting(false);
			},
			onError: () => {
				setDeleting(false);
			},
		});
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Sales Budgets" />

			<div className="mx-auto max-w-6xl p-6">
				{/* Header */}
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-xl font-semibold text-gray-800">Sales Budgets</h1>
						<p className="mt-1 text-sm text-gray-500">View and manage monthly sales budgets per branch</p>
					</div>
					{canModify && (
						<Link
							href="/budget/sales-budget/create"
							className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-4 w-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							Add New Budget
						</Link>
					)}
				</div>

				{/* Filter */}
				<form onSubmit={handleFilterSubmit} className="mb-6 flex flex-col gap-3">
					<div className="flex flex-wrap items-center gap-3">
						<Popover open={openBranch} onOpenChange={setOpenBranch}>
							<PopoverTrigger asChild>
								<Button variant="outline" role="combobox" className="h-10 w-52 justify-between font-normal">
									{selectedBranchOption ? selectedBranchOption.name : 'All Branches'}
									<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
								<Command>
									<CommandInput placeholder="Search branches..." />
									<CommandList className="max-h-60">
										<CommandEmpty>No branches found.</CommandEmpty>
										<CommandGroup>
											<CommandItem value="All Branches" onSelect={() => handleBranchSelect('')}>
												<Check className={cn('mr-2 size-4', selectedBranch === '' ? 'opacity-100' : 'opacity-0')} />
												All Branches
											</CommandItem>
											{branches.map((branch) => (
												<CommandItem
													key={branch.id}
													value={branch.name}
													onSelect={() => handleBranchSelect(String(branch.id))}
												>
													<Check className={cn('mr-2 size-4', selectedBranch === String(branch.id) ? 'opacity-100' : 'opacity-0')} />
													{branch.name}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>

						<select
							value={selectedFiscalYear}
							onChange={(e) => handleFiscalYearChange(e.target.value)}
							className="h-10 w-52 appearance-none rounded-lg border border-gray-200 px-3 py-2 text-sm leading-none focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
						>
							<option value="">All Fiscal Years</option>
							{fiscalYears.map((year) => (
								<option key={year.id} value={year.id}>
									{year.name}
								</option>
							))}
						</select>

						<select
							value={selectedFiscalMonth}
							onChange={(e) => setSelectedFiscalMonth(e.target.value)}
							disabled={!selectedFiscalYear}
							className="h-10 w-52 appearance-none rounded-lg border border-gray-200 px-3 py-2 text-sm leading-none focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
						>
							<option value="">All Months</option>
							{filteredFiscalMonths.map((month) => (
								<option key={month.id} value={month.id}>
									{month.name}
								</option>
							))}
						</select>

						<button
							type="submit"
							className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
						>
							Filter
						</button>
						<button
							type="button"
							onClick={handleResetFilters}
							className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
						>
							Reset
						</button>
					</div>

					<label className="flex w-fit items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600">
						<input
							type="checkbox"
							checked={showUnbudgeted}
							onChange={(e) => setShowUnbudgeted(e.target.checked)}
							className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<span>Show unbudgeted branches</span>
					</label>
				</form>

				{/* Table */}
				<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<table className="w-full text-sm">
						<thead className="bg-slate-500 dark:bg-slate-700">
							<tr>
								<th className="px-4 py-3 text-left font-bold text-white">#</th>
								<th className="px-4 py-3 text-left font-bold text-white">Branch</th>
								<th className="px-4 py-3 text-left font-bold text-white">Month</th>
								<th className="px-4 py-3 text-left font-bold text-white">Year</th>
								<th className="px-4 py-3 text-left font-bold text-white">Prev Expense Budget</th>
								<th className="px-4 py-3 text-left font-bold text-white">Sales Budget (ETB)</th>
								<th className="px-4 py-3 text-left font-bold text-white">Created By</th>
								{canModify && <th className="px-4 py-3 text-left font-bold text-white">Actions</th>}
							</tr>
						</thead>
						<tbody>
							{budgets.data.length === 0 ? (
								<tr>
									<td colSpan={canModify ? 8 : 7} className="py-12 text-center text-gray-400">
										No branches found.
									</td>
								</tr>
							) : (
								budgets.data.map((budget, index) => (
									<tr
										key={budget.id ?? `${budget.branch.id}-${budget.ethiopian_month}-${budget.ethiopian_year}-${index}`}
										className={`border-t border-gray-100 odd:bg-slate-100 hover:bg-slate-200 dark:odd:bg-slate-800 ${!budget.has_budget ? 'opacity-60' : ''}`}
									>
										<td className="px-4 py-3 text-xs text-gray-400">{index + 1}</td>
										<td className="px-4 py-3 font-medium text-gray-800">{budget.branch.name}</td>
										<td className="px-4 py-3 text-gray-600">
											{budget.ethiopian_month ? MONTH_NAMES[budget.ethiopian_month] : <span className="text-gray-300">—</span>}
										</td>
										<td className="px-4 py-3 text-gray-600">
											{budget.ethiopian_year ?? <span className="text-gray-300">—</span>}
										</td>
										<td className="px-4 py-3 text-gray-500">
											{budget.has_budget ? (
												`${Number(budget.prev_expense_budget).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`
											) : (
												<span className="text-gray-300 italic">—</span>
											)}
										</td>
										<td className="px-4 py-3 font-semibold text-gray-800">
											{budget.has_budget ? (
												`${Number(budget.sales_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`
											) : (
												<span className="font-normal text-gray-300 italic">Not budgeted</span>
											)}
										</td>

										<td className="px-4 py-3 text-gray-500">
											{budget.created_by?.name ?? <span className="text-gray-300">—</span>}
										</td>

										{canModify && (
											<td className="px-4 py-3">
												{budget.has_budget ? (
													<div className="flex items-center gap-2">
														<Link
															href={`/budget/sales-budget/${budget.id}/edit`}
															className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																className="h-3 w-3"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2"
															>
																<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
																<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
															</svg>
															Edit
														</Link>
														<button
															onClick={() => openDeleteModal(budget)}
															className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																className="h-3 w-3"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2"
															>
																<polyline points="3 6 5 6 21 6" />
																<path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
																<path d="M10 11v6M14 11v6" />
																<path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
															</svg>
															Delete
														</button>
													</div>
												) : (
													<span className="text-xs text-gray-300 italic">Not budgeted</span>
												)}
											</td>
										)}
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{budgets.last_page > 1 && <TablePagination total={budgets.total} from={budgets.from} to={budgets.to} links={budgets.links} />}
			</div>

			{/* Delete Confirmation Modal */}
			{deleteModal.open && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDeleteModal} />

					<div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl duration-200 animate-in fade-in zoom-in-95">
						<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-7 w-7 text-red-600"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<polyline points="3 6 5 6 21 6" />
								<path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
								<path d="M10 11v6M14 11v6" />
								<path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
							</svg>
						</div>

						<h2 className="mb-1 text-center text-lg font-semibold text-gray-800">Delete Sales Budget</h2>

						<p className="mb-2 text-center text-sm text-gray-500">Are you sure you want to delete the budget for</p>

						<div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
							<p className="text-base font-semibold text-gray-800">{deleteModal.branchName}</p>
							<p className="mt-1 text-sm text-gray-500">
								{deleteModal.month} — {deleteModal.year}
							</p>
						</div>

						<p className="mb-6 text-center text-xs text-red-500">⚠️ This action cannot be undone.</p>

						<div className="flex gap-3">
							<button
								onClick={closeDeleteModal}
								disabled={deleting}
								className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={confirmDelete}
								disabled={deleting}
								className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
							>
								{deleting ? (
									<>
										<svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
										</svg>
										Deleting...
									</>
								) : (
									<>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<polyline points="3 6 5 6 21 6" />
											<path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
										</svg>
										Yes, Delete
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</AppLayout>
	);
}

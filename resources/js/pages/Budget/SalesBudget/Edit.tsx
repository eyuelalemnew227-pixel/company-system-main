import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Sales Budgets', href: '/budget/sales-budget' },
	{ title: 'Edit Budget', href: '#' },
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

interface Budget {
	id: number;
	branch: Branch;
	ethiopian_month: number | null;
	ethiopian_year: number | null;
	sales_amount: string | null;
	prev_expense_budget: string | null;
	created_by: { name: string } | null;
	updated_by?: { name: string } | null;
}

interface Props {
	budget: Budget;
	monthNames?: Record<number, string>;
	canModify: boolean;
}

export default function SalesBudgetEdit({ budget, monthNames, canModify }: Props) {
	const { flash } = usePage<{ flash: { message?: string; error?: string } }>().props;
	const [salesAmount, setSalesAmount] = useState(budget.sales_amount ?? '');
	const [processing, setProcessing] = useState(false);

	useEffect(() => {
		if (flash?.message) toast.success(flash.message);
		if (flash?.error) toast.error(flash.error);
	}, [flash]);

	function handleSubmit() {
		if (!canModify) {
			toast.error('You do not have permission to edit budgets.');
			return;
		}

		const value = salesAmount.trim();
		if (value === '') {
			toast.error('Please enter a sales amount.');
			return;
		}

		const parsed = Number(value);
		if (Number.isNaN(parsed) || parsed < 0) {
			toast.error('Sales amount must be a valid non-negative number.');
			return;
		}

		setProcessing(true);
		router.put(
			`/budget/sales-budget/${budget.id}`,
			{
				sales_amount: parsed.toString(),
			},
			{
				onFinish: () => setProcessing(false),
			},
		);
	}

	const monthLabel = budget.ethiopian_month ? (monthNames?.[budget.ethiopian_month] ?? MONTH_NAMES[budget.ethiopian_month] ?? '') : '';

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Edit Sales Budget" />

			<div className="mx-auto max-w-3xl p-6">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-xl font-semibold text-gray-800">Edit Sales Budget</h1>
						<p className="mt-1 text-sm text-gray-500">Update the sales budget for {budget.branch.name}</p>
					</div>
					<span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600">
						Update Record
					</span>
				</div>

				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Branch</p>
							<p className="mt-2 text-sm font-semibold text-gray-800">{budget.branch.name}</p>
						</div>

						<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Period</p>
							<p className="mt-2 text-sm font-semibold text-gray-800">
								{monthLabel} {budget.ethiopian_year ?? ''}
							</p>
						</div>
					</div>

					<div className="mt-6 grid gap-4 md:grid-cols-2">
						<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Previous Expense Budget</p>
							<p className="mt-2 text-sm font-semibold text-gray-800">
								{budget.prev_expense_budget != null && budget.prev_expense_budget !== ''
									? `${Number(budget.prev_expense_budget).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`
									: '—'}
							</p>
						</div>

						<div>
							<label className="mb-1.5 block text-sm font-medium text-gray-700">
								Sales Budget (ETB) <span className="text-red-500">*</span>
							</label>
							<input
								type="number"
								min="0"
								step="0.01"
								value={salesAmount}
								onChange={(e) => setSalesAmount(e.target.value)}
								disabled={!canModify}
								className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
								placeholder="0.00"
							/>
						</div>
					</div>

					<div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
						<div className="text-sm text-gray-500">
							{budget.created_by?.name ? `Created by ${budget.created_by.name}` : 'No creator recorded'}
						</div>

						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => router.get('/budget/sales-budget')}
								className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSubmit}
								disabled={processing || !canModify}
								className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{processing ? 'Saving...' : 'Save Changes'}
							</button>
						</div>
					</div>
				</div>
			</div>
		</AppLayout>
	);
}

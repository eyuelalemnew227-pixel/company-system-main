import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TablePagination from '@/components/table-pagination';
import { Download, FilterX, GraduationCap } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type LinkedForm = { id: number; title: string };
type FiscalOption = { id: number; name: string; fiscal_year_id?: number };
type TrainingTypeOption = { id: number; name: string };

type ResultRow = {
	employee_id: number;
	employee_name: string;
	department_name: string;
	branch_name: string;
	form_id: number;
	form_title: string;
	submission_id: number;
	fiscal_year_id: number | null;
	fiscal_year_name: string | null;
	fiscal_month_id: number | null;
	fiscal_month_name: string;
	score: number | null;
	status: 'pass' | 'fail' | 'not_scored';
	status_label: string;
	next_action: 'na' | 'warning' | 'training' | 'not_scored';
	next_action_label: string;
	training_type_id: number | null;
	training_type_name: string | null;
};

type Summary = {
	rows: number;
	employees: number;
	pass: number;
	fail: number;
	warning: number;
	training: number;
	not_scored: number;
};

type Filters = {
	search: string;
	form_id: string;
	status: string;
	next_action: string;
	fiscal_year_id: string;
	fiscal_month_id: string;
};

type PageState = 'ready' | 'missing_kpi' | 'no_forms';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Form', href: '/forms' },
	{ title: 'Evaluation Results', href: '/forms/evaluation-results' },
];

function statusClass(status: ResultRow['status']) {
	if (status === 'pass') return 'bg-green-100 text-green-800 border-green-200';
	if (status === 'fail') return 'bg-red-100 text-red-800 border-red-200';
	return 'bg-gray-100 text-gray-700 border-gray-200';
}

function actionClass(action: ResultRow['next_action']) {
	if (action === 'na') return 'bg-green-50 text-green-800 border-green-200';
	if (action === 'warning') return 'bg-amber-100 text-amber-900 border-amber-200';
	if (action === 'training') return 'bg-red-50 text-red-800 border-red-200';
	return 'bg-gray-100 text-gray-700 border-gray-200';
}

export default function EvaluationResults({
	kpiName,
	pageState,
	linkedForms = [],
	rows,
	summary,
	trainingTypes = [],
	fiscalYears = [],
	fiscalMonths = [],
	filters,
}: {
	kpiName: string;
	pageState: PageState;
	linkedForms: LinkedForm[];
	rows: {
		data: ResultRow[];
		total: number;
		from: number;
		to: number;
		links: any[];
	};
	summary: Summary;
	trainingTypes: TrainingTypeOption[];
	fiscalYears: FiscalOption[];
	fiscalMonths: FiscalOption[];
	filters: Filters;
}) {
	const { flash } = usePage<{ flash: { message?: string } }>().props;
	const [searchInput, setSearchInput] = useState(filters.search);
	const [editRow, setEditRow] = useState<ResultRow | null>(null);

	const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
		employee_id: '',
		form_id: '',
		fiscal_year_id: '',
		fiscal_month_id: '',
		next_action: 'na',
		training_type_id: '',
	});

	useEffect(() => {
		if (flash?.message) toast.success(flash.message);
	}, [flash?.message]);

	useEffect(() => {
		setSearchInput(filters.search);
	}, [filters.search]);

	const monthsForYear = useMemo(() => {
		if (filters.fiscal_year_id === 'all') return fiscalMonths;
		return fiscalMonths.filter((month) => String(month.fiscal_year_id) === filters.fiscal_year_id);
	}, [fiscalMonths, filters.fiscal_year_id]);

	function applyFilters(next: Partial<Filters>) {
		const params: Record<string, string> = {
			search: next.search ?? filters.search,
			form_id: next.form_id ?? filters.form_id,
			status: next.status ?? filters.status,
			next_action: next.next_action ?? filters.next_action,
			fiscal_year_id: next.fiscal_year_id ?? filters.fiscal_year_id,
			fiscal_month_id: next.fiscal_month_id ?? filters.fiscal_month_id,
		};

		router.get('/forms/evaluation-results', params, {
			preserveState: true,
			preserveScroll: true,
			replace: true,
		});
	}

	function resetFilters() {
		router.get(
			'/forms/evaluation-results',
			{
				search: '',
				form_id: 'all',
				status: 'all',
				next_action: 'all',
				fiscal_year_id: 'all',
				fiscal_month_id: 'all',
			},
			{ preserveState: true, preserveScroll: true, replace: true },
		);
	}

	function exportCsv() {
		const params = new URLSearchParams({
			search: filters.search,
			form_id: filters.form_id,
			status: filters.status,
			next_action: filters.next_action,
			fiscal_year_id: filters.fiscal_year_id,
			fiscal_month_id: filters.fiscal_month_id,
			export: 'csv',
		});
		window.location.href = `/forms/evaluation-results?${params.toString()}`;
	}

	function openEditDialog(row: ResultRow) {
		if (!row.fiscal_year_id || !row.fiscal_month_id) return;
		clearErrors();
		setEditRow(row);
		setData({
			employee_id: String(row.employee_id),
			form_id: String(row.form_id),
			fiscal_year_id: String(row.fiscal_year_id),
			fiscal_month_id: String(row.fiscal_month_id),
			next_action: row.next_action,
			training_type_id: row.training_type_id ? String(row.training_type_id) : '',
		});
	}

	function closeEditDialog() {
		setEditRow(null);
		reset();
		clearErrors();
	}

	function submitEdit(e: React.FormEvent) {
		e.preventDefault();
		put('/forms/evaluation-results/override', {
			preserveScroll: true,
			onSuccess: () => closeEditDialog(),
		});
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Evaluation Results" />
			<div className="mx-auto max-w-[90rem] space-y-6 pb-12">
				<div>
					<h2 className="text-2xl font-bold tracking-tight text-amber-900">Evaluation Results</h2>
					<p className="text-muted-foreground">
						Employees scored on forms linked to <span className="font-medium text-gray-800">{kpiName}</span>.
						Pass is 75 or above. A fail from 60 to 74.9 is a warning. Below 60 is training. Next action
						defaults to NA and can be edited per row.
					</p>
				</div>

				{pageState === 'missing_kpi' && (
					<div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-8 text-center">
						<GraduationCap className="mx-auto mb-3 h-10 w-10 text-amber-500" />
						<h3 className="text-lg font-medium text-gray-900">KPI not found</h3>
						<p className="mx-auto mt-1 max-w-xl text-gray-600">
							Add a KPI Library entry named "{kpiName}", then link the assessment forms to it.
						</p>
						<Button asChild className="mt-4" variant="outline">
							<Link href="/kpi-libraries">Open KPI Library</Link>
						</Button>
					</div>
				)}

				{pageState === 'no_forms' && (
					<div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-8 text-center">
						<GraduationCap className="mx-auto mb-3 h-10 w-10 text-amber-500" />
						<h3 className="text-lg font-medium text-gray-900">No forms linked</h3>
						<p className="mx-auto mt-1 max-w-xl text-gray-600">
							"{kpiName}" exists, but it is not linked to any form yet.
						</p>
						<Button asChild className="mt-4" variant="outline">
							<Link href="/kpi-libraries">Link forms in KPI Library</Link>
						</Button>
					</div>
				)}

				{pageState === 'ready' && (
					<>
						<div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
							{[
								['Rows', summary.rows],
								['Employees', summary.employees],
								['Pass', summary.pass],
								['Fail', summary.fail],
								['Warning', summary.warning],
								['Training', summary.training],
								['Not scored', summary.not_scored],
							].map(([label, value]) => (
								<div key={String(label)} className="rounded-lg border bg-white px-4 py-3">
									<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
									<p className="mt-1 text-2xl font-bold text-amber-950">{value}</p>
								</div>
							))}
						</div>

						<div className="flex flex-col gap-3 rounded-lg border bg-white p-4 lg:flex-row lg:flex-wrap lg:items-center">
							<form
								className="lg:max-w-xs"
								onSubmit={(e) => {
									e.preventDefault();
									applyFilters({ search: searchInput });
								}}
							>
								<Input
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
									placeholder="Search employee or department"
								/>
							</form>
							<Select value={filters.form_id} onValueChange={(value) => applyFilters({ form_id: value })}>
								<SelectTrigger className="lg:w-56">
									<SelectValue placeholder="Form" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All linked forms</SelectItem>
									{linkedForms.map((form) => (
										<SelectItem key={form.id} value={String(form.id)}>
											{form.title}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={filters.status} onValueChange={(value) => applyFilters({ status: value })}>
								<SelectTrigger className="lg:w-40">
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All statuses</SelectItem>
									<SelectItem value="pass">Pass</SelectItem>
									<SelectItem value="fail">Fail</SelectItem>
									<SelectItem value="not_scored">Not scored</SelectItem>
								</SelectContent>
							</Select>
							<Select
								value={filters.next_action}
								onValueChange={(value) => applyFilters({ next_action: value })}
							>
								<SelectTrigger className="lg:w-44">
									<SelectValue placeholder="Next action" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All actions</SelectItem>
									<SelectItem value="na">NA</SelectItem>
									<SelectItem value="warning">Warning</SelectItem>
									<SelectItem value="training">Training</SelectItem>
									<SelectItem value="not_scored">Not scored</SelectItem>
								</SelectContent>
							</Select>
							<Select
								value={filters.fiscal_year_id}
								onValueChange={(value) => applyFilters({ fiscal_year_id: value, fiscal_month_id: 'all' })}
							>
								<SelectTrigger className="lg:w-44">
									<SelectValue placeholder="Fiscal year" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All years</SelectItem>
									{fiscalYears.map((year) => (
										<SelectItem key={year.id} value={String(year.id)}>
											{year.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={filters.fiscal_month_id}
								onValueChange={(value) => applyFilters({ fiscal_month_id: value })}
							>
								<SelectTrigger className="lg:w-44">
									<SelectValue placeholder="Fiscal month" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All months</SelectItem>
									{monthsForYear.map((month) => (
										<SelectItem key={month.id} value={String(month.id)}>
											{month.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button type="button" variant="ghost" onClick={resetFilters} className="text-gray-600">
								<FilterX className="mr-2 h-4 w-4" /> Reset
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={exportCsv}
								disabled={summary.rows === 0}
								className="lg:ml-auto"
							>
								<Download className="mr-2 h-4 w-4" /> Export CSV
							</Button>
						</div>

						<div className="overflow-hidden rounded-lg border bg-white">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Branch</TableHead>
										<TableHead>Department</TableHead>
										<TableHead>Employee Name</TableHead>
										<TableHead>Form</TableHead>
										<TableHead>Fiscal month</TableHead>
										<TableHead className="text-right">Score</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Next action</TableHead>
										<TableHead>Training type</TableHead>
										<TableHead />
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.data.length === 0 ? (
										<TableRow>
											<TableCell colSpan={10} className="py-12 text-center text-gray-500">
												{summary.rows === 0
													? 'No employees have an assessment matching these filters.'
													: 'No rows match these filters.'}
											</TableCell>
										</TableRow>
									) : (
										rows.data.map((row) => (
											<TableRow
												key={`${row.employee_id}-${row.form_id}-${row.fiscal_month_id ?? 'none'}-${row.submission_id}`}
											>
												<TableCell>{row.branch_name}</TableCell>
												<TableCell>{row.department_name}</TableCell>
												<TableCell className="font-medium text-gray-900">{row.employee_name}</TableCell>
												<TableCell>{row.form_title}</TableCell>
												<TableCell>
													<div className="flex flex-col">
														<span>{row.fiscal_month_name}</span>
														{row.fiscal_year_name && (
															<span className="text-xs text-muted-foreground">
																{row.fiscal_year_name}
															</span>
														)}
													</div>
												</TableCell>
												<TableCell className="text-right font-semibold">
													{row.score === null ? '—' : `${row.score.toFixed(1)}`}
												</TableCell>
												<TableCell>
													<span
														className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}
													>
														{row.status_label}
													</span>
												</TableCell>
												<TableCell>
													<span
														className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${actionClass(row.next_action)}`}
													>
														{row.next_action_label}
													</span>
												</TableCell>
												<TableCell>{row.training_type_name || '—'}</TableCell>
												<TableCell className="text-right">
													<div className="flex items-center justify-end gap-3">
														{row.fiscal_year_id && row.fiscal_month_id && (
															<button
																type="button"
																className="text-sm font-medium text-amber-800 hover:underline"
																onClick={() => openEditDialog(row)}
															>
																Edit
															</button>
														)}
														<Link
															href={`/submissions/${row.submission_id}`}
															className="text-sm font-medium text-amber-800 hover:underline"
														>
															View
														</Link>
													</div>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>

							{rows.data.length > 0 && (
								<TablePagination total={rows.total} from={rows.from} to={rows.to} links={rows.links} />
							)}
						</div>
					</>
				)}
			</div>

			<Dialog open={!!editRow} onOpenChange={(open) => !open && closeEditDialog()}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Edit Next Action</DialogTitle>
					</DialogHeader>
					<form onSubmit={submitEdit} className="space-y-4">
						<div>
							<p className="text-sm text-muted-foreground">Employee</p>
							<p className="font-medium">{editRow?.employee_name}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Form / Period</p>
							<p className="font-medium">
								{editRow?.form_title} — {editRow?.fiscal_month_name}
								{editRow?.fiscal_year_name ? ` / ${editRow.fiscal_year_name}` : ''}
							</p>
						</div>
						<div>
							<Label htmlFor="next_action">Next action</Label>
							<Select
								value={data.next_action}
								onValueChange={(value) => {
									setData('next_action', value);
									if (value !== 'training') setData('training_type_id', '');
								}}
							>
								<SelectTrigger id="next_action">
									<SelectValue placeholder="Select next action" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="na">NA</SelectItem>
									<SelectItem value="warning">Warning</SelectItem>
									<SelectItem value="training">Training</SelectItem>
									<SelectItem value="not_scored">Not scored</SelectItem>
								</SelectContent>
							</Select>
							<InputError message={errors.next_action} />
						</div>
						<div>
							<Label htmlFor="training_type_id">Training type</Label>
							<Select
								value={data.training_type_id || 'none'}
								onValueChange={(value) => setData('training_type_id', value === 'none' ? '' : value)}
								disabled={data.next_action !== 'training'}
							>
								<SelectTrigger id="training_type_id">
									<SelectValue placeholder="Select training type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None</SelectItem>
									{trainingTypes.map((type) => (
										<SelectItem key={type.id} value={String(type.id)}>
											{type.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<InputError message={errors.training_type_id} />
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={closeEditDialog}>
								Cancel
							</Button>
							<Button type="submit" disabled={processing}>
								Save
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</AppLayout>
	);
}

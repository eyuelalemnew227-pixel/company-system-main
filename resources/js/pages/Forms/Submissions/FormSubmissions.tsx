import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TablePagination from '@/components/table-pagination';
import { Eye, Pencil, Trash2, ArrowLeft, Download, FilterX, BarChart3, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SearchableSelect } from '@/components/ui/searchable-select';

type Option = { id: number | string; name: string };

type SubmissionRow = {
	id: number;
	status: string;
	submitted_by: string;
	created_at: string | null;
	branch_name: string | null;
	employee_name: string | null;
	fiscal_year_id: number | null;
	fiscal_month_id: number | null;
};

type Filters = {
	status: string;
	submitted_by: string;
	branch_id: string;
	employee_id: string;
	fiscal_year_id: string;
	fiscal_month_id: string;
};

type PageProps = {
	form: { id: number; title: string };
	submissions: {
		data: SubmissionRow[];
		total: number;
		from: number;
		to: number;
		links: any[];
	};
	hasBranch: boolean;
	hasEmployee: boolean;
	branchLabel: string;
	employeeLabel: string;
	branchOptions?: Option[];
	employeeOptions?: Option[];
	submitterOptions?: Option[];
	fiscalYears?: { id: number; name: string }[];
	fiscalMonths?: { id: number; fiscal_year_id: number; name: string }[];
	currentFiscalYearId?: number | null;
	currentFiscalMonthId?: number | null;
	filters: Filters;
};

export default function FormSubmissions({
	form,
	submissions,
	hasBranch,
	hasEmployee,
	branchLabel,
	employeeLabel,
	branchOptions = [],
	employeeOptions = [],
	submitterOptions = [],
	fiscalYears = [],
	fiscalMonths = [],
	filters,
}: PageProps) {
	const breadcrumbs: BreadcrumbItem[] = [
		{ title: 'Form', href: '/forms' },
		{ title: 'All Submissions', href: '/submissions' },
		{ title: `${form.title} Records`, href: `/submissions/form/${form.id}` },
	];

	function applyFilters(next: Partial<Filters>) {
		const params: Record<string, string> = {
			status: next.status ?? filters.status,
			submitted_by: next.submitted_by ?? filters.submitted_by,
			branch_id: next.branch_id ?? filters.branch_id,
			employee_id: next.employee_id ?? filters.employee_id,
			fiscal_year_id: next.fiscal_year_id ?? filters.fiscal_year_id,
			fiscal_month_id: next.fiscal_month_id ?? filters.fiscal_month_id,
		};

		router.get(`/submissions/form/${form.id}`, params, {
			preserveState: true,
			preserveScroll: true,
			replace: true,
		});
	}

	function resetFilters() {
		router.get(
			`/submissions/form/${form.id}`,
			{
				status: 'all',
				submitted_by: 'all',
				branch_id: 'all',
				employee_id: 'all',
				fiscal_year_id: 'all',
				fiscal_month_id: 'all',
			},
			{ preserveState: true, preserveScroll: true, replace: true },
		);
	}

	function destroy(id: number) {
		router.delete(`/submissions/${id}`);
	}

	const monthsForYear =
		filters.fiscal_year_id !== 'all'
			? fiscalMonths.filter((fm) => String(fm.fiscal_year_id) === filters.fiscal_year_id)
			: fiscalMonths;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title={`${form.title} Submissions`} />

			<div className="mx-auto max-w-[90rem] space-y-6 pb-12">
				<div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
					<div>
						<div className="mb-1 flex items-center space-x-2 text-sm text-amber-600">
							<Link href="/submissions" className="flex items-center hover:underline">
								<ArrowLeft className="mr-1 h-4 w-4" />
								Back to Directory
							</Link>
						</div>
						<h2 className="text-2xl font-bold tracking-tight text-amber-900">{form.title} Submissions</h2>
						<p className="text-muted-foreground">Manage {submissions.total} collected records for this checklist.</p>
					</div>
					<div className="flex items-center space-x-3">
						<Button asChild variant="outline" className="border-amber-300 text-amber-900 shadow-xs hover:bg-amber-50">
							<Link href={`/submissions/form/${form.id}/tracking`}>
								<BarChart3 className="mr-2 h-4 w-4 text-amber-700" />
								Submission Tracking
							</Link>
						</Button>
						{submissions.total > 0 && (
							<Button asChild variant="outline" className="border-blue-200 text-blue-700 shadow-sm hover:bg-blue-50">
								<a href={`/submissions/form/${form.id}/export`} target="_blank" rel="noreferrer">
									<Download className="mr-2 h-4 w-4" /> Export CSV
								</a>
							</Button>
						)}
					</div>
				</div>

				<div className="rounded-lg border border-amber-900/10 bg-white p-4 shadow-sm">
					<div className="flex flex-wrap items-center gap-3">
						{hasBranch && (
							<SearchableSelect
								value={filters.branch_id}
								onValueChange={(value) => applyFilters({ branch_id: value })}
								placeholder="Branch"
								searchPlaceholder="Search branch..."
								allowAll={true}
								allLabel="All Branches"
								className="w-[180px] bg-gray-50/50"
								options={branchOptions.map((o) => ({ id: String(o.id), name: o.name }))}
							/>
						)}

						{hasEmployee && (
							<SearchableSelect
								value={filters.employee_id}
								onValueChange={(value) => applyFilters({ employee_id: value })}
								placeholder={employeeLabel}
								searchPlaceholder="Search employee..."
								allowAll={true}
								allLabel={`All ${employeeLabel}s`}
								className="w-[180px] bg-gray-50/50"
								options={employeeOptions.map((o) => ({ id: String(o.id), name: o.name }))}
							/>
						)}

						<SearchableSelect
							value={filters.status}
							onValueChange={(value) => applyFilters({ status: value })}
							placeholder="Status"
							searchPlaceholder="Search status..."
							allowAll={true}
							allLabel="All Statuses"
							className="w-[140px] bg-gray-50/50"
							options={[
								{ id: 'pending', name: 'Pending' },
								{ id: 'approved', name: 'Approved' },
								{ id: 'rejected', name: 'Rejected' },
							]}
						/>

						<SearchableSelect
							value={filters.submitted_by}
							onValueChange={(value) => applyFilters({ submitted_by: value })}
							placeholder="Submitted By"
							searchPlaceholder="Search submitter..."
							allowAll={true}
							allLabel="All Submitters"
							className="w-[180px] bg-gray-50/50"
							options={submitterOptions.map((o) => ({ id: String(o.id), name: o.name }))}
						/>

						<SearchableSelect
							value={filters.fiscal_year_id}
							onValueChange={(value) => applyFilters({ fiscal_year_id: value, fiscal_month_id: 'all' })}
							placeholder="Fiscal Year"
							searchPlaceholder="Search year..."
							allowAll={true}
							allLabel="All Fiscal Years"
							className="w-[160px] bg-gray-50/50"
							options={fiscalYears.map((fy) => ({ id: String(fy.id), name: fy.name }))}
						/>

						<SearchableSelect
							value={filters.fiscal_month_id}
							onValueChange={(value) => applyFilters({ fiscal_month_id: value })}
							placeholder="Fiscal Month"
							searchPlaceholder="Search month..."
							allowAll={true}
							allLabel="All Fiscal Months"
							className="w-[160px] bg-gray-50/50"
							options={monthsForYear.map((fm) => ({ id: String(fm.id), name: fm.name }))}
						/>

						<Button variant="ghost" className="text-gray-500 hover:text-amber-700" onClick={resetFilters}>
							<FilterX className="mr-2 h-4 w-4" /> Reset
						</Button>
					</div>
				</div>

				<div className="overflow-hidden rounded-lg border border-amber-900/10 bg-white shadow-sm">
					<Table>
						<TableHeader className="bg-amber-50/50">
							<TableRow>
								<TableHead className="w-[100px] text-center">Record #</TableHead>
								{hasBranch && <TableHead>{branchLabel}</TableHead>}
								{hasEmployee && <TableHead>{employeeLabel}</TableHead>}
								<TableHead>Status</TableHead>
								<TableHead>Submitted By</TableHead>
								<TableHead>Submitted At</TableHead>
								<TableHead className="w-[50px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{submissions.data.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={hasBranch ? (hasEmployee ? 7 : 6) : hasEmployee ? 6 : 5}
										className="py-10 text-center text-muted-foreground"
									>
										No items recorded strictly matching those filter parameters.
									</TableCell>
								</TableRow>
							) : (
								submissions.data.map((sub) => (
									<TableRow key={sub.id} className="transition-colors hover:bg-amber-50/30">
										<TableCell className="text-center font-medium">#{sub.id}</TableCell>
										{hasBranch && (
											<TableCell className="font-medium text-amber-900">{sub.branch_name || '—'}</TableCell>
										)}
										{hasEmployee && (
											<TableCell className="font-semibold text-blue-900">{sub.employee_name || '—'}</TableCell>
										)}
										<TableCell>
											<span
												className={`flex w-fit items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${
													sub.status === 'approved'
														? 'border border-green-200 bg-green-100 text-green-800'
														: sub.status === 'rejected'
															? 'border border-red-200 bg-red-100 text-red-800'
															: sub.status === 'pending'
																? 'border border-amber-200 bg-amber-100 text-amber-800'
																: 'border border-gray-200 bg-gray-100 text-gray-800'
												}`}
											>
												{(sub.status || 'pending').toUpperCase()}
											</span>
										</TableCell>
										<TableCell>
											<span className="font-semibold text-gray-700">{sub.submitted_by}</span>
										</TableCell>
										<TableCell>
											{sub.created_at ? (
												<div className="flex flex-col">
													<span className="text-sm font-medium">
														{new Date(sub.created_at).toLocaleDateString()}
													</span>
													<span className="text-xs text-muted-foreground">
														{new Date(sub.created_at).toLocaleTimeString([], {
															hour: '2-digit',
															minute: '2-digit',
														})}
													</span>
												</div>
											) : (
												'—'
											)}
										</TableCell>
										<TableCell className="text-center">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="icon" className="h-8 w-8">
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-52">
													<DropdownMenuLabel className="text-xs uppercase tracking-wider text-gray-500">
														Actions
													</DropdownMenuLabel>
													<DropdownMenuItem asChild>
														<Link href={`/submissions/${sub.id}`} className="flex cursor-pointer items-center">
															<Eye className="mr-2 h-4 w-4 text-amber-700" /> View
														</Link>
													</DropdownMenuItem>
													<DropdownMenuItem asChild>
														<Link
															href={`/submissions/${sub.id}/edit`}
															className="flex cursor-pointer items-center"
														>
															<Pencil className="mr-2 h-4 w-4 text-blue-700" /> Edit
														</Link>
													</DropdownMenuItem>
													<DropdownMenuItem
														className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
														onClick={() => {
															if (confirm('Are you sure you want to permanently delete this submission?')) {
																destroy(sub.id);
															}
														}}
													>
														<Trash2 className="mr-2 h-4 w-4" /> Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>

					{submissions.data.length > 0 && (
						<TablePagination
							total={submissions.total}
							from={submissions.from}
							to={submissions.to}
							links={submissions.links}
						/>
					)}
				</div>
			</div>
		</AppLayout>
	);
}

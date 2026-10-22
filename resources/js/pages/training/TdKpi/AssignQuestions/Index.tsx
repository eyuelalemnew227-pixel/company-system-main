import InputError from '@/components/input-error';
import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePopup } from '@/hooks/use-popup';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
	type TdKpiAssignEmployee,
	type TdKpiBranchOption,
	type TdKpiFiscalMonthOption,
	type TdKpiFiscalYearOption,
	type TdKpiRoleOption,
} from '@/types/td-kpi-assignment';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'TD KPI', href: '/training/td-kpi/assign-questions' },
	{ title: 'Assign Questions', href: '/training/td-kpi/assign-questions' },
];

type PageProps = {
	employees: {
		data: TdKpiAssignEmployee[];
		total: number;
		from: number;
		to: number;
		links: any[];
	};
	branches: TdKpiBranchOption[];
	departments: Array<{ id: number; name: string }>;
	kpiRoles?: TdKpiRoleOption[];
	assessments?: Array<{ id: number; name: string }>;
	assessmentQuestionCounts?: Record<string | number, number>;
	roleQuestionCounts?: Record<string | number, number>;
	fiscalYears: TdKpiFiscalYearOption[];
	fiscalMonths: TdKpiFiscalMonthOption[];
	currentFiscalYearId?: number | null;
	currentFiscalMonthId?: number | null;
	request?: {
		search?: string;
		branch_id?: string;
		department_id?: string;
		status?: string;
	};
};

export default function AssignQuestionsIndex({
	employees,
	branches,
	departments,
	assessments = [],
	assessmentQuestionCounts = {},
	roleQuestionCounts = {},
	fiscalYears,
	fiscalMonths,
	currentFiscalYearId = null,
	currentFiscalMonthId = null,
	request,
}: PageProps) {
	const { flash } = usePage<{ flash: { message?: string; error?: string } }>().props;
	const { triggerPopup, PopupComponent } = usePopup();
	const { can } = usePermission();
	const [search, setSearch] = useState(request?.search ?? '');
	const [selectedBranch, setSelectedBranch] = useState(request?.branch_id ?? 'all');
	const [selectedDepartment, setSelectedDepartment] = useState(request?.department_id ?? 'all');
	const [selectedStatus, setSelectedStatus] = useState(request?.status ?? 'all');
	const [assignEmployee, setAssignEmployee] = useState<TdKpiAssignEmployee | null>(null);

	const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
		employee_id: '',
		assessment_id: '',
		fiscal_year_id: currentFiscalYearId ? String(currentFiscalYearId) : '',
		fiscal_month_id: currentFiscalMonthId ? String(currentFiscalMonthId) : '',
		question_count: '1',
	});

	const questionCounts = Object.keys(assessmentQuestionCounts).length
		? assessmentQuestionCounts
		: roleQuestionCounts;

	useEffect(() => {
		if (flash?.message) triggerPopup('Success', flash.message, 'success');
		if (flash?.error) triggerPopup('Error', flash.error, 'error');
	}, [flash, triggerPopup]);

	const filteredDepartments = useMemo(() => {
		if (selectedBranch === 'all') return departments;
		const branch = branches.find((item) => String(item.id) === selectedBranch);
		return branch?.departments ?? departments;
	}, [selectedBranch, branches, departments]);

	const monthsForYear = useMemo(() => {
		if (!data.fiscal_year_id) return fiscalMonths;
		return fiscalMonths.filter((month) => String(month.fiscal_year_id) === data.fiscal_year_id);
	}, [fiscalMonths, data.fiscal_year_id]);

	const availableCount = data.assessment_id ? Number(questionCounts[data.assessment_id] ?? 0) : 0;

	function applyFilters(overrides: Record<string, string> = {}) {
		const params: Record<string, string> = {};
		const nextSearch = overrides.search ?? search;
		const nextBranch = overrides.branch_id ?? selectedBranch;
		const nextDepartment = overrides.department_id ?? selectedDepartment;
		const nextStatus = overrides.status ?? selectedStatus;

		if (nextSearch) params.search = nextSearch;
		if (nextBranch !== 'all') params.branch_id = nextBranch;
		if (nextDepartment !== 'all') params.department_id = nextDepartment;
		if (nextStatus !== 'all') params.status = nextStatus;

		router.get('/training/td-kpi/assign-questions', params, { preserveState: true, replace: true });
	}

	function openAssignDialog(employee: TdKpiAssignEmployee) {
		clearErrors();
		setAssignEmployee(employee);
		setData({
			employee_id: String(employee.id),
			assessment_id: '',
			fiscal_year_id: currentFiscalYearId ? String(currentFiscalYearId) : '',
			fiscal_month_id: currentFiscalMonthId ? String(currentFiscalMonthId) : '',
			question_count: '1',
		});
	}

	function closeAssignDialog() {
		setAssignEmployee(null);
		reset();
		clearErrors();
	}

	function submitAssign(e: React.FormEvent) {
		e.preventDefault();
		post('/training/td-kpi/assignments', {
			preserveScroll: true,
			onSuccess: () => closeAssignDialog(),
		});
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Assign TD KPI Questions" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader>
						<div className="mb-4 flex items-start justify-between">
							<CardTitle>Assign Questions</CardTitle>
						</div>
						<div className="flex flex-wrap items-end gap-3">
							<form
								className="flex gap-2"
								onSubmit={(e) => {
									e.preventDefault();
									applyFilters();
								}}
							>
								<Input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search employees..."
									className="max-w-xs"
								/>
								<Button type="submit" variant="outline">
									Search
								</Button>
							</form>
							<Select
								value={selectedBranch}
								onValueChange={(value) => {
									setSelectedBranch(value);
									setSelectedDepartment('all');
									applyFilters({ branch_id: value, department_id: 'all' });
								}}
							>
								<SelectTrigger className="w-[200px]">
									<SelectValue placeholder="Filter by Branch" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Branches</SelectItem>
									{branches.map((branch) => (
										<SelectItem key={branch.id} value={String(branch.id)}>
											{branch.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={selectedDepartment}
								onValueChange={(value) => {
									setSelectedDepartment(value);
									applyFilters({ department_id: value });
								}}
								disabled={selectedBranch === 'all'}
							>
								<SelectTrigger className="w-[200px]">
									<SelectValue placeholder="Filter by Department" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Departments</SelectItem>
									{filteredDepartments.map((dept) => (
										<SelectItem key={dept.id} value={String(dept.id)}>
											{dept.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={selectedStatus}
								onValueChange={(value) => {
									setSelectedStatus(value);
									applyFilters({ status: value });
								}}
							>
								<SelectTrigger className="w-[200px]">
									<SelectValue placeholder="Filter by Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="inactive">Inactive</SelectItem>
									<SelectItem value="terminated">Terminated</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</CardHeader>
					<hr />
					<CardContent>
						<Table>
							<TableHeader className="bg-slate-500 dark:bg-slate-700">
								<TableRow>
									<TableHead className="font-bold text-white">ID</TableHead>
									<TableHead className="font-bold text-white">Employee Code</TableHead>
									<TableHead className="font-bold text-white">Full Name</TableHead>
									<TableHead className="font-bold text-white">Branch</TableHead>
									<TableHead className="font-bold text-white">Department</TableHead>
									<TableHead className="font-bold text-white">Position</TableHead>
									<TableHead className="font-bold text-white">Status</TableHead>
									<TableHead className="font-bold text-white">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{employees.data.map((employee, index) => (
									<TableRow key={employee.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
										<TableCell>{employees.from + index}</TableCell>
										<TableCell>{employee.employee_code}</TableCell>
										<TableCell>
											{employee.first_name} {employee.last_name}
										</TableCell>
										<TableCell>{employee.branch || 'N/A'}</TableCell>
										<TableCell>{employee.department || 'N/A'}</TableCell>
										<TableCell>{employee.position || 'N/A'}</TableCell>
										<TableCell>{employee.status}</TableCell>
										<TableCell>
											{can('training.td_kpi.assignments.create') && (
												<Button variant="outline" size="sm" onClick={() => openAssignDialog(employee)}>
													Assign
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
					{employees.data.length > 0 ? (
						<TablePagination total={employees.total} from={employees.from} to={employees.to} links={employees.links} />
					) : (
						<div className="flex h-full items-center justify-center p-8">No Results Found!</div>
					)}
				</Card>
			</div>

			<Dialog open={!!assignEmployee} onOpenChange={(open) => !open && closeAssignDialog()}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Assign Questions</DialogTitle>
					</DialogHeader>
					<form onSubmit={submitAssign} className="space-y-4">
						<div>
							<Label>Employee</Label>
							<p className="mt-1 text-sm font-medium">
								{assignEmployee
									? `${assignEmployee.first_name} ${assignEmployee.last_name} (${assignEmployee.employee_code})`
									: '-'}
							</p>
						</div>
						<div>
							<Label htmlFor="assessment_id">Assessment</Label>
							<Select value={data.assessment_id} onValueChange={(value) => setData('assessment_id', value)}>
								<SelectTrigger id="assessment_id">
									<SelectValue placeholder="Select assessment" />
								</SelectTrigger>
								<SelectContent>
									{assessments.map((assessment) => (
										<SelectItem key={assessment.id} value={String(assessment.id)}>
											{assessment.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<InputError message={errors.assessment_id} />
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<Label htmlFor="fiscal_year_id">Fiscal Year</Label>
								<Select
									value={data.fiscal_year_id}
									onValueChange={(value) => {
										setData('fiscal_year_id', value);
										setData('fiscal_month_id', '');
									}}
								>
									<SelectTrigger id="fiscal_year_id">
										<SelectValue placeholder="Select year" />
									</SelectTrigger>
									<SelectContent>
										{fiscalYears.map((year) => (
											<SelectItem key={year.id} value={String(year.id)}>
												{year.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<InputError message={errors.fiscal_year_id} />
							</div>
							<div>
								<Label htmlFor="fiscal_month_id">Fiscal Month</Label>
								<Select
									value={data.fiscal_month_id}
									onValueChange={(value) => setData('fiscal_month_id', value)}
								>
									<SelectTrigger id="fiscal_month_id">
										<SelectValue placeholder="Select month" />
									</SelectTrigger>
									<SelectContent>
										{monthsForYear.map((month) => (
											<SelectItem key={month.id} value={String(month.id)}>
												{month.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<InputError message={errors.fiscal_month_id} />
							</div>
						</div>
						<div>
							<Label htmlFor="question_count">Number of Questions</Label>
							<Input
								id="question_count"
								type="number"
								min={1}
								max={Math.max(availableCount, 1)}
								value={data.question_count}
								onChange={(e) => setData('question_count', e.target.value)}
							/>
							<p className="mt-1 text-xs text-muted-foreground">
								{data.assessment_id
									? `${availableCount} active question${availableCount === 1 ? '' : 's'} available for this assessment`
									: 'Select an assessment to see available questions'}
							</p>
							<InputError message={errors.question_count} />
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={closeAssignDialog}>
								Cancel
							</Button>
							<Button type="submit" disabled={processing || !data.assessment_id || availableCount < 1}>
								Assign
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			<PopupComponent />
		</AppLayout>
	);
}

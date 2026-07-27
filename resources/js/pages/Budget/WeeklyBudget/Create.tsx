import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Check, ChevronsUpDown, FileText, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Weekly Budgets', href: '/budget/weekly-budget' },
	{ title: 'Add New Budget', href: '/budget/weekly-budget/create' },
];

type BranchOption = {
	id: number;
	name: string;
	branch_code: string;
};

type DepartmentOption = {
	id: number;
	name: string;
};

type FiscalYearOption = {
	id: number;
	name: string;
	gregorian_start_date: string | null; // YYYY-MM-DD
};

type FiscalMonthOption = {
	id: number;
	name: string;
	fiscal_year_id: number;
};

type WeekOption = {
	weekNumber: number;
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD
	label: string;
	disabled: boolean;
};

type CreateProps = {
	branches: BranchOption[];
	departments: DepartmentOption[];
	fiscalYears: FiscalYearOption[];
	fiscalMonths: FiscalMonthOption[];
	today: string; // Gregorian date from server, e.g. "2026-07-09"
	currentFiscalYearId?: number | null;
	currentFiscalMonthId?: number | null;
	request?: {
		department_id?: string;
		branch_id?: string;
	};
};

function isHeadOfficeBranch(branch: BranchOption | null): boolean {
	if (!branch) {
		return false;
	}

	if (branch.branch_code?.toUpperCase() === 'HO') {
		return true;
	}

	return branch.name.includes('Head Office');
}

function formatBudgetInput(value: string): string {
	const sanitized = value.replace(/[^\d.]/g, '');
	const [integerPart = '', ...decimalParts] = sanitized.split('.');
	const decimalPart = decimalParts.join('').slice(0, 2);
	const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

	if (decimalParts.length > 0) {
		return `${formattedInteger}.${decimalPart}`;
	}

	return formattedInteger;
}

function parseFormattedNumber(value: string): number {
	const cleaned = value.replace(/,/g, '').trim();

	if (cleaned === '' || cleaned === '.') {
		return Number.NaN;
	}

	return Number.parseFloat(cleaned);
}

/**
 * Returns the Monday of the week containing the given date.
 */
function getMondayOfWeek(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay(); // 0=Sun,1=Mon,...,6=Sat
	const diff = day === 0 ? -6 : 1 - day; // offset to Monday
	d.setDate(d.getDate() + diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Returns the fiscal week number for a given Monday,
 * counting from the Monday of the week that contains the fiscal year start date.
 * Week 1 = the first week of the fiscal year.
 */
function getFiscalWeekNumber(monday: Date, fiscalYearStartDate: Date): number {
	// Anchor to the Monday of the week that contains the fiscal year start
	const anchor = getMondayOfWeek(fiscalYearStartDate);
	const diffMs = monday.getTime() - anchor.getTime();
	const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
	return Math.floor(diffDays / 7) + 1;
}

/**
 * Format a Date to YYYY-MM-DD
 */
function toDateString(d: Date): string {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

/**
 * Format a Date as "Month DD" (e.g. "July 13").
 */
function toMonthDayLabel(d: Date): string {
	const months = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December',
	];
	return `${months[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Build the week option for a given Monday, using the fiscal year start date
 * to derive the fiscal week number.
 */
function buildWeekOption(monday: Date, isDisabled: boolean, fiscalYearStartDate: Date): WeekOption {
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);
	const weekNumber = getFiscalWeekNumber(monday, fiscalYearStartDate);

	return {
		weekNumber,
		startDate: toDateString(monday),
		endDate: toDateString(sunday),
		label: `Week ${weekNumber} (${toMonthDayLabel(monday)} – ${toMonthDayLabel(sunday)})`,
		disabled: isDisabled,
	};
}

/**
 * Get available week options based on request type and today's date.
 *
 * Urgent: two options — next week and the week after.
 *   Deadline: Sunday (always open; both stay selectable all week).
 *
 * Normal: two options — next week and the week after.
 *   Deadline: Friday.
 *   Exception: on Saturday or Sunday, the immediate next week is disabled;
 *   only the week after remains selectable.
 */
function getWeekOptions(requestType: string, todayStr: string, fiscalYearStartDate: Date): WeekOption[] {
	if (!requestType) {
		return [];
	}

	const today = new Date(todayStr + 'T00:00:00');
	const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

	const currentMonday = getMondayOfWeek(today);

	// Next week's Monday
	const nextMonday = new Date(currentMonday);
	nextMonday.setDate(currentMonday.getDate() + 7);

	// Week after next's Monday
	const weekAfterNextMonday = new Date(currentMonday);
	weekAfterNextMonday.setDate(currentMonday.getDate() + 14);

    if (requestType === 'urgent') {
        // Monday–Friday: current week + next week; Weekend: only next week
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            return [
                buildWeekOption(currentMonday, false, fiscalYearStartDate),
                buildWeekOption(nextMonday, false, fiscalYearStartDate),
            ];
        } else {
            // Saturday (6) or Sunday (0)
            return [
                buildWeekOption(nextMonday, false, fiscalYearStartDate),
            ];
        }
    }

    if (requestType === 'normal') {
        // Monday–Friday: next week + week after next; Weekend: only week after next
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            return [
                buildWeekOption(nextMonday, false, fiscalYearStartDate),
                buildWeekOption(weekAfterNextMonday, false, fiscalYearStartDate),
            ];
        } else {
            // Saturday (6) or Sunday (0)
            return [
                buildWeekOption(weekAfterNextMonday, false, fiscalYearStartDate),
            ];
        }
    }

	return [];
}

export default function CreateWeeklyBudget({
	branches,
	departments,
	fiscalYears,
	fiscalMonths,
	today,
	currentFiscalYearId,
	currentFiscalMonthId,
	request,
}: CreateProps) {
	const { data, setData, post, processing, errors, clearErrors, setError, transform } = useForm({
		request_type: 'normal',
		branch_id: request?.branch_id || '',
		department_id: request?.department_id || '',
		fiscal_year_id: currentFiscalYearId ? String(currentFiscalYearId) : '',
		fiscal_month_id: currentFiscalMonthId ? String(currentFiscalMonthId) : '',
		week_number: '',
		week_start_date: '',
		week_end_date: '',
		amount: '',
		description: '',
	});

	const [openBranch, setOpenBranch] = useState(false);
	const [openDepartment, setOpenDepartment] = useState(false);
	const [selectedBranch, setSelectedBranch] = useState<BranchOption | null>(
		request?.branch_id ? branches.find((b) => String(b.id) === request.branch_id) || null : null,
	);
	const [selectedDepartment, setSelectedDepartment] = useState<DepartmentOption | null>(
		request?.department_id ? departments.find((d) => String(d.id) === request.department_id) || null : null,
	);

	const isBranchEnabled = useMemo(() => {
		if (!selectedDepartment) return false;
		const name = selectedDepartment.name.toLowerCase();
		return name.includes('operation') || name.includes('hr') || name.includes('human resource');
	}, [selectedDepartment]);

	const filteredFiscalMonths = useMemo(() => {
		if (!data.fiscal_year_id) {
			return fiscalMonths;
		}
		return fiscalMonths.filter((m) => String(m.fiscal_year_id) === data.fiscal_year_id);
	}, [data.fiscal_year_id, fiscalMonths]);

	const weekOptions = useMemo(() => {
		if (!data.request_type || !data.fiscal_month_id || !data.fiscal_year_id) {
			return [];
		}
		const fiscalYear = fiscalYears.find((y) => String(y.id) === data.fiscal_year_id);
		if (!fiscalYear?.gregorian_start_date) {
			return [];
		}
		const fiscalYearStartDate = new Date(fiscalYear.gregorian_start_date + 'T00:00:00');
		return getWeekOptions(data.request_type, today, fiscalYearStartDate);
	}, [data.request_type, data.fiscal_month_id, data.fiscal_year_id, today, fiscalYears]);

	// Reset week selection when request_type or fiscal_month changes
	useEffect(() => {
		setData((prev) => ({
			...prev,
			week_number: '',
			week_start_date: '',
			week_end_date: '',
		}));
	}, [data.request_type, data.fiscal_month_id]);

	function handleBranchSelect(branch: BranchOption) {
		setSelectedBranch(branch);
		setData('branch_id', String(branch.id));
		setOpenBranch(false);
	}

	function handleDepartmentSelect(department: DepartmentOption) {
		setSelectedDepartment(department);
		const name = department.name.toLowerCase();
		const enabled = name.includes('operation') || name.includes('hr') || name.includes('human resource');

		setData((prev) => ({
			...prev,
			department_id: String(department.id),
			branch_id: enabled ? prev.branch_id : '',
		}));

		if (!enabled) {
			setSelectedBranch(null);
		}
		setOpenDepartment(false);
	}

	function handleWeekSelect(value: string) {
		const week = weekOptions.find((w) => w.startDate === value);
		if (week) {
			setData({
				...data,
				week_number: String(week.weekNumber),
				week_start_date: week.startDate,
				week_end_date: week.endDate,
			});
		}
	}

	function handleAmountChange(value: string) {
		setData('amount', formatBudgetInput(value));
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		clearErrors();

		if (!data.request_type) {
			setError('request_type', 'The request type field is required.');
			return;
		}

		if (!data.department_id) {
			setError('department_id', 'The department field is required.');
			return;
		}

		if (isBranchEnabled && !data.branch_id) {
			setError('branch_id', 'The branch field is required for this department.');
			return;
		}

		if (!data.fiscal_year_id) {
			setError('fiscal_year_id', 'The fiscal year field is required.');
			return;
		}

		if (!data.fiscal_month_id) {
			setError('fiscal_month_id', 'The fiscal month field is required.');
			return;
		}

		if (!data.week_number) {
			setError('week_number', 'The budget week date field is required.');
			return;
		}

		const parsedAmount = parseFormattedNumber(data.amount);
		if (!data.amount || Number.isNaN(parsedAmount) || parsedAmount < 0) {
			setError('amount', 'Please enter a valid amount.');
			return;
		}

		if (!data.description || data.description.trim() === '') {
			setError('description', 'The description field is required.');
			return;
		}

		transform((formData) => ({
			...formData,
			amount: parseFormattedNumber(formData.amount),
			department_id: formData.department_id,
			branch_id: isBranchEnabled ? formData.branch_id : null,
		}));

		post('/budget/weekly-budget', {
			preserveScroll: true,
			onSuccess: (page) => {
				const message = (page.props as { flash?: { message?: string } }).flash?.message;
				if (message) {
					toast.success(message);
				}
			},
		});
	}

	function handleCancel() {
		router.visit('/budget/weekly-budget');
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="New Budget" />

			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card className="border shadow-sm">
					<CardHeader className="flex flex-row items-center justify-between border-b pb-4">
						<CardTitle className="flex items-center gap-2 text-lg font-semibold">
							<FileText className="size-5 text-muted-foreground" />
							Submit Weekly Budget
						</CardTitle>
						<Button variant="outline" asChild className="shrink-0">
							<Link href="/budget/weekly-budget">Back to list</Link>
						</Button>
					</CardHeader>

					<CardContent className="pt-6">
						<form onSubmit={handleSubmit} className="space-y-6">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
								{/* Request Type */}

								{/* Department */}
								<div className="space-y-2">
									<Label>
										Department <span className="text-red-500">*</span>
									</Label>
									<Popover open={openDepartment} onOpenChange={setOpenDepartment}>
										<PopoverTrigger asChild>
											<Button variant="outline" role="combobox" className="w-full justify-between font-normal">
												{selectedDepartment ? selectedDepartment.name : 'Select Department'}
												<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
											<Command>
												<CommandInput placeholder="Search departments..." />
												<CommandList className="max-h-60">
													<CommandEmpty>No departments found.</CommandEmpty>
													<CommandGroup>
														{departments.map((department) => (
															<CommandItem
																key={department.id}
																value={department.name}
																onSelect={() => handleDepartmentSelect(department)}
															>
																<Check
																	className={cn(
																		'mr-2 size-4',
																		data.department_id === String(department.id) ? 'opacity-100' : 'opacity-0',
																	)}
																/>
																{department.name}
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
									<InputError message={errors.department_id} />
								</div>

								{/* Branch */}
								<div className="space-y-2">
									<Label>Branch {isBranchEnabled && <span className="text-red-500">*</span>}</Label>
									<Popover open={openBranch} onOpenChange={setOpenBranch}>
										<div className={cn(!isBranchEnabled && 'cursor-not-allowed')}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													role="combobox"
													className="w-full justify-between font-normal"
													disabled={!isBranchEnabled}
												>
													{selectedBranch ? selectedBranch.name : 'Select branch...'}
													<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
												</Button>
											</PopoverTrigger>
										</div>
										<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
											<Command>
												<CommandInput placeholder="Search branches..." />
												<CommandList className="max-h-60">
													<CommandEmpty>No branches found.</CommandEmpty>
													<CommandGroup>
														{branches.map((branch) => (
															<CommandItem
																key={branch.id}
																value={branch.name}
																onSelect={() => handleBranchSelect(branch)}
															>
																<Check
																	className={cn(
																		'mr-2 size-4',
																		data.branch_id === String(branch.id) ? 'opacity-100' : 'opacity-0',
																	)}
																/>
																{branch.name}
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
									<InputError message={errors.branch_id} />
								</div>

								<div className="space-y-2">
									<Label htmlFor="request_type">
										Request Type <span className="text-red-500">*</span>
									</Label>
									<Select
										value={data.request_type}
										onValueChange={(value) =>
											setData({
												...data,
												request_type: value,
												week_number: '',
												week_start_date: '',
												week_end_date: '',
											})
										}
									>
										<SelectTrigger id="request_type">
											<SelectValue placeholder="Select request type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="urgent">Urgent</SelectItem>
											<SelectItem value="normal">Normal</SelectItem>
										</SelectContent>
									</Select>
									<InputError message={errors.request_type} />
								</div>

								{/* Fiscal Year */}
								<div className="space-y-2">
									<Label htmlFor="fiscal_year_id">
										Fiscal Year <span className="text-red-500">*</span>
									</Label>
									<Select
										value={data.fiscal_year_id}
										onValueChange={(value) =>
											setData({
												...data,
												fiscal_year_id: value,
												fiscal_month_id: '',
											})
										}
									>
										<SelectTrigger id="fiscal_year_id">
											<SelectValue placeholder="Select fiscal year" />
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

								{/* Fiscal Month */}
								<div className="space-y-2">
									<Label htmlFor="fiscal_month_id">
										Fiscal Month <span className="text-red-500">*</span>
									</Label>
									<Select
										value={data.fiscal_month_id}
										onValueChange={(value) => setData('fiscal_month_id', value)}
										disabled={!data.fiscal_year_id}
									>
										<SelectTrigger id="fiscal_month_id">
											<SelectValue placeholder={data.fiscal_year_id ? 'Select fiscal month' : 'Select fiscal year first'} />
										</SelectTrigger>
										<SelectContent>
											{filteredFiscalMonths.map((month) => (
												<SelectItem key={month.id} value={String(month.id)}>
													{month.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<InputError message={errors.fiscal_month_id} />
								</div>

								{/* Budget Week */}
								<div className="space-y-2">
									<Label htmlFor="budget_week">
										Budget Week <span className="text-red-500">*</span>
									</Label>
									<Select
										value={data.week_start_date}
										onValueChange={(value) => handleWeekSelect(value)}
										disabled={!data.request_type || !data.fiscal_month_id || weekOptions.length === 0}
									>
										<SelectTrigger id="budget_week">
											<SelectValue
												placeholder={
													!data.request_type
														? 'Select request type first'
														: !data.fiscal_month_id
															? 'Select fiscal month first'
															: 'Select week'
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{weekOptions.map((week) => (
												<SelectItem
													key={week.startDate}
													value={week.startDate}
													disabled={week.disabled}
												>
													{week.label}{week.disabled ? ' (deadline passed)' : ''}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<InputError message={errors.week_number} />
									<InputError message={errors.week_start_date} />
									<InputError message={errors.week_end_date} />
								</div>

								{/* Amount */}
								<div className="space-y-2">
									<Label htmlFor="amount">
										Amount (ETB) <span className="text-red-500">*</span>
									</Label>
									<Input
										id="amount"
										type="text"
										inputMode="decimal"
										placeholder="Enter amount"
										value={data.amount}
										onChange={(e) => handleAmountChange(e.target.value)}
										className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									/>
									<InputError message={errors.amount} />
								</div>

								{/* Description */}
								<div className="space-y-2 md:col-span-1 xl:col-span-2">
									<Label htmlFor="description">
										Description <span className="text-red-500">*</span>
									</Label>
									<Textarea
										id="description"
										placeholder="Description for this budget request..."
										value={data.description}
										onChange={(e) => setData('description', e.target.value)}
										rows={3}
									/>
									<InputError message={errors.description} />
								</div>
							</div>

							<div className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-end">
								<div className="flex items-center gap-3">
									<Button type="button" variant="outline" onClick={handleCancel}>
										Cancel
									</Button>
									<Button type="submit" className="bg-black text-white hover:bg-black/90" disabled={processing}>
										<Save className="mr-2 size-4" />
										Submit Budget
									</Button>
								</div>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}

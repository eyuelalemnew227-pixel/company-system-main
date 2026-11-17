import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';

const requiredFields = [
	{ key: 'branch_id', message: 'The branch field is required.' },
	{ key: 'department_id', message: 'The department field is required.' },
	{ key: 'employee_ids', message: 'Select at least one employee.' },
	{ key: 'training_type_id', message: 'The training type field is required.' },
	{ key: 'requested_on', message: 'The proposed date field is required.' },
	{ key: 'recurring_module_id', message: 'The module field is required.' },
] as const;

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Training Request', href: '/training/requests' },
	{ title: 'New Request', href: '/training/requests/create' },
];

type Option = { id: number; name: string };
type BranchOption = Option & { branch_code?: string | null; departments: Option[] };
type EmployeeOption = { id: number; name: string; branch_id: number | null; department_id: number | null };

export default function TrainingRequestCreate({
	branches = [],
	employees = [],
	trainingTypes = [],
	trainingModules = [],
}: {
	branches: BranchOption[];
	employees: EmployeeOption[];
	trainingTypes: Option[];
	trainingModules: Option[];
}) {
	const sortedTypes = useMemo(
		() => [...trainingTypes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
		[trainingTypes],
	);
	const sortedModules = useMemo(
		() => [...trainingModules].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
		[trainingModules],
	);

	const { data, setData, post, processing, errors } = useForm({
		branch_id: '',
		department_id: '',
		employee_ids: [] as string[],
		training_type_id: '',
		requested_on: '',
		recurring_module_id: '',
		extra_info: '',
	});

	const [openBranch, setOpenBranch] = useState(false);
	const [openDepartment, setOpenDepartment] = useState(false);
	const [openEmployee, setOpenEmployee] = useState(false);
	const [employeeSearch, setEmployeeSearch] = useState('');
	const [activeError, setActiveError] = useState<{ key: string; message: string } | null>(null);

	const selectedBranch = branches.find((branch) => String(branch.id) === data.branch_id) ?? null;
	const departmentOptions = selectedBranch?.departments ?? [];
	const selectedDepartment = departmentOptions.find((department) => String(department.id) === data.department_id) ?? null;
	const employeesReady = Boolean(data.branch_id && data.department_id);

	const filteredEmployees = useMemo(() => {
		if (!data.branch_id || !data.department_id) {
			return [];
		}

		return employees
			.filter(
				(employee) =>
					String(employee.branch_id) === data.branch_id && String(employee.department_id) === data.department_id,
			)
			.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
	}, [employees, data.branch_id, data.department_id]);

	const visibleEmployees = useMemo(() => {
		const query = employeeSearch.trim().toLowerCase();
		if (!query) {
			return filteredEmployees;
		}

		return filteredEmployees.filter((employee) => employee.name.toLowerCase().includes(query));
	}, [filteredEmployees, employeeSearch]);

	const allVisibleSelected =
		visibleEmployees.length > 0 && visibleEmployees.every((employee) => data.employee_ids.includes(String(employee.id)));
	const someVisibleSelected =
		!allVisibleSelected && visibleEmployees.some((employee) => data.employee_ids.includes(String(employee.id)));

	function fieldValue(key: (typeof requiredFields)[number]['key']) {
		if (key === 'employee_ids') {
			return data.employee_ids.length > 0 ? 'selected' : '';
		}

		return String(data[key] ?? '');
	}

	function clearErrorIfFilled(key: string, value: string) {
		setActiveError((current) => (current?.key === key && value.trim() ? null : current));
	}

	function handleBranchSelect(branch: BranchOption) {
		setData((current) => ({
			...current,
			branch_id: String(branch.id),
			department_id: '',
			employee_ids: [],
		}));
		setEmployeeSearch('');
		setOpenBranch(false);
		setActiveError((current) =>
			current && ['branch_id', 'department_id', 'employee_ids'].includes(current.key) ? null : current,
		);
	}

	function handleDepartmentSelect(department: Option) {
		setData((current) => ({
			...current,
			department_id: String(department.id),
			employee_ids: [],
		}));
		setEmployeeSearch('');
		setOpenDepartment(false);
		setActiveError((current) =>
			current && ['department_id', 'employee_ids'].includes(current.key) ? null : current,
		);
	}

	function toggleEmployee(id: number) {
		const value = String(id);
		const employeeIds = data.employee_ids.includes(value)
			? data.employee_ids.filter((employeeId) => employeeId !== value)
			: [...data.employee_ids, value];
		setData('employee_ids', employeeIds);
		if (employeeIds.length > 0) {
			clearErrorIfFilled('employee_ids', 'selected');
		}
	}

	function toggleVisibleEmployees(checked: boolean) {
		const visibleIds = visibleEmployees.map((employee) => String(employee.id));
		const employeeIds = checked
			? Array.from(new Set([...data.employee_ids, ...visibleIds]))
			: data.employee_ids.filter((id) => !visibleIds.includes(id));
		setData('employee_ids', employeeIds);
		if (employeeIds.length > 0) {
			clearErrorIfFilled('employee_ids', 'selected');
		}
	}

	function employeeLabel() {
		if (!employeesReady) {
			return 'Select branch and department first';
		}

		if (data.employee_ids.length === 0) {
			return 'Search and select employees...';
		}

		if (data.employee_ids.length === 1) {
			return employees.find((employee) => String(employee.id) === data.employee_ids[0])?.name ?? '1 employee selected';
		}

		return `${data.employee_ids.length} employees selected`;
	}

	function submit(e: React.FormEvent) {
		e.preventDefault();
		const missing = requiredFields.find((field) => !fieldValue(field.key).trim());
		if (missing) {
			setActiveError({ key: missing.key, message: missing.message });
			return;
		}

		setActiveError(null);
		post('/training/requests', {
			onError: (formErrors) => {
				const field = requiredFields.find((item) => formErrors[item.key]);
				if (field) {
					setActiveError({ key: field.key, message: String(formErrors[field.key]) });
					return;
				}

				const employeeError = Object.entries(formErrors).find(([key]) => key.startsWith('employee_ids'));
				setActiveError(employeeError ? { key: 'employee_ids', message: String(employeeError[1]) } : null);
			},
		});
	}

	const employeeError = activeError?.key === 'employee_ids' ? activeError.message : errors.employee_ids;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="New Training Request" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>New Training Request</CardTitle>
						<CardAction>
							<Link href="/training/requests">
								<Button variant="outline">My Requests</Button>
							</Link>
						</CardAction>
					</CardHeader>
					<hr />
					<CardContent className="pt-6">
						<form onSubmit={submit} className="mx-auto max-w-3xl space-y-4">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label>
										Branch/Head Office <span className="text-red-500">*</span>
									</Label>
									<Popover open={openBranch} onOpenChange={setOpenBranch}>
										<PopoverTrigger asChild>
											<Button variant="outline" role="combobox" className="w-full justify-between font-normal">
												{selectedBranch ? selectedBranch.name : 'Select branch...'}
												<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
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
									<InputError
										message={activeError?.key === 'branch_id' ? activeError.message : errors.branch_id}
									/>
								</div>

								<div className="space-y-2">
									<Label>
										Department <span className="text-red-500">*</span>
									</Label>
									<Popover open={openDepartment} onOpenChange={setOpenDepartment}>
										<div className={cn(!selectedBranch && 'cursor-not-allowed')}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													role="combobox"
													className="w-full justify-between font-normal"
													disabled={!selectedBranch}
												>
													{selectedDepartment ? selectedDepartment.name : 'Select Department'}
													<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
												</Button>
											</PopoverTrigger>
										</div>
										<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
											<Command>
												<CommandInput placeholder="Search departments..." />
												<CommandList className="max-h-60">
													<CommandEmpty>No departments found.</CommandEmpty>
													<CommandGroup>
														{departmentOptions.map((department) => (
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
									<InputError
										message={
											activeError?.key === 'department_id' ? activeError.message : errors.department_id
										}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label>
									Employees <span className="text-red-500">*</span>
								</Label>
								<Popover open={openEmployee} onOpenChange={setOpenEmployee}>
									<div className={cn(!employeesReady && 'cursor-not-allowed')}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												className="w-full justify-between font-normal"
												disabled={!employeesReady}
											>
												<span className="truncate">{employeeLabel()}</span>
												<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
									</div>
									<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
										<Command shouldFilter={false}>
											<CommandInput
												placeholder="Search employees..."
												value={employeeSearch}
												onValueChange={setEmployeeSearch}
											/>
											{visibleEmployees.length > 0 && (
												<div
													className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm"
													onClick={() => toggleVisibleEmployees(!allVisibleSelected)}
												>
													<Checkbox
														checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
														className="pointer-events-none"
													/>
													<span>{employeeSearch.trim() ? 'Select all shown' : 'Select all'}</span>
													<span className="ml-auto text-xs text-muted-foreground">
														{data.employee_ids.length} selected
													</span>
												</div>
											)}
											<CommandList className="max-h-60">
												{visibleEmployees.length === 0 ? (
													<CommandEmpty>
														{filteredEmployees.length === 0
															? 'No employees found for this branch and department.'
															: 'No employees found.'}
													</CommandEmpty>
												) : (
													<CommandGroup>
														{visibleEmployees.map((employee) => {
															const selected = data.employee_ids.includes(String(employee.id));

															return (
																<CommandItem
																	key={employee.id}
																	value={`${employee.name}-${employee.id}`}
																	onSelect={() => toggleEmployee(employee.id)}
																>
																	<Checkbox checked={selected} className="pointer-events-none mr-2" />
																	{employee.name}
																</CommandItem>
															);
														})}
													</CommandGroup>
												)}
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
								<InputError message={employeeError} />
							</div>

							<div>
								<Label htmlFor="training_type_id">Training type</Label>
								<Select
									value={data.training_type_id || undefined}
									onValueChange={(value) => {
										setData('training_type_id', value);
										clearErrorIfFilled('training_type_id', value);
									}}
								>
									<SelectTrigger id="training_type_id">
										<SelectValue placeholder="Select training type" />
									</SelectTrigger>
									<SelectContent>
										{sortedTypes.map((type) => (
											<SelectItem key={type.id} value={String(type.id)}>
												{type.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<InputError message={activeError?.key === 'training_type_id' ? activeError.message : undefined} />
							</div>
							<div>
								<Label htmlFor="requested_on">Proposed date</Label>
								<Input
									id="requested_on"
									type="date"
									value={data.requested_on}
									onChange={(e) => {
										setData('requested_on', e.target.value);
										clearErrorIfFilled('requested_on', e.target.value);
									}}
								/>
								<InputError message={activeError?.key === 'requested_on' ? activeError.message : undefined} />
							</div>
							<div>
								<Label htmlFor="recurring_module_id">Module</Label>
								<Select
									value={data.recurring_module_id || undefined}
									onValueChange={(value) => {
										setData('recurring_module_id', value);
										clearErrorIfFilled('recurring_module_id', value);
									}}
								>
									<SelectTrigger id="recurring_module_id">
										<SelectValue placeholder="Select recurring module" />
									</SelectTrigger>
									<SelectContent>
										{sortedModules.map((module) => (
											<SelectItem key={module.id} value={String(module.id)}>
												{module.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<InputError message={activeError?.key === 'recurring_module_id' ? activeError.message : undefined} />
							</div>
							<div>
								<Label htmlFor="extra_info">Extra info</Label>
								<Textarea
									id="extra_info"
									value={data.extra_info}
									onChange={(e) => setData('extra_info', e.target.value)}
									rows={4}
								/>
								<InputError message={errors.extra_info} />
							</div>
							<div className="pt-2">
								<Button type="submit" disabled={processing}>
									Submit request
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}

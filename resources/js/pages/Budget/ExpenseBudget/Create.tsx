import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { formatEthiopianDate } from '@/lib/ethiopian-calendar';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    ChevronsUpDown,
    ClipboardList,
    Droplet,
    FileText,
    Plus,
    Save,
    Trash2,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Add Expense Budget', href: '/budget/expense-budget/create' },
];

const expenseIconMap: Record<string, LucideIcon> = {
    clipboard: ClipboardList,
    stationery: ClipboardList,
    zap: Zap,
    electricity: Zap,
    droplet: Droplet,
    water: Droplet,
};

type BranchOption = {
    id: number;
    name: string;
    branch_code: string;
};

type DepartmentOption = {
    id: number;
    name: string;
};

type ExpenseItemOption = {
    id: number;
    name: string;
    icon: string | null;
};

type BudgetItemRow = {
    expense_item_id: number | '';
    planned_budget: string;
};

type FiscalYearOption = {
    id: number;
    name: string;
};

type FiscalMonthOption = {
    id: number;
    name: string;
    fiscal_year_id: number;
};

type CreateProps = {
    branches: BranchOption[];
    departments: DepartmentOption[];
    frequentExpenseItems: ExpenseItemOption[];
    otherExpenseItems: ExpenseItemOption[];
    fiscalYears: FiscalYearOption[];
    fiscalMonths: FiscalMonthOption[];
    defaultFiscalYearId: number | null;
    defaultFiscalMonthId: number | null;
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

function resolveExpenseIcon(icon: string | null): LucideIcon {
    if (!icon) {
        return ClipboardList;
    }

    return expenseIconMap[icon.toLowerCase()] ?? ClipboardList;
}

function formatAmount(value: number | null | undefined): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

function parseFormattedNumber(value: string): number {
    const cleaned = value.replace(/,/g, '').trim();

    if (cleaned === '' || cleaned === '.') {
        return Number.NaN;
    }

    return Number.parseFloat(cleaned);
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

function buildInitialItems(frequentExpenseItems: ExpenseItemOption[]): BudgetItemRow[] {
    if (frequentExpenseItems.length === 0) {
        return [{ expense_item_id: '', planned_budget: '' }];
    }

    return frequentExpenseItems.map((item) => ({
        expense_item_id: item.id,
        planned_budget: '',
    }));
}

function getSavedItemIds(items: BudgetItemRow[]): Set<number> {
    return new Set(
        items
            .filter(
                (item) =>
                    typeof item.expense_item_id === 'number' &&
                    item.planned_budget !== '' &&
                    !Number.isNaN(parseFormattedNumber(item.planned_budget)),
            )
            .map((item) => item.expense_item_id as number),
    );
}

function getItemsAfterSave(currentItems: BudgetItemRow[], savedItemIds: Set<number>): BudgetItemRow[] {
    const remaining = currentItems.filter((item) => {
        if (typeof item.expense_item_id === 'number' && savedItemIds.has(item.expense_item_id)) {
            return false;
        }

        if (item.planned_budget !== '') {
            return false;
        }

        return true;
    });

    if (remaining.length === 0) {
        return [{ expense_item_id: '', planned_budget: '' }];
    }

    return remaining;
}

function buildFrequentItemsForScope(
    frequentExpenseItems: ExpenseItemOption[],
    budgetedIds: Set<number>,
): BudgetItemRow[] {
    const items = frequentExpenseItems
        .filter((item) => !budgetedIds.has(item.id))
        .map((item) => ({
            expense_item_id: item.id,
            planned_budget: '',
        }));

    if (items.length === 0) {
        return [{ expense_item_id: '', planned_budget: '' }];
    }

    return items;
}

function buildScopeKey(
    branchId: string,
    departmentId: string,
    fiscalYearId: string,
    fiscalMonthId: string,
): string {
    return `${branchId}|${departmentId}|${fiscalYearId}|${fiscalMonthId}`;
}

function hasCompleteScope(
    branchId: string,
    departmentId: string,
    fiscalYearId: string,
    fiscalMonthId: string,
    headOffice: boolean,
): boolean {
    if (!branchId || !fiscalYearId || !fiscalMonthId) {
        return false;
    }

    return !headOffice || Boolean(departmentId);
}

export default function CreateExpenseBudget({
    branches,
    departments,
    frequentExpenseItems,
    otherExpenseItems,
    fiscalYears,
    fiscalMonths,
    defaultFiscalYearId,
    defaultFiscalMonthId,
}: CreateProps) {
    const now = new Date();
    const ethiopianDate = formatEthiopianDate(now);

    const { data, setData, post, processing, errors, transform, setError, clearErrors } = useForm({
        fiscal_year_id: defaultFiscalYearId ? String(defaultFiscalYearId) : '',
        fiscal_month_id: defaultFiscalMonthId ? String(defaultFiscalMonthId) : '',
        branch_id: '',
        department_id: '',
        items: buildInitialItems(frequentExpenseItems),
    });

    const [openBranch, setOpenBranch] = useState(false);
    const [openDepartment, setOpenDepartment] = useState(false);
    const [openExpenseRow, setOpenExpenseRow] = useState<number | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<BranchOption | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<DepartmentOption | null>(null);
    const [prevBudgets, setPrevBudgets] = useState<Record<number, number | null>>({});
    const [loadingPrevBudget, setLoadingPrevBudget] = useState<Record<number, boolean>>({});
    const [budgetedExpenseItemIds, setBudgetedExpenseItemIds] = useState<Set<number>>(new Set());
    const prevScopeRef = useRef('');
    const activeScopeRef = useRef('');
    const prevFetchKeyRef = useRef('');

    const allExpenseItems = useMemo(
        () => [...frequentExpenseItems, ...otherExpenseItems],
        [frequentExpenseItems, otherExpenseItems],
    );

    const expenseItemMap = useMemo(
        () => new Map(allExpenseItems.map((item) => [item.id, item])),
        [allExpenseItems],
    );

    const isHeadOffice = isHeadOfficeBranch(selectedBranch);

    const filteredFiscalMonths = useMemo(() => {
        if (!data.fiscal_year_id) {
            return fiscalMonths;
        }

        return fiscalMonths.filter((month) => String(month.fiscal_year_id) === data.fiscal_year_id);
    }, [data.fiscal_year_id, fiscalMonths]);

    const totalBudget = useMemo(
        () =>
            data.items.reduce((sum, item) => {
                const value = parseFormattedNumber(item.planned_budget);
                return sum + (Number.isNaN(value) ? 0 : value);
            }, 0),
        [data.items],
    );

    const itemIdsSignature = useMemo(
        () =>
            data.items
                .map((item) => item.expense_item_id)
                .filter((id): id is number => typeof id === 'number')
                .join('|'),
        [data.items],
    );

    const fetchPrevBudget = useCallback(
        async (
            expenseItemId: number,
            branchId: string,
            departmentId: string,
            fiscalYearId: string,
            fiscalMonthId: string,
            headOffice: boolean,
            scopeKey: string,
        ) => {
            if (!branchId || !expenseItemId || !fiscalYearId || !fiscalMonthId) {
                return;
            }

            if (headOffice && !departmentId) {
                return;
            }

            setLoadingPrevBudget((prev) => ({ ...prev, [expenseItemId]: true }));

            try {
                const params = new URLSearchParams({
                    expense_item_id: String(expenseItemId),
                    branch_id: branchId,
                    fiscal_year_id: fiscalYearId,
                    fiscal_month_id: fiscalMonthId,
                });

                if (headOffice && departmentId) {
                    params.set('department_id', departmentId);
                }

                const response = await fetch(`/budget/expense-budget/prev-budget?${params.toString()}`);
                const result = (await response.json()) as { prev_month_budget: number | null };

                if (activeScopeRef.current !== scopeKey) {
                    return;
                }

                setPrevBudgets((prev) => ({
                    ...prev,
                    [expenseItemId]: result.prev_month_budget ?? null,
                }));
            } finally {
                if (activeScopeRef.current === scopeKey) {
                    setLoadingPrevBudget((prev) => ({ ...prev, [expenseItemId]: false }));
                }
            }
        },
        [],
    );

    const fetchBudgetedExpenseItems = useCallback(
        async (
            branchId: string,
            departmentId: string,
            fiscalYearId: string,
            fiscalMonthId: string,
            headOffice: boolean,
            { rebuildItems = false }: { rebuildItems?: boolean } = {},
        ) => {
            const scopeKey = buildScopeKey(branchId, departmentId, fiscalYearId, fiscalMonthId);

            if (!hasCompleteScope(branchId, departmentId, fiscalYearId, fiscalMonthId, headOffice)) {
                if (rebuildItems && activeScopeRef.current === scopeKey) {
                    setBudgetedExpenseItemIds(new Set());
                }

                return;
            }

            const params = new URLSearchParams({
                branch_id: branchId,
                fiscal_year_id: fiscalYearId,
                fiscal_month_id: fiscalMonthId,
            });

            if (headOffice && departmentId) {
                params.set('department_id', departmentId);
            }

            const response = await fetch(`/budget/expense-budget/budgeted-items?${params.toString()}`);
            const result = (await response.json()) as { expense_item_ids: number[] };
            const budgetedIds = new Set(result.expense_item_ids);

            if (activeScopeRef.current !== scopeKey) {
                return;
            }

            setBudgetedExpenseItemIds(budgetedIds);

            if (rebuildItems) {
                setData('items', buildFrequentItemsForScope(frequentExpenseItems, budgetedIds));
            }
        },
        [frequentExpenseItems, setData],
    );

    useEffect(() => {
        transform((formData) => ({
            ...formData,
            items: formData.items
                .map((item: BudgetItemRow, index: number) => ({ item, index }))
                .filter(({ item }) => typeof item.expense_item_id === 'number')
                .map(({ item, index }) => {
                    const parsedBudget =
                        item.planned_budget === '' || item.planned_budget === null
                            ? null
                            : parseFormattedNumber(item.planned_budget);

                    return {
                        expense_item_id: item.expense_item_id,
                        planned_budget: parsedBudget === null || Number.isNaN(parsedBudget) ? null : parsedBudget,
                        prev_month_budget:
                            typeof item.expense_item_id === 'number'
                                ? prevBudgets[item.expense_item_id] ?? null
                                : null,
                    };
                }),
        }));
    }, [transform, prevBudgets]);

    useEffect(() => {
        const scope = buildScopeKey(
            data.branch_id,
            data.department_id,
            data.fiscal_year_id,
            data.fiscal_month_id,
        );

        if (prevScopeRef.current === scope) {
            return;
        }

        activeScopeRef.current = scope;
        prevScopeRef.current = scope;
        setPrevBudgets({});
        setLoadingPrevBudget({});

        if (!data.branch_id) {
            return;
        }

        setData('items', buildInitialItems(frequentExpenseItems));

        const completeScope = hasCompleteScope(
            data.branch_id,
            data.department_id,
            data.fiscal_year_id,
            data.fiscal_month_id,
            isHeadOffice,
        );

        if (!completeScope) {
            setBudgetedExpenseItemIds(new Set());
        }
    }, [
        data.branch_id,
        data.department_id,
        data.fiscal_year_id,
        data.fiscal_month_id,
        isHeadOffice,
        frequentExpenseItems,
        setData,
    ]);

    useEffect(() => {
        fetchBudgetedExpenseItems(
            data.branch_id,
            data.department_id,
            data.fiscal_year_id,
            data.fiscal_month_id,
            isHeadOffice,
            { rebuildItems: true },
        );
    }, [data.branch_id, data.department_id, data.fiscal_year_id, data.fiscal_month_id, isHeadOffice, fetchBudgetedExpenseItems]);

    useEffect(() => {
        if (
            !hasCompleteScope(
                data.branch_id,
                data.department_id,
                data.fiscal_year_id,
                data.fiscal_month_id,
                isHeadOffice,
            )
        ) {
            prevFetchKeyRef.current = '';
            return;
        }

        const scopeKey = buildScopeKey(
            data.branch_id,
            data.department_id,
            data.fiscal_year_id,
            data.fiscal_month_id,
        );
        const fetchKey = `${scopeKey}::${itemIdsSignature}`;

        if (prevFetchKeyRef.current === fetchKey) {
            return;
        }

        const previousFetchKey = prevFetchKeyRef.current;
        prevFetchKeyRef.current = fetchKey;

        const [previousScopeKey = ''] = previousFetchKey.split('::');
        const scopeChanged = previousScopeKey !== scopeKey;

        if (scopeChanged) {
            setPrevBudgets({});
            setLoadingPrevBudget({});
        }

        const previousItemIdsPart = previousFetchKey.includes('::')
            ? previousFetchKey.split('::')[1] ?? ''
            : '';
        const previousItemIds = new Set(
            previousItemIdsPart ? previousItemIdsPart.split('|').map((id) => Number(id)) : [],
        );
        const currentItemIds = itemIdsSignature
            ? itemIdsSignature.split('|').map((id) => Number(id))
            : [];

        const idsToFetch = scopeChanged
            ? currentItemIds
            : currentItemIds.filter((id) => !previousItemIds.has(id));

        idsToFetch.forEach((expenseItemId) => {
            fetchPrevBudget(
                expenseItemId,
                data.branch_id,
                data.department_id,
                data.fiscal_year_id,
                data.fiscal_month_id,
                isHeadOffice,
                scopeKey,
            );
        });
    }, [
        itemIdsSignature,
        data.branch_id,
        data.department_id,
        data.fiscal_year_id,
        data.fiscal_month_id,
        isHeadOffice,
        fetchPrevBudget,
    ]);

    function handleBranchSelect(branch: BranchOption) {
        setSelectedBranch(branch);
        setSelectedDepartment(null);
        setData({
            ...data,
            branch_id: String(branch.id),
            department_id: '',
        });
        setOpenBranch(false);
    }

    function handleDepartmentSelect(department: DepartmentOption) {
        setSelectedDepartment(department);
        setData('department_id', String(department.id));
        setOpenDepartment(false);
    }

    function handleExpenseItemSelect(rowIndex: number, expenseItemId: number) {
        setData(
            'items',
            data.items.map((item, index) =>
                index === rowIndex ? { ...item, expense_item_id: expenseItemId } : item,
            ),
        );
        setOpenExpenseRow(null);
    }

    function handlePlannedBudgetChange(rowIndex: number, value: string) {
        const formattedValue = formatBudgetInput(value);

        setData(
            'items',
            data.items.map((item, index) =>
                index === rowIndex ? { ...item, planned_budget: formattedValue } : item,
            ),
        );
    }

    function addExpenseRow() {
        setData('items', [...data.items, { expense_item_id: '', planned_budget: '' }]);
    }

    function removeExpenseRow(rowIndex: number) {
        setData(
            'items',
            data.items.filter((_, index) => index !== rowIndex),
        );
    }

    function getAvailableExpenseItems(currentRowIndex: number) {
        const selectedIds = new Set(
            data.items
                .filter((_, index) => index !== currentRowIndex)
                .map((item) => item.expense_item_id)
                .filter((id): id is number => typeof id === 'number'),
        );

        return allExpenseItems.filter(
            (item) => !selectedIds.has(item.id) && !budgetedExpenseItemIds.has(item.id),
        );
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        clearErrors();

        if (!data.branch_id) {
            setError('branch_id', 'The branch field is required.');
            return;
        }

        if (isHeadOffice && !data.department_id) {
            setError('department_id', 'The department field is required when the selected branch is Head Office.');
            return;
        }

        const savedItemIds = getSavedItemIds(data.items);
        const itemsSnapshot = data.items;

        post('/budget/expense-budget', {
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => {
                const message = (page.props as { flash?: { message?: string } }).flash?.message;

                if (message) {
                    toast.success(message);
                }

                setBudgetedExpenseItemIds((prev) => new Set([...prev, ...savedItemIds]));
                setData('items', getItemsAfterSave(itemsSnapshot, savedItemIds));
                setPrevBudgets({});
                setLoadingPrevBudget({});

                fetchBudgetedExpenseItems(
                    data.branch_id,
                    data.department_id,
                    data.fiscal_year_id,
                    data.fiscal_month_id,
                    isHeadOffice,
                    { rebuildItems: false },
                );
            },
        });
    }

    function handleCancel() {
        router.visit(document.referrer || '/dashboard');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Expense Budget" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-end">
                    <p className="text-sm text-muted-foreground">{ethiopianDate}</p>
                </div>

                <Card className="border shadow-sm">
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                            <FileText className="size-5 text-muted-foreground" />
                            Expense Budget Details
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                                            <SelectValue
                                                placeholder={
                                                    data.fiscal_year_id ? 'Select fiscal month' : 'Select fiscal year first'
                                                }
                                            />
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

                                <div className="space-y-2">
                                    <Label>
                                        Branch <span className="text-red-500">*</span>
                                    </Label>
                                    <Popover open={openBranch} onOpenChange={setOpenBranch}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between font-normal"
                                            >
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
                                    <InputError message={errors.branch_id} />
                                </div>

                                <div className="space-y-2">
                                    <Label>
                                        Department <span className="text-red-500">*</span>
                                    </Label>
                                    <Popover open={openDepartment} onOpenChange={setOpenDepartment}>
                                        <div className={cn(!isHeadOffice && 'cursor-not-allowed')}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className="w-full justify-between font-normal"
                                                    disabled={!isHeadOffice}
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
                            </div>

                            <div className="overflow-hidden rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-100/80 hover:bg-slate-100/80">
                                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Expense Item
                                            </TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Prev. Month Budget (ETB)
                                            </TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Planned Budget (ETB)
                                            </TableHead>
                                            <TableHead className="w-20 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Action
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.items.map((row, rowIndex) => {
                                            const expenseItem =
                                                typeof row.expense_item_id === 'number'
                                                    ? expenseItemMap.get(row.expense_item_id)
                                                    : undefined;
                                            const ExpenseIcon = expenseItem ? resolveExpenseIcon(expenseItem.icon) : null;
                                            const availableItems = getAvailableExpenseItems(rowIndex);
                                            const expenseItemId =
                                                typeof row.expense_item_id === 'number' ? row.expense_item_id : null;

                                            return (
                                                <TableRow key={rowIndex}>
                                                    <TableCell className="align-middle">
                                                        {expenseItem ? (
                                                            <div className="flex items-center gap-2">
                                                                {ExpenseIcon && <ExpenseIcon className="size-4 text-muted-foreground" />}
                                                                <span>{expenseItem.name}</span>
                                                            </div>
                                                        ) : (
                                                            <Popover
                                                                open={openExpenseRow === rowIndex}
                                                                onOpenChange={(open) => setOpenExpenseRow(open ? rowIndex : null)}
                                                            >
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        role="combobox"
                                                                        className="w-full justify-between font-normal"
                                                                    >
                                                                        Select expense item
                                                                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                                                    <Command>
                                                                        <CommandInput placeholder="Search expense items..." />
                                                                        <CommandList className="max-h-60">
                                                                            <CommandEmpty>No expense items found.</CommandEmpty>
                                                                            <CommandGroup>
                                                                                {availableItems.map((item) => (
                                                                                    <CommandItem
                                                                                        key={item.id}
                                                                                        value={item.name}
                                                                                        onSelect={() => handleExpenseItemSelect(rowIndex, item.id)}
                                                                                    >
                                                                                        <Check
                                                                                            className={cn(
                                                                                                'mr-2 size-4',
                                                                                                row.expense_item_id === item.id ? 'opacity-100' : 'opacity-0',
                                                                                            )}
                                                                                        />
                                                                                        {item.name}
                                                                                    </CommandItem>
                                                                                ))}
                                                                            </CommandGroup>
                                                                        </CommandList>
                                                                    </Command>
                                                                </PopoverContent>
                                                            </Popover>
                                                        )}
                                                        <InputError message={errors[`items.${rowIndex}.expense_item_id` as keyof typeof errors]} />
                                                    </TableCell>

                                                    <TableCell className="align-middle text-sm">
                                                        {expenseItemId !== null && loadingPrevBudget[expenseItemId] ? (
                                                            <span className="text-muted-foreground">Loading...</span>
                                                        ) : expenseItemId !== null &&
                                                          prevBudgets[expenseItemId] !== undefined &&
                                                          prevBudgets[expenseItemId] !== null ? (
                                                            formatAmount(prevBudgets[expenseItemId])
                                                        ) : (
                                                            <span className="italic text-muted-foreground">Not available</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="align-middle">
                                                        <Input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder="Enter budget"
                                                            value={row.planned_budget}
                                                            onChange={(event) =>
                                                                handlePlannedBudgetChange(rowIndex, event.target.value)
                                                            }
                                                            className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                        />
                                                        <InputError message={errors[`items.${rowIndex}.planned_budget` as keyof typeof errors]} />
                                                    </TableCell>

                                                    <TableCell className="align-middle">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                                            onClick={() => removeExpenseRow(rowIndex)}
                                                            disabled={data.items.length === 1}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            <InputError message={errors.items} />

                            <Button
                                type="button"
                                className="bg-green-700 text-white hover:bg-green-800"
                                onClick={addExpenseRow}
                            >
                                <Plus className="mr-1 size-4" />
                                Add Expense Type
                            </Button>

                            <div className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
                                <div className="rounded-lg bg-sky-50 px-5 py-3">
                                    <p className="text-sm text-muted-foreground">Total Budget</p>
                                    <p className="text-xl font-bold text-foreground">
                                        {formatAmount(totalBudget)} ETB
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button type="button" variant="outline" onClick={handleCancel}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="bg-black text-white hover:bg-black/90" disabled={processing}>
                                        <Save className="mr-2 size-4" />
                                        Save Budget
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

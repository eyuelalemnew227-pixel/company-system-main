import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import React from 'react';

type Product = {
	product_id: number;
	product_name: string;
	product_code: string | null;
	unit_cost: string;
	count: string;
	total_cost: string;
};

type Category = {
	category_id: number;
	category_name: string;
	products: Product[];
	total_count: string;
	total_cost: string;
};

type Branch = {
	branch_id: number;
	branch_name: string;
	categories: Category[];
	total_count: string;
	total_cost: string;
};

type PageProps = {
	data: Branch[];
	branches: { id: number; name: string }[];
	childCategories: { id: number; child_name: string }[];
	fiscalYears: { id: number; name: string }[];
	periods: { id: number; inventory_period_name: string; fiscal_year_id: number }[];
	request?: { branch_id?: string; child_category_id?: string; fiscal_year_id?: string; period_id?: string };
};

export default function InventoryCountSummaryPage({ data, branches, childCategories, fiscalYears, periods, request }: PageProps) {
	const defaultPeriod = periods.length > 0 ? String(periods[0].id) : '';
	const defaultFiscalYear = React.useMemo(() => {
		if (periods.length > 0) {
			const latestPeriod = periods[0];
			return String(latestPeriod.fiscal_year_id);
		}
		return fiscalYears.length > 0 ? String(fiscalYears[0].id) : '';
	}, [periods, fiscalYears]);

	const [branchId, setBranchId] = React.useState<string>(request?.branch_id ?? '');
	const [childCategoryId, setChildCategoryId] = React.useState<string>(request?.child_category_id ?? '');
	const [fiscalYearId, setFiscalYearId] = React.useState<string>(request?.fiscal_year_id ?? defaultFiscalYear);
	const [periodId, setPeriodId] = React.useState<string>(request?.period_id ?? defaultPeriod);

	const [expandedBranches, setExpandedBranches] = React.useState<Record<number, boolean>>({});
	const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({});

	React.useEffect(() => {
		if (!request?.fiscal_year_id && defaultFiscalYear && fiscalYearId !== defaultFiscalYear) {
			setFiscalYearId(defaultFiscalYear);
		}
		if (!request?.period_id && defaultPeriod && periodId !== defaultPeriod) {
			setPeriodId(defaultPeriod);
		}
	}, [defaultFiscalYear, defaultPeriod, request]);

	const filteredPeriods = React.useMemo(() => {
		if (!fiscalYearId) return periods;
		return periods.filter((p) => String(p.fiscal_year_id) === fiscalYearId);
	}, [fiscalYearId, periods]);

	React.useEffect(() => {
		if (filteredPeriods.length > 0 && !filteredPeriods.find((p) => String(p.id) === periodId)) {
			setPeriodId(String(filteredPeriods[0].id));
		}
	}, [filteredPeriods, periodId]);

	const buildQuery = () => {
		const params = new URLSearchParams();
		if (branchId) params.set('branch_id', branchId);
		if (childCategoryId) params.set('child_category_id', childCategoryId);
		if (fiscalYearId) params.set('fiscal_year_id', fiscalYearId);
		if (periodId) params.set('period_id', periodId);
		const s = params.toString();
		return s ? `?${s}` : '';
	};

	const applyFilters = () => {
		window.location.href = `/reports/inventory-count-summary${buildQuery()}`;
	};

	const toggleBranch = (branchId: number) => {
		setExpandedBranches((prev) => ({ ...prev, [branchId]: !prev[branchId] }));
	};

	const toggleCategory = (branchId: number, categoryId: number) => {
		const key = `${branchId}-${categoryId}`;
		setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const isBranchExpanded = (branchId: number) => expandedBranches[branchId] ?? false;
	const isCategoryExpanded = (branchId: number, categoryId: number) => {
		const key = `${branchId}-${categoryId}`;
		return expandedCategories[key] ?? false;
	};

	const expandAllBranches = () => {
		const allExpanded: Record<number, boolean> = {};
		data.forEach((branch) => {
			allExpanded[branch.branch_id] = true;
		});
		setExpandedBranches(allExpanded);
	};

	const collapseAllBranches = () => {
		setExpandedBranches({});
	};

	const expandAllCategories = () => {
		const allExpanded: Record<string, boolean> = {};
		data.forEach((branch) => {
			branch.categories.forEach((category) => {
				allExpanded[`${branch.branch_id}-${category.category_id}`] = true;
			});
		});
		setExpandedCategories(allExpanded);
	};

	const collapseAllCategories = () => {
		setExpandedCategories({});
	};

	const handleExport = () => {
		const params = new URLSearchParams();
		if (branchId) params.set('branch_id', branchId);
		if (childCategoryId) params.set('child_category_id', childCategoryId);
		if (fiscalYearId) params.set('fiscal_year_id', fiscalYearId);
		if (periodId) params.set('period_id', periodId);

		const expandedBranchIds = Object.keys(expandedBranches).filter((id) => expandedBranches[Number(id)]);
		const expandedCategoryKeys = Object.keys(expandedCategories).filter((key) => expandedCategories[key]);

		if (expandedBranchIds.length > 0) {
			params.set('expanded_branches', expandedBranchIds.join(','));
		}
		if (expandedCategoryKeys.length > 0) {
			params.set('expanded_categories', expandedCategoryKeys.join(','));
		}

		window.location.href = `/reports/inventory-count-summary/export${params.toString() ? `?${params.toString()}` : ''}`;
	};

	return (
		<AppLayout title="Inventory Count Summary">
			<Head title="Inventory Count Summary" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader>
						<CardTitle>Filters</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap items-end gap-4">
							<div className="w-56">
								<label className="mb-2 block text-sm font-medium">Branch</label>
								<Select value={branchId || 'all'} onValueChange={(v) => setBranchId(v === 'all' ? '' : v)}>
									<SelectTrigger>
										<SelectValue placeholder="All" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All</SelectItem>
										{branches.map((b) => (
											<SelectItem key={b.id} value={String(b.id)}>
												{b.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="w-56">
								<label className="mb-2 block text-sm font-medium">Child Category</label>
								<Select value={childCategoryId || 'all'} onValueChange={(v) => setChildCategoryId(v === 'all' ? '' : v)}>
									<SelectTrigger>
										<SelectValue placeholder="All" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All</SelectItem>
										{childCategories.map((c) => (
											<SelectItem key={c.id} value={String(c.id)}>
												{c.child_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="w-56">
								<label className="mb-2 block text-sm font-medium">Fiscal Year *</label>
								<Select
									value={fiscalYearId}
									onValueChange={(v) => {
										setFiscalYearId(v);
										const newFilteredPeriods = periods.filter((p) => String(p.fiscal_year_id) === v);
										if (newFilteredPeriods.length > 0) {
											setPeriodId(String(newFilteredPeriods[0].id));
										}
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select Fiscal Year" />
									</SelectTrigger>
									<SelectContent>
										{fiscalYears.map((fy) => (
											<SelectItem key={fy.id} value={String(fy.id)}>
												{fy.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="w-56">
								<label className="mb-2 block text-sm font-medium">Period *</label>
								<Select value={periodId} onValueChange={(v) => setPeriodId(v)}>
									<SelectTrigger>
										<SelectValue placeholder="Select Period" />
									</SelectTrigger>
									<SelectContent>
										{filteredPeriods.map((p) => (
											<SelectItem key={p.id} value={String(p.id)}>
												{p.inventory_period_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<Button variant="outline" onClick={applyFilters}>
								Apply Filters
							</Button>
							<Button variant="outline" onClick={handleExport}>
								Export CSV
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-0">
						<Table>
							<TableHeader className="bg-slate-500 dark:bg-slate-700">
								<TableRow>
									<TableHead className="font-bold text-white">
										<div className="flex items-center gap-2">
											<span>Branch</span>
											<div className="flex gap-1">
												<Button
													size="sm"
													variant="ghost"
													className="h-6 w-6 p-0 text-white hover:bg-slate-600 hover:text-white"
													onClick={expandAllBranches}
													title="Expand all branches"
												>
													<ChevronsDownUp className="h-4 w-4" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													className="h-6 w-6 p-0 text-white hover:bg-slate-600 hover:text-white"
													onClick={collapseAllBranches}
													title="Collapse all branches"
												>
													<ChevronsUpDown className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</TableHead>
									<TableHead className="font-bold text-white">
										<div className="flex items-center gap-2">
											<span>Child Category</span>
											<div className="flex gap-1">
												<Button
													size="sm"
													variant="ghost"
													className="h-6 w-6 p-0 text-white hover:bg-slate-600 hover:text-white"
													onClick={expandAllCategories}
													title="Expand all categories"
												>
													<ChevronsDownUp className="h-4 w-4" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													className="h-6 w-6 p-0 text-white hover:bg-slate-600 hover:text-white"
													onClick={collapseAllCategories}
													title="Collapse all categories"
												>
													<ChevronsUpDown className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</TableHead>
									<TableHead className="font-bold text-white">Product</TableHead>
									<TableHead className="font-bold text-white">Product Code</TableHead>
									<TableHead className="text-right font-bold text-white">Count</TableHead>
									<TableHead className="text-right font-bold text-white">Unit Cost</TableHead>
									<TableHead className="text-right font-bold text-white">Total Cost</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.length === 0 && (
									<TableRow>
										<TableCell colSpan={7} className="text-center">
											No data available
										</TableCell>
									</TableRow>
								)}
								{data.map((branch) => {
									const branchExpanded = isBranchExpanded(branch.branch_id);

									if (!branchExpanded) {
										return (
											<TableRow
												key={`branch-${branch.branch_id}`}
												className="cursor-pointer bg-blue-50 font-semibold hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900"
												onClick={() => toggleBranch(branch.branch_id)}
											>
												<TableCell>
													<div className="flex items-center gap-2">
														<ChevronRight className="h-4 w-4" />
														{branch.branch_name}
													</div>
												</TableCell>
												<TableCell colSpan={3}></TableCell>
												<TableCell className="text-right"></TableCell>
												<TableCell className="text-right"></TableCell>
												<TableCell className="text-right">{branch.total_cost}</TableCell>
											</TableRow>
										);
									}

									return (
										<React.Fragment key={`branch-${branch.branch_id}`}>
											<TableRow
												className="cursor-pointer bg-blue-50 font-semibold hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900"
												onClick={() => toggleBranch(branch.branch_id)}
											>
												<TableCell>
													<div className="flex items-center gap-2">
														<ChevronDown className="h-4 w-4" />
														{branch.branch_name}
													</div>
												</TableCell>
												<TableCell colSpan={3}></TableCell>
												<TableCell className="text-right"></TableCell>
												<TableCell className="text-right"></TableCell>
												<TableCell className="text-right">{branch.total_cost}</TableCell>
											</TableRow>
											{branch.categories.map((category) => {
												const categoryExpanded = isCategoryExpanded(branch.branch_id, category.category_id);

												if (!categoryExpanded) {
													return (
														<TableRow
															key={`category-${branch.branch_id}-${category.category_id}`}
															className="cursor-pointer bg-green-50 font-medium hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
															onClick={() => toggleCategory(branch.branch_id, category.category_id)}
														>
															<TableCell></TableCell>
															<TableCell>
																<div className="flex items-center gap-2 pl-4">
																	<ChevronRight className="h-4 w-4" />
																	{category.category_name}
																</div>
															</TableCell>
															<TableCell colSpan={2}></TableCell>
															<TableCell className="text-right"></TableCell>
															<TableCell className="text-right"></TableCell>
															<TableCell className="text-right">{category.total_cost}</TableCell>
														</TableRow>
													);
												}

												return (
													<React.Fragment key={`category-${branch.branch_id}-${category.category_id}`}>
														<TableRow
															className="cursor-pointer bg-green-50 font-medium hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
															onClick={() => toggleCategory(branch.branch_id, category.category_id)}
														>
															<TableCell></TableCell>
															<TableCell>
																<div className="flex items-center gap-2 pl-4">
																	<ChevronDown className="h-4 w-4" />
																	{category.category_name}
																</div>
															</TableCell>
															<TableCell colSpan={2}></TableCell>
															<TableCell className="text-right"></TableCell>
															<TableCell className="text-right"></TableCell>
															<TableCell className="text-right">{category.total_cost}</TableCell>
														</TableRow>
														{category.products.map((product) => (
															<TableRow
																key={`product-${branch.branch_id}-${category.category_id}-${product.product_id}`}
																className="odd:bg-slate-100 dark:odd:bg-slate-800"
															>
																<TableCell></TableCell>
																<TableCell></TableCell>
																<TableCell className="pl-8">{product.product_name}</TableCell>
																<TableCell>{product.product_code || '-'}</TableCell>
																<TableCell className="text-right">{product.count}</TableCell>
																<TableCell className="text-right">{product.unit_cost}</TableCell>
																<TableCell className="text-right">{product.total_cost}</TableCell>
															</TableRow>
														))}
													</React.Fragment>
												);
											})}
										</React.Fragment>
									);
								})}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/user-permissions';
import type { InventoryCount, Branch, ChildCategory, Product, InventoryPeriod } from '@/types/inventory-count';
import { CheckCircle, XCircle } from 'lucide-react';

type Paginated<T> = {
	data: T[];
	current_page: number;
	per_page: number;
	total: number;
	from: number;
	to: number;
	last_page: number;
	links: any[];
};

type Filters = {
	search?: string;
	branch_id?: string;
	child_category_id?: string;
	approval_status?: string;
	inventory_period_id?: string;
};

type PageProps = {
	branches: Branch[];
	canManageAllBranches: boolean;
	canApprove: boolean;
	canUnapprove: boolean;
	inventoryPeriods: InventoryPeriod[];
	childCategories: ChildCategory[];
	inventoryCounts: Paginated<InventoryCount>;
	filters: Filters;
	selectedPeriodStatus?: string | null;
};

export default function InventoryCountsIndex({ 
	branches = [], 
	canManageAllBranches = false,
	canApprove = false,
	canUnapprove = false,
	inventoryPeriods = [], 
	childCategories = [],
	inventoryCounts,
	filters = {},
	selectedPeriodStatus = null
}: PageProps) {
	const { can } = usePermission();
	
	// Check if the selected period is inactive
	const isPeriodInactive = selectedPeriodStatus && selectedPeriodStatus !== 'active';

	const [search, setSearch] = useState(filters.search ?? '');
	const [branchFilter, setBranchFilter] = useState<string>(filters.branch_id ?? 'all');
	const [categoryFilter, setCategoryFilter] = useState<string>(filters.child_category_id ?? 'all');
	const [approvalFilter, setApprovalFilter] = useState<string>(filters.approval_status ?? 'all');
	const [periodFilter, setPeriodFilter] = useState<string>(filters.inventory_period_id ?? 'all');
	const [selectedIds, setSelectedIds] = useState<number[]>([]);

	function handleFilter() {
		const params: Filters = {};
		if (search) params.search = search;
		if (branchFilter !== 'all') params.branch_id = branchFilter;
		if (categoryFilter !== 'all') params.child_category_id = categoryFilter;
		if (approvalFilter !== 'all') params.approval_status = approvalFilter;
		if (periodFilter !== 'all') params.inventory_period_id = periodFilter;
		
		router.get('/inventory-counts', params, {
			preserveState: true,
			preserveScroll: true,
		});
	}


	function deleteItem(id: number) {
		if (!confirm('Delete this inventory count?')) return;
		router.delete(route('inventory-counts.destroy', id), {
			preserveScroll: true,
			onSuccess: () => toast.success('Deleted successfully'),
			onError: (errors) => {
				const errorMessage = errors.error || 'Delete failed. Please try again.';
				toast.error(errorMessage);
			},
		});
	}

	function approveItem(id: number) {
		router.put(route('inventory-counts.approve', id), {}, {
			preserveScroll: true,
			onSuccess: () => toast.success('Approved successfully'),
			onError: (errors) => {
				const errorMessage = errors.error || 'Approval failed. Please try again.';
				toast.error(errorMessage);
			},
		});
	}

	function unapproveItem(id: number) {
		if (!confirm('Unapprove this inventory count?')) return;
		router.put(route('inventory-counts.unapprove', id), {}, {
			preserveScroll: true,
			onSuccess: () => toast.success('Unapproved successfully'),
			onError: (errors) => {
				const errorMessage = errors.error || 'Unapprove failed. Please try again.';
				toast.error(errorMessage);
			},
		});
	}

	function bulkApprove() {
		if (selectedIds.length === 0) {
			toast.error('Please select items to approve');
			return;
		}
		router.post(route('inventory-counts.bulk-approve'), { ids: selectedIds }, {
			preserveScroll: true,
			onSuccess: () => {
				toast.success(`${selectedIds.length} item(s) approved successfully`);
				setSelectedIds([]);
			},
			onError: (errors) => {
				const errorMessage = errors.error || 'Approval failed. Please try again.';
				toast.error(errorMessage);
			},
		});
	}

	function bulkUnapprove() {
		if (selectedIds.length === 0) {
			toast.error('Please select items to unapprove');
			return;
		}
		if (!confirm(`Unapprove ${selectedIds.length} selected item(s)?`)) return;
		router.post(route('inventory-counts.bulk-unapprove'), { ids: selectedIds }, {
			preserveScroll: true,
			onSuccess: () => {
				toast.success(`${selectedIds.length} item(s) unapproved successfully`);
				setSelectedIds([]);
			},
			onError: (errors) => {
				const errorMessage = errors.error || 'Unapprove failed. Please try again.';
				toast.error(errorMessage);
			},
		});
	}

	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedIds(inventoryCounts?.data.map((item) => item.id) ?? []);
		} else {
			setSelectedIds([]);
		}
	};

	const handleSelectItem = (id: number, checked: boolean) => {
		if (checked) {
			setSelectedIds([...selectedIds, id]);
		} else {
			setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
		}
	};

	return (
		<AppLayout breadcrumbs={[{ title: 'Inventory Counts', href: '/inventory-counts' }]}>
			<Head title="Inventory Counts" />
			<div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-2 sm:p-4">
				<Card>
					<CardHeader className="flex-col space-y-4">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
							<CardTitle className="text-xl sm:text-2xl">Inventory Counts</CardTitle>
							{can('create inventory counts') && (
								<CardAction>
									<Link href="/inventory-counts/create">
										<Button 
											variant="default" 
											size="sm" 
											className="w-full sm:w-auto"
											disabled={isPeriodInactive}
											title={isPeriodInactive ? 'Cannot create counts for inactive period' : ''}
										>
											Add New
										</Button>
									</Link>
								</CardAction>
							)}
						</div>
						<form
							className="flex flex-col gap-3 w-full"
							onSubmit={(e) => {
								e.preventDefault();
								handleFilter();
							}}
						>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
								<Input 
									value={search} 
									onChange={(e) => setSearch(e.target.value)} 
									placeholder="Search by product, branch, category, or user..." 
									className="w-full"
								/>
								{canManageAllBranches && (
									<Select
										value={branchFilter}
										onValueChange={setBranchFilter}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Filter by branch" />
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
								)}
								<Select
									value={periodFilter}
									onValueChange={setPeriodFilter}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Filter by period" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Periods</SelectItem>
										{inventoryPeriods.map((period) => (
											<SelectItem key={period.id} value={String(period.id)}>
												{period.inventory_period_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select
									value={categoryFilter}
									onValueChange={setCategoryFilter}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Filter by category" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Categories</SelectItem>
										{childCategories.map((category) => (
											<SelectItem key={category.id} value={String(category.id)}>
												{category.child_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select
									value={approvalFilter}
									onValueChange={setApprovalFilter}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Filter by status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Statuses</SelectItem>
										<SelectItem value="pending">Pending Approval</SelectItem>
										<SelectItem value="approved">Approved</SelectItem>
									</SelectContent>
								</Select>
								<Button type="submit" variant="outline" className="w-full">
									Search
								</Button>
							</div>
						</form>
					</CardHeader>
					<hr />
					<CardContent className="p-2 sm:p-6">
						{selectedIds.length > 0 && (
							<div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 rounded border bg-slate-50 p-3 dark:bg-slate-900">
								<span className="text-sm font-medium">{selectedIds.length} item(s) selected</span>
								<div className="flex flex-wrap gap-2">
									{can('approve inventory counts') && (
										<Button 
											onClick={bulkApprove} 
											size="sm" 
											variant="default" 
											className="flex-1 sm:flex-none"
											disabled={isPeriodInactive}
											title={isPeriodInactive ? 'Cannot approve counts for inactive period' : ''}
										>
											<CheckCircle className="mr-1 h-4 w-4" />
											<span className="hidden sm:inline">Approve Selected</span>
											<span className="sm:hidden">Approve</span>
										</Button>
									)}
									{can('unapprove inventory counts') && (
										<Button 
											onClick={bulkUnapprove} 
											size="sm" 
											variant="outline" 
											className="flex-1 sm:flex-none"
											disabled={isPeriodInactive}
											title={isPeriodInactive ? 'Cannot unapprove counts for inactive period' : ''}
										>
											<XCircle className="mr-1 h-4 w-4" />
											<span className="hidden sm:inline">Unapprove Selected</span>
											<span className="sm:hidden">Unapprove</span>
										</Button>
									)}
									<Button onClick={() => setSelectedIds([])} size="sm" variant="ghost" className="flex-1 sm:flex-none">
										Clear
									</Button>
								</div>
							</div>
						)}
						<div className="overflow-x-auto -mx-2 sm:mx-0">
							<div className="inline-block min-w-full align-middle">
								<Table>
							<TableHeader className="bg-slate-500 dark:bg-slate-700">
								<TableRow>
									<TableHead className="w-10 font-bold text-white sticky left-0 bg-slate-500 dark:bg-slate-700 z-10">
										<Checkbox
											checked={selectedIds.length === inventoryCounts?.data.length && inventoryCounts?.data.length > 0}
											onCheckedChange={handleSelectAll}
											className="border-white"
										/>
									</TableHead>
									<TableHead className="font-bold text-white whitespace-nowrap">#</TableHead>
									<TableHead className="font-bold text-white whitespace-nowrap">Branch</TableHead>
									<TableHead className="font-bold text-white whitespace-nowrap">Period</TableHead>
									<TableHead className="font-bold text-white whitespace-nowrap">Category</TableHead>
									<TableHead className="font-bold text-white whitespace-nowrap">Product</TableHead>
									<TableHead className="font-bold text-white whitespace-nowrap">Count</TableHead>
									<TableHead className="font-bold text-white whitespace-nowrap">Status</TableHead>
									<TableHead className="font-bold text-white whitespace-nowrap hidden sm:table-cell">Created By</TableHead>
									<TableHead className="font-bold text-white whitespace-nowrap hidden md:table-cell">Updated By</TableHead>
									<TableHead className="font-bold text-white whitespace-nowrap">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{inventoryCounts?.data?.map((item, idx) => (
										<TableRow key={item.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
											<TableCell className="sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">
												<Checkbox
													checked={selectedIds.includes(item.id)}
													onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
												/>
											</TableCell>
											<TableCell className="whitespace-nowrap">{(inventoryCounts.from ?? 0) + idx}</TableCell>
											<TableCell className="whitespace-nowrap">{item.branch?.name ?? 'N/A'}</TableCell>
											<TableCell className="whitespace-nowrap">{item.inventory_period?.inventory_period_name ?? 'N/A'}</TableCell>
											<TableCell className="whitespace-nowrap">{item.child_category?.child_name ?? 'N/A'}</TableCell>
											<TableCell className="whitespace-nowrap">{item.product?.product_name ?? 'N/A'}</TableCell>
											<TableCell className="whitespace-nowrap">
												<Badge variant="outline">{item.count}</Badge>
											</TableCell>
											<TableCell className="whitespace-nowrap">
												{item.is_approved ? (
													<div className="flex flex-col gap-1 min-w-[120px]">
														<Badge variant="default" className="bg-green-100 text-green-800 whitespace-nowrap">
															<CheckCircle className="mr-1 h-3 w-3" />
															Approved
														</Badge>
														<span className="text-xs text-muted-foreground">
															by {item.approver?.name ?? 'N/A'}
														</span>
														{item.approved_at && (
															<span className="text-xs text-muted-foreground">
																{new Date(item.approved_at).toLocaleDateString()}
															</span>
														)}
													</div>
												) : (
													<Badge variant="outline" className="bg-yellow-100 text-yellow-800 whitespace-nowrap">
														Pending
													</Badge>
												)}
											</TableCell>
											<TableCell className="whitespace-nowrap hidden sm:table-cell">{item.creator?.name ?? 'N/A'}</TableCell>
											<TableCell className="whitespace-nowrap hidden md:table-cell">{item.updater?.name ?? 'N/A'}</TableCell>
											<TableCell className="whitespace-nowrap">
												<div className="flex flex-col sm:flex-row gap-1 min-w-[100px]">
													{!item.is_approved && can('update inventory counts') && (
														<Link href={`/inventory-counts/${item.id}/edit`}>
															<Button 
																variant="outline" 
																size="sm" 
																className="w-full sm:w-auto"
																disabled={item.inventory_period?.status !== 'active'}
																title={item.inventory_period?.status !== 'active' ? 'Cannot edit count for inactive period' : ''}
															>
																Edit
															</Button>
														</Link>
													)}
													{!item.is_approved && can('delete inventory counts') && (
														<Button 
															variant="destructive" 
															size="sm" 
															onClick={() => deleteItem(item.id)} 
															className="w-full sm:w-auto"
															disabled={item.inventory_period?.status !== 'active'}
															title={item.inventory_period?.status !== 'active' ? 'Cannot delete count for inactive period' : ''}
														>
															Delete
														</Button>
													)}
													{!item.is_approved && can('approve inventory counts') && (
														<Button 
															variant="default" 
															size="sm" 
															onClick={() => approveItem(item.id)} 
															className="w-full sm:w-auto"
															disabled={item.inventory_period?.status !== 'active'}
															title={item.inventory_period?.status !== 'active' ? 'Cannot approve count for inactive period' : ''}
														>
															<CheckCircle className="mr-1 h-3 w-3" />
															<span className="hidden lg:inline">Approve</span>
															<span className="lg:hidden">✓</span>
														</Button>
													)}
													{item.is_approved && can('unapprove inventory counts') && (
														<Button 
															variant="outline" 
															size="sm" 
															onClick={() => unapproveItem(item.id)} 
															className="w-full sm:w-auto"
															disabled={item.inventory_period?.status !== 'active'}
															title={item.inventory_period?.status !== 'active' ? 'Cannot unapprove count for inactive period' : ''}
														>
															<XCircle className="mr-1 h-3 w-3" />
															<span className="hidden lg:inline">Unapprove</span>
															<span className="lg:hidden">✗</span>
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									))}
								{(!inventoryCounts || inventoryCounts.data.length === 0) && (
									<TableRow>
										<TableCell colSpan={11} className="text-center py-8">No Results Found!</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
							</div>
						</div>
					</CardContent>
					{inventoryCounts && inventoryCounts.data.length > 0 && (
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
							<div className="text-sm text-muted-foreground text-center sm:text-left">
								Showing {inventoryCounts.from} to {inventoryCounts.to} of {inventoryCounts.total} results
							</div>
							<div className="flex gap-2">
								{inventoryCounts.links.map((link, index) => {
									if (link.label.includes('Previous')) {
										return (
											<Link
												key={index}
												href={link.url || '#'}
												preserveScroll
											>
												<Button variant="outline" size="sm" disabled={!link.url}>
													<span className="hidden sm:inline">Previous</span>
													<span className="sm:hidden">Prev</span>
												</Button>
											</Link>
										);
									}
									if (link.label.includes('Next')) {
										return (
											<Link
												key={index}
												href={link.url || '#'}
												preserveScroll
											>
												<Button variant="outline" size="sm" disabled={!link.url}>
													Next
												</Button>
											</Link>
										);
									}
									return null;
								})}
							</div>
						</div>
					)}
				</Card>
			</div>
		</AppLayout>
	);
}

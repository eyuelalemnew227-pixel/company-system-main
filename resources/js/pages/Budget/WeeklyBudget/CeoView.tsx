import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import type { Pagination } from '@/types/pagination';
import { Head, router, usePage } from '@inertiajs/react';
import { Filter, MessageSquare } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Weekly Budgets CEO', href: '/budget/weekly-budget/ceo' }];

type WeeklyBudgetRow = {
	id: number;
	branch: string | null;
	department: string | null;
	request_type: string;
	status_finance: string;
	status_department: string;
	status_ceo: string;
	amount: string | number;
	description: string | null;
	note: string | null;
};

interface WeeklyBudgetList extends Pagination {
	data: WeeklyBudgetRow[];
}

type CeoProps = {
	items: WeeklyBudgetList;
	statusCeos: string[];
	request?: any;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: string | number | null | undefined): string {
	const amount = Number(value ?? 0);
	return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
		Number.isNaN(amount) ? 0 : amount,
	);
}

function statusBadge(status: string, _variant: 'ceo') {
	const colorMap: Record<string, string> = {
		pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
		approved: 'bg-green-50 text-green-700 border-green-200',
		rejected: 'bg-red-50 text-red-700 border-red-200',
		paid: 'bg-blue-50 text-blue-700 border-blue-200',
		'on-hold': 'bg-orange-50 text-orange-700 border-orange-200',
	};
	return (
		<span
			className={`rounded-full border px-2 py-0.5 text-[11px] font-bold shadow-sm ${colorMap[status] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}
		>
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</span>
	);
}

function requestTypeBadge(type: string) {
	const color = type === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200';
	return (
		<span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold shadow-sm ${color}`}>
			{type.charAt(0).toUpperCase() + type.slice(1)}
		</span>
	);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WeeklyBudgetCeoView({ items, statusCeos, request }: CeoProps) {
	const { flash, errors } = usePage<any>().props;
	const { can } = usePermission();
	const canManageCeo = can('manage ceo budgets');

	// ── Filter state ────────────────────────────────────────────────────────
	const [selectedStatusCeo, setSelectedStatusCeo] = useState<string>(request?.status_ceo ?? 'all');

	// ── Bulk action state ───────────────────────────────────────────────────
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [bulkStatus, setBulkStatus] = useState<string>('');

	// ── Edit state ──────────────────────────────────────────────────────────
	const [editingRowId, setEditingRowId] = useState<number | null>(null);
	const [editForm, setEditForm] = useState<any>({});

	// ── View note dialog ────────────────────────────────────────────────────
	const [viewNoteItem, setViewNoteItem] = useState<WeeklyBudgetRow | null>(null);

	useEffect(() => {
		if (flash?.message) toast.success(flash.message);
		if (errors?.status_ceo) toast.error(errors.status_ceo);
	}, [flash?.message, errors]);

	const allSelectableIds = useMemo(() => {
		return items.data.filter((item) => item.status_finance !== 'paid').map((item) => item.id);
	}, [items.data]);

	const isAllSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedIds.includes(id));
	const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

	function applyFilters(overrides: Record<string, string> = {}) {
		const params: Record<string, string> = {};
		if (selectedStatusCeo !== 'all') params.status_ceo = selectedStatusCeo;

		Object.assign(params, overrides);

		Object.keys(params).forEach((key) => {
			if (params[key] === 'all') delete params[key];
		});

		router.get('/budget/weekly-budget/ceo', params, { preserveState: true, replace: true });
	}

	function toggleSelectAll() {
		if (isAllSelected) setSelectedIds([]);
		else setSelectedIds(allSelectableIds);
	}

	function toggleSelectRow(id: number) {
		if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter((i) => i !== id));
		else setSelectedIds([...selectedIds, id]);
	}

	function handleBulkUpdate() {
		if (!bulkStatus) return toast.error('Select a status to apply.');
		if (selectedIds.length === 0) return toast.error('Select at least one item.');

		router.patch(
			'/budget/weekly-budget/ceo/bulk',
			{
				ids: selectedIds,
				status_ceo: bulkStatus,
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					setSelectedIds([]);
					setBulkStatus('');
				},
			},
		);
	}

	// ── Edit helpers ─────────────────────────────────────────────────────────

	function startEditRow(item: WeeklyBudgetRow) {
		setEditingRowId(item.id);
		setEditForm({
			status_ceo: item.status_ceo,
		});
	}

	function saveEditRow(item: WeeklyBudgetRow) {
		router.patch(
			`/budget/weekly-budget/${item.id}/ceo-status`,
			{
				status_ceo: editForm.status_ceo,
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					setEditingRowId(null);
				},
			},
		);
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Weekly Budgets - CEO View" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Weekly Budgets — CEO View</h1>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Filter className="size-4 text-muted-foreground" /> Filters
						</CardTitle>
						<div className="flex flex-wrap items-end gap-3 pt-2">
							{/* CEO Status */}
							<Select
								value={selectedStatusCeo}
								onValueChange={(v) => {
									setSelectedStatusCeo(v);
									applyFilters({ status_ceo: v });
								}}
							>
								<SelectTrigger className="w-[150px]">
									<SelectValue placeholder="CEO Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Statuses</SelectItem>
									{statusCeos.map((s) => (
										<SelectItem key={s} value={s}>
											{s.charAt(0).toUpperCase() + s.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{canManageCeo && (
							<div className="mt-6 flex items-center gap-3 rounded-lg border bg-slate-50 p-3 dark:bg-slate-900">
								<span className="text-sm font-medium">Bulk Action ({selectedIds.length} selected):</span>
								<Select value={bulkStatus} onValueChange={setBulkStatus}>
									<SelectTrigger className="w-[180px] bg-white dark:bg-slate-800">
										<SelectValue placeholder="Select Status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="pending">Pending</SelectItem>
										<SelectItem value="approved">Approved</SelectItem>
										<SelectItem value="rejected">Rejected</SelectItem>
										<SelectItem value="on-hold">On Hold</SelectItem>
									</SelectContent>
								</Select>
								<Button onClick={handleBulkUpdate} disabled={selectedIds.length === 0 || !bulkStatus}>
									Apply Bulk Status
								</Button>
							</div>
						)}
					</CardHeader>

					<CardContent>
						<Table>
							<TableHeader className="bg-slate-500 dark:bg-slate-700">
								<TableRow>
									{canManageCeo && (
										<TableHead className="w-12 text-center text-white">
											<Checkbox
												checked={isAllSelected}
												// @ts-ignore
												indeterminate={isSomeSelected}
												onCheckedChange={toggleSelectAll}
												disabled={allSelectableIds.length === 0}
												aria-label="Select all"
												className="border-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
											/>
										</TableHead>
									)}
									<TableHead className="font-bold text-white">Department</TableHead>
									<TableHead className="font-bold text-white">Branch</TableHead>
									<TableHead className="font-bold text-white">Request Type</TableHead>
									<TableHead className="font-bold text-white">Status (CEO)</TableHead>
									<TableHead className="font-bold text-white">Description</TableHead>
									<TableHead className="font-bold text-white">Note</TableHead>
									<TableHead className="font-bold text-white">Amount</TableHead>
									{canManageCeo && <TableHead className="font-bold text-white">Actions</TableHead>}
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.data.map((item) => {
									const isEditing = editingRowId === item.id;
									const isEditable = canManageCeo && item.status_finance !== 'paid';
									const bothApproved =
										item.status_finance === 'approved' && item.status_department === 'approved';

									return (
										<TableRow key={item.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
											{canManageCeo && (
												<TableCell className="text-center">
													<Checkbox
														checked={selectedIds.includes(item.id)}
														onCheckedChange={() => toggleSelectRow(item.id)}
														disabled={item.status_finance === 'paid'}
													/>
												</TableCell>
											)}
											<TableCell>{item.department ?? '-'}</TableCell>
											<TableCell>{item.branch ?? '-'}</TableCell>
											<TableCell>{requestTypeBadge(item.request_type)}</TableCell>

											{/* CEO Status */}
											<TableCell>
												{isEditing ? (
													<Select
														value={editForm.status_ceo}
														onValueChange={(v) => setEditForm({ ...editForm, status_ceo: v })}
													>
														<SelectTrigger className="w-[120px]">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{statusCeos.map((s) => {
																// Only allow Approved if both finance & department are approved
																const disabled = s === 'approved' && !bothApproved;
																return disabled ? null : (
																	<SelectItem key={s} value={s}>
																		{s.charAt(0).toUpperCase() + s.slice(1)}
																	</SelectItem>
																);
															})}
														</SelectContent>
													</Select>
												) : (
													statusBadge(item.status_ceo, 'ceo')
												)}
											</TableCell>

											<TableCell>
												<div className="max-w-xs truncate text-sm text-slate-600">
													{item.description || '-'}
												</div>
											</TableCell>

											<TableCell>
												<button
													type="button"
													className={cn(
														'flex items-center justify-center rounded p-1 transition-colors',
														item.note
															? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700'
															: 'cursor-pointer text-slate-300 hover:text-slate-500',
													)}
													onClick={() => setViewNoteItem(item)}
													aria-label="View note"
												>
													<MessageSquare className="size-4" />
												</button>
											</TableCell>

											<TableCell className="whitespace-nowrap">
												{formatCurrency(item.amount)}
											</TableCell>

											{/* Actions */}
											{canManageCeo && (
												<TableCell className="whitespace-nowrap">
													{isEditing ? (
														<div className="flex gap-1">
															<Button
																size="sm"
																onClick={() => saveEditRow(item)}
																className="h-7 px-2 text-xs"
															>
																Save
															</Button>
															<Button
																variant="outline"
																size="sm"
																onClick={() => setEditingRowId(null)}
																className="h-7 px-2 text-xs"
															>
																Cancel
															</Button>
														</div>
													) : isEditable ? (
														<Button
															variant="ghost"
															size="sm"
															onClick={() => startEditRow(item)}
															className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
														>
															Edit
														</Button>
													) : null}
												</TableCell>
											)}
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</CardContent>
					{items.data.length > 0 ? (
						<TablePagination total={items.total} from={items.from} to={items.to} links={items.links} />
					) : (
						<div className="flex h-full items-center justify-center py-8">No Results Found!</div>
					)}
				</Card>
			</div>

			{/* ── View Note Dialog ─────────────────────────────────────────── */}
			<Dialog open={!!viewNoteItem} onOpenChange={(open) => !open && setViewNoteItem(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>View Note</DialogTitle>
					</DialogHeader>
					<div className="whitespace-pre-wrap py-4 text-sm text-slate-700 dark:text-slate-300">
						{viewNoteItem?.note || <span className="italic text-slate-400">No note added.</span>}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setViewNoteItem(null)}>
							Cancel
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</AppLayout>
	);
}

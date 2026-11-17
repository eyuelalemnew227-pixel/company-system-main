import InputError from '@/components/input-error';
import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePopup } from '@/hooks/use-popup';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { MoreVertical } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Training Request', href: '/training/requests' },
	{ title: 'My Requests', href: '/training/requests' },
];

type TrainingRequestRow = {
	id: number;
	employee_name: string;
	employee_code: string | null;
	training_type: string | null;
	module: string | null;
	requested_on: string | null;
	status: string;
	status_label: string;
	first_proposed_start_at: string | null;
	first_proposed_end_at: string | null;
	current_proposed_start_at: string | null;
	current_proposed_end_at: string | null;
	coordinator_actual_start_at: string | null;
	coordinator_actual_end_at: string | null;
	coordinator_actual_start_at_input: string | null;
	coordinator_actual_end_at_input: string | null;
	actual_date_verdict: string | null;
	requester_actual_start_at: string | null;
	requester_actual_end_at: string | null;
	requester_actual_start_at_input: string | null;
	requester_actual_end_at_input: string | null;
	can_submit_verdict: boolean;
};

type PageProps = {
	requests: {
		data: TrainingRequestRow[];
		total: number;
		from: number;
		to: number;
		links: any[];
	};
	request?: { search?: string };
};

export default function TrainingRequestsIndex({ requests, request }: PageProps) {
	const { flash } = usePage<{ flash: { message?: string; error?: string } }>().props;
	const { triggerPopup, PopupComponent } = usePopup();
	const { can } = usePermission();
	const [search, setSearch] = useState(request?.search ?? '');
	const [verdictRow, setVerdictRow] = useState<TrainingRequestRow | null>(null);

	const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
		actual_date_verdict: '',
		requester_actual_start_at: '',
		requester_actual_end_at: '',
	});

	useEffect(() => {
		if (flash?.message) triggerPopup('Success', flash.message, 'success');
		if (flash?.error) triggerPopup('Error', flash.error, 'error');
	}, [flash, triggerPopup]);

	function handleSearch() {
		router.get('/training/requests', search ? { search } : {}, { preserveState: true, replace: true });
	}

	function openVerdict(row: TrainingRequestRow) {
		clearErrors();
		setVerdictRow(row);
		setData({
			actual_date_verdict: row.actual_date_verdict ?? '',
			requester_actual_start_at: row.requester_actual_start_at_input ?? '',
			requester_actual_end_at: row.requester_actual_end_at_input ?? '',
		});
	}

	function closeVerdict() {
		setVerdictRow(null);
		reset();
		clearErrors();
	}

	function submitVerdict(e: React.FormEvent) {
		e.preventDefault();
		if (!verdictRow) return;
		put(`/training/requests/${verdictRow.id}/verdict`, {
			preserveScroll: true,
			onSuccess: () => closeVerdict(),
		});
	}

	function verdictLabel(row: TrainingRequestRow) {
		if (row.actual_date_verdict === 'correct') return 'Correct';
		if (row.actual_date_verdict === 'incorrect') return 'Incorrect';
		return 'Confirm';
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="My Training Requests" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="grid-cols-1 gap-1">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<CardTitle>My Requests</CardTitle>
							<div className="flex flex-wrap items-center gap-2">
								<form
									className="flex gap-2"
									onSubmit={(e) => {
										e.preventDefault();
										handleSearch();
									}}
								>
									<Input
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										placeholder="Search employee..."
										className="max-w-xs"
									/>
									<Button type="submit" variant="outline">
										Search
									</Button>
								</form>
								{can('training.requests.create') && (
									<Link href="/training/requests/create">
										<Button>New Request</Button>
									</Link>
								)}
							</div>
						</div>
						<p className="text-sm text-muted-foreground">
							After training is held, confirm whether the actual start and end times are correct.
						</p>
					</CardHeader>
					<hr />
					<CardContent>
						<div className="overflow-x-auto">
							<Table>
								<TableHeader className="bg-slate-500 dark:bg-slate-700">
									<TableRow>
										<TableHead className="font-bold text-white">Employee</TableHead>
										<TableHead className="font-bold text-white">Training type</TableHead>
										<TableHead className="font-bold text-white">Module</TableHead>
										<TableHead className="font-bold text-white">Proposed date</TableHead>
										<TableHead className="font-bold text-white">Status</TableHead>
										<TableHead className="font-bold text-white">Current proposed date</TableHead>
										<TableHead className="font-bold text-white">Actual training date</TableHead>
										<TableHead className="font-bold text-white">Actions</TableHead>
										<TableHead className="w-10 font-bold text-white" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{requests.data.map((row) => (
										<TableRow key={row.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
											<TableCell>
												<div className="font-medium">{row.employee_name || '—'}</div>
												<div className="text-xs text-muted-foreground">{row.employee_code}</div>
											</TableCell>
											<TableCell>{row.training_type || '—'}</TableCell>
											<TableCell>{row.module || '—'}</TableCell>
											<TableCell>{row.requested_on || '—'}</TableCell>
											<TableCell>{row.status_label}</TableCell>
											<TableCell>
												<div className="whitespace-nowrap text-sm">
													<div>Start: {row.current_proposed_start_at || '—'}</div>
													<div>End: {row.current_proposed_end_at || '—'}</div>
												</div>
											</TableCell>
											<TableCell>
												<div className="whitespace-nowrap text-sm">
													<div>Start: {row.coordinator_actual_start_at || '—'}</div>
													<div>End: {row.coordinator_actual_end_at || '—'}</div>
												</div>
											</TableCell>
											<TableCell>
												{row.can_submit_verdict ? (
													<div className="flex items-center gap-3">
														<Button variant="outline" size="sm" onClick={() => openVerdict(row)}>
															{verdictLabel(row)}
														</Button>
														{row.actual_date_verdict === 'incorrect' && (
															<div className="whitespace-nowrap text-sm">
																<div>Start: {row.requester_actual_start_at || '—'}</div>
																<div>End: {row.requester_actual_end_at || '—'}</div>
															</div>
														)}
													</div>
												) : (
													'—'
												)}
											</TableCell>
											<TableCell>
												<Popover>
													<PopoverTrigger asChild>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="h-8 w-8"
															aria-label="Show more"
														>
															<MoreVertical className="h-4 w-4" />
														</Button>
													</PopoverTrigger>
													<PopoverContent align="end" className="w-64 space-y-2 text-sm">
														<div>
															<div className="text-xs font-medium uppercase text-muted-foreground">
																First proposed
															</div>
															<div className="mt-1 whitespace-nowrap">
																<div>Start: {row.first_proposed_start_at || '—'}</div>
																<div>End: {row.first_proposed_end_at || '—'}</div>
															</div>
														</div>
													</PopoverContent>
												</Popover>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
					{requests.data.length > 0 ? (
						<TablePagination
							total={requests.total}
							from={requests.from}
							to={requests.to}
							links={requests.links}
						/>
					) : (
						<div className="flex h-full items-center justify-center p-8">
							No training requests yet.
						</div>
					)}
				</Card>
			</div>

			<Dialog open={!!verdictRow} onOpenChange={(open) => !open && closeVerdict()}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Confirm actual training times</DialogTitle>
					</DialogHeader>
					<form onSubmit={submitVerdict} className="space-y-4">
						<div className="grid gap-3 rounded-md border bg-muted/40 p-3 text-sm sm:grid-cols-2">
							<div>
								<div className="text-xs font-medium uppercase text-muted-foreground">Coordinator start</div>
								<div className="font-medium">{verdictRow?.coordinator_actual_start_at || '—'}</div>
							</div>
							<div>
								<div className="text-xs font-medium uppercase text-muted-foreground">Coordinator end</div>
								<div className="font-medium">{verdictRow?.coordinator_actual_end_at || '—'}</div>
							</div>
						</div>
						<div>
							<Label htmlFor="actual_date_verdict">Are these times correct?</Label>
							<Select
								value={data.actual_date_verdict || undefined}
								onValueChange={(value) => {
									setData({
										...data,
										actual_date_verdict: value,
										requester_actual_start_at: value === 'incorrect' ? data.requester_actual_start_at : '',
										requester_actual_end_at: value === 'incorrect' ? data.requester_actual_end_at : '',
									});
								}}
							>
								<SelectTrigger id="actual_date_verdict">
									<SelectValue placeholder="Select" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="correct">Correct</SelectItem>
									<SelectItem value="incorrect">Incorrect</SelectItem>
								</SelectContent>
							</Select>
							<InputError message={errors.actual_date_verdict} />
						</div>
						{data.actual_date_verdict === 'incorrect' && (
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<Label htmlFor="requester_actual_start_at">Corrected start time</Label>
									<Input
										id="requester_actual_start_at"
										type="datetime-local"
										value={data.requester_actual_start_at}
										onChange={(e) => setData('requester_actual_start_at', e.target.value)}
									/>
									<InputError message={errors.requester_actual_start_at} />
								</div>
								<div>
									<Label htmlFor="requester_actual_end_at">Corrected end time</Label>
									<Input
										id="requester_actual_end_at"
										type="datetime-local"
										value={data.requester_actual_end_at}
										onChange={(e) => setData('requester_actual_end_at', e.target.value)}
									/>
									<InputError message={errors.requester_actual_end_at} />
								</div>
							</div>
						)}
						<DialogFooter>
							<Button type="button" variant="outline" onClick={closeVerdict}>
								Cancel
							</Button>
							<Button type="submit" disabled={processing || !data.actual_date_verdict}>
								Save
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			<PopupComponent />
		</AppLayout>
	);
}

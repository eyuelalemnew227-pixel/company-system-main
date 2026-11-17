import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePopup } from '@/hooks/use-popup';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'TD KPI', href: '/training/td-kpi/proposed-date-requests' },
	{ title: 'Date Change Requests', href: '/training/td-kpi/proposed-date-requests' },
];

type ChangeRequest = {
	id: number;
	employee_name: string;
	branch_name: string | null;
	department_name: string | null;
	training_type_name: string | null;
	assigned_training_content: string | null;
	current_proposed_start_at: string | null;
	current_proposed_end_at: string | null;
	requested_proposed_start_at: string | null;
	requested_proposed_end_at: string | null;
	reason: string;
	status: 'pending' | 'accepted' | 'rejected';
	status_label: string;
	requested_by: string | null;
	requested_at: string | null;
};

type PageProps = {
	requests: {
		data: ChangeRequest[];
		total: number;
		from: number;
		to: number;
		links: any[];
	};
};

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
	return (
		<div>
			<p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
			<p className="font-medium">{value || '—'}</p>
		</div>
	);
}

export default function ProposedDateRequestsIndex({ requests }: PageProps) {
	const { flash } = usePage<{ flash: { message?: string; error?: string } }>().props;
	const { triggerPopup, PopupComponent } = usePopup();

	useEffect(() => {
		if (flash?.message) triggerPopup('Success', flash.message, 'success');
		if (flash?.error) triggerPopup('Error', flash.error, 'error');
	}, [flash, triggerPopup]);

	function decide(id: number, action: 'accept' | 'reject') {
		router.post(`/training/td-kpi/proposed-date-requests/${id}/${action}`, {}, { preserveScroll: true });
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Date Change Requests" />
			<div className="flex h-full flex-1 flex-col overflow-x-auto rounded-xl p-4">
				<Card className="gap-2 py-3">
					<CardHeader className="gap-1">
						<CardTitle>Date Change Requests</CardTitle>
						<p className="text-sm text-muted-foreground">
							Review invoices from training coordinators who need saved training start and end times changed.
						</p>
					</CardHeader>
					<hr />
					<CardContent>
						{requests.data.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">No change requests yet.</p>
						) : (
							<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
								{requests.data.map((invoice) => (
									<article key={invoice.id} className="flex flex-col rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-950">
										<div className="mb-2 flex items-start justify-between gap-2">
											<div>
												<p className="text-xs font-medium uppercase text-muted-foreground">Invoice</p>
												<h3 className="font-semibold">{invoice.employee_name}</h3>
											</div>
											<p className="text-xs font-medium">{invoice.status_label}</p>
										</div>
										<div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
											<Detail label="Branch" value={invoice.branch_name} />
											<Detail label="Department" value={invoice.department_name} />
											<Detail label="Training type" value={invoice.training_type_name} />
											<Detail label="Assigned training content" value={invoice.assigned_training_content} />
											<Detail label="Requested by" value={invoice.requested_by} />
											<Detail label="Requested at" value={invoice.requested_at} />
										</div>
										<div className="mt-3 space-y-2 text-sm">
											<div className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
												<p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
													Current start → end
												</p>
												<p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
													{invoice.current_proposed_start_at || '—'} → {invoice.current_proposed_end_at || '—'}
												</p>
											</div>
											<div className="rounded-md border border-amber-200 bg-amber-100 px-3 py-2.5 dark:border-amber-800 dark:bg-amber-950/60">
												<p className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
													New start → end
												</p>
												<p className="mt-1 font-medium text-amber-950 dark:text-amber-50">
													{invoice.requested_proposed_start_at || '—'} → {invoice.requested_proposed_end_at || '—'}
												</p>
											</div>
										</div>
										<div className="mt-3 rounded-md bg-muted/50 p-2 text-sm">
											<p className="text-xs font-medium uppercase text-muted-foreground">Reason</p>
											<p className="whitespace-pre-wrap">{invoice.reason}</p>
										</div>
										{invoice.status === 'pending' && (
											<div className="mt-3 flex justify-end gap-2">
												<Button type="button" variant="outline" size="sm" onClick={() => decide(invoice.id, 'reject')}>
													Reject
												</Button>
												<Button type="button" size="sm" onClick={() => decide(invoice.id, 'accept')}>
													Accept
												</Button>
											</div>
										)}
									</article>
								))}
							</div>
						)}
					</CardContent>
					{requests.data.length > 0 && (
						<TablePagination total={requests.total} from={requests.from} to={requests.to} links={requests.links} />
					)}
				</Card>
			</div>
			<PopupComponent />
		</AppLayout>
	);
}

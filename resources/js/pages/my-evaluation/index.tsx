import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Evaluation = { id: number; name?: string; created_at?: string; evaluator_group?: { name?: string }; evaluates_group?: { name?: string } };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'My Evaluation', href: '/my-evaluation' }];

export default function MyEvaluationIndex({
	evaluations,
	request,
}: {
	evaluations: { data: Evaluation[]; total: number; from: number; to: number; links: any[] };
	request?: { search?: string };
}) {
	const { flash, auth } = usePage<PageProps>().props;
	const [search, setSearch] = useState<string>(request?.search ?? '');

	const canViewEvaluatorGroup = auth.permissions.includes('view evaluator group column');

	useEffect(() => {
		if (flash.message) {
			toast.success(flash.message);
		}
	}, [flash.message]);

	function submitSearch(e: React.FormEvent) {
		e.preventDefault();
		router.get('/my-evaluation', { search }, { preserveState: true, replace: true });
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="My Evaluation" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>Fill Evaluation</CardTitle>
						<form className="ml-4 flex gap-2" onSubmit={submitSearch}>
							<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search evaluations..." />
							<Button type="submit" variant="outline">
								Search
							</Button>
						</form>
						<CardAction>{/* No create action for My Evaluation index */}</CardAction>
					</CardHeader>
					<hr />
					<CardContent>
						<Table>
							<TableHeader className="bg-slate-500 dark:bg-slate-700">
								<TableRow>
									<TableHead className="font-bold text-white">ID</TableHead>
									<TableHead className="font-bold text-white">Name</TableHead>
									{canViewEvaluatorGroup && <TableHead className="font-bold text-white">Evaluator Group</TableHead>}
									<TableHead className="font-bold text-white">Evaluates Group</TableHead>
									<TableHead className="font-bold text-white">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{evaluations.data.map((ev, index) => (
									<TableRow key={ev.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
										<TableCell>{(evaluations.from ?? 0) + index}</TableCell>
										<TableCell className="font-medium">{ev.name || `Evaluation #${ev.id}`}</TableCell>
										{canViewEvaluatorGroup && <TableCell>{ev.evaluator_group?.name || '—'}</TableCell>}
										<TableCell>{ev.evaluates_group?.name || '—'}</TableCell>
										<TableCell>
											<Link href={`/my-evaluation/${ev.id}`}>
												<Button variant="outline" size="sm">
													Open
												</Button>
											</Link>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
					{evaluations.data.length > 0 ? (
						<TablePagination total={evaluations.total} from={evaluations.from} to={evaluations.to} links={evaluations.links} />
					) : (
						<div className="flex h-full items-center justify-center p-8">No Results Found!</div>
					)}
				</Card>
			</div>
		</AppLayout>
	);
}

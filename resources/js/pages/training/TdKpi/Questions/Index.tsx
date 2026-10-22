import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePopup } from '@/hooks/use-popup';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type TdKpiQuestionPagination } from '@/types/td-kpi-question';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'TD KPI', href: '/training/td-kpi/questions' },
	{ title: 'Questions', href: '/training/td-kpi/questions' },
];

export default function TdKpiQuestionsIndex({ questions }: { questions: TdKpiQuestionPagination }) {
	const { flash } = usePage<{ flash: { message?: string; error?: string } }>().props;
	const { triggerPopup, PopupComponent } = usePopup();
	const initialSearch = ((usePage().props as any)?.request?.search) ?? '';
	const [search, setSearch] = useState<string>(initialSearch);
	const { can } = usePermission();

	useEffect(() => {
		if (flash?.message) triggerPopup('Success', flash.message, 'success');
		if (flash?.error) triggerPopup('Error', flash.error, 'error');
	}, [flash, triggerPopup]);

	function handleSearch() {
		router.get('/training/td-kpi/questions', { search: search ?? '' }, { preserveState: true, replace: true });
	}

	function deleteQuestion(id: number) {
		if (confirm('Are you sure you want to delete this question?')) {
			router.delete(`/training/td-kpi/questions/${id}`);
		}
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="TD KPI Questions" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>TD KPI Questions</CardTitle>
						<div className="ml-4 flex gap-2">
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search questions..."
								onKeyDown={(e) => {
									if (e.key === 'Enter') handleSearch();
								}}
							/>
							<Button variant="secondary" onClick={handleSearch}>
								Search
							</Button>
						</div>
						<CardAction>
							{can('training.td_kpi.questions.create') && (
								<Link href="/training/td-kpi/questions/create">
									<Button variant="default">Add New</Button>
								</Link>
							)}
						</CardAction>
					</CardHeader>
					<hr />
					<CardContent>
						<Table>
							<TableHeader className="bg-slate-500 dark:bg-slate-700">
								<TableRow>
									<TableHead className="font-bold text-white">ID</TableHead>
									<TableHead className="font-bold text-white">Label</TableHead>
									<TableHead className="font-bold text-white">Assessment</TableHead>
									<TableHead className="font-bold text-white">Input Type</TableHead>
									<TableHead className="font-bold text-white">Answer</TableHead>
									<TableHead className="font-bold text-white">Status</TableHead>
									<TableHead className="font-bold text-white">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{questions.data.map((question) => (
									<TableRow key={question.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
										<TableCell>{question.id}</TableCell>
										<TableCell className="max-w-md truncate">{question.label}</TableCell>
										<TableCell>
											{(question.assessment as any)?.assessment_name ??
												question.assessment?.name ??
												'-'}
										</TableCell>
										<TableCell>{question.input_type?.name ?? '-'}</TableCell>
										<TableCell className="max-w-xs truncate">{question.answer ?? '—'}</TableCell>
										<TableCell>
											<span
												className={`rounded-full px-2 py-1 text-xs font-semibold ${
													question.status === 'active'
														? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
														: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
												}`}
											>
												{question.status}
											</span>
										</TableCell>
										<TableCell>
											{can('training.td_kpi.questions.update') && (
												<Link href={`/training/td-kpi/questions/${question.id}/edit`}>
													<Button variant="outline" size="sm">
														Edit
													</Button>
												</Link>
											)}
											{can('training.td_kpi.questions.delete') && (
												<Button
													className="m-2"
													variant="destructive"
													size="sm"
													onClick={() => deleteQuestion(question.id)}
												>
													Delete
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
					{questions.data.length > 0 ? (
						<TablePagination total={questions.total} from={questions.from} to={questions.to} links={questions.links} />
					) : (
						<div className="flex h-full items-center justify-center p-8">No Questions Found!</div>
					)}
				</Card>
			</div>
			<PopupComponent />
		</AppLayout>
	);
}

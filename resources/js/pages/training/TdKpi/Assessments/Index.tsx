import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'TD KPI', href: '/training/td-kpi/assessments' },
	{ title: 'Assessments', href: '/training/td-kpi/assessments' },
];

type AssessmentRow = {
	id: number;
	assessment_name: string;
	training_module: string | null;
	randomization_questions_number: number;
	status: string;
};

type PageProps = {
	assessments: {
		data: AssessmentRow[];
		total: number;
		from: number;
		to: number;
		links: any[];
	};
};

export default function AssessmentsIndex({ assessments }: PageProps) {
	const { flash } = usePage<{ flash: { message?: string } }>().props;
	const initialSearch = ((usePage().props as any)?.request?.search) ?? '';
	const [search, setSearch] = useState<string>(initialSearch);
	const { can } = usePermission();

	useEffect(() => {
		if (flash?.message) toast.success(flash.message);
	}, [flash?.message]);

	function handleSearch() {
		router.get('/training/td-kpi/assessments', { search: search ?? '' }, { preserveState: true, replace: true });
	}

	function deleteAssessment(id: number) {
		if (confirm('Are you sure you want to delete this assessment?')) {
			router.delete(`/training/td-kpi/assessments/${id}`);
		}
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="TD KPI Assessments" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>Assessments</CardTitle>
						<div className="ml-4 flex gap-2">
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search assessments..."
								onKeyDown={(e) => {
									if (e.key === 'Enter') handleSearch();
								}}
							/>
							<Button variant="secondary" onClick={handleSearch}>
								Search
							</Button>
						</div>
						<CardAction>
							{can('training.td_kpi.assessments.create') && (
								<Link href="/training/td-kpi/assessments/create">
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
									<TableHead className="font-bold text-white">Assessment Name</TableHead>
									<TableHead className="font-bold text-white">Training Module</TableHead>
									<TableHead className="font-bold text-white">Random Questions</TableHead>
									<TableHead className="font-bold text-white">Status</TableHead>
									<TableHead className="font-bold text-white">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{assessments.data.map((assessment, index) => (
									<TableRow key={assessment.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
										<TableCell>{assessments.from + index}</TableCell>
										<TableCell>{assessment.assessment_name}</TableCell>
										<TableCell>{assessment.training_module || '—'}</TableCell>
										<TableCell>{assessment.randomization_questions_number}</TableCell>
										<TableCell className="capitalize">{assessment.status}</TableCell>
										<TableCell>
											{can('training.td_kpi.assessments.update') && (
												<Link href={`/training/td-kpi/assessments/${assessment.id}/edit`}>
													<Button variant="outline" size="sm">
														Edit
													</Button>
												</Link>
											)}
											{can('training.td_kpi.assessments.delete') && (
												<Button
													className="m-2"
													variant="destructive"
													size="sm"
													onClick={() => deleteAssessment(assessment.id)}
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
					{assessments.data.length > 0 ? (
						<TablePagination
							total={assessments.total}
							from={assessments.from}
							to={assessments.to}
							links={assessments.links}
						/>
					) : (
						<div className="flex h-full items-center justify-center p-8">No Assessments Found!</div>
					)}
				</Card>
			</div>
		</AppLayout>
	);
}

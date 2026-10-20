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
	{ title: 'TD KPI', href: '/training/td-kpi/training-types' },
	{ title: 'Training Types', href: '/training/td-kpi/training-types' },
];

type TrainingType = {
	id: number;
	name: string;
	status: string;
};

type PageProps = {
	trainingTypes: {
		data: TrainingType[];
		total: number;
		from: number;
		to: number;
		links: any[];
	};
};

export default function TrainingTypesIndex({ trainingTypes }: PageProps) {
	const { flash } = usePage<{ flash: { message?: string } }>().props;
	const initialSearch = ((usePage().props as any)?.request?.search) ?? '';
	const [search, setSearch] = useState<string>(initialSearch);
	const { can } = usePermission();

	useEffect(() => {
		if (flash?.message) toast.success(flash.message);
	}, [flash?.message]);

	function handleSearch() {
		router.get('/training/td-kpi/training-types', { search: search ?? '' }, { preserveState: true, replace: true });
	}

	function deleteTrainingType(id: number) {
		if (confirm('Are you sure you want to delete this training type?')) {
			router.delete(`/training/td-kpi/training-types/${id}`);
		}
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Training Types" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>Training Types</CardTitle>
						<div className="ml-4 flex gap-2">
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search training types..."
								onKeyDown={(e) => {
									if (e.key === 'Enter') handleSearch();
								}}
							/>
							<Button variant="secondary" onClick={handleSearch}>
								Search
							</Button>
						</div>
						<CardAction>
							{can('training.td_kpi.training_types.create') && (
								<Link href="/training/td-kpi/training-types/create">
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
									<TableHead className="font-bold text-white">Name</TableHead>
									<TableHead className="font-bold text-white">Status</TableHead>
									<TableHead className="font-bold text-white">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{trainingTypes.data.map((type, index) => (
									<TableRow key={type.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
										<TableCell>{trainingTypes.from + index}</TableCell>
										<TableCell>{type.name}</TableCell>
										<TableCell className="capitalize">{type.status}</TableCell>
										<TableCell>
											{can('training.td_kpi.training_types.update') && (
												<Link href={`/training/td-kpi/training-types/${type.id}/edit`}>
													<Button variant="outline" size="sm">
														Edit
													</Button>
												</Link>
											)}
											{can('training.td_kpi.training_types.delete') && (
												<Button
													className="m-2"
													variant="destructive"
													size="sm"
													onClick={() => deleteTrainingType(type.id)}
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
					{trainingTypes.data.length > 0 ? (
						<TablePagination
							total={trainingTypes.total}
							from={trainingTypes.from}
							to={trainingTypes.to}
							links={trainingTypes.links}
						/>
					) : (
						<div className="flex h-full items-center justify-center p-8">No Training Types Found!</div>
					)}
				</Card>
			</div>
		</AppLayout>
	);
}

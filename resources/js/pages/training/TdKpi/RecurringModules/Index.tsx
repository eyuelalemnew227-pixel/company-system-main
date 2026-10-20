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
	{ title: 'TD KPI', href: '/training/td-kpi/recurring-modules' },
	{ title: 'Recurring Modules', href: '/training/td-kpi/recurring-modules' },
];

type ModuleRow = {
	id: number;
	training_name: string;
	description: string | null;
	conducting_department: string | null;
	trainer_employee: string | null;
	targeted_department: string;
};

type PageProps = {
	modules: {
		data: ModuleRow[];
		total: number;
		from: number;
		to: number;
		links: any[];
	};
};

export default function RecurringModulesIndex({ modules }: PageProps) {
	const { flash } = usePage<{ flash: { message?: string } }>().props;
	const initialSearch = ((usePage().props as any)?.request?.search) ?? '';
	const [search, setSearch] = useState<string>(initialSearch);
	const { can } = usePermission();

	useEffect(() => {
		if (flash?.message) toast.success(flash.message);
	}, [flash?.message]);

	function handleSearch() {
		router.get('/training/td-kpi/recurring-modules', { search: search ?? '' }, { preserveState: true, replace: true });
	}

	function deleteModule(id: number) {
		if (confirm('Are you sure you want to delete this recurring training module?')) {
			router.delete(`/training/td-kpi/recurring-modules/${id}`);
		}
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Recurring Training Modules" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>Recurring Training Modules</CardTitle>
						<div className="ml-4 flex gap-2">
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search modules..."
								onKeyDown={(e) => {
									if (e.key === 'Enter') handleSearch();
								}}
							/>
							<Button variant="secondary" onClick={handleSearch}>
								Search
							</Button>
						</div>
						<CardAction>
							{can('training.recurring_modules.create') && (
								<Link href="/training/td-kpi/recurring-modules/create">
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
									<TableHead className="font-bold text-white">Training Name</TableHead>
									<TableHead className="font-bold text-white">Conducting Department</TableHead>
									<TableHead className="font-bold text-white">Trainer</TableHead>
									<TableHead className="font-bold text-white">Targeted Department</TableHead>
									<TableHead className="font-bold text-white">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{modules.data.map((module, index) => (
									<TableRow key={module.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
										<TableCell>{modules.from + index}</TableCell>
										<TableCell>
											<div className="font-medium">{module.training_name}</div>
											{module.description && (
												<div className="max-w-xs truncate text-xs text-muted-foreground">{module.description}</div>
											)}
										</TableCell>
										<TableCell>{module.conducting_department || '—'}</TableCell>
										<TableCell>{module.trainer_employee || '—'}</TableCell>
										<TableCell>{module.targeted_department}</TableCell>
										<TableCell>
											{can('training.recurring_modules.update') && (
												<Link href={`/training/td-kpi/recurring-modules/${module.id}/edit`}>
													<Button variant="outline" size="sm">
														Edit
													</Button>
												</Link>
											)}
											{can('training.recurring_modules.delete') && (
												<Button
													className="m-2"
													variant="destructive"
													size="sm"
													onClick={() => deleteModule(module.id)}
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
					{modules.data.length > 0 ? (
						<TablePagination total={modules.total} from={modules.from} to={modules.to} links={modules.links} />
					) : (
						<div className="flex h-full items-center justify-center p-8">No Recurring Training Modules Found!</div>
					)}
				</Card>
			</div>
		</AppLayout>
	);
}

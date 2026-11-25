import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TablePagination from '@/components/table-pagination';
import { Eye, FilterX } from 'lucide-react';
import { useMemo } from 'react';

type FiscalOption = { id: number; name: string; fiscal_year_id?: number };

type SimilarityRow = {
	qa_submission_id: number;
	inspector_submission_id: number;
	branch_name: string;
	department_name: string;
	employee_name: string;
	form_id: number | null;
	form_title: string;
	form_type: string;
	form_type_label: string;
	similar_questions: number;
	similarity_percent: number;
	qa_submitted_at: string | null;
	inspector_submitted_at: string | null;
};

type Filters = {
	fiscal_year_id: string;
	fiscal_month_id: string;
};

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Form', href: '/forms' },
	{ title: 'QA Similarity', href: '/forms/qa-similarity' },
];

function similarityClass(percent: number) {
	if (percent >= 80) {
		return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
	}
	if (percent >= 50) {
		return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
	}
	return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
}

export default function QaSimilarityIndex({
	rows,
	fiscalYears = [],
	fiscalMonths = [],
	filters,
}: {
	rows: {
		data: SimilarityRow[];
		total: number;
		from: number | null;
		to: number | null;
		links: any[];
	};
	fiscalYears: FiscalOption[];
	fiscalMonths: FiscalOption[];
	filters: Filters;
}) {
	const monthsForYear = useMemo(() => {
		if (filters.fiscal_year_id === 'all') return fiscalMonths;
		return fiscalMonths.filter((month) => String(month.fiscal_year_id) === filters.fiscal_year_id);
	}, [fiscalMonths, filters.fiscal_year_id]);

	function applyFilters(next: Partial<Filters>) {
		const params: Record<string, string> = {
			fiscal_year_id: next.fiscal_year_id ?? filters.fiscal_year_id,
			fiscal_month_id: next.fiscal_month_id ?? filters.fiscal_month_id,
		};

		router.get('/forms/qa-similarity', params, {
			preserveState: true,
			preserveScroll: true,
			replace: true,
		});
	}

	function resetFilters() {
		router.get(
			'/forms/qa-similarity',
			{
				fiscal_year_id: 'all',
				fiscal_month_id: 'all',
			},
			{ preserveState: true, preserveScroll: true, replace: true },
		);
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="QA Similarity" />
			<div className="flex h-full flex-1 flex-col gap-2 rounded-xl px-2 pb-2 pt-0 sm:px-4 sm:pb-4">
				<Card className="gap-0 py-0">
					<CardHeader className="flex-col space-y-2 px-4 py-3">
						<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
							<Select
								value={filters.fiscal_year_id}
								onValueChange={(value) => applyFilters({ fiscal_year_id: value, fiscal_month_id: 'all' })}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Fiscal year" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All years</SelectItem>
									{fiscalYears.map((year) => (
										<SelectItem key={year.id} value={String(year.id)}>
											{year.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select
								value={filters.fiscal_month_id}
								onValueChange={(value) => applyFilters({ fiscal_month_id: value })}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Fiscal month" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All months</SelectItem>
									{monthsForYear.map((month) => (
										<SelectItem key={month.id} value={String(month.id)}>
											{month.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Button type="button" variant="outline" onClick={resetFilters} className="w-full">
								<FilterX className="mr-1.5 h-4 w-4" />
								Reset
							</Button>
						</div>
					</CardHeader>

					<CardContent className="space-y-2 px-4 pb-4 pt-2">
						<div className="overflow-x-auto">
							<div className="inline-block min-w-full align-middle">
								<Table>
									<TableHeader className="bg-slate-500 dark:bg-slate-700">
										<TableRow>
											<TableHead className="font-bold text-white whitespace-nowrap">Branch</TableHead>
											<TableHead className="font-bold text-white whitespace-nowrap">Department</TableHead>
											<TableHead className="font-bold text-white whitespace-nowrap">Employee Name</TableHead>
											<TableHead className="font-bold text-white whitespace-nowrap">Form Type</TableHead>
											<TableHead className="font-bold text-white whitespace-nowrap text-right">
												Similar Questions
											</TableHead>
											<TableHead className="font-bold text-white whitespace-nowrap text-right">
												% Similarity
											</TableHead>
											<TableHead className="font-bold text-white whitespace-nowrap text-right">
												Actions
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{rows.data.length === 0 ? (
											<TableRow>
												<TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
													No QA–inspector pairs found for this period.
												</TableCell>
											</TableRow>
										) : (
											rows.data.map((row) => (
												<TableRow
													key={`${row.qa_submission_id}-${row.inspector_submission_id}`}
													className="odd:bg-slate-100 dark:odd:bg-slate-800"
												>
													<TableCell>{row.branch_name}</TableCell>
													<TableCell>{row.department_name}</TableCell>
													<TableCell>
														<div className="font-medium">{row.employee_name}</div>
														<div className="text-xs text-muted-foreground">{row.form_title}</div>
													</TableCell>
													<TableCell>{row.form_type_label}</TableCell>
													<TableCell className="text-right font-mono font-semibold">
														{row.similar_questions}
													</TableCell>
													<TableCell className="text-right">
														<span
															className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${similarityClass(row.similarity_percent)}`}
														>
															{row.similarity_percent}%
														</span>
													</TableCell>
													<TableCell className="text-right whitespace-nowrap">
														<div className="flex items-center justify-end gap-1">
															<Link href={`/submissions/${row.inspector_submission_id}`}>
																<Button variant="outline" size="sm">
																	<Eye className="w-3.5 h-3.5 sm:mr-1" />
																	<span className="hidden sm:inline">View Inspector</span>
																</Button>
															</Link>
															<Link href={`/submissions/${row.qa_submission_id}`}>
																<Button variant="outline" size="sm">
																	<Eye className="w-3.5 h-3.5 sm:mr-1" />
																	<span className="hidden sm:inline">View QA</span>
																</Button>
															</Link>
														</div>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>
						</div>

						{rows.data.length > 0 && (
							<TablePagination total={rows.total} from={rows.from} to={rows.to} links={rows.links} />
						)}
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}

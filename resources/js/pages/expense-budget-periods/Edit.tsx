import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermission } from '@/hooks/user-permissions';

type FiscalYearOption = {
	id: number;
	name: string;
};

type FiscalMonthOption = {
	id: number;
	name: string;
	fiscal_year_id: number;
};

type ExpenseBudgetPeriodItem = {
	id: number;
	period_name: string;
	status: 'active' | 'inactive';
	fiscal_year_id: number;
	fiscal_month_id: number;
};

type PageProps = {
	expenseBudgetPeriod: ExpenseBudgetPeriodItem;
	fiscalYears: FiscalYearOption[];
	fiscalMonths: FiscalMonthOption[];
};

export default function EditExpenseBudgetPeriod() {
	const { props } = usePage<PageProps>();
	const period = props.expenseBudgetPeriod;
	const fiscalYears = props.fiscalYears ?? [];
	const fiscalMonths = props.fiscalMonths ?? [];
	const { can } = usePermission();

	const [periodName, setPeriodName] = useState(period.period_name || '');
	const [fiscalYearId, setFiscalYearId] = useState<string>(String(period.fiscal_year_id || ''));
	const [fiscalMonthId, setFiscalMonthId] = useState<string>(String(period.fiscal_month_id || ''));
	const [status, setStatus] = useState<'active' | 'inactive'>(period.status || 'inactive');

	const filteredMonths = useMemo(() => {
		if (!fiscalYearId) {
			return fiscalMonths;
		}
		return fiscalMonths.filter((month) => String(month.fiscal_year_id) === fiscalYearId);
	}, [fiscalMonths, fiscalYearId]);

	useEffect(() => {
		if (!fiscalYearId) {
			setFiscalMonthId('');
		} else if (!filteredMonths.find((m) => String(m.id) === fiscalMonthId)) {
			setFiscalMonthId('');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fiscalYearId]);

	function submit(e: React.FormEvent) {
		e.preventDefault();
		router.put(route('expense-budget-periods.update', period.id), {
			period_name: periodName,
			fiscal_year_id: fiscalYearId ? Number(fiscalYearId) : null,
			fiscal_month_id: fiscalMonthId ? Number(fiscalMonthId) : null,
			status,
		});
	}

	return (
		<AppLayout
			breadcrumbs={[
				{ title: 'Expense Budget Periods', href: '/expense-budget-periods' },
				{ title: 'Edit Expense Budget Period', href: `/expense-budget-periods/${period.id}/edit` },
			]}
		>
			<Head title="Edit Expense Budget Period" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card className="max-w-2xl">
					<CardHeader>
						<CardTitle>Edit Expense Budget Period</CardTitle>
					</CardHeader>
					<CardContent>
						<form className="space-y-6" onSubmit={submit}>
							<div className="space-y-2">
								<Label htmlFor="period_name">Name</Label>
								<Input
									id="period_name"
									value={periodName}
									onChange={(e) => setPeriodName(e.target.value)}
									required
									maxLength={191}
									placeholder="Enter period name"
								/>
							</div>
							<div className="space-y-2">
								<Label>Fiscal Year</Label>
								<Select
									value={fiscalYearId}
									onValueChange={(value) => {
										setFiscalYearId(value);
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select fiscal year" />
									</SelectTrigger>
									<SelectContent>
										{fiscalYears.map((year) => (
											<SelectItem key={year.id} value={String(year.id)}>
												{year.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Fiscal Month</Label>
								<Select
									value={fiscalMonthId}
									onValueChange={(value) => setFiscalMonthId(value)}
									disabled={!fiscalYearId}
								>
									<SelectTrigger>
										<SelectValue placeholder={fiscalYearId ? 'Select fiscal month' : 'Select fiscal year first'} />
									</SelectTrigger>
									<SelectContent>
										{filteredMonths.map((month) => (
											<SelectItem key={month.id} value={String(month.id)}>
												{month.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Status</Label>
								<Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
									<SelectTrigger>
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="inactive">Inactive</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-center gap-2">
								<Button
									type="submit"
									disabled={
										!can('manage expense budget anytime') ||
										!periodName.trim() ||
										!fiscalYearId ||
										!fiscalMonthId
									}
								>
									Update
								</Button>
								<Link href="/expense-budget-periods">
									<Button type="button" variant="outline">
										Cancel
									</Button>
								</Link>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}

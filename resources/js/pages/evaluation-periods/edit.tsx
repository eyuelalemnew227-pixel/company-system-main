import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import InputError from '@/components/input-error';
import { Loader2 } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import type { EvaluationPeriod } from '@/types/evaluation-period';
import type { FiscalYear } from '@/types/fiscal-year';
import type { FiscalMonth } from '@/types/fiscal-month';
import type { PageProps } from '@/types';

type Props = PageProps & {
    evaluationPeriod: EvaluationPeriod;
    fiscalYears: FiscalYear[];
    fiscalMonths: FiscalMonth[];
};

export default function Edit({ evaluationPeriod, fiscalYears, fiscalMonths }: Props) {
    const { data, setData, put, processing, errors, reset } = useForm({
        evaluation_period_name: evaluationPeriod.evaluation_period_name,
        fiscal_year_id: evaluationPeriod.fiscal_year_id.toString(),
        fiscal_month_id: evaluationPeriod.fiscal_month_id.toString(),
        status: evaluationPeriod.status,
    });

    const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(evaluationPeriod.fiscal_year_id.toString());

    useEffect(() => {
        setSelectedFiscalYear(data.fiscal_year_id);
    }, [data.fiscal_year_id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('evaluation-periods.update', evaluationPeriod.id), {
            onSuccess: () => {
                // Optionally reset form or redirect
            },
        });
    };

    const handleFiscalYearChange = (value: string) => {
        setSelectedFiscalYear(value);
        setData((prev) => ({
            ...prev,
            fiscal_year_id: value,
            fiscal_month_id: '',
        }));
    };

    // Filter fiscal months based on selected fiscal year
    const filteredFiscalMonths = selectedFiscalYear
        ? fiscalMonths.filter(month => month.fiscal_year_id === parseInt(selectedFiscalYear))
        : fiscalMonths;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Evaluation Periods', href: '/evaluation-periods' },
        { title: 'Edit Evaluation Period', href: `/evaluation-periods/${evaluationPeriod.id}/edit` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Evaluation Period" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card className="max-w-2xl">
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Evaluation Period Details</CardTitle>
                        <CardAction>
                            <Link href={'/evaluation-periods'}>
                                <Button variant={'default'}>Go Back</Button>
                            </Link>
                        </CardAction>
                    </CardHeader>
                    <hr />
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="evaluation_period_name">Period Name</Label>
                                <Input
                                    id="evaluation_period_name"
                                    type="text"
                                    value={data.evaluation_period_name}
                                    onChange={(e) => setData('evaluation_period_name', e.target.value)}
                                    placeholder="Enter evaluation period name"
                                    className={errors.evaluation_period_name ? 'border-red-500' : ''}
                                />
                                <InputError message={errors.evaluation_period_name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fiscal_year_id">Fiscal Year</Label>
                                <Select value={data.fiscal_year_id} onValueChange={handleFiscalYearChange}>
                                    <SelectTrigger className={errors.fiscal_year_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Select fiscal year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fiscalYears.map((year) => (
                                            <SelectItem key={year.id} value={year.id.toString()}>
                                                {year.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.fiscal_year_id} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fiscal_month_id">Fiscal Month</Label>
                                <Select
                                    value={data.fiscal_month_id}
                                    onValueChange={(value) => setData('fiscal_month_id', value)}
                                    disabled={!selectedFiscalYear}
                                >
                                    <SelectTrigger className={errors.fiscal_month_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={selectedFiscalYear ? "Select fiscal month" : "Select fiscal year first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredFiscalMonths.map((month) => (
                                            <SelectItem key={month.id} value={month.id.toString()}>
                                                {month.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.fiscal_month_id} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select value={data.status} onValueChange={(value) => setData('status', value as 'active' | 'inactive')}>
                                    <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.status} />
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button type="submit" disabled={processing}>
                                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Evaluation Period
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={'/evaluation-periods'}>Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

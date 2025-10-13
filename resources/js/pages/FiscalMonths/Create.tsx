import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import type { FiscalYear } from '@/types/fiscal-year';
import type { EthiopianMonth } from '@/types/fiscal-month';

type Props = {
    fiscalYears: FiscalYear[];
    ethiopianMonths: Record<number, EthiopianMonth>;
};

export default function Create({ fiscalYears, ethiopianMonths }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        fiscal_year_id: '',
        name: '',
        efy_month_number: '',
        gregorian_start_date: '',
        gregorian_end_date: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('fiscal-months.store'));
    };

    const handleMonthSelect = (monthNumber: string) => {
        setData('efy_month_number', monthNumber);
        if (ethiopianMonths[parseInt(monthNumber)]) {
            setData('name', ethiopianMonths[parseInt(monthNumber)].en);
        }
    };

    return (
        <AppLayout>
            <Head title="Create Fiscal Month" />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={route('fiscal-months.index')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold">Create Ethiopian Fiscal Month</h1>
                </div>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="fiscal_year_id">Fiscal Year</Label>
                            <Select value={data.fiscal_year_id} onValueChange={(value) => setData('fiscal_year_id', value)}>
                                <SelectTrigger className={errors.fiscal_year_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder="Select fiscal year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {fiscalYears.map((year) => (
                                        <SelectItem key={year.id} value={year.id.toString()}>
                                            {year.name} ({year.gregorian_start_date} to {year.gregorian_end_date})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.fiscal_year_id && <p className="text-sm text-red-500">{errors.fiscal_year_id}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="efy_month_number">Ethiopian Month</Label>
                            <Select value={data.efy_month_number} onValueChange={handleMonthSelect}>
                                <SelectTrigger className={errors.efy_month_number ? 'border-red-500' : ''}>
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(ethiopianMonths).map(([num, month]) => (
                                        <SelectItem key={num} value={num}>
                                            {num}. {month.en} ({month.am})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.efy_month_number && <p className="text-sm text-red-500">{errors.efy_month_number}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Month Name</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g., Hamle"
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="gregorian_start_date">Gregorian Start Date</Label>
                                <Input
                                    id="gregorian_start_date"
                                    type="date"
                                    value={data.gregorian_start_date}
                                    onChange={(e) => setData('gregorian_start_date', e.target.value)}
                                    className={errors.gregorian_start_date ? 'border-red-500' : ''}
                                />
                                {errors.gregorian_start_date && (
                                    <p className="text-sm text-red-500">{errors.gregorian_start_date}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gregorian_end_date">Gregorian End Date</Label>
                                <Input
                                    id="gregorian_end_date"
                                    type="date"
                                    value={data.gregorian_end_date}
                                    onChange={(e) => setData('gregorian_end_date', e.target.value)}
                                    className={errors.gregorian_end_date ? 'border-red-500' : ''}
                                />
                                {errors.gregorian_end_date && (
                                    <p className="text-sm text-red-500">{errors.gregorian_end_date}</p>
                                )}
                            </div>
                        </div>

                        {/* Status removed */}

                        <div className="flex gap-4">
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Creating...' : 'Create Fiscal Month'}
                            </Button>
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('fiscal-months.index')}>Cancel</Link>
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}


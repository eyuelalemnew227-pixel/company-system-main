import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        gregorian_start_date: '',
        gregorian_end_date: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('fiscal-years.store'));
    };

    return (
        <AppLayout>
            <Head title="Create Fiscal Year" />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={route('fiscal-years.index')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold">Create Ethiopian Fiscal Year</h1>
                </div>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Fiscal Year Name</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g., EFY 2017"
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            <p className="text-xs text-gray-500">
                                Ethiopian Fiscal Year format (e.g., EFY 2017, EFY 2018)
                            </p>
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
                                {processing ? 'Creating...' : 'Create Fiscal Year'}
                            </Button>
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('fiscal-years.index')}>Cancel</Link>
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}


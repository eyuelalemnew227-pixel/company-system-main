import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';

type EvaluationCategory = {
    id: number;
    name: string;
    weight: number;
    is_active: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Evaluation Categories', href: '/evaluation-categories' },
    { title: 'Edit Category', href: null },
];

export default function Edit({ category }: { category: EvaluationCategory }) {
    const { data, setData, put, processing, errors } = useForm({
        name: category.name,
        weight: category.weight,
        is_active: category.is_active,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('evaluation-categories.update', category.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Evaluation Category" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card className="max-w-2xl mx-auto w-full">
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Edit Evaluation Category</CardTitle>
                        <CardAction>
                            <Link href={'/evaluation-categories'}>
                                <Button variant={'default'}>Go Back</Button>
                            </Link>
                        </CardAction>
                    </CardHeader>
                    <hr />
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Category Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className={errors.name ? 'border-red-500' : ''}
                                />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="weight">Weight (%)</Label>
                                <Input
                                    id="weight"
                                    type="number"
                                    value={data.weight}
                                    onChange={(e) => setData('weight', parseFloat(e.target.value))}
                                    className={errors.weight ? 'border-red-500' : ''}
                                />
                                {errors.weight && <p className="text-sm text-red-500">{errors.weight}</p>}
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked: boolean) => setData('is_active', checked)}
                                />
                                <Label htmlFor="is_active">Is Active?</Label>
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={'/evaluation-categories'}>Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

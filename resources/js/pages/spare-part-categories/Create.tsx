import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function SparePartCategoryCreate() {
    const { data, setData, post, processing, errors } = useForm({ name: '' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('spare-part-categories.store'));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Spare Part Categories', href: '/spare-part-categories' },
            { title: 'Create', href: '/spare-part-categories/create' },
        ]}>
            <Head title="Create Category" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Create Spare Part Category</CardTitle>
                        <Button asChild variant="outline">
                            <Link href={route('spare-part-categories.index')}>Back to list</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-1">
                                <Label>Name</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                            </div>
                            <CardFooter className="px-0">
                                <Button type="submit" disabled={processing}>Create Category</Button>
                            </CardFooter>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

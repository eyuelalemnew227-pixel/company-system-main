import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';

type Category = { id: number; name: string };

type PageProps = {
    categories: Category[];
};

export default function SparePartCreate({ categories }: PageProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        article_code: '',
        description: '',
        spare_part_category_id: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('spare-parts.store'));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Spare Parts', href: '/spare-parts' },
            { title: 'Create', href: '/spare-parts/create' },
        ]}>
            <Head title="Create Spare Part" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Create Spare Part</CardTitle>
                        <Button asChild variant="outline">
                            <Link href={route('spare-parts.index')}>Back to list</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-1">
                                    <Label>Name</Label>
                                    <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label>Article Code</Label>
                                    <Input value={data.article_code} onChange={(e) => setData('article_code', e.target.value)} />
                                    {errors.article_code && <p className="text-sm text-red-600">{errors.article_code}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label>Category</Label>
                                    <Select value={data.spare_part_category_id} onValueChange={(v) => setData('spare_part_category_id', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.spare_part_category_id && <p className="text-sm text-red-600">{errors.spare_part_category_id}</p>}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>Description</Label>
                                <Textarea rows={3} value={data.description} onChange={(e) => setData('description', e.target.value)} />
                                {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
                            </div>
                            <CardFooter className="px-0">
                                <Button type="submit" disabled={processing}>Create Spare Part</Button>
                            </CardFooter>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

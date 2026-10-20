import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'TD KPI', href: '/training/td-kpi/training-types' },
	{ title: 'Training Types', href: '/training/td-kpi/training-types' },
	{ title: 'Create', href: '/training/td-kpi/training-types/create' },
];

export default function TrainingTypeCreate() {
	const { data, setData, post, processing, errors } = useForm({
		name: '',
		status: 'active',
	});

	function submit(e: React.FormEvent) {
		e.preventDefault();
		post('/training/td-kpi/training-types');
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Create Training Type" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>Create Training Type</CardTitle>
						<CardAction>
							<Link href="/training/td-kpi/training-types">
								<Button variant="outline">Go Back</Button>
							</Link>
						</CardAction>
					</CardHeader>
					<hr />
					<CardContent className="pt-6">
						<form onSubmit={submit} className="mx-auto max-w-lg space-y-4">
							<div>
								<Label htmlFor="name">Name</Label>
								<Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} />
								<InputError message={errors.name} />
							</div>
							<div>
								<Label htmlFor="status">Status</Label>
								<Select value={data.status} onValueChange={(value) => setData('status', value)}>
									<SelectTrigger id="status">
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="inactive">Inactive</SelectItem>
									</SelectContent>
								</Select>
								<InputError message={errors.status} />
							</div>
							<div className="flex justify-end gap-2">
								<Link href="/training/td-kpi/training-types">
									<Button type="button" variant="outline">
										Cancel
									</Button>
								</Link>
								<Button type="submit" disabled={processing}>
									Save
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</AppLayout>
	);
}

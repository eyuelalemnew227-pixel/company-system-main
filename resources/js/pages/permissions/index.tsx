import InputError from '@/components/input-error';
import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Permission, SinglePermission } from '@/types/role_permission';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Permissions',
		href: '/permissions',
	},
];

export default function Permissions({ permissions, request }: { permissions: Permission, request?: { search?: string } }) {
	const [openAddPermissionDialog, setOpenAddPermissionDialog] = useState(false);
	const [openEditPermissionDialog, setOpenEditPermissionDialog] = useState(false);
	const { flash } = usePage<{ flash: { message?: string } }>().props;

    const [search, setSearch] = useState<string>(request?.search ?? '');

	const { can } = usePermission();

	useEffect(() => {
		if (flash.message) {
			setOpenAddPermissionDialog(false);
			setOpenEditPermissionDialog(false);
			toast.success(flash.message);
		}
	}, [flash.message]);

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/permissions', { search }, { preserveState: true, replace: true });
    }

	const {
		data,
		setData,
		post,
		put,
		delete: destroy,
		processing,
		errors,
		reset,
	} = useForm({
		id: 0,
		name: '',
	});

	function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		post('/permissions', {
			onSuccess: () => {
				reset('name');
			},
		});
	}

	function edit(permission: SinglePermission) {
		setData('name', permission.name);
		setData('id', permission.id);
		setOpenEditPermissionDialog(true);
	}

	function update(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		put(`/permissions/${data.id}`);
	}

	function deletePermission(id: number) {
		destroy(`/permissions/${id}`);
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Permissions" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<CardTitle>Permissions Management</CardTitle>
                        <form className="ml-4 flex gap-2" onSubmit={submitSearch}>
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search permissions..." />
                            <Button type="submit" variant="outline">Search</Button>
                        </form>
						<CardAction>
							{can('create permissions') && (
								<Button
									variant={'default'}
									onClick={() => {
										setOpenAddPermissionDialog(true);
									}}
								>
									Add New
								</Button>
							)}
						</CardAction>
					</CardHeader>
					<hr />
					<CardContent>
						<Table>
							<TableHeader className="bg-slate-500 dark:bg-slate-700">
								<TableRow>
									<TableHead className="font-bold text-white">ID</TableHead>
									<TableHead className="font-bold text-white">Name</TableHead>
									<TableHead className="font-bold text-white">Created At</TableHead>
									<TableHead className="font-bold text-white">Actions</TableHead>
								</TableRow>
							</TableHeader>
                        <TableBody>
                            {permissions.data
                                .map((permission, index) => (
									<TableRow className="odd:bg-slate-100 dark:odd:bg-slate-800">
										<TableCell>{index + 1}</TableCell>
										<TableCell>{permission.name}</TableCell>
										<TableCell>{permission.created_at}</TableCell>
										<TableCell>
											{can('update permissions') && (
												<Button variant={'outline'} size={'sm'} onClick={() => edit(permission)}>
													Edit
												</Button>
											)}
											{can('delete permissions') && (
												<Button
													className="m-2"
													variant={'destructive'}
													size={'sm'}
													onClick={() => deletePermission(permission.id)}
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
					{permissions.data.length > 0 ? (
						<TablePagination total={permissions.total} from={permissions.from} to={permissions.to} links={permissions.links} />
					) : (
						<div className="flex h-full items-center justify-center">No Results Found!</div>
					)}
				</Card>

				{/* add new permission dialog start */}
				<Dialog open={openAddPermissionDialog} onOpenChange={setOpenAddPermissionDialog}>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>Add New Permission</DialogTitle>
						</DialogHeader>
						<hr />
						<form onSubmit={submit}>
							<div className="grid gap-4">
								<div className="grid gap-3">
									<Label htmlFor="name">Permission Name</Label>
									<Input
										id="name"
										type="text"
										value={data.name}
										onChange={(e) => setData('name', e.target.value)}
										aria-invalid={!!errors.name}
									/>
									<InputError message={errors.name} />
								</div>
							</div>
							<DialogFooter className="mt-4">
								<DialogClose asChild>
									<Button variant="outline">Cancel</Button>
								</DialogClose>
								<Button type="submit" disabled={processing}>
									{processing && <Loader2 className="animate-spin" />}
									<span>Create</span>
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
				{/* add new permission dialog end */}

				{/* edit permission dialog start */}
				<Dialog open={openEditPermissionDialog} onOpenChange={setOpenEditPermissionDialog}>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>Edit Permission</DialogTitle>
						</DialogHeader>
						<hr />
						<form onSubmit={update}>
							<div className="grid gap-4">
								<div className="grid gap-3">
									<Label htmlFor="name">Permission Name</Label>
									<Input
										id="name"
										type="text"
										value={data.name}
										onChange={(e) => setData('name', e.target.value)}
										aria-invalid={!!errors.name}
									/>
									<InputError message={errors.name} />
								</div>
							</div>
							<DialogFooter className="mt-4">
								<DialogClose asChild>
									<Button variant="outline">Cancel</Button>
								</DialogClose>
								<Button type="submit" disabled={processing}>
									{processing && <Loader2 className="animate-spin" />}
									<span>Update</span>
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
				{/* edit permission dialog end */}
			</div>
		</AppLayout>
	);
}

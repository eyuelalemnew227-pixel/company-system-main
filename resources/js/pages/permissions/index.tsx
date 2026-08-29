import InputError from '@/components/input-error';
import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { getPermissionCategory } from '@/lib/permission-categories';
import { type BreadcrumbItem } from '@/types';
import { Permission, SinglePermission } from '@/types/role_permission';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Loader2, ShieldCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Permissions',
		href: '/permissions',
	},
];

export default function Permissions({ permissions, request }: { permissions: Permission; request?: { search?: string } }) {
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
		if (confirm('Are you sure you want to delete this permission?')) {
			destroy(`/permissions/${id}`);
		}
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Permissions" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<div>
							<CardTitle>Permissions Management</CardTitle>
							<p className="mt-1 text-xs text-muted-foreground">
								Browse and manage application permissions by system module
							</p>
						</div>
						<form className="ml-4 flex gap-2" onSubmit={submitSearch}>
							<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search permissions or categories..." />
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
									Add New Permission
								</Button>
							)}
						</CardAction>
					</CardHeader>
					<hr />
					<CardContent>
						<Table>
							<TableHeader className="bg-slate-500 dark:bg-slate-700">
								<TableRow>
									<TableHead className="font-bold text-white w-16">ID</TableHead>
									<TableHead className="font-bold text-white">Permission Name</TableHead>
									<TableHead className="font-bold text-white">Module Category</TableHead>
									<TableHead className="font-bold text-white w-36">Created At</TableHead>
									<TableHead className="font-bold text-white w-40">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{permissions.data.map((permission, index) => {
									const categoryName = permission.category || getPermissionCategory(permission.name);

									return (
										<TableRow key={permission.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
											<TableCell className="font-medium">{index + 1}</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<ShieldCheck className="h-4 w-4 text-emerald-600" />
													<span className="font-mono text-xs">{permission.name}</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="secondary" className="font-semibold">
													{categoryName}
												</Badge>
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">{permission.created_at}</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													{can('update permissions') && (
														<Button variant={'outline'} size={'sm'} onClick={() => edit(permission)}>
															Edit
														</Button>
													)}
													{can('delete permissions') && (
														<Button
															variant={'destructive'}
															size={'sm'}
															onClick={() => deletePermission(permission.id)}
														>
															Delete
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</CardContent>
					{permissions.data.length > 0 ? (
						<TablePagination total={permissions.total} from={permissions.from} to={permissions.to} links={permissions.links} />
					) : (
						<div className="flex h-32 items-center justify-center text-muted-foreground">No Permissions Found!</div>
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
										placeholder="e.g. ticket.view or view users"
										value={data.name}
										onChange={(e) => setData('name', e.target.value)}
										aria-invalid={!!errors.name}
									/>
									{data.name && (
										<p className="text-xs text-muted-foreground">
											Assigned Module: <span className="font-semibold text-primary">{getPermissionCategory(data.name)}</span>
										</p>
									)}
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
									{data.name && (
										<p className="text-xs text-muted-foreground">
											Assigned Module: <span className="font-semibold text-primary">{getPermissionCategory(data.name)}</span>
										</p>
									)}
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

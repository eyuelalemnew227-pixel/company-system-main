import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { groupPermissionsList } from '@/lib/permission-categories';
import { type BreadcrumbItem } from '@/types';
import { Role, SingleRole } from '@/types/role_permission';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, Grid, Shield, ShieldAlert } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Roles',
		href: '/roles',
	},
];

export default function Roles({ roles, request }: { roles: Role; request?: { search?: string } }) {
	const { flash } = usePage<{ flash: { message?: string } }>().props;
	const [search, setSearch] = useState<string>(request?.search ?? '');
	const [selectedRoleForView, setSelectedRoleForView] = useState<SingleRole | null>(null);

	const { can } = usePermission();

	useEffect(() => {
		if (flash.message) {
			toast.success(flash.message);
		}
	}, [flash.message]);

	function submitSearch(e: React.FormEvent) {
		e.preventDefault();
		router.get('/roles', { search }, { preserveState: true, replace: true });
	}

	function deleteRole(id: number) {
		if (confirm('Are you sure want to delete this role?')) {
			router.delete(`/roles/${id}`);
		}
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Roles" />
			<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
				<Card>
					<CardHeader className="flex items-center justify-between">
						<div>
							<CardTitle>Roles Management</CardTitle>
							<p className="mt-1 text-xs text-muted-foreground">Manage user roles and categorized module permissions</p>
						</div>
						<form className="ml-4 flex gap-2" onSubmit={submitSearch}>
							<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search roles..." />
							<Button type="submit" variant="outline">Search</Button>
						</form>
						<CardAction className="flex items-center gap-2">
							<Link href={'/roles/matrix'}>
								<Button variant={'outline'} className="gap-1.5">
									<Grid className="h-4 w-4" />
									<span>Compare Matrix View</span>
								</Button>
							</Link>
							{can('create roles') && (
								<Link href={'/roles/create'}>
									<Button variant={'default'}>Add New Role</Button>
								</Link>
							)}
						</CardAction>
					</CardHeader>
					<hr />
					<CardContent>
						<Table>
							<TableHeader className="bg-slate-500 dark:bg-slate-700">
								<TableRow>
									<TableHead className="font-bold text-white w-16">ID</TableHead>
									<TableHead className="font-bold text-white w-48">Role Name</TableHead>
									<TableHead className="font-bold text-white">Categorized Permissions Summary</TableHead>
									<TableHead className="font-bold text-white w-32">Created At</TableHead>
									<TableHead className="font-bold text-white w-44">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{roles.data.map((role, index) => {
									const grouped = role.grouped_permissions || groupPermissionsList(role.permissions);
									const totalPerms = role.permissions.length;

									return (
										<TableRow key={role.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
											<TableCell className="font-medium">{index + 1}</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Shield className="h-4 w-4 text-primary" />
													<span className="font-semibold text-slate-900 dark:text-slate-100">{role.name}</span>
												</div>
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap items-center gap-1.5">
													{Object.entries(grouped).slice(0, 5).map(([cat, perms]) => (
														<Badge key={cat} variant="secondary" className="text-xs bg-slate-200/80 dark:bg-slate-700">
															{cat}: <span className="ml-1 font-bold">{perms.length}</span>
														</Badge>
													))}
													{Object.keys(grouped).length > 5 && (
														<Badge variant="outline" className="text-xs">
															+{Object.keys(grouped).length - 5} more modules
														</Badge>
													)}
													<Button
														variant="ghost"
														size="sm"
														className="h-6 px-2 text-xs text-primary gap-1"
														onClick={() => setSelectedRoleForView(role)}
													>
														<Eye className="h-3 w-3" />
														View All ({totalPerms})
													</Button>
												</div>
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">{role.created_at}</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													{can('update roles') && (
														<Link href={`/roles/${role.id}/edit`}>
															<Button variant={'outline'} size={'sm'}>
																Edit
															</Button>
														</Link>
													)}
													{can('delete roles') && (
														<Button
															variant={'destructive'}
															size={'sm'}
															onClick={() => deleteRole(role.id)}
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
					{roles.data.length > 0 ? (
						<TablePagination total={roles.total} from={roles.from} to={roles.to} links={roles.links} />
					) : (
						<div className="flex h-32 items-center justify-center text-muted-foreground">No Roles Found!</div>
					)}
				</Card>

				{/* Role Permission Detail Modal */}
				{selectedRoleForView && (
					<Dialog open={!!selectedRoleForView} onOpenChange={() => setSelectedRoleForView(null)}>
						<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
							<DialogHeader>
								<DialogTitle className="flex items-center gap-2 text-lg">
									<Shield className="h-5 w-5 text-primary" />
									Role Permissions: {selectedRoleForView.name}
								</DialogTitle>
								<p className="text-xs text-muted-foreground">
									Total {selectedRoleForView.permissions.length} permissions granted across modules.
								</p>
							</DialogHeader>

							<div className="space-y-4 py-2">
								{Object.entries(
									selectedRoleForView.grouped_permissions || groupPermissionsList(selectedRoleForView.permissions)
								).map(([category, perms]) => (
									<Card key={category} className="p-3">
										<div className="flex items-center justify-between font-semibold text-sm mb-2 border-b pb-1.5">
											<span>{category}</span>
											<Badge variant="secondary">{perms.length} Permissions</Badge>
										</div>
										<div className="flex flex-wrap gap-1.5">
											{perms.map((p) => (
												<Badge key={p} variant="outline" className="text-xs bg-slate-50 dark:bg-slate-900">
													{p}
												</Badge>
											))}
										</div>
									</Card>
								))}
							</div>
						</DialogContent>
					</Dialog>
				)}
			</div>
		</AppLayout>
	);
}

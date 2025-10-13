import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Role } from '@/types/role_permission';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Roles',
		href: '/roles',
	},
];

export default function Roles({ roles, request }: { roles: Role, request?: { search?: string } }) {
	const { flash } = usePage<{ flash: { message?: string } }>().props;
    const [search, setSearch] = useState<string>(request?.search ?? '');

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
						<CardTitle>Roles Management</CardTitle>
                        <form className="ml-4 flex gap-2" onSubmit={submitSearch}>
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search roles..." />
                            <Button type="submit" variant="outline">Search</Button>
                        </form>
						<CardAction>
							{can('create roles') && (
								<Link href={'roles/create'}>
									<Button variant={'default'}>Add New</Button>
								</Link>
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
									<TableHead className="font-bold text-white">Permissions</TableHead>
									<TableHead className="font-bold text-white">Created At</TableHead>
									<TableHead className="font-bold text-white">Actions</TableHead>
								</TableRow>
							</TableHeader>
                            <TableBody>
                                {roles.data
                                    .map((role, index) => (
									<TableRow className="odd:bg-slate-100 dark:odd:bg-slate-800">
										<TableCell>{index + 1}</TableCell>
										<TableCell>{role.name}</TableCell>
										<TableCell className="flex flex-wrap items-center gap-2">
											{role.permissions.map((perm, index) => (
												<Badge variant={'outline'} key={index}>
													{perm}
												</Badge>
											))}
										</TableCell>
										<TableCell>{role.created_at}</TableCell>
										<TableCell>
											{can('update roles') && (
												<Link href={`/roles/${role.id}/edit`}>
													<Button variant={'outline'} size={'sm'}>
														Edit
													</Button>
												</Link>
											)}
											{can('delete roles') && (
												<Button className="m-2" variant={'destructive'} size={'sm'} onClick={() => deleteRole(role.id)}>
													Delete
												</Button>
											)}
										</TableCell>
									</TableRow>
                                ))}
							</TableBody>
						</Table>
					</CardContent>
					{roles.data.length > 0 ? (
						<TablePagination total={roles.total} from={roles.from} to={roles.to} links={roles.links} />
					) : (
						<div className="flex h-full items-center justify-center">No Results Found!</div>
					)}
				</Card>
			</div>
		</AppLayout>
	);
}

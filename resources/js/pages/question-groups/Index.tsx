import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { usePermission } from '@/hooks/user-permissions';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import React from 'react';
import type { QuestionGroup } from '@/types/question-groups';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Question Groups', href: '/question-groups' },
];

export default function QuestionGroupsIndex({ groups }: { groups: { data: QuestionGroup[]; total: number; from: number; to: number; links: any[] } }) {
    const { can } = usePermission();
    const initialSearch = ((window as any).Inertia?.page?.props?.request?.search) ?? '';
    const [search, setSearch] = React.useState(initialSearch);

    function handleSearch() {
        router.get('/question-groups', { search: search ?? '' }, { preserveState: true, replace: true });
    }

    function deleteGroup(id: number) {
        if (confirm('Are you sure?')) {
            router.delete(`/question-groups/${id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Question Groups" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Question Groups</CardTitle>
                        <div className="ml-4 flex gap-2">
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups..." onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} />
                            <Button variant="secondary" onClick={handleSearch}>Search</Button>
                        </div>
                        <CardAction>
                            {can('create question groups') && (
                                <Link href="/question-groups/create">
                                    <Button variant="default">Add New</Button>
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
                                    <TableHead className="font-bold text-white">Questions</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groups.data.map((g, index) => (
                                    <TableRow key={g.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{(groups.from ?? 0) + index}</TableCell>
                                        <TableCell className="font-medium">{g.name}</TableCell>
                                        <TableCell>{g.questions_count ?? 0}</TableCell>
                                        <TableCell className="space-x-2">
                                            {can('update question groups') && (
                                                <Link href={`/question-groups/${g.id}/edit`}>
                                                    <Button size="sm" variant="secondary">Edit</Button>
                                                </Link>
                                            )}
                                            {can('delete question groups') && (
                                                <Button size="sm" variant="destructive" onClick={() => deleteGroup(g.id)}>Delete</Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {groups.data.length > 0 ? (
                        <TablePagination total={groups.total} from={groups.from} to={groups.to} links={groups.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-8">No Results Found!</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}



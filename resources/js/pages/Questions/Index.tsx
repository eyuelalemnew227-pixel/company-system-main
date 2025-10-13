import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type QuestionPagination } from '@/types/question.d';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Questions',
        href: '/questions',
    },
];

export default function Questions({ questions }: { questions: QuestionPagination }) {
    const { flash } = usePage<{ flash: { message?: string } }>().props;
    const initialSearch = ((usePage().props as any)?.request?.search) ?? '';
    const [search, setSearch] = useState<string>(initialSearch);
    const { can } = usePermission();

    useEffect(() => {
        if (flash.message) {
            toast.success(flash.message);
        }
    }, [flash.message]);

    function handleSearch() {
        router.get('/questions', { search: search ?? '' }, { preserveState: true, replace: true });
    }

    function deleteQuestion(id: number) {
        if (confirm('Are you sure you want to delete this question?')) {
            router.delete(`/questions/${id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Questions" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Questions Management</CardTitle>
                        <div className="ml-4 flex gap-2">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search questions..."
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                            />
                            <Button variant="secondary" onClick={handleSearch}>Search</Button>
                        </div>
                        <CardAction>
                            {can('create questions') && (
                                <Link href={'/questions/create'}>
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
                                    <TableHead className="font-bold text-white">Question Text</TableHead>
                                    <TableHead className="font-bold text-white">Evaluation Type</TableHead>
                                    <TableHead className="font-bold text-white">Status</TableHead>
                                    <TableHead className="font-bold text-white">Created At</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {questions.data
                                    .map((question, index) => (
                                    <TableRow key={question.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell className="max-w-md truncate">{question.question_text}</TableCell>
                                        <TableCell>{question.evaluation_type?.name}</TableCell>
                                        <TableCell>
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                                    question.status === 'active'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}
                                            >
                                                {question.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>{new Date(question.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            {can('update questions') && (
                                                <Link href={`/questions/${question.id}/edit`}>
                                                    <Button variant={'outline'} size={'sm'}>
                                                        Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {can('delete questions') && (
                                                <Button
                                                    className="m-2"
                                                    variant={'destructive'}
                                                    size={'sm'}
                                                    onClick={() => deleteQuestion(question.id)}
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
                    {questions.data.length > 0 ? (
                        <TablePagination total={questions.total} from={questions.from} to={questions.to} links={questions.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-8">No Questions Found!</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}


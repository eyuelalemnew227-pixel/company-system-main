import TablePagination from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, ChevronsUpDown, Search } from 'lucide-react';
import type { EvaluationPagination } from '@/types/evaluation';
import type { PageProps } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

type Props = PageProps & {
    evaluations: EvaluationPagination;
    request: {
        search?: string;
        evaluation_name?: string;
        evaluator_group_id?: string;
        evaluates_group_id?: string;
    };
    evaluatorGroups: { id: number; name: string }[];
    evaluatesGroups: { id: number; name: string }[];
};

export default function Index({ evaluations, request, evaluatorGroups, evaluatesGroups }: Props) {
    const { can } = usePermission();

    const [evaluationName, setEvaluationName] = useState(request?.evaluation_name ?? 'all');
    const [evaluatorGroupId, setEvaluatorGroupId] = useState(request?.evaluator_group_id ?? 'all');
    const [evaluatesGroupId, setEvaluatesGroupId] = useState(request?.evaluates_group_id ?? 'all');

    const [openEvaluator, setOpenEvaluator] = useState(false);
    const [openEvaluates, setOpenEvaluates] = useState(false);

    const handleFilterChange = () => {
        router.get(route('evaluations.index'), {
            evaluation_name: evaluationName === 'all' ? undefined : evaluationName,
            evaluator_group_id: evaluatorGroupId === 'all' ? undefined : evaluatorGroupId,
            evaluates_group_id: evaluatesGroupId === 'all' ? undefined : evaluatesGroupId,
        }, { preserveState: true, replace: true });
    };



    // Handle other filters immediately
    useEffect(() => {
        if (evaluationName !== (request.evaluation_name || 'all') ||
            evaluatorGroupId !== (request.evaluator_group_id || 'all') ||
            evaluatesGroupId !== (request.evaluates_group_id || 'all')) {
            handleFilterChange();
        }
    }, [evaluationName, evaluatorGroupId, evaluatesGroupId]);

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this evaluation?')) {
            router.delete(route('evaluations.destroy', id));
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Evaluations', href: '/evaluations' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evaluations" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex flex-col gap-4">
                        <div className="flex items-center justify-between w-full">
                            <CardTitle>Evaluations Management</CardTitle>
                            <CardAction>
                                {can('create evaluations') && (
                                    <Link href={'/evaluations/create'}>
                                        <Button variant={'default'}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add New
                                        </Button>
                                    </Link>
                                )}
                            </CardAction>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">


                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={evaluationName}
                                onChange={(e) => setEvaluationName(e.target.value)}
                            >
                                <option value="all">All Evaluations</option>
                                <option value="Peer to Peer Evaluation">Peer to Peer Evaluation</option>
                                <option value="Bottom Up Evaluation">Bottom Up Evaluation</option>
                                <option value="Top Down Evaluation">Top Down Evaluation</option>
                                <option value="Department to Department">Department to Department</option>
                                <option value="Branch Managers Evaluation">Branch Managers Evaluation</option>
                            </select>

                            <Popover open={openEvaluator} onOpenChange={setOpenEvaluator}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openEvaluator}
                                        className="w-full justify-between font-normal"
                                    >
                                        {evaluatorGroupId !== 'all'
                                            ? evaluatorGroups.find((g) => g.id.toString() === evaluatorGroupId)?.name
                                            : 'All Evaluator Groups'}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search groups..." />
                                        <CommandList>
                                            <CommandEmpty>No groups found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    value="all"
                                                    onSelect={() => {
                                                        setEvaluatorGroupId('all');
                                                        setOpenEvaluator(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            evaluatorGroupId === 'all' ? 'opacity-100' : 'opacity-0'
                                                        )}
                                                    />
                                                    All Evaluator Groups
                                                </CommandItem>
                                                {evaluatorGroups.map((group) => (
                                                    <CommandItem
                                                        key={group.id}
                                                        value={group.name}
                                                        onSelect={() => {
                                                            setEvaluatorGroupId(group.id.toString());
                                                            setOpenEvaluator(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-4 w-4',
                                                                evaluatorGroupId === group.id.toString() ? 'opacity-100' : 'opacity-0'
                                                            )}
                                                        />
                                                        {group.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            <Popover open={openEvaluates} onOpenChange={setOpenEvaluates}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openEvaluates}
                                        className="w-full justify-between font-normal"
                                    >
                                        {evaluatesGroupId !== 'all'
                                            ? evaluatesGroups.find((g) => g.id.toString() === evaluatesGroupId)?.name
                                            : 'All Evaluates Groups'}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search groups..." />
                                        <CommandList>
                                            <CommandEmpty>No groups found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    value="all"
                                                    onSelect={() => {
                                                        setEvaluatesGroupId('all');
                                                        setOpenEvaluates(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            evaluatesGroupId === 'all' ? 'opacity-100' : 'opacity-0'
                                                        )}
                                                    />
                                                    All Evaluates Groups
                                                </CommandItem>
                                                {evaluatesGroups.map((group) => (
                                                    <CommandItem
                                                        key={group.id}
                                                        value={group.name}
                                                        onSelect={() => {
                                                            setEvaluatesGroupId(group.id.toString());
                                                            setOpenEvaluates(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-4 w-4',
                                                                evaluatesGroupId === group.id.toString() ? 'opacity-100' : 'opacity-0'
                                                            )}
                                                        />
                                                        {group.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>


                        </div>
                    </CardHeader>
                    <hr />
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-slate-500 dark:bg-slate-700">
                                <TableRow>
                                    <TableHead className="font-bold text-white">ID</TableHead>
                                    <TableHead className="font-bold text-white">Name</TableHead>
                                    <TableHead className="font-bold text-white">Evaluator Group</TableHead>
                                    <TableHead className="font-bold text-white">Evaluates Group</TableHead>
                                    <TableHead className="font-bold text-white">Type</TableHead>
                                    <TableHead className="font-bold text-white">Created At</TableHead>
                                    <TableHead className="font-bold text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evaluations.data.map((evaluation: any, index: number) => (
                                    <TableRow key={evaluation.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                        <TableCell>{(evaluations.from ?? 0) + index}</TableCell>
                                        <TableCell className="font-medium">{evaluation.name}</TableCell>
                                        <TableCell>{evaluation.evaluator_group?.name}</TableCell>
                                        <TableCell>{evaluation.evaluates_group?.name}</TableCell>
                                        <TableCell>{evaluation.evaluates_group?.evaluable_type ?? 'N/A'}</TableCell>
                                        <TableCell>{evaluation.created_at ? new Date(evaluation.created_at).toLocaleDateString() : '—'}</TableCell>
                                        <TableCell>
                                            {can('update evaluations') && (
                                                <Link href={`/evaluations/${evaluation.id}/edit`}>
                                                    <Button variant={'outline'} size={'sm'}>
                                                        <Pencil className="h-4 w-4" />
                                                        Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {can('delete evaluations') && (
                                                <Button
                                                    className="m-2"
                                                    variant={'destructive'}
                                                    size={'sm'}
                                                    onClick={() => handleDelete(evaluation.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {evaluations.data.length > 0 ? (
                        <TablePagination total={evaluations.total} from={evaluations.from} to={evaluations.to} links={evaluations.links} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-8">No Results Found!</div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}


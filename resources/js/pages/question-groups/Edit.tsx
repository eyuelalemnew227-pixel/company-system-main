import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import React, { useMemo, useState } from 'react';
import { Search, CheckSquare, XSquare } from 'lucide-react';
import type { QuestionGroup } from '@/types/question-groups';

type QuestionOption = {
    id: number;
    question_text: string;
    evaluation_type_id: number;
    status: string;
    evaluation_type?: { id: number; name: string };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Question Groups', href: '/question-groups' },
    { title: 'Edit Group', href: null },
];

export default function EditQuestionGroup({ group, questions, current_weights }: { group: QuestionGroup; questions: QuestionOption[]; current_weights: Record<number, number> }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');

    const { data, setData, put, errors, processing } = useForm({
        name: group.name,
        question_ids: (group.questions || []).map((q) => q.id) as number[],
        question_weights: current_weights || {} as Record<number, number>,
    });

    // Get unique evaluation types
    const evaluationTypes = useMemo(() => {
        const types = questions
            .map(q => q.evaluation_type)
            .filter((type, index, self) =>
                type && self.findIndex(t => t?.id === type?.id) === index
            );
        return types as { id: number; name: string }[];
    }, [questions]);

    // Filter questions based on search and type
    const filteredQuestions = useMemo(() => {
        return questions.filter(q => {
            const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === 'all' || q.evaluation_type_id.toString() === filterType;
            return matchesSearch && matchesType;
        });
    }, [questions, searchQuery, filterType]);

    function toggleQuestion(id: number, checked: boolean | string) {
        setData('question_ids', checked ? [...data.question_ids, id] : data.question_ids.filter((x) => x !== id));
    }

    function selectAll() {
        setData('question_ids', filteredQuestions.map(q => q.id));
    }

    function deselectAll() {
        setData('question_ids', []);
    }

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        put(`/question-groups/${group.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Question Group" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Edit Question Group</CardTitle>
                        <CardAction>
                            <Link href="/question-groups">
                                <Button variant="default">Go Back</Button>
                            </Link>
                        </CardAction>
                    </CardHeader>
                    <hr />
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Group Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Select Questions ({data.question_ids.length} selected)</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={selectAll}
                                        >
                                            <CheckSquare className="mr-1 h-4 w-4" />
                                            Select All
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={deselectAll}
                                        >
                                            <XSquare className="mr-1 h-4 w-4" />
                                            Deselect All
                                        </Button>
                                    </div>
                                </div>

                                {/* Search and Filter */}
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <Input
                                            placeholder="Search questions..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <Select value={filterType} onValueChange={setFilterType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Filter by evaluation type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            {evaluationTypes.map((type) => (
                                                <SelectItem key={type.id} value={type.id.toString()}>
                                                    {type.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Questions List */}
                                <div className="max-h-96 overflow-y-auto rounded-md border p-4">
                                    {filteredQuestions.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-gray-500">No questions found</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredQuestions.map((q) => {
                                                const checked = data.question_ids.includes(q.id);
                                                return (
                                                    <div
                                                        key={q.id}
                                                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                                                    >
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={(c) => toggleQuestion(q.id, c)}
                                                        />
                                                        <div className="flex-1">
                                                            <p className="text-sm leading-tight">{q.question_text}</p>
                                                            {q.evaluation_type && (
                                                                <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                                    {q.evaluation_type.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {checked && (
                                                            <div className="w-24">
                                                                <Label htmlFor={`weight-${q.id}`} className="sr-only">Weight</Label>
                                                                <Input
                                                                    id={`weight-${q.id}`}
                                                                    type="number"
                                                                    step="0.1"
                                                                    placeholder="Weight"
                                                                    value={data.question_weights[q.id] || 1.0}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value);
                                                                        setData('question_weights', {
                                                                            ...data.question_weights,
                                                                            [q.id]: isNaN(val) ? 1.0 : val
                                                                        });
                                                                    }}
                                                                    className="h-8"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <InputError message={errors.question_ids as any} />
                            </div>

                            <div className="flex items-center gap-3">
                                <Button type="submit" disabled={processing}>
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}



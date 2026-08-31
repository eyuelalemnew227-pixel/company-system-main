import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/user-permissions';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Award, CheckCircle, Filter, MessageSquare, Plus, RotateCcw, Search, Star, ThumbsUp } from 'lucide-react';
import React, { useState } from 'react';

type Branch = { id: number; name: string };
type Schedule = { id: number; title: string; schedule_date: string };
type FeedbackResponse = {
    id: number;
    trainee_name?: string | null;
    q1_relevance: number;
    q2_objective_clarity: string;
    q3_response_quality: number;
    q4_participatory: number;
    q5_motivating: number;
    q6_gained_new_knowledge: string;
    q7_motivation_diff?: string | null;
    q8_knowledge_increase?: string | null;
    q9_one_word_summary?: string | null;
    q10_most_liked_aspects?: string | null;
    q11_additional_comments?: string | null;
    created_at: string;
    branch?: Branch | null;
    schedule?: Schedule | null;
};

type SummaryStats = {
    total: number;
    avg_q1_relevance: number;
    avg_q3_response_quality: number;
    avg_q4_participatory: number;
    avg_q5_motivating: number;
    gained_knowledge_yes_count: number;
};

type PageProps = {
    responses: FeedbackResponse[];
    summary: SummaryStats;
    schedules: Schedule[];
    branches: Branch[];
    filters?: {
        search: string;
        q6_gained_new_knowledge: string;
    };
};

export default function FeedbackIndex({ responses = [], summary = { total: 0, avg_q1_relevance: 0, avg_q3_response_quality: 0, avg_q4_participatory: 0, avg_q5_motivating: 0, gained_knowledge_yes_count: 0 }, schedules = [], branches = [], filters = { search: '', q6_gained_new_knowledge: 'all' } }: PageProps) {
    const { can } = usePermission();
    const [search, setSearch] = useState(filters.search || '');
    const [knowledgeFilter, setKnowledgeFilter] = useState(filters.q6_gained_new_knowledge || 'all');

    const handleApplyFilters = () => {
        router.get('/training/feedback', {
            search,
            q6_gained_new_knowledge: knowledgeFilter,
        }, { preserveState: true, replace: true });
    };

    const handleResetFilters = () => {
        setSearch('');
        setKnowledgeFilter('all');
        router.get('/training/feedback', {}, { preserveState: true, replace: true });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training Management', href: '/training/dashboard' },
                { title: 'Feedback Questionnaires', href: '/training/feedback' },
            ]}
        >
            <Head title="Participant Feedback Questionnaires" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">ለተሳታፊዎች የቀረቡ ጥያቄዎች (Feedback Questionnaires)</h1>
                        <p className="text-sm text-muted-foreground">
                            Collected feedback responses for the 11 questionnaires submitted by training participants
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {(can('training.feedback.create') || can('training.feedback.manage')) && (
                            <Link href="/training/feedback/create">
                                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-bold">
                                    <Plus className="h-4 w-4" /> Fill Questionnaire (አስተያየት ይስጡ)
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Card className="bg-white dark:bg-slate-900 border shadow-sm">
                        <CardContent className="p-3 text-center">
                            <div className="text-xs text-muted-foreground font-semibold">Total Responses</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{summary.total}</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border shadow-sm">
                        <CardContent className="p-3 text-center">
                            <div className="text-xs text-muted-foreground font-semibold">Q1 Relevance</div>
                            <div className="text-xl font-bold text-amber-600 flex items-center justify-center gap-1 mt-1">
                                <Star className="h-4 w-4 fill-amber-500" /> {summary.avg_q1_relevance}/5
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border shadow-sm">
                        <CardContent className="p-3 text-center">
                            <div className="text-xs text-muted-foreground font-semibold">Q3 Answers Quality</div>
                            <div className="text-xl font-bold text-amber-600 flex items-center justify-center gap-1 mt-1">
                                <Star className="h-4 w-4 fill-amber-500" /> {summary.avg_q3_response_quality}/5
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border shadow-sm">
                        <CardContent className="p-3 text-center">
                            <div className="text-xs text-muted-foreground font-semibold">Q4 Interactive</div>
                            <div className="text-xl font-bold text-amber-600 flex items-center justify-center gap-1 mt-1">
                                <Star className="h-4 w-4 fill-amber-500" /> {summary.avg_q4_participatory}/5
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border shadow-sm">
                        <CardContent className="p-3 text-center">
                            <div className="text-xs text-muted-foreground font-semibold">Q5 Motivating</div>
                            <div className="text-xl font-bold text-amber-600 flex items-center justify-center gap-1 mt-1">
                                <Star className="h-4 w-4 fill-amber-500" /> {summary.avg_q5_motivating}/5
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border shadow-sm">
                        <CardContent className="p-3 text-center">
                            <div className="text-xs text-muted-foreground font-semibold">Q6 Gained Knowledge</div>
                            <div className="text-xl font-bold text-emerald-600 flex items-center justify-center gap-1 mt-1">
                                <ThumbsUp className="h-4 w-4" /> {summary.gained_knowledge_yes_count} Yes
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="border-emerald-100 dark:border-emerald-900 bg-emerald-50/20">
                    <CardHeader className="py-2.5 px-4 border-b border-emerald-100 dark:border-emerald-900">
                        <CardTitle className="text-xs font-bold flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
                            <Filter className="h-3.5 w-3.5 text-emerald-600" /> Filter Feedback Responses
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search respondent name, word summary, comments..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                className="pl-8 text-xs h-9 bg-white dark:bg-slate-950"
                            />
                        </div>

                        <div>
                            <Select value={knowledgeFilter} onValueChange={setKnowledgeFilter}>
                                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950">
                                    <SelectValue placeholder="Q6 Gained Knowledge" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Responses</SelectItem>
                                    <SelectItem value="Yes">Yes (አዎ፣ አዲስ እውቀት አግኝቻለሁ)</SelectItem>
                                    <SelectItem value="No">No (አላገኘሁም)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleApplyFilters} className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 flex-1 font-bold">
                                Filter
                            </Button>
                            <Button onClick={handleResetFilters} variant="outline" className="h-9 text-xs">
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-emerald-600" /> Submitted 11 Amharic Questionnaire Responses ({responses.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-800 text-white">
                                <TableRow>
                                    <TableHead className="font-bold text-white">Trainee & Branch</TableHead>
                                    <TableHead className="font-bold text-white text-center">Q1 Relevance</TableHead>
                                    <TableHead className="font-bold text-white text-center">Q2 Clarity</TableHead>
                                    <TableHead className="font-bold text-white text-center">Q3 Resp</TableHead>
                                    <TableHead className="font-bold text-white text-center">Q4 Inter</TableHead>
                                    <TableHead className="font-bold text-white text-center">Q5 Motiv</TableHead>
                                    <TableHead className="font-bold text-white text-center">Q6 Knowl</TableHead>
                                    <TableHead className="font-bold text-white">Q9 Word Summary</TableHead>
                                    <TableHead className="font-bold text-white">Q10 Liked Aspects & Q11 Comments</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {responses.map((resp) => (
                                    <TableRow key={resp.id} className="odd:bg-muted/40">
                                        <TableCell>
                                            <div className="font-bold text-slate-900 dark:text-slate-100">{resp.trainee_name || 'Participant'}</div>
                                            <div className="text-xs text-muted-foreground">{resp.branch?.name ?? 'General'}</div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono font-bold text-amber-600">{resp.q1_relevance}/5</TableCell>
                                        <TableCell className="text-center text-xs font-semibold">{resp.q2_objective_clarity}</TableCell>
                                        <TableCell className="text-center font-mono font-bold text-amber-600">{resp.q3_response_quality}/5</TableCell>
                                        <TableCell className="text-center font-mono font-bold text-amber-600">{resp.q4_participatory}/5</TableCell>
                                        <TableCell className="text-center font-mono font-bold text-amber-600">{resp.q5_motivating}/5</TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={resp.q6_gained_new_knowledge === 'Yes' ? 'bg-emerald-600' : 'bg-slate-500'}>
                                                {resp.q6_gained_new_knowledge}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold text-purple-700 dark:text-purple-400 text-xs">
                                            {resp.q9_one_word_summary || '-'}
                                        </TableCell>
                                        <TableCell className="max-w-xs text-xs space-y-1">
                                            {resp.q10_most_liked_aspects && (
                                                <div><span className="font-bold text-emerald-600">Loved:</span> {resp.q10_most_liked_aspects}</div>
                                            )}
                                            {resp.q11_additional_comments && (
                                                <div className="text-muted-foreground"><span>Comments:</span> {resp.q11_additional_comments}</div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {responses.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            No questionnaire responses submitted yet. Click "Fill Questionnaire" to submit feedback.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

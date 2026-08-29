import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Building,
    Calendar,
    Loader2,
    Send,
    Star,
    ThumbsUp,
    UserCheck,
} from 'lucide-react';
import React from 'react';

type ScheduleItem = {
    id: number;
    topic_title: string;
    allocated_minutes: number;
    start_time: string;
    end_time: string;
    department?: { id: number; name: string } | null;
    schedule?: { id: number; title: string; schedule_date: string } | null;
};

type Branch = { id: number; name: string };
type Department = { id: number; name: string };

type PageProps = {
    scheduleItem?: ScheduleItem | null;
    scheduleItems?: ScheduleItem[];
    userBranch?: Branch | null;
    branches: Branch[];
    departments: Department[];
};

export default function TrainerEvaluationForm({
    scheduleItem = null,
    scheduleItems = [],
    userBranch,
    branches = [],
    departments = [],
}: PageProps) {
    const [deptSearch, setDeptSearch] = React.useState('');

    const filteredDepartments = departments.filter((d) =>
        d.name.toLowerCase().includes(deptSearch.toLowerCase())
    );

    const defaultTrainerDeptId = scheduleItem?.department?.id
        ? String(scheduleItem.department.id)
        : (departments[0]?.id ? String(departments[0].id) : '');

    const { data, setData, post, processing, errors } = useForm({
        training_schedule_item_id: scheduleItem?.id ? String(scheduleItem.id) : '',
        trainer_department_id: defaultTrainerDeptId,
        evaluator_branch_id: userBranch?.id ? String(userBranch.id) : (branches[0]?.id ? String(branches[0].id) : ''),
        content_clarity_rating: 5,
        preparation_rating: 5,
        time_management_rating: 5,
        applicability_rating: 5,
        strengths: '',
        areas_for_improvement: '',
        feedback_notes: '',
        attendance_confirmed: true as boolean,
    });

    const renderRatingStars = (
        value: number,
        onChange: (rating: number) => void,
        label: string,
        description: string
    ) => {
        return (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <Label className="font-bold text-sm text-slate-900 dark:text-slate-100">{label}</Label>
                        <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => onChange(star)}
                                className="p-1 focus:outline-none transition-transform hover:scale-110"
                            >
                                <Star
                                    className={`h-6 w-6 ${
                                        star <= value
                                            ? 'text-amber-500 fill-amber-500'
                                            : 'text-slate-300 dark:text-slate-700'
                                    }`}
                                />
                            </button>
                        ))}
                        <span className="ml-2 font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                            {value}/5
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/training/evaluations');
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training Management', href: '/training/dashboard' },
                { title: 'Master Schedules', href: '/training/schedules' },
                { title: 'Evaluate Trainer Department', href: '#' },
            ]}
        >
            <Head title="Evaluate Trainer Department" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-3xl mx-auto">
                <div className="flex items-center gap-3">
                    <Link href="/training/evaluations">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Trainer Department Evaluation</h1>
                        <p className="text-xs text-muted-foreground">
                            Super Admin & Branch Manager evaluation for presenting Trainer Departments
                        </p>
                    </div>
                </div>

                <Card className="border-2 border-slate-300 dark:border-slate-800 shadow-md">
                    <CardHeader className="bg-slate-100 dark:bg-slate-900 border-b p-4 rounded-t-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <Badge variant="secondary" className="mb-1">
                                    Trainer Department: {scheduleItem?.department?.name ?? 'Select Below'}
                                </Badge>
                                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {scheduleItem?.topic_title || 'General Trainer Department Evaluation'}
                                </CardTitle>
                                {scheduleItem?.schedule && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        📅 {scheduleItem.schedule.title} ({scheduleItem.schedule.schedule_date})
                                    </p>
                                )}
                            </div>
                            {scheduleItem && (
                                <Badge className="bg-purple-700 px-3 py-1 font-mono">
                                    {scheduleItem.start_time} - {scheduleItem.end_time}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="p-6 space-y-6">
                            {/* Branch & Trainer Department Selection */}
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-3">
                                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-sm">
                                    <UserCheck className="h-5 w-5 text-emerald-600" />
                                    1. Evaluator & Trainer Department Info
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs font-semibold mb-1 block">Evaluator Branch Location</Label>
                                        <SearchableSelect
                                            options={branches}
                                            value={data.evaluator_branch_id}
                                            onValueChange={(val) => setData('evaluator_branch_id', val)}
                                            placeholder="Select Branch..."
                                            searchPlaceholder="Search branch..."
                                            className="w-full"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-xs font-semibold mb-1 block">Trainer Department Evaluated <span className="text-rose-500">*</span></Label>
                                        <SearchableSelect
                                            options={departments}
                                            value={data.trainer_department_id}
                                            onValueChange={(val) => setData('trainer_department_id', val)}
                                            placeholder="Select Trainer Department..."
                                            searchPlaceholder="Search submitted department..."
                                            className="w-full font-bold text-purple-700 dark:text-purple-300"
                                        />
                                        <InputError message={errors.trainer_department_id} />
                                    </div>

                                    {scheduleItems.length > 0 && !scheduleItem && (
                                        <div className="sm:col-span-2">
                                            <Label className="text-xs font-semibold">Link to Timetable Session (Optional)</Label>
                                            <select
                                                value={data.training_schedule_item_id}
                                                onChange={(e) => {
                                                    const selected = scheduleItems.find(s => String(s.id) === e.target.value);
                                                    setData((prev) => ({
                                                        ...prev,
                                                        training_schedule_item_id: e.target.value,
                                                        trainer_department_id: selected?.department?.id ? String(selected.department.id) : prev.trainer_department_id,
                                                    }));
                                                }}
                                                className="mt-1 w-full rounded-md border border-input bg-white p-2 text-xs dark:bg-slate-950 font-medium"
                                            >
                                                <option value="">-- General Evaluation (Not linked to specific timetable slot) --</option>
                                                {scheduleItems.map((si) => (
                                                    <option key={si.id} value={si.id}>
                                                        [{si.department?.name}] {si.topic_title} ({si.schedule?.schedule_date || 'Schedule'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id="attendance_confirmed"
                                            checked={data.attendance_confirmed}
                                            onChange={(e) => setData('attendance_confirmed', e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <Label htmlFor="attendance_confirmed" className="text-xs font-bold cursor-pointer">
                                            I confirm that I attended/evaluated this department training session.
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            {/* Rating Criteria */}
                            <div className="space-y-4">
                                <h3 className="font-extrabold text-base flex items-center gap-2 border-b pb-2">
                                    <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                    2. Trainer Department Performance Ratings (1 to 5 Stars)
                                </h3>

                                {renderRatingStars(
                                    data.content_clarity_rating,
                                    (r) => setData('content_clarity_rating', r),
                                    'የስልጠናው ይዘት ግልፅነትና ጠቃሚነት (Content Clarity & Value)',
                                    'Were the training materials clear, easy to understand, and valuable for branch operations?'
                                )}

                                {renderRatingStars(
                                    data.preparation_rating,
                                    (r) => setData('preparation_rating', r),
                                    'የአሰልጣኙ ዝግጅትና አቀራረብ (Trainer Preparation & Presentation)',
                                    'Was the department trainer well prepared, engaging, and clear in presenting?'
                                )}

                                {renderRatingStars(
                                    data.time_management_rating,
                                    (r) => setData('time_management_rating', r),
                                    'የጊዜ አጠቃቀም (Time Management & Schedule Adherence)',
                                    'Did the trainer respect the allocated duration and start/end time slots?'
                                )}

                                {renderRatingStars(
                                    data.applicability_rating,
                                    (r) => setData('applicability_rating', r),
                                    'በስራ ላይ ያለው ተገቢነት (Practical Applicability to Work)',
                                    'Is the knowledge directly applicable to solving branch challenges and improving results?'
                                )}
                            </div>

                            <hr />

                            {/* Qualitative Feedback */}
                            <div className="space-y-4">
                                <h3 className="font-extrabold text-base flex items-center gap-2">
                                    <ThumbsUp className="h-5 w-5 text-purple-600" />
                                    3. Qualitative Feedback & Recommendations
                                </h3>

                                <div>
                                    <Label htmlFor="strengths" className="font-bold text-sm">
                                        ጠንካራ ጎኖች (Key Strengths & What Went Well)
                                    </Label>
                                    <Textarea
                                        id="strengths"
                                        rows={2}
                                        placeholder="What did the trainer department do really well?"
                                        value={data.strengths}
                                        onChange={(e) => setData('strengths', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="areas_for_improvement" className="font-bold text-sm">
                                        ማሻሻያ የሚያስፈልጋቸው ሃሳቦች (Areas for Improvement & Suggestions)
                                    </Label>
                                    <Textarea
                                        id="areas_for_improvement"
                                        rows={2}
                                        placeholder="Specific suggestions for the trainer department to improve..."
                                        value={data.areas_for_improvement}
                                        onChange={(e) => setData('areas_for_improvement', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="feedback_notes" className="font-bold text-sm">
                                        ተጨማሪ አስተያየት (Additional Feedback Notes)
                                    </Label>
                                    <Textarea
                                        id="feedback_notes"
                                        rows={2}
                                        placeholder="Any other comments or questions for the Training Department..."
                                        value={data.feedback_notes}
                                        onChange={(e) => setData('feedback_notes', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="pt-4 flex items-center justify-end gap-3 border-t">
                                <Link href="/training/evaluations">
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing} className="gap-2 bg-amber-600 hover:bg-amber-700">
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    <span>Submit Trainer Evaluation</span>
                                </Button>
                            </div>
                        </CardContent>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}

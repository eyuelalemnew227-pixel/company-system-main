import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, ChevronsUpDown, HelpCircle, Send, Star } from 'lucide-react';
import React from 'react';

type Branch = { id: number; name: string };
type Department = { id: number; name: string };
type Schedule = { id: number; title: string; schedule_date: string };
type UserOption = { id: number; name: string; branch_id?: string | null; department_id?: string | null };

type PageProps = {
    schedules: Schedule[];
    branches: Branch[];
    departments?: Department[];
    users?: UserOption[];
    userBranch?: Branch | null;
    userDepartment?: Department | null;
};

export default function QuestionnaireForm({
    schedules = [],
    branches = [],
    departments = [],
    users = [],
    userBranch,
    userDepartment,
}: PageProps) {
    React.useEffect(() => {
        // @ts-ignore
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            // @ts-ignore
            window.Telegram.WebApp.ready();
            // @ts-ignore
            window.Telegram.WebApp.expand();
        }
    }, []);

    const { data, setData, post, processing, errors } = useForm({
        training_schedule_id: schedules[0]?.id ? String(schedules[0].id) : '',
        branch_id: userBranch?.id ? String(userBranch.id) : '',
        department_id: userDepartment?.id ? String(userDepartment.id) : '',
        trainee_name: '',
        q1_relevance: 5,
        q2_objective_clarity: 'Yes',
        q3_response_quality: 5,
        q4_participatory: 5,
        q5_motivating: 5,
        q6_gained_new_knowledge: 'Yes',
        q7_motivation_diff: '',
        q8_knowledge_increase: '',
        q9_one_word_summary: '',
        q10_most_liked_aspects: '',
        q11_additional_comments: '',
    });

    const [openDepartment, setOpenDepartment] = React.useState(false);
    const [openTrainee, setOpenTrainee] = React.useState(false);
    const [traineeQuery, setTraineeQuery] = React.useState('');

    const filteredUsers = React.useMemo(() => {
        if (!data.branch_id) return users;
        return users.filter((u) => u.branch_id === String(data.branch_id));
    }, [users, data.branch_id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/training/feedback');
    };

    const StarRatingSelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
        return (
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
                                star <= value ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'
                            }`}
                        />
                    </button>
                ))}
                <span className="ml-2 font-mono font-bold text-sm text-slate-700 dark:text-slate-300">{value} / 5</span>
            </div>
        );
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training Management', href: '/training/dashboard' },
                { title: 'Feedback Questionnaires', href: '/training/feedback' },
                { title: 'ለተሳታፊዎች የቀረቡ ጥያቄዎች (Participant Questionnaire)', href: '#' },
            ]}
        >
            <Head title="ለተሳታፊዎች የቀረቡ ጥያቄዎች - Feedback Questionnaire" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                        <Link href="/training/feedback">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">ለተሳታፊዎች የቀረቡ ጥያቄዎች (Participant Feedback Form)</h1>
                            <p className="text-xs text-muted-foreground">
                                Please evaluate the training session by answering the 11 questionnaires below
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header info */}
                    <Card className="border-purple-100 dark:border-purple-900 bg-purple-50/20">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-bold text-purple-950 dark:text-purple-300">
                                📋 የስልጠና እና የተሳታፊ መረጃ (Session & Trainee Info)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">የስልጠና መርሃግብር (Schedule Session)</Label>
                                <Select value={data.training_schedule_id} onValueChange={(val: string) => setData('training_schedule_id', val)}>
                                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950">
                                        <SelectValue placeholder="Select Session" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {schedules.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.title} ({s.schedule_date})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold flex items-center justify-between">
                                    <span>ቅርንጫፍ (Branch)</span>
                                    {userBranch && <span className="text-[10px] font-normal text-slate-500">🔒 (Locked)</span>}
                                </Label>
                                <Select
                                    disabled={!!userBranch}
                                    value={data.branch_id}
                                    onValueChange={(val: string) => {
                                        setData('branch_id', val);
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950 disabled:opacity-80 disabled:bg-slate-100 dark:disabled:bg-slate-900">
                                        <SelectValue placeholder="Select Branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Searchable Department */}
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">የሥራ ክፍል (Department)</Label>
                                <Popover open={openDepartment} onOpenChange={setOpenDepartment}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openDepartment}
                                            className="h-9 w-full justify-between bg-white dark:bg-slate-950 text-xs font-normal truncate"
                                        >
                                            <span className="truncate">
                                                {data.department_id
                                                    ? departments.find((d) => String(d.id) === String(data.department_id))?.name || 'Select Department'
                                                    : 'Select Department'}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[260px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search Department..." className="h-8 text-xs" />
                                            <CommandList>
                                                <CommandEmpty className="p-2 text-xs text-muted-foreground">No department found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        value="unspecified"
                                                        onSelect={() => {
                                                            setData('department_id', '');
                                                            setOpenDepartment(false);
                                                        }}
                                                    >
                                                        <Check className={cn('mr-2 h-4 w-4', !data.department_id ? 'opacity-100' : 'opacity-0')} />
                                                        Unspecified
                                                    </CommandItem>
                                                    {departments.map((dep) => (
                                                        <CommandItem
                                                            key={dep.id}
                                                            value={dep.name}
                                                            onSelect={() => {
                                                                setData('department_id', String(dep.id));
                                                                setOpenDepartment(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    'mr-2 h-4 w-4',
                                                                    String(data.department_id) === String(dep.id) ? 'opacity-100' : 'opacity-0'
                                                                )}
                                                            />
                                                            {dep.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Trainee Name (Filtered by Branch) */}
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">የተሳታፊ ስም (Trainee Name)</Label>
                                <Popover open={openTrainee} onOpenChange={setOpenTrainee}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openTrainee}
                                            className="h-9 w-full justify-between bg-white dark:bg-slate-950 text-xs font-normal truncate"
                                        >
                                            <span className="truncate">{data.trainee_name || 'Select or type trainee name...'}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[280px] p-0" align="start">
                                        <Command>
                                            <CommandInput
                                                placeholder={data.branch_id ? "Search branch users..." : "Search all users..."}
                                                className="h-8 text-xs"
                                                value={traineeQuery}
                                                onValueChange={(val) => setTraineeQuery(val)}
                                            />
                                            <CommandList>
                                                <CommandEmpty className="p-2 text-xs text-muted-foreground">
                                                    No matching user found.
                                                </CommandEmpty>
                                                {traineeQuery.trim() !== '' && (
                                                    <CommandGroup heading="Custom Name">
                                                        <CommandItem
                                                            value={traineeQuery}
                                                            onSelect={() => {
                                                                setData('trainee_name', traineeQuery);
                                                                setOpenTrainee(false);
                                                            }}
                                                        >
                                                            <Check className="mr-2 h-4 w-4 opacity-0" />
                                                            Use &quot;{traineeQuery}&quot;
                                                        </CommandItem>
                                                    </CommandGroup>
                                                )}
                                                <CommandGroup heading={data.branch_id ? `Branch Users (${filteredUsers.length})` : `All Users (${users.length})`}>
                                                    {filteredUsers.map((u) => (
                                                        <CommandItem
                                                            key={u.id}
                                                            value={u.name}
                                                            onSelect={() => {
                                                                setData('trainee_name', u.name);
                                                                setOpenTrainee(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    'mr-2 h-4 w-4',
                                                                    data.trainee_name === u.name ? 'opacity-100' : 'opacity-0'
                                                                )}
                                                            />
                                                            {u.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 11 Amharic Questionnaires Card */}
                    <Card>
                        <CardHeader className="py-4 px-6 border-b bg-slate-800 text-white rounded-t-lg">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-amber-400" /> ለተሳታፊዎች የቀረቡ 11 ጥያቄዎች
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Q1 */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-2">
                                <Label className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    1. ርዕሱ ለቀጣይ ስራ ያለው ጠቃሚነት
                                </Label>
                                <p className="text-xs text-muted-foreground">How useful is the topic for your ongoing work?</p>
                                <StarRatingSelector
                                    value={data.q1_relevance}
                                    onChange={(val) => setData('q1_relevance', val)}
                                />
                            </div>

                            {/* Q2 */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-2">
                                <Label className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    2. የስልጠናው ዓላማ በግልጽ ተብራርቶላችሗል?
                                </Label>
                                <p className="text-xs text-muted-foreground">Was the training objective explained clearly?</p>
                                <div className="flex gap-6 pt-1">
                                    <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="q2_objective_clarity"
                                            value="Yes"
                                            checked={data.q2_objective_clarity === 'Yes'}
                                            onChange={() => setData('q2_objective_clarity', 'Yes')}
                                            className="text-purple-600 focus:ring-purple-500"
                                        />
                                        <span>አዎ (Yes)</span>
                                    </label>
                                    <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="q2_objective_clarity"
                                            value="No"
                                            checked={data.q2_objective_clarity === 'No'}
                                            onChange={() => setData('q2_objective_clarity', 'No')}
                                            className="text-purple-600 focus:ring-purple-500"
                                        />
                                        <span>አይ (No)</span>
                                    </label>
                                    <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="q2_objective_clarity"
                                            value="Partial"
                                            checked={data.q2_objective_clarity === 'Partial'}
                                            onChange={() => setData('q2_objective_clarity', 'Partial')}
                                            className="text-purple-600 focus:ring-purple-500"
                                        />
                                        <span>በከፊል (Partially)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Q3 */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-2">
                                <Label className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    3. ለሚቀርቡ ጥያቄዎች ተገቢውን ምላሽ መስጠት(ስልጠናውን በተመለከተ)
                                </Label>
                                <p className="text-xs text-muted-foreground">Quality of responses given to training-related questions</p>
                                <StarRatingSelector
                                    value={data.q3_response_quality}
                                    onChange={(val) => setData('q3_response_quality', val)}
                                />
                            </div>

                            {/* Q4 */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-2">
                                <Label className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    4. አሳታፊ ነበር?
                                </Label>
                                <p className="text-xs text-muted-foreground">Was the training session interactive and participatory?</p>
                                <StarRatingSelector
                                    value={data.q4_participatory}
                                    onChange={(val) => setData('q4_participatory', val)}
                                />
                            </div>

                            {/* Q5 */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-2">
                                <Label className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    5. አነቃቂ ነበር?
                                </Label>
                                <p className="text-xs text-muted-foreground">Was the session engaging and motivating?</p>
                                <StarRatingSelector
                                    value={data.q5_motivating}
                                    onChange={(val) => setData('q5_motivating', val)}
                                />
                            </div>

                            {/* Q6 */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-2">
                                <Label className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    6. በዚህ ስልጠና በኋላ አዲስ እውቀት አግኝቻለሁ ብለው ያምናሉ?
                                </Label>
                                <p className="text-xs text-muted-foreground">Do you believe you gained new knowledge after this training?</p>
                                <div className="flex gap-6 pt-1">
                                    <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="q6_gained_new_knowledge"
                                            value="Yes"
                                            checked={data.q6_gained_new_knowledge === 'Yes'}
                                            onChange={() => setData('q6_gained_new_knowledge', 'Yes')}
                                            className="text-purple-600 focus:ring-purple-500"
                                        />
                                        <span>አዎ፣ አዲስ እውቀት አግኝቻለሁ (Yes)</span>
                                    </label>
                                    <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="q6_gained_new_knowledge"
                                            value="No"
                                            checked={data.q6_gained_new_knowledge === 'No'}
                                            onChange={() => setData('q6_gained_new_knowledge', 'No')}
                                            className="text-purple-600 focus:ring-purple-500"
                                        />
                                        <span>አላገኘሁም (No)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Q7 */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-2">
                                <Label className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    7. ስልጠናው ከመጀመሩ በፊት የነበረዎት ተነሳሽነት እና አሁን ያለው ስሜት ምን ያህል ልዩነት አለው?
                                </Label>
                                <p className="text-xs text-muted-foreground">Difference in your motivation before vs. after training</p>
                                <Textarea
                                    rows={2}
                                    placeholder="ለአብነት፡ ከፍተኛ ልዩነት አለው፣ ተነሳሽነቴ ጨምሯል..."
                                    value={data.q7_motivation_diff}
                                    onChange={(e) => setData('q7_motivation_diff', e.target.value)}
                                    className="text-xs bg-white dark:bg-slate-950"
                                />
                            </div>

                            {/* Q8 */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-2">
                                <Label className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    8. ስልጠናው ከመሰጠቱ በፊት ስለ ርዕሰ ጉዳዩ የነበረዎት ግንዛቤ አሁን ካለዎት ጋር ሲነጻጸር ምን ያህል ጨምሯል?
                                </Label>
                                <p className="text-xs text-muted-foreground">Increase in subject matter understanding before vs. now</p>
                                <Textarea
                                    rows={2}
                                    placeholder="ግንዛቤዬ በከፍተኛ ሁኔታ ጨምሯል..."
                                    value={data.q8_knowledge_increase}
                                    onChange={(e) => setData('q8_knowledge_increase', e.target.value)}
                                    className="text-xs bg-white dark:bg-slate-950"
                                />
                            </div>

                            {/* Q9 */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-2">
                                <Label className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    9. ስልጠናውን በአንድ ቃል ግለጹት ቢባሉ ምን ይላሉ?
                                </Label>
                                <p className="text-xs text-muted-foreground">Describe the training session in one single word</p>
                                <Input
                                    placeholder="ለአብነት፡ ድንቅ / ውጤታማ / አነቃቂ..."
                                    value={data.q9_one_word_summary}
                                    onChange={(e) => setData('q9_one_word_summary', e.target.value)}
                                    className="h-9 text-xs bg-white dark:bg-slate-950"
                                />
                            </div>

                            {/* Q10 */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-2">
                                <Label className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    10. በስልጠናው በጣም የወደዷቸው እና ለወደፊቱም መኖር ያለባቸው ክፍሎች የትኞቹ ናቸው?
                                </Label>
                                <p className="text-xs text-muted-foreground">Most liked aspects of training to preserve in future sessions</p>
                                <Textarea
                                    rows={3}
                                    placeholder="ተግባራዊ ምሳሌዎች፣ የጥያቄና መልስ ሰዓት..."
                                    value={data.q10_most_liked_aspects}
                                    onChange={(e) => setData('q10_most_liked_aspects', e.target.value)}
                                    className="text-xs bg-white dark:bg-slate-950"
                                />
                            </div>

                            {/* Q11 */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-2">
                                <Label className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    11. ተጨማሪ ሀሳብ ካለወት?
                                </Label>
                                <p className="text-xs text-muted-foreground">Any additional comments or suggestions?</p>
                                <Textarea
                                    rows={3}
                                    placeholder="ተጨማሪ አሳብዎን እዚህ ይጻፉ..."
                                    value={data.q11_additional_comments}
                                    onChange={(e) => setData('q11_additional_comments', e.target.value)}
                                    className="text-xs bg-white dark:bg-slate-950"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3 pt-2">
                        <Link href="/training/feedback">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing} className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-bold px-6">
                            <Send className="h-4 w-4" /> Submit Feedback
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

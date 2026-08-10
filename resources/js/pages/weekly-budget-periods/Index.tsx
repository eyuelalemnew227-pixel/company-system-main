import { FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePermission } from '@/hooks/user-permissions';

type Setting = {
    id: number;
    submission_deadline_day: string;
    is_urgent_enabled: boolean;
};

type PageProps = {
    setting: Setting;
};

export default function WeeklyBudgetPeriodSettings({ setting }: PageProps) {
    const { can } = usePermission();
    const isManager = can('manage weekly budget periods');

    const { data, setData, post, processing, errors } = useForm({
        submission_deadline_day: setting.submission_deadline_day,
        is_urgent_enabled: setting.is_urgent_enabled,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('weekly-budget-periods.store'));
    };

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Period Management', url: '#' },
                { title: 'Weekly Budget Periods', url: route('weekly-budget-periods.index') },
            ]}
        >
            <Head title="Weekly Budget Settings" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Weekly Budget Settings</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Configure global system settings for weekly budgets.
                        </p>
                    </div>
                </div>

                <div className="max-w-2xl">
                    <Card>
                        <form onSubmit={submit}>
                            <CardHeader>
                                <CardTitle>Submission Rules</CardTitle>
                                <CardDescription>
                                    Set the deadline and configure urgent budget availability.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="submission_deadline_day">Weekly Submission Deadline</Label>
                                    <Select
                                        value={data.submission_deadline_day}
                                        onValueChange={(value) => setData('submission_deadline_day', value)}
                                        disabled={!isManager}
                                    >
                                        <SelectTrigger id="submission_deadline_day" className="bg-white">
                                            <SelectValue placeholder="Select day" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {daysOfWeek.map((day) => (
                                                <SelectItem key={day} value={day}>
                                                    {day}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.submission_deadline_day && (
                                        <p className="text-sm font-medium text-red-500 mt-1">{errors.submission_deadline_day}</p>
                                    )}
                                    <p className="text-sm text-slate-500">
                                        This is the last day of the week that users can submit a Normal weekly budget for the upcoming week.
                                    </p>
                                </div>

                                <div className="flex flex-row items-center justify-between rounded-lg border border-slate-200 p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Urgent Budget Submission</Label>
                                        <p className="text-sm text-slate-500">
                                            Enable or disable the ability for users to submit urgent weekly budgets system-wide.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.is_urgent_enabled}
                                        onCheckedChange={(checked) => setData('is_urgent_enabled', checked)}
                                        disabled={!isManager}
                                    />
                                    {errors.is_urgent_enabled && (
                                        <p className="text-sm font-medium text-red-500 mt-1">{errors.is_urgent_enabled}</p>
                                    )}
                                </div>
                            </CardContent>
                            {isManager && (
                                <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex justify-end">
                                    <Button type="submit" disabled={processing}>
                                        Save Changes
                                    </Button>
                                </CardFooter>
                            )}
                        </form>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

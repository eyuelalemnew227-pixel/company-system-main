import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

export type TargetKpiEntry = {
    order_type_id: number | null;
    order_type_name: string;
    target: number;
    paid_count: number;
    percentage: number; // 0-100+
};

type Props = {
    data: TargetKpiEntry[];
    holidayName?: string;
};

function barColor(pct: number): string {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-amber-400';
    return 'bg-red-500';
}

function textColor(pct: number): string {
    if (pct >= 100) return 'text-emerald-600';
    if (pct >= 60) return 'text-amber-600';
    return 'text-red-500';
}

export default function TargetKpiCard({ data, holidayName }: Props) {
    if (!data || data.length === 0) return null;

    return (
        <Card className="border-2 border-slate-300 dark:border-slate-600 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base">
                        Paid Orders Progress
                        {holidayName && <span className="ml-2 text-sm font-normal text-muted-foreground">— {holidayName}</span>}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {data.map((entry, idx) => {
                    const clamped = Math.min(entry.percentage, 100);
                    const pct = entry.percentage;
                    return (
                        <div key={idx} className="space-y-1.5">
                            {/* Label row */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{entry.order_type_name}</span>
                                <span className={`font-semibold tabular-nums ${textColor(pct)}`}>
                                    {entry.paid_count.toLocaleString()} / {entry.target.toLocaleString()}
                                    <span className="ml-2 text-xs font-normal">({pct.toFixed(1)}%)</span>
                                </span>
                            </div>
                            {/* Progress bar */}
                            <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`}
                                    style={{ width: `${clamped}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

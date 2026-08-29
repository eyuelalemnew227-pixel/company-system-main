import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, Flame, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'Leaderboard & Gamification', href: '/training/leaderboard' },
];

export default function LeaderboardIndex({ leaderboard }: any) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Leaderboard & Rankings" />
      <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
        
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-800 p-6 md:p-8 text-white shadow-xl flex items-center justify-between">
          <div className="space-y-2">
            <Badge className="bg-amber-400/30 text-amber-100 border-none">
              <Trophy className="mr-1.5 h-3.5 w-3.5 text-amber-300" /> Gamification & Recognition
            </Badge>
            <h1 className="text-2xl md:text-3xl font-extrabold">Company Learning Leaderboard</h1>
            <p className="text-amber-100 text-sm">
              Top performing team members recognized for course completions and quiz excellence.
            </p>
          </div>
          <Trophy className="h-20 w-20 text-amber-200 opacity-40 hidden sm:block" />
        </div>

        {/* Leaderboard Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Top Staff Rankings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboard?.data?.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Trophy className="mx-auto h-12 w-12 opacity-30 mb-2" />
                <p className="font-medium text-base">Leaderboard rankings are updated daily.</p>
              </div>
            ) : (
              leaderboard?.data?.map((entry: any, index: number) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    index === 0
                      ? 'bg-amber-50/70 border-amber-300 dark:bg-amber-950/30 ring-1 ring-amber-400'
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold ${
                      index === 0 ? 'bg-amber-400 text-amber-950' : index === 1 ? 'bg-slate-300 text-slate-900' : index === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      #{index + 1}
                    </span>

                    <div>
                      <h4 className="font-bold text-base text-foreground">
                        {entry.employee?.first_name} {entry.employee?.last_name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {entry.employee?.position?.name || 'Employee'} • {entry.employee?.branch?.name || 'HQ'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className="bg-amber-600 text-white text-xs px-3 py-1 font-bold">
                      {entry.points} Points
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}

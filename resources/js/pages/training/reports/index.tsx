import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, CheckCircle2, BookOpen, Award, Users, FileCheck } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Training Management', href: '/training/dashboard' },
  { title: 'LMS Reports & Analytics', href: '/training/reports' },
];

export default function ReportsIndex({ summary = {}, recentEnrollments = [] }: any) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="LMS Analytics & Reports" />
      <div className="space-y-8 p-4 md:p-6 max-w-6xl mx-auto">
        
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 p-6 md:p-8 text-white shadow-xl flex items-center justify-between">
          <div className="space-y-2">
            <Badge className="bg-blue-500/30 text-blue-200 border-none">
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Corporate Training Analytics
            </Badge>
            <h1 className="text-2xl md:text-3xl font-extrabold">LMS Reports & Audit Dashboard</h1>
            <p className="text-blue-100 text-sm">
              Real-time analytics on employee course completions, quiz performance, SOP compliance rates, and digital certificate verification logs.
            </p>
          </div>
          <BarChart3 className="h-20 w-20 text-blue-300 opacity-40 hidden sm:block" />
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">Course Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground">{summary.completion_rate || 0}%</div>
              <p className="text-xs text-muted-foreground mt-1">Across all registered staff</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">Quiz Pass Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground">{summary.quiz_pass_rate || 0}%</div>
              <p className="text-xs text-muted-foreground mt-1">First-time & retake attempts</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">Issued Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground">{summary.certificates_issued || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Verified credentials</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">SOP Acknowledgements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground">{summary.sop_acknowledgements || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Digital sign-off compliance</p>
            </CardContent>
          </Card>
        </div>

        {/* Audit Log Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent Enrollment & Learning Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b bg-muted/50 text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Course Title</th>
                    <th className="p-3">Branch / Dept</th>
                    <th className="p-3">Progress</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">No recent enrollment activity.</td>
                    </tr>
                  ) : (
                    recentEnrollments.map((item: any) => (
                      <tr key={item.id} className="hover:bg-accent/30">
                        <td className="p-3 font-semibold text-foreground">
                          {item.employee?.first_name} {item.employee?.last_name}
                        </td>
                        <td className="p-3 font-medium">{item.course?.title}</td>
                        <td className="p-3 text-muted-foreground">
                          {item.employee?.branch?.name || 'HQ'} ({item.employee?.department?.name || 'General'})
                        </td>
                        <td className="p-3 font-bold">{item.progress_percent}%</td>
                        <td className="p-3">
                          <Badge className={item.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}>
                            {item.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}

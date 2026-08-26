import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, BarChart3, Users, Building2, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import React from 'react';
import { Progress } from "@/components/ui/progress";

export default function Analytics({ form, totalSubmissions = 0, branchScores = [], employeeScores = [], totalCompanyBranches = 0, totalPossibleEmployees = 0, unvisitedBranches = [], unevaluatedEmployeesByBranch = {} }: {
    form: any,
    totalSubmissions: number,
    branchScores: { name: string, score: number, total_questions: number }[],
    employeeScores: { name: string, branch: string, score: number, total_questions: number }[],
    totalCompanyBranches: number,
    totalPossibleEmployees: number,
    unvisitedBranches: string[],
    unevaluatedEmployeesByBranch: Record<string, string[]>
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Form Builder', href: '/forms' },
        { title: 'All Submissions', href: '/submissions' },
        { title: `${form.title} Records`, href: `/submissions/form/${form.id}` },
        { title: `Analytics`, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Analytics: ${form.title}`} />

            <div className="max-w-[80rem] mx-auto space-y-6 pb-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center space-x-2 text-sm text-amber-600 mb-1">
                            <Link href={`/submissions/form/${form.id}`} className="hover:underline flex items-center">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back to Datatable
                            </Link>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-amber-900 flex items-center">
                            <BarChart3 className="mr-2 h-6 w-6 opacity-80" />
                            {form.title} Performance Analytics
                        </h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="col-span-1 shadow-sm border-amber-900/10 bg-gradient-to-br from-white to-amber-50/50">
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Total Submission</p>
                                    <h3 className="text-3xl font-bold text-gray-900">{totalSubmissions}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-1 shadow-sm border-amber-900/10">
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-amber-100 text-amber-700 rounded-full">
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Total Visited Branches</p>
                                    <h3 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-900 inline-block px-1">
                                        {branchScores.length} <span className="text-lg text-gray-400 font-medium ml-1">/ {totalCompanyBranches}</span>
                                    </h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-1 shadow-sm border-amber-900/10">
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-green-100 text-green-700 rounded-full">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Total Inspected Employees</p>
                                    <h3 className="text-3xl font-bold text-gray-900 border-b-2 border-amber-900 inline-block px-1">
                                        {employeeScores.length} <span className="text-lg text-gray-400 font-medium ml-1">/ {totalPossibleEmployees}</span>
                                    </h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    <Card className="shadow-sm border-amber-900/10">
                        <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                            <CardTitle className="text-lg flex items-center">
                                <Users className="w-5 h-5 mr-2 text-blue-700" />
                                Top Performing Evaluated Employees
                            </CardTitle>
                            <CardDescription>Based on positive compliance (Yes) checklist scores.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {employeeScores.length === 0 ? (
                                <div className="p-10 text-center text-muted-foreground">No employee data available yet.</div>
                            ) : (
                                <div className="max-h-[500px] overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50/50">
                                                <TableHead>Employee Name</TableHead>
                                                <TableHead className="text-right">Score</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(
                                                employeeScores.reduce((acc, curr) => {
                                                    if (!acc[curr.branch]) acc[curr.branch] = [];
                                                    acc[curr.branch].push(curr);
                                                    return acc;
                                                }, {} as Record<string, typeof employeeScores>)
                                            ).map(([branchName, employees]) => (
                                                <React.Fragment key={branchName}>
                                                    <TableRow className="bg-gray-50/80 sticky top-0 shadow-sm z-10 backdrop-blur-sm">
                                                        <TableCell colSpan={2} className="font-bold text-gray-500 uppercase tracking-widest text-xs pt-4 pb-2 border-b-2 border-gray-200">
                                                            {branchName}
                                                        </TableCell>
                                                    </TableRow>
                                                    {employees.map((emp, idx) => (
                                                        <TableRow key={`${branchName}-${idx}`}>
                                                            <TableCell className="font-semibold text-gray-900 pl-6 indent-2">{emp.name}</TableCell>
                                                            <TableCell className="text-right font-bold text-blue-700">{emp.score}%</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* COVERAGE GAPS SECTION */}
                <div className="pt-6 mt-6 border-t border-gray-200">
                    <h3 className="text-xl font-bold tracking-tight text-red-900 flex items-center mb-6">
                        <AlertCircle className="mr-2 h-6 w-6 opacity-80" />
                        Coverage Gaps
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="shadow-sm border-red-900/10 h-max">
                            <CardHeader className="bg-red-50/50 border-b border-red-100">
                                <CardTitle className="text-lg flex items-center text-red-800">
                                    Unvisited Branches
                                </CardTitle>
                                <CardDescription>Sales generating branches missing evaluations.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {unvisitedBranches.length === 0 ? (
                                    <div className="p-10 text-center text-muted-foreground">All active branches have been visited!</div>
                                ) : (
                                    <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto bg-white/50">
                                        {unvisitedBranches.map((name, idx) => (
                                            <div key={idx} className="p-4 px-6 flex items-center">
                                                <div className="bg-red-100 p-2 rounded-full mr-4 text-red-700 font-bold text-xs h-8 w-8 flex items-center justify-center">{idx + 1}</div>
                                                <span className="font-semibold text-gray-800 tracking-wide text-sm">{name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-orange-900/10">
                            <CardHeader className="bg-orange-50/50 border-b border-orange-100">
                                <CardTitle className="text-lg flex items-center text-orange-800">
                                    Unevaluated Employees
                                </CardTitle>
                                <CardDescription>Active employees in evaluated departments missing evaluations, grouped by branch.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {Object.keys(unevaluatedEmployeesByBranch).length === 0 ? (
                                    <div className="p-10 text-center text-muted-foreground">Outstanding! All active employees in the target departments have been evaluated.</div>
                                ) : (
                                    <div className="max-h-[500px] overflow-y-auto">
                                        {Object.entries(unevaluatedEmployeesByBranch).map(([branchName, employees]) => (
                                            <div key={branchName} className="border-b border-gray-100 last:border-0">
                                                <div className="bg-gray-50/80 px-4 py-2 border-y border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 backdrop-blur-sm flex justify-between">
                                                    <span>{branchName}</span>
                                                    <span className="text-orange-600 bg-orange-100 px-2 rounded-full">{employees.length} missing</span>
                                                </div>
                                                <ul className="divide-y divide-gray-50 bg-white">
                                                    {employees.map((emp, i) => (
                                                        <li key={i} className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mr-3"></div>
                                                            {emp}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

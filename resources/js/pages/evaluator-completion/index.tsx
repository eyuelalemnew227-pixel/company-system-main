import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Users, CheckCircle, XCircle, AlertCircle, TrendingUp, Eye } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Evaluator Completion Tracking', href: '/evaluator-completion' },
];

interface EvaluateeDetail {
  id: number;
  name: string;
  employee_code: string;
  department: string | null;
  position: string | null;
  is_evaluated: boolean;
  evaluation_response_id: number | null;
  evaluation_period: string | null;
  evaluated_at: string | null;
  status: string | null;
}

interface EvaluationDetail {
  evaluation_id: number;
  evaluation_name: string;
  evaluator_group: string;
  evaluates_group: string;
  total_evaluatees: number;
  completed_evaluatees: number;
  remaining_evaluatees: number;
  completion_percentage: number;
  evaluatees: EvaluateeDetail[];
}

interface AllEvaluatee {
  id: number;
  name: string;
  employee_code: string;
  department: string | null;
  position: string | null;
  is_evaluated: boolean;
}

interface EvaluatorStats {
  id: number;
  name: string;
  employee_code: string | null;
  department: string | null;
  position: string | null;
  total_evaluations: number;
  completed_evaluations: number;
  remaining_evaluations: number;
  completion_percentage: number;
  is_complete: boolean;
  evaluation_details: EvaluationDetail[];
  all_evaluatees: AllEvaluatee[];
}

interface EvaluationPeriod {
  id: number;
  evaluation_period_name: string;
}

interface Evaluation {
  id: number;
  name: string;
}

interface EvaluatorsByPeriod {
  [key: number]: {
    period: EvaluationPeriod;
    evaluators: EvaluatorStats[];
  };
}

export default function EvaluatorCompletionIndex({ 
  evaluatorsByPeriod, 
  periods,
  evaluations,
  request 
}: { 
  evaluatorsByPeriod: EvaluatorsByPeriod;
  periods: EvaluationPeriod[];
  evaluations: Evaluation[];
  request?: { search?: string; period_id?: string; status?: string; evaluation_names?: string };
}) {
  const [search, setSearch] = useState<string>(request?.search ?? '');
  const [periodId, setPeriodId] = useState<string>(request?.period_id ?? 'all');
  const [status, setStatus] = useState<string>(request?.status ?? 'all');
  const [selectedEvaluationNames, setSelectedEvaluationNames] = useState<string[]>(
    request?.evaluation_names ? request.evaluation_names.split(',') : []
  );
  const [selectedEvaluator, setSelectedEvaluator] = useState<EvaluatorStats | null>(null);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.get('/evaluator-completion', { 
      search, 
      period_id: periodId !== 'all' ? periodId : undefined,
      status: status !== 'all' ? status : undefined,
      evaluation_names: selectedEvaluationNames.length > 0 ? selectedEvaluationNames.join(',') : undefined
    }, { preserveState: true, replace: true });
  }

  // Calculate summary statistics across all periods
  const allEvaluators = Object.values(evaluatorsByPeriod).flatMap(p => p.evaluators);
  const totalEvaluators = allEvaluators.length;
  const completedEvaluators = allEvaluators.filter(e => e.is_complete).length;
  const incompleteEvaluators = totalEvaluators - completedEvaluators;
  const totalEvaluations = allEvaluators.reduce((sum, e) => sum + e.total_evaluations, 0);
  const totalCompleted = allEvaluators.reduce((sum, e) => sum + e.completed_evaluations, 0);
  const overallCompletionRate = totalEvaluations > 0 ? Math.round((totalCompleted / totalEvaluations) * 100) : 0;

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Evaluator Completion Tracking" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Evaluators</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEvaluators}</div>
              <p className="text-xs text-muted-foreground">Active evaluators</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedEvaluators}</div>
              <p className="text-xs text-muted-foreground">Fully completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incomplete</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{incompleteEvaluators}</div>
              <p className="text-xs text-muted-foreground">Pending evaluations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallCompletionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {totalCompleted} of {totalEvaluations} evaluations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitSearch}>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Search Evaluators</label>
                  <Input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    placeholder="Search by name, employee code, department..." 
                  />
                </div>
                <div className="w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Filter by Period</label>
                  <Select value={periodId} onValueChange={setPeriodId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select evaluation period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Periods</SelectItem>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.evaluation_period_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Filter by Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                      <SelectItem value="incomplete">Incomplete</SelectItem>
                      <SelectItem value="partial">Partially Complete</SelectItem>
                      <SelectItem value="not_started">Not Started</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Filter by Evaluation</label>
                  <MultiSelect
                    options={evaluations.map((e) => ({ value: e.name, label: e.name }))}
                    selected={selectedEvaluationNames}
                    onChange={setSelectedEvaluationNames}
                    placeholder="Select evaluations (e.g., Branch Managers Evaluation)..."
                  />
                </div>
                <Button type="submit" variant="outline">
                  Apply Filters
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {Object.values(evaluatorsByPeriod).map((periodData) => (
            <Card key={periodData.period.id}>
              <CardHeader>
                <div>
                  <CardTitle className="text-lg">{periodData.period.evaluation_period_name}</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {periodData.evaluators.length} evaluator{periodData.evaluators.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </CardHeader>
              <hr />
              <CardContent>
                <Table>
                  <TableHeader className="bg-slate-500 dark:bg-slate-700">
                    <TableRow>
                      <TableHead className="font-bold text-white">Evaluator</TableHead>
                      <TableHead className="font-bold text-white">Department</TableHead>
                      <TableHead className="font-bold text-white">Total</TableHead>
                      <TableHead className="font-bold text-white">Completed</TableHead>
                      <TableHead className="font-bold text-white">Remaining</TableHead>
                      <TableHead className="font-bold text-white">Progress</TableHead>
                      <TableHead className="font-bold text-white">Status</TableHead>
                      <TableHead className="font-bold text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodData.evaluators.map((evaluator, index) => (
                      <TableRow key={evaluator.id} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                        <TableCell>
                          <div className="font-medium">{evaluator.name}</div>
                        </TableCell>
                        <TableCell>{evaluator.department || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{evaluator.total_evaluations}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          {evaluator.completed_evaluations}
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                          {evaluator.remaining_evaluations}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={evaluator.completion_percentage} 
                              className="w-20" 
                            />
                            <span className="text-sm font-medium">
                              {evaluator.completion_percentage}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {evaluator.is_complete ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Incomplete
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedEvaluator(evaluator)}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Evaluation Details - {evaluator.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                  <div>
                                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">Employee Information</h4>
                                    <p className="text-sm"><strong>Name:</strong> {evaluator.name}</p>
                                    <p className="text-sm"><strong>Department:</strong> {evaluator.department || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">Overall Progress</h4>
                                    <p className="text-sm"><strong>Total Evaluations:</strong> {evaluator.total_evaluations}</p>
                                    <p className="text-sm"><strong>Completed:</strong> {evaluator.completed_evaluations}</p>
                                    <p className="text-sm"><strong>Remaining:</strong> {evaluator.remaining_evaluations}</p>
                                    <p className="text-sm"><strong>Completion:</strong> {evaluator.completion_percentage}%</p>
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-lg">Evaluation Breakdown</h4>
                                  {evaluator.evaluation_details.map((evaluation) => (
                                    <Card key={evaluation.evaluation_id}>
                                      <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <CardTitle className="text-base">{evaluation.evaluation_name}</CardTitle>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                              Evaluator Group: {evaluation.evaluator_group} | 
                                              Evaluates Group: {evaluation.evaluates_group}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-sm font-medium">
                                              {evaluation.completed_evaluatees} / {evaluation.total_evaluatees} completed
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {evaluation.completion_percentage}% complete
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-2">
                                          <Progress value={evaluation.completion_percentage} className="w-full" />
                                        </div>
                                      </CardHeader>
                                  <CardContent>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      This evaluation includes {evaluation.total_evaluatees} evaluatee{evaluation.total_evaluatees !== 1 ? 's' : ''} 
                                      with {evaluation.completed_evaluatees} completed and {evaluation.remaining_evaluatees} remaining.
                                    </div>
                                  </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              {periodData.evaluators.length === 0 ? (
                <div className="flex h-full items-center justify-center p-8">
                  No evaluators found for this period!
                </div>
              ) : null}
            </Card>
          ))}
          
          {Object.keys(evaluatorsByPeriod).length === 0 ? (
            <Card>
              <CardContent className="flex h-full items-center justify-center p-8">
                <div className="text-center">
                  <p className="text-lg font-medium">No evaluators found!</p>
                  <p className="text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}

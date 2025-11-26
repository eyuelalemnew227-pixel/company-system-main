<?php

namespace App\Http\Controllers;

use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use App\Models\User;
use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class EvaluatorCompletionController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search', '');
        $periodId = $request->query('period_id');
        $status = $request->query('status');
        $evaluationNames = $request->query('evaluation_names');
        
        if ($periodId === 'all' || $periodId === '') {
            $periodId = null;
        }
        
        if ($status === 'all' || $status === '') {
            $status = null;
        }
        
        // Parse evaluation_names if provided (comma-separated string)
        $selectedEvaluationNames = null;
        if ($evaluationNames && $evaluationNames !== 'all') {
            $selectedEvaluationNames = explode(',', $evaluationNames);
        }

        // Get all evaluators (users who have evaluation responses or are in evaluator groups)
        $evaluators = User::query()
            ->whereHas('employee.evaluatorGroups')
            ->with(['employee', 'evaluatorResponses' => function ($query) use ($periodId) {
                if ($periodId) {
                    $query->where('evaluation_period_id', $periodId);
                }
            }])
            ->when($search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhereHas('employee', function ($q) use ($search) {
                        $q->where('first_name', 'like', "%{$search}%")
                          ->orWhere('last_name', 'like', "%{$search}%");
                    });
            })
            ->get();

        // Get evaluation periods for filter
        $periods = \App\Models\EvaluationPeriod::select('id', 'evaluation_period_name')
            ->orderBy('id', 'desc')
            ->get();
        
        // Get all evaluations for filter dropdown with distinct names
        $allEvaluations = Evaluation::select('id', 'name')
            ->orderBy('name')
            ->get()
            ->unique('name')
            ->values();

        // Group evaluators by period - calculate stats per period
        $evaluatorsByPeriod = [];
        
        foreach ($periods as $period) {
            // Skip this period if specific period is selected and it's not this one
            if ($periodId && $period->id != $periodId) {
                continue;
            }

            $periodEvaluators = $evaluators->map(function ($evaluator) use ($period, $selectedEvaluationNames) {
                // Get all evaluations this evaluator should complete
                $evaluations = Evaluation::query()
                    ->whereHas('evaluatorGroup.employees', function ($query) use ($evaluator) {
                        $query->where('employee_id', $evaluator->employee_id);
                    })
                    ->when($selectedEvaluationNames, function ($query) use ($selectedEvaluationNames) {
                        $query->whereIn('name', $selectedEvaluationNames);
                    })
                    ->with([
                        'evaluatesGroup.employees.user', 
                        'evaluatesGroup.employees.department', 
                        'evaluatesGroup.employees.position',
                        'evaluatesGroup.departments',
                        'evaluatesGroup.branches',
                        'evaluatesGroup.otherEvaluables'
                    ])
                    ->get();

                // Calculate total evaluatees across all evaluations for this period
                $totalEvaluations = 0;
                $allEvaluatees = collect();
                
                foreach ($evaluations as $evaluation) {
                    $evaluableType = $evaluation->evaluatesGroup->evaluable_type;
                    
                    // Get the appropriate evaluatees based on evaluable_type
                    switch ($evaluableType) {
                        case 'employee':
                            $evaluatees = $evaluation->evaluatesGroup->employees;
                            // Exclude the evaluator themselves from the evaluatees list
                            $evaluatees = $evaluatees->filter(function ($employee) use ($evaluator) {
                                return $employee->id !== $evaluator->employee_id;
                            });
                            break;
                        case 'department':
                            $evaluatees = $evaluation->evaluatesGroup->departments;
                            // Exclude the evaluator's own department
                            $evaluatorDepartmentId = $evaluator->employee?->department_id;
                            if ($evaluatorDepartmentId) {
                                $evaluatees = $evaluatees->filter(function ($department) use ($evaluatorDepartmentId) {
                                    return $department->id !== $evaluatorDepartmentId;
                                });
                            }
                            break;
                        case 'branch':
                            $evaluatees = $evaluation->evaluatesGroup->branches;
                            // Exclude the evaluator's own branch
                            $evaluatorBranchId = $evaluator->employee?->branch_id;
                            if ($evaluatorBranchId) {
                                $evaluatees = $evaluatees->filter(function ($branch) use ($evaluatorBranchId) {
                                    return $branch->id !== $evaluatorBranchId;
                                });
                            }
                            break;
                        case 'other':
                            $evaluatees = $evaluation->evaluatesGroup->otherEvaluables;
                            break;
                        default:
                            $evaluatees = collect();
                    }
                    
                    $allEvaluatees = $allEvaluatees->merge($evaluatees);
                }
                
                // Remove duplicates (same entity might be in multiple evaluate groups)
                $uniqueEvaluatees = $allEvaluatees->unique('id');
                $totalEvaluations = $uniqueEvaluatees->count();

                // Get completed evaluations for this evaluator in this period
                $completedEvaluations = EvaluationResponse::query()
                    ->where('evaluator_id', $evaluator->id)
                    ->where('evaluation_period_id', $period->id)
                    ->count();

                $remainingEvaluations = max(0, $totalEvaluations - $completedEvaluations);
                $completionPercentage = $totalEvaluations > 0 ? round(($completedEvaluations / $totalEvaluations) * 100, 2) : 0;

                // Get detailed evaluation information for this period
                $evaluationDetails = [];
                foreach ($evaluations as $evaluation) {
                    $evaluableType = $evaluation->evaluatesGroup->evaluable_type;
                    
                    // Get the appropriate evaluatees based on evaluable_type
                    switch ($evaluableType) {
                        case 'employee':
                            $evaluatees = $evaluation->evaluatesGroup->employees;
                            // Exclude the evaluator themselves from the evaluatees list
                            $evaluatees = $evaluatees->filter(function ($employee) use ($evaluator) {
                                return $employee->id !== $evaluator->employee_id;
                            });
                            break;
                        case 'department':
                            $evaluatees = $evaluation->evaluatesGroup->departments;
                            // Exclude the evaluator's own department
                            $evaluatorDepartmentId = $evaluator->employee?->department_id;
                            if ($evaluatorDepartmentId) {
                                $evaluatees = $evaluatees->filter(function ($department) use ($evaluatorDepartmentId) {
                                    return $department->id !== $evaluatorDepartmentId;
                                });
                            }
                            break;
                        case 'branch':
                            $evaluatees = $evaluation->evaluatesGroup->branches;
                            // Exclude the evaluator's own branch
                            $evaluatorBranchId = $evaluator->employee?->branch_id;
                            if ($evaluatorBranchId) {
                                $evaluatees = $evaluatees->filter(function ($branch) use ($evaluatorBranchId) {
                                    return $branch->id !== $evaluatorBranchId;
                                });
                            }
                            break;
                        case 'other':
                            $evaluatees = $evaluation->evaluatesGroup->otherEvaluables;
                            break;
                        default:
                            $evaluatees = collect();
                    }
                    
                    $totalForThisEvaluation = $evaluatees->count();
                    
                    // Get evaluation responses for this specific evaluation and period
                    $evaluationResponses = EvaluationResponse::query()
                        ->where('evaluator_id', $evaluator->id)
                        ->where('evaluation_id', $evaluation->id)
                        ->where('evaluation_period_id', $period->id)
                        ->with(['evaluate', 'evaluationPeriod'])
                        ->get();

                    // Count only responses for evaluatees that are actually in this evaluation's evaluatesGroup
                    $completedForThisEvaluation = 0;
                    $evaluableType = $evaluation->evaluatesGroup->evaluable_type;
                    
                    foreach ($evaluatees as $evaluatee) {
                        $evaluateeId = $evaluatee->id; // This is the ID of the entity being evaluated
                        
                        // Check if there's a response for this specific evaluatee with the correct evaluable_type
                        $hasResponse = $evaluationResponses->where('evaluate_id', $evaluateeId)
                            ->where('evaluable_type', $evaluableType)
                            ->count() > 0;
                        
                        if ($hasResponse) {
                            $completedForThisEvaluation++;
                        }
                    }
                    
                    $evaluationDetails[] = [
                        'evaluation_id' => $evaluation->id,
                        'evaluation_name' => $evaluation->name,
                        'evaluator_group' => $evaluation->evaluatorGroup->name,
                        'evaluates_group' => $evaluation->evaluatesGroup->name,
                        'total_evaluatees' => $totalForThisEvaluation,
                        'completed_evaluatees' => $completedForThisEvaluation,
                        'remaining_evaluatees' => max(0, $totalForThisEvaluation - $completedForThisEvaluation),
                        'completion_percentage' => $totalForThisEvaluation > 0 ? round(($completedForThisEvaluation / $totalForThisEvaluation) * 100, 2) : 0,
                        'evaluatees' => $evaluatees->map(function ($evaluatee) use ($evaluationResponses, $evaluableType) {
                            // Find response for this specific evaluatee with the correct evaluable_type
                            $response = $evaluationResponses->where('evaluate_id', $evaluatee->id)
                                ->where('evaluable_type', $evaluableType)
                                ->first();
                            
                            // Get the appropriate name based on evaluable_type
                            $name = '';
                            if ($evaluableType === 'employee') {
                                $name = $evaluatee->user?->name ?? $evaluatee->first_name . ' ' . $evaluatee->last_name;
                            } else {
                                $name = $evaluatee->name ?? 'Unknown';
                            }
                            
                            return [
                                'id' => $evaluatee->id,
                                'name' => $name,
                                'employee_code' => $evaluatee->employee_code ?? null,
                                'department' => $evaluatee->department?->name ?? null,
                                'position' => $evaluatee->position?->name ?? null,
                                'is_evaluated' => $response ? true : false,
                                'evaluation_response_id' => $response?->id,
                                'evaluation_period' => $response?->evaluationPeriod?->evaluation_period_name,
                                'evaluated_at' => $response?->created_at?->format('Y-m-d H:i:s'),
                                'status' => $response?->status,
                            ];
                        }),
                    ];
                }

                // Get all unique evaluatees with their evaluation status for this period
                $allEvaluateesWithStatus = $uniqueEvaluatees->map(function ($evaluatee) use ($evaluator, $period, $evaluations) {
                    // Check if this evaluatee has been evaluated by this evaluator in this period
                    // We need to check across all evaluations for this evaluator
                    $hasBeenEvaluated = false;
                    
                    foreach ($evaluations as $evaluation) {
                        $evaluableType = $evaluation->evaluatesGroup->evaluable_type;
                        
                        $hasResponse = EvaluationResponse::query()
                            ->where('evaluator_id', $evaluator->id)
                            ->where('evaluate_id', $evaluatee->id)
                            ->where('evaluable_type', $evaluableType)
                            ->where('evaluation_period_id', $period->id)
                            ->exists();
                        
                        if ($hasResponse) {
                            $hasBeenEvaluated = true;
                            break;
                        }
                    }
                    
                    // Get the appropriate name based on the first evaluation's evaluable_type
                    $firstEvaluation = $evaluations->first();
                    $evaluableType = $firstEvaluation ? $firstEvaluation->evaluatesGroup->evaluable_type : 'employee';
                    
                    $name = '';
                    if ($evaluableType === 'employee') {
                        $name = $evaluatee->user?->name ?? $evaluatee->first_name . ' ' . $evaluatee->last_name;
                    } else {
                        $name = $evaluatee->name ?? 'Unknown';
                    }
                    
                    return [
                        'id' => $evaluatee->id,
                        'name' => $name,
                        'employee_code' => $evaluatee->employee_code ?? null,
                        'department' => $evaluatee->department?->name ?? null,
                        'position' => $evaluatee->position?->name ?? null,
                        'is_evaluated' => $hasBeenEvaluated,
                    ];
                });

                return [
                    'id' => $evaluator->id,
                    'name' => $evaluator->name,
                    'employee_code' => $evaluator->employee?->employee_code,
                    'department' => $evaluator->employee?->department?->name,
                    'position' => $evaluator->employee?->position?->name,
                    'total_evaluations' => $totalEvaluations,
                    'completed_evaluations' => $completedEvaluations,
                    'remaining_evaluations' => $remainingEvaluations,
                    'completion_percentage' => $completionPercentage,
                    'is_complete' => $remainingEvaluations === 0 && $totalEvaluations > 0,
                    'evaluation_details' => $evaluationDetails,
                    'all_evaluatees' => $allEvaluateesWithStatus,
                ];
            });

            // Filter out evaluators with no evaluations for this period
            $periodEvaluators = $periodEvaluators->filter(function ($stat) {
                return $stat['total_evaluations'] > 0;
            });

            // Apply status filter if provided
            if ($status) {
                $periodEvaluators = $periodEvaluators->filter(function ($stat) use ($status) {
                    switch ($status) {
                        case 'complete':
                            return $stat['is_complete'];
                        case 'incomplete':
                            return !$stat['is_complete'];
                        case 'partial':
                            return !$stat['is_complete'] && $stat['completed_evaluations'] > 0;
                        case 'not_started':
                            return !$stat['is_complete'] && $stat['completed_evaluations'] === 0;
                        default:
                            return true;
                    }
                });
            }

            // Sort by completion percentage (incomplete first)
            $periodEvaluators = $periodEvaluators->sortBy([
                ['is_complete', 'asc'],
                ['completion_percentage', 'asc'],
                ['name', 'asc']
            ]);

            // Only add this period if it has evaluators
            if ($periodEvaluators->count() > 0) {
                $evaluatorsByPeriod[$period->id] = [
                    'period' => $period,
                    'evaluators' => $periodEvaluators->values()
                ];
            }
        }

        return Inertia::render('evaluator-completion/index', [
            'evaluatorsByPeriod' => $evaluatorsByPeriod,
            'periods' => $periods,
            'evaluations' => $allEvaluations,
            'request' => $request->only('search', 'period_id', 'status', 'evaluation_names'),
        ]);
    }
}

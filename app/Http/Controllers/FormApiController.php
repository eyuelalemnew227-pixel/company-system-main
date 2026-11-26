<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Form;
use App\Models\FormSubmission;
use App\Models\FormSubmissionAnswer;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FormApiController extends Controller
{
    /**
     * List all forms with high-level summary statistics.
     * GET /api/forms
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status'); // optional filter: active, draft, archived

        $query = Form::with(['versions.submissions' => function ($q) {
            $q->select('id', 'form_version_id', 'status', 'created_at');
        }]);

        if ($status) {
            $query->where('status', $status);
        }

        $forms = $query->orderBy('title')->get();

        $data = $forms->map(function ($form) {
            $submissions = $form->versions->flatMap->submissions;
            $totalSubmissions = $submissions->count();
            $approved = $submissions->where('status', 'approved')->count();
            $pending = $submissions->where('status', 'pending')->count();
            $rejected = $submissions->where('status', 'rejected')->count();
            $latest = $submissions->sortByDesc('created_at')->first();

            return [
                'id' => $form->id,
                'title' => $form->title,
                'description' => $form->description,
                'status' => $form->status,
                'created_at' => $form->created_at ? $form->created_at->toDateTimeString() : null,
                'total_submissions' => $totalSubmissions,
                'approved_submissions' => $approved,
                'pending_submissions' => $pending,
                'rejected_submissions' => $rejected,
                'latest_submission_at' => $latest && $latest->created_at ? $latest->created_at->toDateTimeString() : null,
                'versions_count' => $form->versions->count(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'count' => $data->count(),
            'data' => $data,
        ]);
    }

    /**
     * Get schema and structure of a specific form.
     * GET /api/forms/{id}
     */
    public function show(Request $request, $id): JsonResponse
    {
        $form = Form::with([
            'versions' => function ($q) {
                $q->orderByDesc('version_number');
            },
            'versions.sections.questions.inputType',
            'versions.sections.questions.choices',
        ])->find($id);

        if (!$form) {
            return response()->json([
                'status' => 'error',
                'message' => "Form with ID {$id} not found.",
            ], 404);
        }

        $activeVersion = $form->versions->first();

        $sections = [];
        if ($activeVersion) {
            foreach ($activeVersion->sections as $sec) {
                $questions = [];
                foreach ($sec->questions as $q) {
                    $choices = $q->choices->map(fn($c) => [
                        'id' => $c->id,
                        'label' => $c->label,
                        'value' => $c->value,
                    ])->values();

                    $questions[] = [
                        'id' => $q->id,
                        'question_id' => $q->id,
                        'section_id' => $sec->id,
                        'section_name' => $sec->title,
                        'label' => $q->label,
                        'question_label' => $q->label,
                        'input_type' => $q->inputType->type_identifier ?? 'text',
                        'weight' => $q->weight !== null ? (float) $q->weight : null,
                        'is_required' => (bool) $q->is_required,
                        'choices' => $choices,
                    ];
                }

                $sections[] = [
                    'id' => $sec->id,
                    'section_id' => $sec->id,
                    'title' => $sec->title,
                    'section_name' => $sec->title,
                    'weight' => $sec->weight !== null ? (float) $sec->weight : null,
                    'questions_count' => count($questions),
                    'questions' => $questions,
                ];
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $form->id,
                'title' => $form->title,
                'description' => $form->description,
                'status' => $form->status,
                'version' => $activeVersion ? $activeVersion->version_number : 1,
                'sections' => $sections,
            ],
        ]);
    }

    /**
     * Get analytics-ready submissions for a form or all forms.
     * GET /api/forms/submissions
     * GET /api/forms/{id}/submissions
     */
    public function submissions(Request $request, $id = null): JsonResponse|StreamedResponse
    {
        $targetFormId = $id ?? $request->query('form_id');
        $branchIdFilter = $request->query('branch_id');
        $departmentIdFilter = $request->query('department_id');
        $employeeIdFilter = $request->query('employee_id') ?? $request->query('employee_code');
        $submittedByIdFilter = $request->query('submitted_by_employee_code')
            ?? $request->query('submitted_by_employee_id')
            ?? $request->query('submitted_by_id')
            ?? $request->query('employee_code')
            ?? $request->query('user_id');
        $statusFilter = $request->query('status');
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        $perPageParam = $request->query('per_page', 100);
        $format = strtolower((string) $request->query('format', 'json'));

        // Pre-fetch reference dictionaries to optimize resolution
        $branches = Branch::pluck('name', 'id')->toArray();
        $departments = Department::pluck('name', 'id')->toArray();
        $employeeModels = Employee::with(['branch:id,name', 'department:id,name'])->get();
        $employees = $employeeModels->mapWithKeys(function ($e) {
            return [$e->id => trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code];
        })->toArray();
        $employeeCodes = $employeeModels->pluck('employee_code', 'id')->toArray();
        $employeesLookup = [
            'byId' => $employeeModels->keyBy('id'),
            'byCode' => $employeeModels->keyBy('employee_code'),
            'byName' => [],
            'byEmail' => [],
            'codes' => $employeeCodes,
        ];
        foreach ($employeeModels as $e) {
            $fullName = strtolower(trim($e->first_name . ' ' . $e->last_name));
            if ($fullName && !isset($employeesLookup['byName'][$fullName])) {
                $employeesLookup['byName'][$fullName] = $e;
            }
            if ($e->email && !isset($employeesLookup['byEmail'][strtolower($e->email)])) {
                $employeesLookup['byEmail'][strtolower($e->email)] = $e;
            }
        }

        // Base query
        $query = FormSubmission::with([
            'formVersion.form',
            'user:id,name,email,employee_id',
            'user.employee:id,first_name,last_name,employee_code,branch_id,department_id',
            'user.employee.branch:id,name',
            'user.employee.department:id,name',
            'answers.question.choices',
            'answers.question.inputType',
            'answers.question.section:id,form_version_id,title,weight',
        ]);

        if ($targetFormId) {
            $query->whereHas('formVersion', function ($q) use ($targetFormId) {
                $q->where('form_id', $targetFormId);
            });
        }

        if ($submittedByIdFilter && $submittedByIdFilter !== 'all') {
            $query->where(function ($q) use ($submittedByIdFilter) {
                $q->whereHas('user', function ($uq) use ($submittedByIdFilter) {
                    $uq->where('employee_id', $submittedByIdFilter)
                       ->orWhereHas('employee', function ($eq) use ($submittedByIdFilter) {
                           $eq->where('employee_code', $submittedByIdFilter);
                       });
                })->orWhere('user_id', $submittedByIdFilter);
            });
        }

        if ($statusFilter && $statusFilter !== 'all') {
            $statuses = explode(',', $statusFilter);
            $query->whereIn('status', $statuses);
        }

        if ($dateFrom) {
            $query->where('created_at', '>=', Carbon::parse($dateFrom)->startOfDay());
        }

        if ($dateTo) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        $query->orderByDesc('id');

        $isAll = in_array(strtolower((string) $perPageParam), ['all', '0', '-1'], true)
            || $request->query('paginate') === 'false'
            || $format === 'csv';

        if ($isAll) {
            $submissions = $query->get();
            $pagination = [
                'total' => $submissions->count(),
                'per_page' => $submissions->count(),
                'current_page' => 1,
                'last_page' => 1,
            ];
        } else {
            $perPage = max(1, min(500, (int) $perPageParam));
            $paginated = $query->paginate($perPage);
            $submissions = $paginated->items();
            $pagination = [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
            ];
        }

        // Transform submissions into analytics-ready format
        $data = collect($submissions)->map(function ($sub) use ($branches, $departments, $employees, $employeesLookup) {
            return $this->formatSubmissionRow($sub, $branches, $departments, $employees, $employeesLookup);
        });

        // Apply branch filter if provided
        if ($branchIdFilter && $branchIdFilter !== 'all') {
            $branchName = $branches[$branchIdFilter] ?? null;
            $data = $data->filter(function ($row) use ($branchIdFilter, $branchName) {
                return collect($row['answers_flat'])->contains(function ($val, $key) use ($branchIdFilter, $branchName) {
                    return (string) $val === (string) $branchIdFilter
                        || ($branchName && strcasecmp((string) $val, (string) $branchName) === 0);
                });
            })->values();
        }

        // Apply department filter if provided
        if ($departmentIdFilter && $departmentIdFilter !== 'all') {
            $deptName = $departments[$departmentIdFilter] ?? null;
            $data = $data->filter(function ($row) use ($departmentIdFilter, $deptName) {
                return collect($row['answers_flat'])->contains(function ($val, $key) use ($departmentIdFilter, $deptName) {
                    return (string) $val === (string) $departmentIdFilter
                        || ($deptName && strcasecmp((string) $val, (string) $deptName) === 0);
                });
            })->values();
        }

        // Apply employee filter if provided
        if ($employeeIdFilter && $employeeIdFilter !== 'all') {
            $empName = $employees[$employeeIdFilter] ?? null;
            $data = $data->filter(function ($row) use ($employeeIdFilter, $empName) {
                return (string) ($row['submitted_by_employee_code'] ?? '') === (string) $employeeIdFilter
                    || (string) ($row['submitted_by_employee_id'] ?? '') === (string) $employeeIdFilter
                    || collect($row['answers_flat'])->contains(function ($val, $key) use ($employeeIdFilter, $empName) {
                        return (string) $val === (string) $employeeIdFilter
                            || ($empName && strcasecmp((string) $val, (string) $empName) === 0);
                    });
            })->values();
        }

        // Return CSV if requested
        if ($format === 'csv') {
            return $this->streamCsvResponse($data, "form_submissions_" . date('Y_m_d_His') . ".csv");
        }

        return response()->json([
            'status' => 'success',
            'pagination' => $pagination,
            'count' => $data->count(),
            'data' => $data,
        ]);
    }

    /**
     * Get aggregated analytics: submissions for every form & branch breakdown for every form.
     * GET /api/forms/analytics
     * GET /api/forms/{id}/analytics
     */
    public function analytics(Request $request, $id = null): JsonResponse
    {
        $targetFormId = $id ?? $request->query('form_id');

        $branches = Branch::select('id', 'name')->orderBy('name')->get()->keyBy('id');
        $allBranchesList = $branches->values()->toArray();

        // 1. Fetch Forms
        $formsQuery = Form::query();
        if ($targetFormId) {
            $formsQuery->where('id', $targetFormId);
        }
        $forms = $formsQuery->orderBy('title')->get();

        // 2. Fetch Submissions
        $subQuery = FormSubmission::with([
            'formVersion:id,form_id',
            'user:id,name,employee_id',
            'user.employee.branch:id,name',
            'answers' => function ($q) {
                $q->whereHas('question.inputType', function ($iq) {
                    $iq->where('type_identifier', 'branch_lookup');
                });
            },
        ]);

        if ($targetFormId) {
            $subQuery->whereHas('formVersion', function ($q) use ($targetFormId) {
                $q->where('form_id', $targetFormId);
            });
        }

        $submissions = $subQuery->get();

        // Initialize aggregation structures
        $formStats = [];
        foreach ($forms as $form) {
            $formStats[$form->id] = [
                'form_id' => $form->id,
                'form_title' => $form->title,
                'status' => $form->status,
                'submissions_count' => 0,
                'approved_count' => 0,
                'pending_count' => 0,
                'rejected_count' => 0,
                'branches_count' => 0,
                'latest_submission_at' => null,
                'branches' => [],
            ];
        }

        $branchStats = [];
        $timelineDaily = [];
        $totalApproved = 0;
        $totalPending = 0;
        $totalRejected = 0;

        foreach ($submissions as $sub) {
            $formId = $sub->formVersion?->form_id;
            if (!$formId || !isset($formStats[$formId])) {
                continue;
            }

            $status = strtolower((string) ($sub->status ?: 'pending'));
            if ($status === 'approved') {
                $totalApproved++;
            } elseif ($status === 'rejected') {
                $totalRejected++;
            } else {
                $totalPending++;
            }

            // Timeline
            $dateKey = $sub->created_at ? $sub->created_at->format('Y-m-d') : null;
            if ($dateKey) {
                $timelineDaily[$dateKey] = ($timelineDaily[$dateKey] ?? 0) + 1;
            }

            // Resolve branch
            $branchId = null;
            $branchName = null;

            if ($sub->answers && $sub->answers->isNotEmpty()) {
                $branchAns = $sub->answers->first();
                if ($branchAns && $branchAns->value_text) {
                    $val = trim($branchAns->value_text);
                    if (is_numeric($val) && isset($branches[(int) $val])) {
                        $branchId = (string) $val;
                        $branchName = $branches[(int) $val]->name;
                    } else {
                        $matchedBranch = $branches->first(function ($b) use ($val) {
                            return strcasecmp($b->name, $val) === 0;
                        });
                        if ($matchedBranch) {
                            $branchId = (string) $matchedBranch->id;
                            $branchName = $matchedBranch->name;
                        } else {
                            $branchName = $val;
                            $branchId = 'custom_' . md5($val);
                        }
                    }
                }
            }

            if (!$branchId) {
                $empBranchId = $sub->user?->employee?->branch_id;
                if ($empBranchId && isset($branches[$empBranchId])) {
                    $branchId = (string) $empBranchId;
                    $branchName = $branches[$empBranchId]->name;
                } else {
                    $branchId = 'unassigned';
                    $branchName = 'Unassigned / Head Office';
                }
            }

            // Aggregate Form Stats
            $formStats[$formId]['submissions_count']++;
            if ($status === 'approved') $formStats[$formId]['approved_count']++;
            elseif ($status === 'rejected') $formStats[$formId]['rejected_count']++;
            else $formStats[$formId]['pending_count']++;

            $subCreatedAt = $sub->created_at ? $sub->created_at->toDateTimeString() : null;
            if (!$formStats[$formId]['latest_submission_at'] || ($subCreatedAt && $subCreatedAt > $formStats[$formId]['latest_submission_at'])) {
                $formStats[$formId]['latest_submission_at'] = $subCreatedAt;
            }

            // Aggregate Branch inside this form
            if (!isset($formStats[$formId]['branches'][$branchId])) {
                $formStats[$formId]['branches'][$branchId] = [
                    'branch_id' => $branchId,
                    'branch_name' => $branchName,
                    'submissions_count' => 0,
                    'approved_count' => 0,
                    'pending_count' => 0,
                    'rejected_count' => 0,
                    'latest_submission_at' => null,
                ];
            }
            $formStats[$formId]['branches'][$branchId]['submissions_count']++;
            if ($status === 'approved') $formStats[$formId]['branches'][$branchId]['approved_count']++;
            elseif ($status === 'rejected') $formStats[$formId]['branches'][$branchId]['rejected_count']++;
            else $formStats[$formId]['branches'][$branchId]['pending_count']++;

            if (!$formStats[$formId]['branches'][$branchId]['latest_submission_at'] || ($subCreatedAt && $subCreatedAt > $formStats[$formId]['branches'][$branchId]['latest_submission_at'])) {
                $formStats[$formId]['branches'][$branchId]['latest_submission_at'] = $subCreatedAt;
            }

            // Aggregate global Branch Stats
            if (!isset($branchStats[$branchId])) {
                $branchStats[$branchId] = [
                    'branch_id' => $branchId,
                    'branch_name' => $branchName,
                    'total_submissions' => 0,
                    'approved' => 0,
                    'pending' => 0,
                    'rejected' => 0,
                    'forms' => [],
                ];
            }
            $branchStats[$branchId]['total_submissions']++;
            if ($status === 'approved') $branchStats[$branchId]['approved']++;
            elseif ($status === 'rejected') $branchStats[$branchId]['rejected']++;
            else $branchStats[$branchId]['pending']++;

            if (!isset($branchStats[$branchId]['forms'][$formId])) {
                $branchStats[$branchId]['forms'][$formId] = [
                    'form_id' => $formId,
                    'form_title' => $formStats[$formId]['form_title'],
                    'submissions_count' => 0,
                    'approved' => 0,
                    'pending' => 0,
                    'rejected' => 0,
                ];
            }
            $branchStats[$branchId]['forms'][$formId]['submissions_count']++;
            if ($status === 'approved') $branchStats[$branchId]['forms'][$formId]['approved']++;
            elseif ($status === 'rejected') $branchStats[$branchId]['forms'][$formId]['rejected']++;
            else $branchStats[$branchId]['forms'][$formId]['pending']++;
        }

        // Convert associative branches in forms to sorted indexed array
        foreach ($formStats as &$fs) {
            uasort($fs['branches'], fn($a, $b) => $b['submissions_count'] <=> $a['submissions_count']);
            $fs['branches'] = array_values($fs['branches']);
            $fs['branches_count'] = count($fs['branches']);
        }
        unset($fs);

        // Convert associative forms in branches to sorted indexed array
        foreach ($branchStats as &$bs) {
            uasort($bs['forms'], fn($a, $b) => $b['submissions_count'] <=> $a['submissions_count']);
            $bs['forms'] = array_values($bs['forms']);
            $bs['forms_count'] = count($bs['forms']);
        }
        unset($bs);

        $formsAnalytics = array_values($formStats);
        usort($formsAnalytics, fn($a, $b) => $b['submissions_count'] <=> $a['submissions_count']);

        $branchesAnalytics = array_values($branchStats);
        usort($branchesAnalytics, fn($a, $b) => $b['total_submissions'] <=> $a['total_submissions']);

        ksort($timelineDaily);
        $timeline = [];
        foreach (array_slice($timelineDaily, -30, 30, true) as $date => $count) {
            $timeline[] = [
                'date' => $date,
                'submissions' => $count,
            ];
        }

        return response()->json([
            'status' => 'success',
            'overview' => [
                'total_forms' => count($forms),
                'total_submissions' => $submissions->count(),
                'approved_submissions' => $totalApproved,
                'pending_submissions' => $totalPending,
                'rejected_submissions' => $totalRejected,
                'branches_with_submissions' => count($branchesAnalytics),
                'total_registered_branches' => count($allBranchesList),
            ],
            'submissions_by_form' => $formsAnalytics,
            'submissions_by_branch' => $branchesAnalytics,
            'daily_timeline' => $timeline,
        ]);
    }

    /**
     * Format a single submission row into analytics-ready structure.
     */
    private function formatSubmissionRow($sub, array $branches, array $departments, array $employees, array $employeesLookup = []): array
    {
        $submitterEmp = $sub->user?->employee;
        if (!$submitterEmp && $sub->user && !empty($employeesLookup)) {
            $userEmail = strtolower((string)$sub->user->email);
            $userName = strtolower(trim((string)$sub->user->name));
            if ($sub->user->employee_id && isset($employeesLookup['byId'][$sub->user->employee_id])) {
                $submitterEmp = $employeesLookup['byId'][$sub->user->employee_id];
            } elseif ($userEmail && isset($employeesLookup['byEmail'][$userEmail])) {
                $submitterEmp = $employeesLookup['byEmail'][$userEmail];
            } elseif ($userName && isset($employeesLookup['byName'][$userName])) {
                $submitterEmp = $employeesLookup['byName'][$userName];
            }
        }

        $submitterEmployeeCode = $submitterEmp?->employee_code
            ?? ($employeesLookup['codes'][$sub->user?->employee_id ?? ''] ?? null);

        $answersFlat = [];
        $answersStructured = [];
        $subBranchId = null;
        $subBranchName = null;
        $subDeptId = null;
        $subDeptName = null;

        foreach ($sub->answers as $ans) {
            $question = $ans->question;
            $section = $question?->section;
            $secId = $section ? (int) $section->id : ($question && $question->form_section_id ? (int) $question->form_section_id : null);
            $secName = $section ? $section->title : null;
            $qId = $ans->form_question_id ?? ($question ? (int) $question->id : null);
            $qLabel = $question?->label ?? ('question_' . $ans->form_question_id);
            $type = $question?->inputType?->type_identifier ?? 'text';
            $val = $ans->value_text;
            $rawId = null;
            $empCode = null;

            // Resolve lookups & choices
            if ($type === 'branch_lookup') {
                $rawId = $val;
                $resolvedVal = isset($branches[$val]) ? $branches[$val] : $val;
                if ($rawId !== null && $rawId !== '') {
                    $subBranchId = is_numeric($rawId) ? (int) $rawId : $rawId;
                    $subBranchName = $resolvedVal;
                }
            } elseif ($type === 'department_lookup') {
                $rawId = $val;
                $resolvedVal = isset($departments[$val]) ? $departments[$val] : $val;
                if ($rawId !== null && $rawId !== '') {
                    $subDeptId = is_numeric($rawId) ? (int) $rawId : $rawId;
                    $subDeptName = $resolvedVal;
                }
            } elseif ($type === 'employee_lookup') {
                $rawId = $val;
                $resolvedVal = isset($employees[$val]) ? $employees[$val] : $val;
                $empCode = $employeesLookup['codes'][$val] ?? $val;
            } elseif ($type === 'number') {
                $resolvedVal = ($ans->value_text !== null && $ans->value_text !== '') ? $ans->value_text : ($ans->value_boolean !== null ? (string) (int) $ans->value_boolean : $val);
            } elseif ($question && $question->choices->isNotEmpty()) {
                $c = $question->choices->first(function ($choice) use ($ans) {
                    return (string) $choice->id === (string) $ans->value_text
                        || (string) $choice->value === (string) $ans->value_text
                        || (string) $choice->label === (string) $ans->value_text;
                });
                if ($c) {
                    $rawId = $c->id;
                    $resolvedVal = $c->label;
                } else {
                    $resolvedVal = $ans->value_text ?? ($ans->value_boolean !== null ? ($ans->value_boolean ? 'Yes' : 'No') : null);
                }
            } elseif ($ans->value_boolean !== null) {
                $resolvedVal = $ans->value_boolean ? 'Yes' : 'No';
            } else {
                $resolvedVal = $val;
            }

            $isSignature = ($type === 'signature');

            // For flat tabular export, do not return huge base64 data for signatures
            $flatVal = $resolvedVal;
            if ($isSignature) {
                $flatVal = null;
            } elseif (is_string($flatVal) && (str_starts_with($flatVal, 'data:image/') || strlen($flatVal) > 2000)) {
                $flatVal = '[Image Attached]';
            }

            $answersFlat[$qLabel] = $flatVal;
            if ($type === 'employee_lookup') {
                $answersFlat[$qLabel . ' (Code)'] = $empCode;
                $answersFlat[$qLabel . ' (ID)'] = $empCode;
            } elseif (in_array($type, ['branch_lookup', 'department_lookup']) && $rawId !== null) {
                $answersFlat[$qLabel . ' (ID)'] = is_numeric($rawId) ? (int) $rawId : $rawId;
            }

            $targets = $ans->targeted_employees;
            if (is_string($targets)) {
                try {
                    $targets = json_decode($targets, true);
                } catch (\Exception $e) {
                    $targets = null;
                }
            }
            if (!is_array($targets)) {
                $targets = null;
            }

            $answersStructured[] = [
                'question_id' => $qId,
                'question_label' => $qLabel,
                'section_id' => $secId,
                'section_name' => $secName,
                'input_type' => $type,
                'value' => $flatVal,
                'raw_value' => $val,
                'targeted_employees' => $targets,
            ];
        }

        // Fallback for branch / department from submitter employee profile
        if (!$subBranchId && $submitterEmp?->branch_id) {
            $subBranchId = $submitterEmp->branch_id;
            $subBranchName = $submitterEmp->branch?->name ?? ($branches[$subBranchId] ?? null);
        }
        if (!$subDeptId && $submitterEmp?->department_id) {
            $subDeptId = $submitterEmp->department_id;
            $subDeptName = $submitterEmp->department?->name ?? ($departments[$subDeptId] ?? null);
        }

        $sectionsGrouped = [];
        foreach ($answersStructured as $item) {
            $sId = $item['section_id'] ?? 0;
            if (!isset($sectionsGrouped[$sId])) {
                $sectionsGrouped[$sId] = [
                    'section_id' => $item['section_id'],
                    'section_name' => $item['section_name'] ?? 'General',
                    'questions' => [],
                ];
            }
            $sectionsGrouped[$sId]['questions'][] = $item;
        }

        return [
            'submission_id' => $sub->id,
            'form_id' => $sub->formVersion?->form_id,
            'form_title' => $sub->formVersion?->form?->title ?? 'Unknown Form',
            'status' => $sub->status ?: 'pending',
            'branch_id' => $subBranchId,
            'branch_name' => $subBranchName,
            'department_id' => $subDeptId,
            'department_name' => $subDeptName,
            'submitted_by_employee_code' => $submitterEmployeeCode,
            'submitted_by_employee_id' => $submitterEmployeeCode,
            'submitted_at' => $sub->created_at ? $sub->created_at->toDateTimeString() : null,
            'sections' => array_values($sectionsGrouped),
            'answers' => $answersStructured,
            'answers_flat' => $answersFlat,
        ];
    }

    /**
     * Get granular answer rows (1 row per question answered) with section_id, section_name, question_id.
     * Ideal for Power BI, Excel, and relational analytics.
     * GET /api/forms/answers
     * GET /api/forms/{id}/answers
     */
    public function answers(Request $request, $id = null): JsonResponse|StreamedResponse
    {
        $targetFormId = $id ?? $request->query('form_id');
        $sectionIdFilter = $request->query('section_id');
        $questionIdFilter = $request->query('question_id');
        $branchIdFilter = $request->query('branch_id');
        $departmentIdFilter = $request->query('department_id');
        $statusFilter = $request->query('status');
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        $perPageParam = $request->query('per_page', 500);
        $format = strtolower((string) $request->query('format', 'json'));

        // Pre-fetch reference dictionaries
        $branches = Branch::pluck('name', 'id')->toArray();
        $departments = Department::pluck('name', 'id')->toArray();
        $employeeModels = Employee::with(['branch:id,name', 'department:id,name'])->get();
        $employees = $employeeModels->mapWithKeys(function ($e) {
            return [$e->id => trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code];
        })->toArray();
        $employeeCodes = $employeeModels->pluck('employee_code', 'id')->toArray();
        $employeesLookup = [
            'byId' => $employeeModels->keyBy('id'),
            'byCode' => $employeeModels->keyBy('employee_code'),
            'byName' => [],
            'byEmail' => [],
            'codes' => $employeeCodes,
        ];
        foreach ($employeeModels as $e) {
            $fullName = strtolower(trim($e->first_name . ' ' . $e->last_name));
            if ($fullName && !isset($employeesLookup['byName'][$fullName])) {
                $employeesLookup['byName'][$fullName] = $e;
            }
            if ($e->email && !isset($employeesLookup['byEmail'][strtolower($e->email)])) {
                $employeesLookup['byEmail'][strtolower($e->email)] = $e;
            }
        }

        $query = FormSubmission::with([
            'formVersion.form',
            'user:id,name,email,employee_id',
            'user.employee:id,first_name,last_name,employee_code,branch_id,department_id',
            'user.employee.branch:id,name',
            'user.employee.department:id,name',
            'answers.question.choices',
            'answers.question.inputType',
            'answers.question.section:id,form_version_id,title,weight',
        ]);

        if ($targetFormId) {
            $query->whereHas('formVersion', function ($q) use ($targetFormId) {
                $q->where('form_id', $targetFormId);
            });
        }

        if ($statusFilter && $statusFilter !== 'all') {
            $statuses = explode(',', $statusFilter);
            $query->whereIn('status', $statuses);
        }

        if ($dateFrom) {
            $query->where('created_at', '>=', Carbon::parse($dateFrom)->startOfDay());
        }

        if ($dateTo) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        $query->orderByDesc('id');

        $isAll = in_array(strtolower((string) $perPageParam), ['all', '0', '-1'], true)
            || $request->query('paginate') === 'false'
            || $format === 'csv';

        if ($isAll) {
            $submissions = $query->get();
            $pagination = [
                'total_submissions' => $submissions->count(),
                'per_page' => $submissions->count(),
                'current_page' => 1,
                'last_page' => 1,
            ];
        } else {
            $perPage = max(1, min(1000, (int) $perPageParam));
            $paginated = $query->paginate($perPage);
            $submissions = $paginated->items();
            $pagination = [
                'total_submissions' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
            ];
        }

        $flatAnswers = [];
        foreach ($submissions as $sub) {
            $formatted = $this->formatSubmissionRow($sub, $branches, $departments, $employees, $employeesLookup);
            $baseMeta = [
                'submission_id' => $formatted['submission_id'],
                'form_id' => $formatted['form_id'],
                'form_title' => $formatted['form_title'],
                'status' => $formatted['status'],
                'branch_id' => $formatted['branch_id'],
                'branch_name' => $formatted['branch_name'],
                'department_id' => $formatted['department_id'],
                'department_name' => $formatted['department_name'],
                'submitted_by_employee_code' => $formatted['submitted_by_employee_code'],
                'submitted_at' => $formatted['submitted_at'],
            ];

            foreach ($formatted['answers'] as $ans) {
                if ($sectionIdFilter && $sectionIdFilter !== 'all' && (string) $ans['section_id'] !== (string) $sectionIdFilter) {
                    continue;
                }
                if ($questionIdFilter && $questionIdFilter !== 'all' && (string) $ans['question_id'] !== (string) $questionIdFilter) {
                    continue;
                }

                $flatAnswers[] = array_merge($baseMeta, [
                    'section_id' => $ans['section_id'],
                    'section_name' => $ans['section_name'],
                    'question_id' => $ans['question_id'],
                    'question_label' => $ans['question_label'],
                    'input_type' => $ans['input_type'],
                    'value' => $ans['value'],
                    'raw_value' => $ans['raw_value'],
                    'targeted_employees' => $ans['targeted_employees'],
                ]);
            }
        }

        $dataCollection = collect($flatAnswers);

        // Filter by branch if requested
        if ($branchIdFilter && $branchIdFilter !== 'all') {
            $branchName = $branches[$branchIdFilter] ?? null;
            $dataCollection = $dataCollection->filter(function ($row) use ($branchIdFilter, $branchName) {
                return (string) ($row['branch_id'] ?? '') === (string) $branchIdFilter
                    || ($branchName && strcasecmp((string) ($row['branch_name'] ?? ''), (string) $branchName) === 0);
            })->values();
        }

        // Filter by department if requested
        if ($departmentIdFilter && $departmentIdFilter !== 'all') {
            $deptName = $departments[$departmentIdFilter] ?? null;
            $dataCollection = $dataCollection->filter(function ($row) use ($departmentIdFilter, $deptName) {
                return (string) ($row['department_id'] ?? '') === (string) $departmentIdFilter
                    || ($deptName && strcasecmp((string) ($row['department_name'] ?? ''), (string) $deptName) === 0);
            })->values();
        }

        if ($format === 'csv') {
            return $this->streamAnswersCsvResponse($dataCollection, "checklist_answers_" . date('Y_m_d_His') . ".csv");
        }

        $pagination['total_answers'] = $dataCollection->count();

        return response()->json([
            'status' => 'success',
            'pagination' => $pagination,
            'count' => $dataCollection->count(),
            'data' => $dataCollection,
        ]);
    }

    /**
     * Stream CSV file of answers directly for external tools like Excel / PowerBI.
     */
    private function streamAnswersCsvResponse($rows, string $filename): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            $csvColumns = [
                'submission_id',
                'form_id',
                'form_title',
                'status',
                'branch_id',
                'branch_name',
                'department_id',
                'department_name',
                'submitted_by_employee_code',
                'submitted_at',
                'section_id',
                'section_name',
                'question_id',
                'question_label',
                'input_type',
                'value',
                'raw_value',
            ];

            fputcsv($handle, $csvColumns);

            foreach ($rows as $row) {
                $line = [];
                foreach ($csvColumns as $col) {
                    $val = $row[$col] ?? '';
                    $line[] = is_array($val) ? json_encode($val, JSON_UNESCAPED_UNICODE) : $val;
                }
                fputcsv($handle, $line);
            }

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * List all sections and questions with section_id, section_name, question_id.
     * GET /api/forms/sections
     * GET /api/forms/{id}/sections
     */
    public function sections(Request $request, $id = null): JsonResponse
    {
        $targetFormId = $id ?? $request->query('form_id');
        $includeAllVersions = $request->boolean('all_versions');

        $query = \App\Models\FormSection::with([
            'formVersion.form:id,title',
            'questions.inputType:id,type_identifier',
            'questions.choices:id,form_question_id,label,value',
        ]);

        if ($targetFormId) {
            if (!$includeAllVersions) {
                $form = \App\Models\Form::with('versions')->find($targetFormId);
                $latestVersionId = $form?->versions?->sortByDesc('version_number')->first()?->id;
                if ($latestVersionId) {
                    $query->where('form_version_id', $latestVersionId);
                } else {
                    $query->whereHas('formVersion', fn($q) => $q->where('form_id', $targetFormId));
                }
            } else {
                $query->whereHas('formVersion', fn($q) => $q->where('form_id', $targetFormId));
            }
        } elseif (!$includeAllVersions) {
            // Get latest version ID for each form
            $latestVersionIds = \App\Models\FormVersion::select('id', 'form_id', 'version_number')
                ->orderByDesc('version_number')
                ->get()
                ->unique('form_id')
                ->pluck('id')
                ->toArray();
            if (!empty($latestVersionIds)) {
                $query->whereIn('form_version_id', $latestVersionIds);
            }
        }

        $sections = $query->get()->map(function ($sec) {
            $questions = $sec->questions->map(function ($q) use ($sec) {
                return [
                    'question_id' => $q->id,
                    'section_id' => $sec->id,
                    'section_name' => $sec->title,
                    'label' => $q->label,
                    'question_label' => $q->label,
                    'input_type' => $q->inputType?->type_identifier ?? 'text',
                    'weight' => $q->weight !== null ? (float) $q->weight : null,
                    'is_required' => (bool) $q->is_required,
                    'choices' => $q->choices->map(fn($c) => [
                        'id' => $c->id,
                        'label' => $c->label,
                        'value' => $c->value,
                    ])->values(),
                ];
            });

            return [
                'section_id' => $sec->id,
                'section_name' => $sec->title,
                'form_id' => $sec->formVersion?->form_id,
                'form_title' => $sec->formVersion?->form?->title ?? 'Unknown Form',
                'form_version_id' => $sec->form_version_id,
                'weight' => $sec->weight !== null ? (float) $sec->weight : null,
                'questions_count' => $questions->count(),
                'questions' => $questions,
            ];
        });

        return response()->json([
            'status' => 'success',
            'count' => $sections->count(),
            'data' => $sections,
        ]);
    }

    /**
     * API Gateway endpoint matching https://kaldisbunnaet.com/api/api.php?endpoint=...&api_key=...
     * Supports:
     * - ?endpoint=health
     * - ?endpoint=submissions / form_submissions
     * - ?endpoint=answers / checklist_answers
     * - ?endpoint=sections / form_sections
     * - ?endpoint=forms / checklists
     */
    public function apiPhpGateway(Request $request): JsonResponse|StreamedResponse
    {
        $endpoint = strtolower(trim((string) $request->query('endpoint', 'health')));

        if ($endpoint === 'health') {
            return response()->json([
                'status' => 'ok',
                'code' => 200,
                'message' => 'Kaldis Systems Forms & Checklists API is running.',
                'version' => '1.3.0',
                'environment' => config('app.env', 'production'),
                'endpoints' => [
                    [
                        'name' => 'Health Check',
                        'url' => '?endpoint=health',
                    ],
                    [
                        'name' => 'Form Submissions (with section_id, section_name, question_id)',
                        'url' => '?endpoint=submissions',
                    ],
                    [
                        'name' => 'Granular Checklist Answers (with section_id, section_name, question_id)',
                        'url' => '?endpoint=answers',
                    ],
                    [
                        'name' => 'Form Sections',
                        'url' => '?endpoint=sections',
                    ],
                    [
                        'name' => 'Forms / Checklists List',
                        'url' => '?endpoint=forms',
                    ],
                ],
            ]);
        }

        if ($endpoint === 'submissions' || $endpoint === 'form_submissions') {
            $resp = $this->submissions($request);
            if ($resp instanceof StreamedResponse) {
                return $resp;
            }
            $payload = json_decode($resp->getContent(), true);
            return response()->json([
                'status' => 'success',
                'code' => 200,
                'endpoint' => $endpoint,
                'filters' => [
                    'form_id' => $request->query('form_id', 'all'),
                    'branch_id' => $request->query('branch_id', 'all'),
                    'department_id' => $request->query('department_id', 'all'),
                    'date_from' => $request->query('date_from', 'all'),
                    'date_to' => $request->query('date_to', 'all'),
                    'status' => $request->query('status', 'all'),
                ],
                'pagination' => $payload['pagination'] ?? [],
                'data' => $payload['data'] ?? [],
            ]);
        }

        if ($endpoint === 'answers' || $endpoint === 'checklist_answers') {
            $resp = $this->answers($request);
            if ($resp instanceof StreamedResponse) {
                return $resp;
            }
            $payload = json_decode($resp->getContent(), true);
            return response()->json([
                'status' => 'success',
                'code' => 200,
                'endpoint' => $endpoint,
                'filters' => [
                    'form_id' => $request->query('form_id', 'all'),
                    'section_id' => $request->query('section_id', 'all'),
                    'question_id' => $request->query('question_id', 'all'),
                    'branch_id' => $request->query('branch_id', 'all'),
                    'status' => $request->query('status', 'all'),
                ],
                'pagination' => $payload['pagination'] ?? [],
                'data' => $payload['data'] ?? [],
            ]);
        }

        if ($endpoint === 'sections' || $endpoint === 'form_sections') {
            $resp = $this->sections($request);
            $payload = json_decode($resp->getContent(), true);
            return response()->json([
                'status' => 'success',
                'code' => 200,
                'endpoint' => $endpoint,
                'count' => $payload['count'] ?? 0,
                'data' => $payload['data'] ?? [],
            ]);
        }

        if ($endpoint === 'forms' || $endpoint === 'checklists') {
            $resp = $this->index($request);
            $payload = json_decode($resp->getContent(), true);
            return response()->json([
                'status' => 'success',
                'code' => 200,
                'endpoint' => $endpoint,
                'count' => $payload['count'] ?? 0,
                'data' => $payload['data'] ?? [],
            ]);
        }

        return response()->json([
            'status' => 'error',
            'code' => 404,
            'message' => "Endpoint '{$endpoint}' not found.",
            'hint' => 'Call ?endpoint=health to see all available endpoints: submissions, answers, sections, forms.',
        ], 404);
    }

    /**
     * Stream CSV file directly for external tools like Excel / PowerBI.
     */
    private function streamCsvResponse($rows, string $filename): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            if ($rows->isEmpty()) {
                fputcsv($handle, ['No records found']);
                fclose($handle);
                return;
            }

            // Collect all unique question headers
            $baseHeaders = [
                'submission_id',
                'form_id',
                'form_title',
                'status',
                'submitted_by_employee_code',
                'submitted_at',
            ];
            $questionHeaders = [];
            foreach ($rows as $row) {
                foreach (array_keys($row['answers_flat']) as $q) {
                    if (!in_array($q, $questionHeaders, true)) {
                        $questionHeaders[] = $q;
                    }
                }
            }

            fputcsv($handle, array_merge($baseHeaders, $questionHeaders));

            foreach ($rows as $row) {
                $line = [
                    $row['submission_id'],
                    $row['form_id'],
                    $row['form_title'],
                    $row['status'],
                    $row['submitted_by_employee_code'] ?? ($row['submitted_by_employee_id'] ?? ''),
                    $row['submitted_at'],
                ];
                foreach ($questionHeaders as $q) {
                    $val = $row['answers_flat'][$q] ?? '';
                    $line[] = is_array($val) ? json_encode($val, JSON_UNESCAPED_UNICODE) : $val;
                }
                fputcsv($handle, $line);
            }

            fclose($handle);
        }, 200, $headers);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\FiscalMonth;
use App\Models\Form;
use App\Models\FormSubmission;
use App\Models\MemoTemplate;
use App\Models\Training\EvaluationResultOverride;
use App\Models\Training\RecurringTrainingModule;
use App\Models\Training\TrainingType;
use App\Models\User;
use App\Services\Forms\InspectorChecklistChampionAccess;
use App\Services\SimpleXlsxWriter;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FormSubmissionAdminController extends Controller
{
    private function userCanViewFormSubmissions(User $user, Form $form): bool
    {
        if ((int) ($form->created_by ?? 0) === (int) $user->id) {
            return true;
        }

        if ($form->user_permissions()
            ->where('user_id', $user->id)
            ->where('can_view_submissions', true)
            ->exists()) {
            return true;
        }

        // Position match alone is not enough — require the champion permission.
        return $user->can(InspectorChecklistChampionAccess::PERMISSION_NAME)
            && InspectorChecklistChampionAccess::canViewForm($user, $form);
    }

    /**
     * Forms the user may open under All Submissions.
     */
    private function formsQueryableForSubmissions(User $user)
    {
        $championFormIds = $user->can(InspectorChecklistChampionAccess::PERMISSION_NAME)
            ? InspectorChecklistChampionAccess::accessibleFormIds($user)
            : [];

        return Form::query()->where(function ($query) use ($user, $championFormIds) {
            $query->where('created_by', $user->id)
                ->orWhereHas('user_permissions', function ($q) use ($user) {
                    $q->where('user_id', $user->id)->where('can_view_submissions', true);
                });

            if (! empty($championFormIds)) {
                $query->orWhereIn('id', $championFormIds);
            }
        });
    }

    private function _calculateEmployeeScores($submission, $employeesCollection)
    {
        $rosterAnswer = $submission->answers->first(function ($a) {
            return ($a->question?->inputType?->type_identifier ?? '') === 'employee_attendance_roster';
        });

        $employeeScoresMatrix = [];
        $presentEmployeeIds = [];

        if ($rosterAnswer && $rosterAnswer->value_text) {
            $decoded = json_decode($rosterAnswer->value_text, true);
            if (is_array($decoded)) {
                $presentEmployeeIds = $decoded;
            }
        }

        foreach ($presentEmployeeIds as $empId) {
            $emp = $this->employeeFromCollection($employeesCollection, (int) $empId);
            if ($emp) {
                $employeeScoresMatrix[(string) $empId] = [
                    'id' => $emp->id,
                    'name' => trim($emp->first_name . ' ' . $emp->last_name) ?: ($emp->employee_code ?? "Employee #{$emp->id}"),
                    'employee_code' => $emp->employee_code,
                    'department_id' => $emp->department_id,
                    'branch_id' => $emp->branch_id,
                    'total_points' => 0,
                    'earned_points' => 0,
                    'percentage' => null,
                ];
            }
        }

        $totalBoolQuestions = 0;
        $yesAnswers = 0;
        $sectionScores = [];
        $empSectionScores = [];
        $sectionsById = $submission->formVersion?->sections?->keyBy('id') ?? collect();

        foreach ($submission->answers as $ans) {
            $qType = $ans->question?->inputType?->type_identifier ?? 'text';
            $sec = $ans->question?->section ?? $sectionsById->get($ans->question?->form_section_id);
            $secId = $sec ? (int) $sec->id : 0;
            $secWeight = ($sec && $sec->weight !== null && $sec->weight > 0) ? (float) $sec->weight : null;

            if ($qType === 'select_one' || $qType === 'boolean') {
                $isScored = false;
                $isYes = false;

                if ($ans->value_boolean !== null) {
                    $isScored = true;
                    $isYes = (bool) $ans->value_boolean;
                } elseif ($ans->value_text === '0' || $ans->value_text === '1' || $ans->value_text === 'አዎ' || $ans->value_text === 'አይ') {
                    $isScored = true;
                    $isYes = ($ans->value_text === '1' || $ans->value_text === 'አዎ');
                } else {
                    $choice = $ans->question?->choices?->first(function ($c) use ($ans) {
                        return (string) $c->id === (string) $ans->value_text
                            || (string) $c->label === (string) $ans->value_text
                            || (string) $c->value === (string) $ans->value_text;
                    });
                    if ($choice && ($choice->value === '1' || $choice->value === '0' || $choice->label === 'አዎ' || $choice->label === 'አይ')) {
                        $isScored = true;
                        $isYes = ($choice->value === '1' || $choice->label === 'አዎ');
                    }
                }

                if ($isScored) {
                    $qWeight = ($ans->question && $ans->question->weight !== null && $ans->question->weight > 0)
                        ? (float) $ans->question->weight
                        : 1.0;

                    $totalBoolQuestions += $qWeight;
                    if ($isYes) {
                        $yesAnswers += $qWeight;
                    }

                    if (!isset($sectionScores[$secId])) {
                        $sectionScores[$secId] = ['weight' => $secWeight, 'earned' => 0, 'total' => 0];
                    }
                    $sectionScores[$secId]['total'] += $qWeight;
                    if ($isYes) {
                        $sectionScores[$secId]['earned'] += $qWeight;
                    }

                    // Decode answer targets
                    $ansTargets = $ans->targeted_employees;
                    if (is_string($ansTargets)) {
                        $ansTargets = json_decode($ansTargets, true);
                    }
                    $ansTargetEmpIds = is_array($ansTargets) ? array_map('strval', $ansTargets) : [];

                    // Decode question department targets
                    $targetDepts = $ans->question?->department_targets ?? [];
                    if (is_string($targetDepts)) {
                        $targetDepts = json_decode($targetDepts, true);
                    }
                    $targetDeptIds = is_array($targetDepts) ? array_map('strval', $targetDepts) : [];
                    $expandedTargetDeptIds = [];
                    foreach ($targetDeptIds as $tId) {
                        $expandedTargetDeptIds = array_merge($expandedTargetDeptIds, \App\Models\Department::getAliasedDepartmentIds($tId));
                    }
                    $expandedTargetDeptIds = array_unique(array_map('strval', $expandedTargetDeptIds));

                    foreach ($employeeScoresMatrix as $empKey => &$empScore) {
                        $isTargeted = false;
                        $empIdStr = (string) $empScore['id'];

                        if (!empty($ansTargetEmpIds)) {
                            $isTargeted = in_array($empIdStr, $ansTargetEmpIds, true);
                        } elseif (!empty($expandedTargetDeptIds)) {
                            $isTargeted = in_array((string) $empScore['department_id'], $expandedTargetDeptIds, true);
                        } else {
                            $isTargeted = true;
                        }

                        if ($isTargeted) {
                            $empScore['total_points'] += $qWeight;
                            if ($isYes) {
                                $empScore['earned_points'] += $qWeight;
                            }

                            if (!isset($empSectionScores[$empKey][$secId])) {
                                $empSectionScores[$empKey][$secId] = ['weight' => $secWeight, 'earned' => 0, 'total' => 0];
                            }
                            $empSectionScores[$empKey][$secId]['total'] += $qWeight;
                            if ($isYes) {
                                $empSectionScores[$empKey][$secId]['earned'] += $qWeight;
                            }
                        }
                    }
                    unset($empScore);
                }
            }

            // Employee Evaluation Grid Scoring Map Integration
            if ($qType === 'employee_evaluation_grid') {
                $targets = $ans->targeted_employees;
                if (is_string($targets)) {
                    $targets = json_decode($targets, true);
                }
                if (!is_array($targets)) {
                    $targets = [];
                }

                $numVal = is_numeric($ans->value_text) ? (float) $ans->value_text : 0;

                foreach ($targets as $empIdStr) {
                    $empIdKey = (string) $empIdStr;
                    if (isset($employeeScoresMatrix[$empIdKey])) {
                        if ($numVal > 0) {
                            $employeeScoresMatrix[$empIdKey]['earned_points'] += $numVal;
                        }
                        $employeeScoresMatrix[$empIdKey]['total_points'] += max(1, $numVal);

                        if (!isset($empSectionScores[$empIdKey][$secId])) {
                            $empSectionScores[$empIdKey][$secId] = ['weight' => $secWeight, 'earned' => 0, 'total' => 0];
                        }
                        if ($numVal > 0) {
                            $empSectionScores[$empIdKey][$secId]['earned'] += $numVal;
                        }
                        $empSectionScores[$empIdKey][$secId]['total'] += max(1, $numVal);
                    }
                }
            }
        }

        $hasCustomSectionWeights = false;
        foreach ($sectionScores as $sData) {
            if ($sData['weight'] !== null && $sData['weight'] > 0) {
                $hasCustomSectionWeights = true;
                break;
            }
        }
        if (!$hasCustomSectionWeights) {
            foreach ($empSectionScores as $eSecs) {
                foreach ($eSecs as $sData) {
                    if ($sData['weight'] !== null && $sData['weight'] > 0) {
                        $hasCustomSectionWeights = true;
                        break 2;
                    }
                }
            }
        }

        $scoresList = [];
        foreach ($employeeScoresMatrix as $empKey => &$empScore) {
            if ($hasCustomSectionWeights && !empty($empSectionScores[$empKey])) {
                $empWeightedSum = 0;
                $empWeightTotal = 0;
                foreach ($empSectionScores[$empKey] as $sData) {
                    if ($sData['total'] > 0 && $sData['weight'] !== null && (float) $sData['weight'] > 0) {
                        $w = (float) $sData['weight'];
                        $pct = ($sData['earned'] / $sData['total']) * 100;
                        $empWeightedSum += $pct * $w;
                        $empWeightTotal += $w;
                    }
                }
                if ($empWeightTotal > 0) {
                    $empScore['percentage'] = round($empWeightedSum / $empWeightTotal, 1);
                    $empScore['total_points'] = round($empWeightTotal, 2);
                    $empScore['earned_points'] = round(($empScore['percentage'] / 100) * $empWeightTotal, 2);
                } elseif ($empScore['total_points'] > 0) {
                    $empScore['percentage'] = round(($empScore['earned_points'] / $empScore['total_points']) * 100, 1);
                }
            } else {
                if ($empScore['total_points'] > 0) {
                    $empScore['percentage'] = round(($empScore['earned_points'] / $empScore['total_points']) * 100, 1);
                }
            }
            $scoresList[] = $empScore;
        }
        unset($empScore);

        $submission->employee_scores = $scoresList;

        if (!empty($scoresList)) {
            $validPercentages = array_filter(array_column($scoresList, 'percentage'), fn ($p) => $p !== null);
            $submission->calculated_score = !empty($validPercentages)
                ? round(array_sum($validPercentages) / count($validPercentages), 1)
                : null;
        } else {
            if ($hasCustomSectionWeights && !empty($sectionScores)) {
                $subWeightedSum = 0;
                $subWeightTotal = 0;
                foreach ($sectionScores as $sData) {
                    if ($sData['total'] > 0 && $sData['weight'] !== null && (float) $sData['weight'] > 0) {
                        $w = (float) $sData['weight'];
                        $pct = ($sData['earned'] / $sData['total']) * 100;
                        $subWeightedSum += $pct * $w;
                        $subWeightTotal += $w;
                    }
                }
                $submission->calculated_score = $subWeightTotal > 0 ? round($subWeightedSum / $subWeightTotal, 1) : null;
            } else {
                $submission->calculated_score = $totalBoolQuestions > 0 ? round(($yesAnswers / $totalBoolQuestions) * 100, 1) : null;
            }
        }

        return $submission;
    }

    /**
     * List all form directories globally.
     */
    public function all_index()
    {
        $user = auth()->user();
        $forms = $this->formsQueryableForSubmissions($user)
            ->withCount('submissions')
            ->orderBy('title')
            ->get();

        return Inertia::render('Forms/Submissions/Index', [
            'forms' => $forms
        ]);
    }

    /**
     * Show isolated submissions strictly bound to one Form (server-paginated, slim rows).
     */
    public function form_submissions(Request $request, Form $form)
    {
        $user = auth()->user();
        if (! $this->userCanViewFormSubmissions($user, $form)) {
            abort(403, 'You must be granted explicit form-level access to view submissions for this form.');
        }

        $fiscalYears = \App\Models\FiscalYear::orderBy('gregorian_start_date')
            ->get(['id', 'name', 'gregorian_start_date', 'gregorian_end_date']);
        $fiscalMonths = \App\Models\FiscalMonth::orderBy('gregorian_start_date')
            ->get(['id', 'fiscal_year_id', 'name', 'gregorian_start_date', 'gregorian_end_date']);

        $today = Carbon::today();
        $currentFiscalYear = $fiscalYears->first(fn ($fy) => $today->between(
            Carbon::parse($fy->gregorian_start_date),
            Carbon::parse($fy->gregorian_end_date)
        ));
        $currentFiscalMonth = $fiscalMonths->first(fn ($fm) => $today->between(
            Carbon::parse($fm->gregorian_start_date),
            Carbon::parse($fm->gregorian_end_date)
        ));

        $lookupMeta = \App\Models\FormQuestion::query()
            ->whereHas('section.formVersion', fn ($q) => $q->where('form_id', $form->id))
            ->whereHas('inputType', fn ($q) => $q->whereIn('type_identifier', ['branch_lookup', 'employee_lookup']))
            ->with('inputType:id,type_identifier')
            ->get(['id', 'label', 'form_input_type_id']);

        $hasBranch = $lookupMeta->contains(fn ($q) => ($q->inputType->type_identifier ?? '') === 'branch_lookup');
        $hasEmployee = $lookupMeta->contains(fn ($q) => ($q->inputType->type_identifier ?? '') === 'employee_lookup');
        $branchLabel = $lookupMeta->first(fn ($q) => ($q->inputType->type_identifier ?? '') === 'branch_lookup')?->label ?? 'Branch';
        $employeeLabel = $lookupMeta->first(fn ($q) => ($q->inputType->type_identifier ?? '') === 'employee_lookup')?->label ?? 'Evaluated Employee';

        $statusFilter = $request->input('status', 'all');
        $submittedByFilter = $request->input('submitted_by', 'all');
        $submissionTypeFilter = $request->input('submission_type', 'all');
        $branchFilter = $request->input('branch_id', 'all');
        $employeeFilter = $request->input('employee_id', 'all');
        // Default to current fiscal period only on first visit (no filter query params).
        $fiscalYearFilter = $request->has('fiscal_year_id')
            ? (string) $request->input('fiscal_year_id', 'all')
            : ($currentFiscalYear?->id ? (string) $currentFiscalYear->id : 'all');
        $fiscalMonthFilter = $request->has('fiscal_month_id')
            ? (string) $request->input('fiscal_month_id', 'all')
            : ($currentFiscalMonth?->id ? (string) $currentFiscalMonth->id : 'all');

        $query = FormSubmission::query()
            ->select(['id', 'form_version_id', 'user_id', 'status', 'is_qa_manager', 'qa_manager_id', 'created_at'])
            ->whereHas('formVersion', fn ($q) => $q->where('form_id', $form->id))
            ->with(['user:id,name', 'qaManager:id,name'])
            ->orderByDesc('id');

        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        if ($submittedByFilter !== 'all' && ctype_digit($submittedByFilter)) {
            $query->where('user_id', (int) $submittedByFilter);
        }

        if ($submissionTypeFilter === 'qa_manager') {
            $query->where('is_qa_manager', true);
        } elseif ($submissionTypeFilter === 'standard') {
            $query->where('is_qa_manager', false);
        }

        if ($fiscalMonthFilter !== 'all' && ctype_digit($fiscalMonthFilter)) {
            $month = $fiscalMonths->firstWhere('id', (int) $fiscalMonthFilter);
            if ($month) {
                $query->whereBetween('created_at', [
                    Carbon::parse($month->gregorian_start_date)->startOfDay(),
                    Carbon::parse($month->gregorian_end_date)->endOfDay(),
                ]);
            }
        } elseif ($fiscalYearFilter !== 'all' && ctype_digit($fiscalYearFilter)) {
            $year = $fiscalYears->firstWhere('id', (int) $fiscalYearFilter);
            if ($year) {
                $query->whereBetween('created_at', [
                    Carbon::parse($year->gregorian_start_date)->startOfDay(),
                    Carbon::parse($year->gregorian_end_date)->endOfDay(),
                ]);
            }
        }

        if ($hasBranch && $branchFilter !== 'all' && ctype_digit($branchFilter)) {
            $query->whereHas('answers', function ($q) use ($branchFilter) {
                $q->where('value_text', (string) $branchFilter)
                    ->whereHas('question.inputType', fn ($t) => $t->where('type_identifier', 'branch_lookup'));
            });
        }

        if ($hasEmployee && $employeeFilter !== 'all' && ctype_digit($employeeFilter)) {
            $query->whereHas('answers', function ($q) use ($employeeFilter) {
                $q->where('value_text', (string) $employeeFilter)
                    ->whereHas('question.inputType', fn ($t) => $t->where('type_identifier', 'employee_lookup'));
            });
        }

        $paginator = $query->paginate(25)->withQueryString();

        $pageIds = $paginator->getCollection()->pluck('id')->all();
        $lookupAnswers = collect();
        if ($pageIds !== [] && ($hasBranch || $hasEmployee)) {
            $types = array_values(array_filter([
                $hasBranch ? 'branch_lookup' : null,
                $hasEmployee ? 'employee_lookup' : null,
            ]));

            $lookupAnswers = \App\Models\FormSubmissionAnswer::query()
                ->whereIn('form_submission_id', $pageIds)
                ->whereHas('question.inputType', fn ($q) => $q->whereIn('type_identifier', $types))
                ->with(['question.inputType:id,type_identifier'])
                ->get(['id', 'form_submission_id', 'form_question_id', 'value_text', 'is_relocated'])
                ->groupBy('form_submission_id');
        }

        $pageBranchIds = [];
        $pageEmployeeIds = [];
        foreach ($lookupAnswers as $answers) {
            foreach ($answers as $answer) {
                $type = $answer->question?->inputType?->type_identifier ?? '';
                if ($type === 'branch_lookup' && is_numeric($answer->value_text)) {
                    $pageBranchIds[] = (int) $answer->value_text;
                }
                if ($type === 'employee_lookup' && is_numeric($answer->value_text)) {
                    $pageEmployeeIds[] = (int) $answer->value_text;
                }
            }
        }

        $branchNames = $pageBranchIds === []
            ? collect()
            : \App\Models\Branch::whereIn('id', array_unique($pageBranchIds))->pluck('name', 'id');
        $employeeNames = $pageEmployeeIds === []
            ? collect()
            : \App\Models\Employee::query()
                ->whereIn('id', array_unique($pageEmployeeIds))
                ->get(['id', 'first_name', 'last_name', 'employee_code'])
                ->mapWithKeys(fn ($e) => [
                    $e->id => trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code,
                ]);

        $rows = $paginator->getCollection()->map(function (FormSubmission $sub) use (
            $fiscalYears,
            $fiscalMonths,
            $lookupAnswers,
            $hasBranch,
            $hasEmployee,
            $branchNames,
            $employeeNames
        ) {
            $submittedAt = Carbon::parse($sub->created_at);
            $matchedYear = $fiscalYears->first(
                fn ($fy) => $submittedAt->between(
                    Carbon::parse($fy->gregorian_start_date),
                    Carbon::parse($fy->gregorian_end_date)
                )
            );
            $matchedMonth = $fiscalMonths->first(
                fn ($fm) => $submittedAt->between(
                    Carbon::parse($fm->gregorian_start_date),
                    Carbon::parse($fm->gregorian_end_date)
                )
            );

            $answers = $lookupAnswers->get($sub->id, collect());
            $branchAnswer = $hasBranch
                ? $answers->first(fn ($a) => ($a->question?->inputType?->type_identifier ?? '') === 'branch_lookup')
                : null;
            $employeeAnswer = $hasEmployee
                ? $answers->first(fn ($a) => ($a->question?->inputType?->type_identifier ?? '') === 'employee_lookup')
                : null;

            $branchId = $branchAnswer && is_numeric($branchAnswer->value_text) ? (int) $branchAnswer->value_text : null;
            $employeeId = $employeeAnswer && is_numeric($employeeAnswer->value_text) ? (int) $employeeAnswer->value_text : null;
            $isEmployeeRelocated = (bool) ($employeeAnswer?->is_relocated ?? false);

            return [
                'id' => $sub->id,
                'status' => $sub->status ?? 'pending',
                'submitted_by' => $sub->user?->name ?? 'Unknown User',
                'is_qa_manager' => (bool) $sub->is_qa_manager,
                'qa_manager_id' => $sub->qa_manager_id,
                'qa_manager_name' => $sub->qaManager?->name,
                'created_at' => $sub->created_at?->toDateTimeString(),
                'branch_name' => $branchId ? ($branchNames[$branchId] ?? (string) $branchId) : null,
                'employee_name' => $employeeId ? ($employeeNames[$employeeId] ?? (string) $employeeId) : null,
                'is_employee_relocated' => $isEmployeeRelocated,
                'fiscal_year_id' => $matchedYear?->id,
                'fiscal_month_id' => $matchedMonth?->id,
            ];
        });

        $paginator->setCollection($rows);

        $submitterOptions = FormSubmission::query()
            ->whereHas('formVersion', fn ($q) => $q->where('form_id', $form->id))
            ->with('user:id,name')
            ->select('user_id')
            ->distinct()
            ->get()
            ->map(fn ($s) => [
                'id' => $s->user_id,
                'name' => $s->user?->name ?? 'Unknown User',
            ])
            ->filter(fn ($s) => $s['id'])
            ->unique('id')
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        $branchOptions = $hasBranch
            ? \App\Models\Branch::orderBy('name')->get(['id', 'name'])->map(fn ($b) => ['id' => $b->id, 'name' => $b->name])
            : collect();

        $employeeOptions = $hasEmployee
            ? \App\Models\Employee::query()
                ->where('status', 'active')
                ->orderBy('first_name')
                ->orderBy('last_name')
                ->get(['id', 'first_name', 'last_name', 'employee_code'])
                ->map(fn ($e) => [
                    'id' => $e->id,
                    'name' => trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code,
                ])
            : collect();

        return Inertia::render('Forms/Submissions/FormSubmissions', [
            'form' => ['id' => $form->id, 'title' => $form->title],
            'submissions' => $paginator,
            'hasBranch' => $hasBranch,
            'hasEmployee' => $hasEmployee,
            'branchLabel' => $branchLabel,
            'employeeLabel' => $employeeLabel,
            'branchOptions' => $branchOptions,
            'employeeOptions' => $employeeOptions,
            'submitterOptions' => $submitterOptions,
            'fiscalYears' => $fiscalYears->map(fn ($fy) => ['id' => $fy->id, 'name' => $fy->name])->values(),
            'fiscalMonths' => $fiscalMonths->map(fn ($fm) => [
                'id' => $fm->id,
                'fiscal_year_id' => $fm->fiscal_year_id,
                'name' => $fm->name,
            ])->values(),
            'currentFiscalYearId' => $currentFiscalYear?->id,
            'currentFiscalMonthId' => $currentFiscalMonth?->id,
            'filters' => [
                'status' => $statusFilter,
                'submitted_by' => $submittedByFilter,
                'submission_type' => $submissionTypeFilter,
                'branch_id' => $branchFilter,
                'employee_id' => $employeeFilter,
                'fiscal_year_id' => (string) $fiscalYearFilter,
                'fiscal_month_id' => (string) $fiscalMonthFilter,
            ],
        ]);
    }

    /**
     * Submission tracking dashboard with branch visit metrics, charts, and fiscal & date filters.
     */
    public function form_tracking(Form $form)
    {
        $user = auth()->user();
        if (! $this->userCanViewFormSubmissions($user, $form)) {
            abort(403, 'You must be granted explicit form-level access to view tracking for this form.');
        }

        $allBranches = \App\Models\Branch::where('is_sales_generating', true)->orderBy('name')->get(['id', 'name', 'branch_code', 'location']);
        $branchMap = $allBranches->keyBy('id');

        $submissions = FormSubmission::whereHas('formVersion', function ($q) use ($form) {
                $q->where('form_id', $form->id);
            })
            ->with([
                'user:id,name,email',
                'user.employee.branch:id,name',
                'answers.question.inputType:id,type_identifier'
            ])
            ->orderByDesc('created_at')
            ->get();

        $fiscalYears = \App\Models\FiscalYear::orderBy('gregorian_start_date')->get(['id', 'name', 'gregorian_start_date', 'gregorian_end_date']);
        $fiscalMonths = \App\Models\FiscalMonth::orderBy('gregorian_start_date')->get(['id', 'fiscal_year_id', 'name', 'gregorian_start_date', 'gregorian_end_date']);

        $today = \Carbon\Carbon::today();
        $currentFiscalYear = $fiscalYears->first(fn($fy) => $today->between(
            \Carbon\Carbon::parse($fy->gregorian_start_date),
            \Carbon\Carbon::parse($fy->gregorian_end_date)
        ));
        $currentFiscalMonth = $fiscalMonths->first(fn($fm) => $today->between(
            \Carbon\Carbon::parse($fm->gregorian_start_date),
            \Carbon\Carbon::parse($fm->gregorian_end_date)
        ));

        $resolvedSubmissions = $submissions->map(function ($sub) use ($branchMap, $allBranches, $fiscalYears, $fiscalMonths) {
            $branchAns = $sub->answers->first(function ($a) {
                return ($a->question?->inputType?->type_identifier ?? '') === 'branch_lookup';
            });

            $branchId = null;
            $branchName = null;

            if ($branchAns && $branchAns->value_text) {
                $val = trim($branchAns->value_text);
                if (is_numeric($val) && isset($branchMap[(int)$val])) {
                    $branchId = (int)$val;
                    $branchName = $branchMap[(int)$val]->name;
                } else {
                    $matched = $allBranches->first(fn($b) => strcasecmp($b->name, $val) === 0);
                    if ($matched) {
                        $branchId = $matched->id;
                        $branchName = $matched->name;
                    } else {
                        $branchName = $val;
                        $branchId = 'custom_' . md5($val);
                    }
                }
            }

            if (!$branchId) {
                $empBranch = $sub->user?->employee?->branch;
                if ($empBranch) {
                    $branchId = $empBranch->id;
                    $branchName = $empBranch->name;
                } else {
                    $branchId = 'unassigned';
                    $branchName = 'Unassigned';
                }
            }

            $submittedAt = \Carbon\Carbon::parse($sub->created_at);
            $matchedYear = $fiscalYears->first(fn($fy) => $submittedAt->between(
                \Carbon\Carbon::parse($fy->gregorian_start_date),
                \Carbon\Carbon::parse($fy->gregorian_end_date)
            ));
            $matchedMonth = $fiscalMonths->first(fn($fm) => $submittedAt->between(
                \Carbon\Carbon::parse($fm->gregorian_start_date),
                \Carbon\Carbon::parse($fm->gregorian_end_date)
            ));

            return [
                'id' => $sub->id,
                'branch_id' => $branchId,
                'branch_name' => $branchName,
                'user_id' => $sub->user_id,
                'user_name' => $sub->user?->name ?? 'Unknown',
                'status' => $sub->status ?: 'pending',
                'created_at' => $sub->created_at->toIso8601String(),
                'date' => $sub->created_at->format('Y-m-d'),
                'fiscal_year_id' => $matchedYear?->id,
                'fiscal_year_name' => $matchedYear?->name,
                'fiscal_month_id' => $matchedMonth?->id,
                'fiscal_month_name' => $matchedMonth?->name,
            ];
        });

        // Other forms the user can view, allowing quick switching from the tracking page
        $availableForms = $this->formsQueryableForSubmissions($user)
            ->orderBy('title')
            ->get(['id', 'title']);

        return Inertia::render('Forms/Submissions/Tracking', [
            'form' => [
                'id' => $form->id,
                'title' => $form->title,
                'description' => $form->description,
                'status' => $form->status,
            ],
            'availableForms' => $availableForms,
            'allBranches' => $allBranches->map(fn($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'branch_code' => $b->branch_code,
                'location' => $b->location,
            ]),
            'submissions' => $resolvedSubmissions,
            'fiscalYears' => $fiscalYears->map(fn($fy) => [
                'id' => $fy->id,
                'name' => $fy->name,
                'start_date' => $fy->gregorian_start_date,
                'end_date' => $fy->gregorian_end_date,
            ])->values(),
            'fiscalMonths' => $fiscalMonths->map(fn($fm) => [
                'id' => $fm->id,
                'fiscal_year_id' => $fm->fiscal_year_id,
                'name' => $fm->name,
                'start_date' => $fm->gregorian_start_date,
                'end_date' => $fm->gregorian_end_date,
            ])->values(),
            'currentFiscalYearId' => $currentFiscalYear?->id,
            'currentFiscalMonthId' => $currentFiscalMonth?->id,
        ]);
    }

    /**
     * List only the authenticated user's own submissions.
     */
    public function my_submissions()
    {
        $user = auth()->user();

        $submissions = FormSubmission::where('user_id', $user->id)
            ->with([
                'formVersion.form',
                'formVersion.sections',
                'answers.question.inputType',
                'answers.question.section',
            ])
            ->orderByDesc('id')
            ->get();

        $fullEmployeesCollection = \App\Models\Employee::get();
        $submissions->each(function ($sub) use ($fullEmployeesCollection) {
            $this->_calculateEmployeeScores($sub, $fullEmployeesCollection);
            $this->attachLookupSubjectScore($sub, $fullEmployeesCollection);
        });

        $branches = \App\Models\Branch::pluck('name', 'id')->toArray();
        $departments = \App\Models\Department::pluck('name', 'id')->toArray();
        $employees = \App\Models\Employee::get()->mapWithKeys(function ($e) {
            $name = trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code;
            return [$e->id => $name];
        })->toArray();

        // Load fiscal periods and resolve each submission
        $fiscalYears = \App\Models\FiscalYear::orderBy('gregorian_start_date')->get(['id', 'name', 'gregorian_start_date', 'gregorian_end_date']);
        $fiscalMonths = \App\Models\FiscalMonth::orderBy('gregorian_start_date')->get(['id', 'fiscal_year_id', 'name', 'gregorian_start_date', 'gregorian_end_date']);

        $submissions->each(function ($sub) use ($fiscalYears, $fiscalMonths) {
            $submittedAt = \Carbon\Carbon::parse($sub->created_at);

            $matchedYear = $fiscalYears->first(
                fn($fy) =>
                $submittedAt->between(
                    \Carbon\Carbon::parse($fy->gregorian_start_date),
                    \Carbon\Carbon::parse($fy->gregorian_end_date)
                )
            );
            $sub->fiscal_year_id = $matchedYear?->id;
            $sub->fiscal_year_name = $matchedYear?->name;

            $matchedMonth = $fiscalMonths->first(
                fn($fm) =>
                $submittedAt->between(
                    \Carbon\Carbon::parse($fm->gregorian_start_date),
                    \Carbon\Carbon::parse($fm->gregorian_end_date)
                )
            );
            $sub->fiscal_month_id = $matchedMonth?->id;
            $sub->fiscal_month_name = $matchedMonth?->name;
        });

        $today = \Carbon\Carbon::today();
        $currentFiscalYear = $fiscalYears->first(fn($fy) => $today->between(
            \Carbon\Carbon::parse($fy->gregorian_start_date),
            \Carbon\Carbon::parse($fy->gregorian_end_date)
        ));
        $currentFiscalMonth = $fiscalMonths->first(fn($fm) => $today->between(
            \Carbon\Carbon::parse($fm->gregorian_start_date),
            \Carbon\Carbon::parse($fm->gregorian_end_date)
        ));

        // Get unique forms from user's submissions
        $forms = $submissions->map(function ($s) {
            return $s->formVersion?->form ? [
                'id' => $s->formVersion->form->id,
                'title' => $s->formVersion->form->title,
            ] : null;
        })->filter()->unique('id')->values();

        return Inertia::render('Forms/Submissions/MySubmissions', [
            'submissions' => $submissions,
            'forms' => $forms,
            'branches' => $branches,
            'departments' => $departments,
            'employees' => $employees,
            'fiscalYears' => $fiscalYears->map(fn($fy) => ['id' => $fy->id, 'name' => $fy->name])->values(),
            'fiscalMonths' => $fiscalMonths->map(fn($fm) => ['id' => $fm->id, 'fiscal_year_id' => $fm->fiscal_year_id, 'name' => $fm->name])->values(),
            'currentFiscalYearId' => $currentFiscalYear?->id,
            'currentFiscalMonthId' => $currentFiscalMonth?->id,
        ]);
    }

    /**
     * Show a detailed view of a singular submission's answers.
     */
    public function show(string $submissionId)
    {
        $submission = FormSubmission::with([
            'user',
            'qaManager',
            'formVersion.form',
            'formVersion.sections.questions.inputType',
            'formVersion.sections.questions.choices',
            'answers.question.inputType',
            'answers.question.section',
            'answers.question.choices'
        ])->findOrFail($submissionId);

        $user = auth()->user();
        $isSubmitter = ((int) $submission->user_id === (int) $user->id);
        $isCreator = ((int) ($submission->formVersion->form->created_by ?? 0) === (int) $user->id);
        $hasViewPermission = $this->userCanViewFormSubmissions($user, $submission->formVersion->form);

        if (!$isSubmitter && !$hasViewPermission) {
            abort(403, 'You must be granted explicit form-level access to view submissions for this form.');
        }

        $isMySubmissions = request()->routeIs('forms.submissions.my_show')
            || request()->is('my-submissions*')
            || request()->query('from') === 'my-submissions';

        // When viewing via My Submissions or when the user is viewing their own submission, approval actions are disabled
        $canApproveReject = !$isMySubmissions
            && !$isSubmitter
            && ($isCreator || $submission->formVersion->form->user_permissions()->where('user_id', $user->id)->where('can_edit_submissions', true)->exists());

        $branches = \App\Models\Branch::select('id', 'name')->get();
        $departments = \App\Models\Department::select('id', 'name')->get();
        $employees = \App\Models\Employee::get()->map(function ($e) {
            return [
                'id' => $e->id,
                'name' => trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code,
            ];
        });

        $fullEmployeesCollection = \App\Models\Employee::get();
        $this->_calculateEmployeeScores($submission, $fullEmployeesCollection);
        $this->attachLookupSubjectScore($submission, $fullEmployeesCollection);

        $from = request()->query('from', ($isMySubmissions || $isSubmitter) ? 'my-submissions' : null);

        return Inertia::render('Forms/Submissions/Show', [
            'form' => $submission->formVersion->form, // Keep old prop structure to limit UI rewrites
            'submission' => $submission,
            'branches' => $branches,
            'departments' => $departments,
            'employees' => $employees,
            'canApproveReject' => $canApproveReject,
            'from' => $from,
        ]);
    }
    public function edit(string $submissionId)
    {
        $submission = FormSubmission::with([
            'user',
            'formVersion.form',
            'formVersion.sections.questions.inputType',
            'formVersion.sections.questions.choices',
            'answers.question'
        ])->findOrFail($submissionId);

        $user = auth()->user();
        if ($submission->formVersion->form->created_by !== $user->id) {
            if (!$submission->formVersion->form->user_permissions()->where('user_id', $user->id)->where('can_edit_submissions', true)->exists()) {
                abort(403, 'You must be granted explicit form-level access to edit submissions for this form.');
            }
        }

        $parsedAnswers = [];
        foreach ($submission->answers as $ans) {
            $questionType = $ans->question->inputType->type_identifier ?? 'text';

            if ($questionType === 'boolean') {
                $parsedAnswers[$ans->form_question_id] = (bool) $ans->value_boolean;
            } elseif ($questionType === 'employee_evaluation_grid') {
                if (!isset($parsedAnswers[$ans->form_question_id])) {
                    $parsedAnswers[$ans->form_question_id] = [];
                }
                $targets = $ans->targeted_employees;
                if (is_string($targets)) {
                    $targets = json_decode($targets, true);
                }
                if (is_array($targets)) {
                    foreach ($targets as $empId) {
                        if (!isset($parsedAnswers[$ans->form_question_id][(string) $empId])) {
                            $parsedAnswers[$ans->form_question_id][(string) $empId] = [];
                        }
                        $subQ = $ans->sub_question_identifier ?: 'single';
                        $parsedAnswers[$ans->form_question_id][(string) $empId][$subQ] = $ans->value_text;
                    }
                }
            } else {
                $val = $ans->value_text;
                $decoded = json_decode($val, true);
                if (is_array($decoded)) {
                    $parsedAnswers[$ans->form_question_id] = $decoded;
                } else {
                    $parsedAnswers[$ans->form_question_id] = $val;
                }
            }
        }

        $branches = \App\Models\Branch::select('id', 'name', 'is_sales_generating')->get();
        $departments = \App\Models\Department::select('id', 'name')->get();
        $employees = \App\Models\Employee::get()->map(function ($e) {
            return [
                'id' => $e->id,
                'name' => trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code,
                'branch_id' => $e->branch_id,
                'department_id' => $e->department_id,
                'status' => $e->status,
            ];
        });

        $initialRelocated = [];
        foreach ($submission->answers as $ans) {
            if ($ans->is_relocated) {
                $initialRelocated[$ans->form_question_id] = true;
            }
        }

        return Inertia::render('Forms/Fill', [
            'form' => $submission->formVersion->form,
            'formVersion' => $submission->formVersion,
            'submission' => $submission,
            'parsedAnswers' => $parsedAnswers,
            'initialRelocated' => $initialRelocated,
            'branches' => $branches,
            'departments' => $departments,
            'employees' => $employees
        ]);
    }

    public function update(\Illuminate\Http\Request $request, string $submissionId)
    {
        $submission = FormSubmission::with('formVersion.form')->findOrFail($submissionId);

        $user = auth()->user();
        if ($submission->formVersion->form->created_by !== $user->id) {
            if (!$submission->formVersion->form->user_permissions()->where('user_id', $user->id)->where('can_edit_submissions', true)->exists()) {
                abort(403, 'You must be granted explicit form-level access to edit submissions for this form.');
            }
        }

        $validated = $request->validate([
            'answers' => 'required|array',
            'relocated_questions' => 'nullable|array',
        ]);

        $relocatedQuestions = $request->input('relocated_questions', []);

        \Illuminate\Support\Facades\DB::transaction(function () use ($submission, $validated, $relocatedQuestions) {
            $submission->answers()->delete();
            if (Schema::hasColumn('form_submissions', 'evaluation_score_snapshot')) {
                $submission->forceFill([
                    'evaluation_score_snapshot' => null,
                    'evaluation_score_snapshot_at' => null,
                ])->saveQuietly();
            }

            foreach ($validated['answers'] as $questionId => $answerValue) {
                // To fetch the question type safely for matrix targeting we can query it directly here (or eager load it above)
                $questionForTypeCheck = \App\Models\FormQuestion::with('inputType')->find($questionId);
                $tId = $questionForTypeCheck->inputType->type_identifier ?? '';
                $isRelocated = !empty($relocatedQuestions[$questionId]);

                if ($tId === 'title') {
                    continue;
                }

                if ($tId === 'employee_evaluation_grid' && is_array($answerValue)) {
                    foreach ($answerValue as $empIdStr => $evals) {
                        if (!is_array($evals))
                            continue;
                        $empId = [(string) $empIdStr];

                        foreach ($evals as $subQLabel => $val) {
                            if ($subQLabel === 'remark' && ($val === '' || $val === null))
                                continue;

                            \App\Models\FormSubmissionAnswer::create([
                                'form_submission_id' => $submission->id,
                                'form_question_id' => $questionId,
                                'sub_question_identifier' => $subQLabel === 'single' ? null : $subQLabel,
                                'value_text' => (string) $val,
                                'value_boolean' => null,
                                'is_relocated' => $isRelocated,
                                'targeted_employees' => $empId,
                            ]);
                        }
                    }
                } elseif ($qObj = \App\Models\FormQuestion::with('choices', 'inputType')->find($questionId)) {
                    $tId = $qObj->inputType?->type_identifier ?? '';
                    if ($tId === 'select_one') {
                        $selectedChoice = $qObj->choices->first(function ($c) use ($answerValue) {
                            return (string) $c->id === (string) $answerValue;
                        });

                        if (!$selectedChoice) {
                            $selectedChoice = $qObj->choices->first(function ($c) use ($answerValue) {
                                return strtolower(trim((string) $c->label)) === strtolower(trim((string) $answerValue));
                            });
                        }

                        if (!$selectedChoice) {
                            $selectedChoice = $qObj->choices->first(function ($c) use ($answerValue) {
                                return (string) $c->value === (string) $answerValue;
                            });
                        }

                        $boolVal = null;
                        $valText = null;

                        if ($selectedChoice) {
                            $cVal = strtolower(trim((string) $selectedChoice->value));
                            if ($cVal === '1' || $cVal === 'yes' || $cVal === 'true') {
                                $boolVal = true;
                            } elseif ($cVal === '0' || $cVal === 'no' || $cVal === 'false') {
                                $boolVal = false;
                            } else {
                                $cLabel = strtolower(trim((string) $selectedChoice->label));
                                if (in_array($cLabel, ['yes', 'true', 'አዎ'], true)) {
                                    $boolVal = true;
                                } elseif (in_array($cLabel, ['no', 'false', 'አይ'], true)) {
                                    $boolVal = false;
                                }
                            }
                            $valText = (string) $selectedChoice->label;
                        } else {
                            $valText = is_bool($answerValue) ? ($answerValue ? 'yes' : 'no') : (is_array($answerValue) ? json_encode($answerValue) : (string) $answerValue);
                            if (in_array(strtolower((string) $answerValue), ['yes', 'true', '1'], true)) {
                                $boolVal = true;
                            } elseif (in_array(strtolower((string) $answerValue), ['no', 'false', '0'], true)) {
                                $boolVal = false;
                            }
                        }

                        \App\Models\FormSubmissionAnswer::create([
                            'form_submission_id' => $submission->id,
                            'form_question_id' => $questionId,
                            'value_text' => $valText,
                            'value_boolean' => $boolVal,
                            'is_relocated' => $isRelocated,
                        ]);
                    } else {
                        $boolVal = null;
                        if ($tId === 'boolean') {
                            if (is_bool($answerValue)) {
                                $boolVal = $answerValue;
                            } else if (!is_array($answerValue) && in_array(strtolower((string) $answerValue), ['yes', 'true', '1'], true)) {
                                $boolVal = true;
                            } else if (!is_array($answerValue) && in_array(strtolower((string) $answerValue), ['no', 'false', '0'], true)) {
                                $boolVal = false;
                            }
                        }

                        $valText = is_bool($answerValue)
                            ? ($answerValue ? 'yes' : 'no')
                            : (is_array($answerValue) ? json_encode($answerValue) : (string) $answerValue);

                        \App\Models\FormSubmissionAnswer::create([
                            'form_submission_id' => $submission->id,
                            'form_question_id' => $questionId,
                            'value_text' => $valText,
                            'value_boolean' => $boolVal,
                            'is_relocated' => $isRelocated,
                        ]);
                    }
                } else {
                    \App\Models\FormSubmissionAnswer::create([
                        'form_submission_id' => $submission->id,
                        'form_question_id' => $questionId,
                        'value_text' => is_bool($answerValue) ? ($answerValue ? 'yes' : 'no') : (is_array($answerValue) ? json_encode($answerValue) : (string) $answerValue),
                        'value_boolean' => null,
                        'is_relocated' => $isRelocated,
                    ]);
                }
            }
        });

        $this->refreshEvaluationScoreSnapshot($submission);

        return redirect()->route('forms.submissions.show', $submission->id)->with('success', 'Submission updated successfully.');
    }

    /**
     * Update only the structural status of a submission.
     */
    public function update_status(\Illuminate\Http\Request $request, string $submissionId)
    {
        $validated = $request->request->all() ? $request->validate([
            'status' => 'required|in:pending,approved,rejected'
        ]) : [];

        $submission = FormSubmission::with('formVersion.form')->findOrFail($submissionId);

        $user = auth()->user();
        if ((int) $submission->user_id === (int) $user->id) {
            abort(403, 'You cannot approve or reject your own submission.');
        }

        if ($submission->formVersion->form->created_by !== $user->id) {
            if (!$submission->formVersion->form->user_permissions()->where('user_id', $user->id)->where('can_edit_submissions', true)->exists()) {
                abort(403, 'You must be granted explicit form-level access to edit submissions for this form.');
            }
        }
        $submission->update(['status' => $validated['status']]);

        return back()->with('success', 'Submission status updated.');
    }



    /**
     * Delete the submission entirely.
     */
    public function destroy(string $submissionId)
    {
        $submission = FormSubmission::with('formVersion.form')->findOrFail($submissionId);

        $user = auth()->user();
        if ($submission->formVersion->form->created_by !== $user->id) {
            if (!$submission->formVersion->form->user_permissions()->where('user_id', $user->id)->where('can_delete_submissions', true)->exists()) {
                abort(403, 'You must be granted explicit form-level access to delete submissions for this form.');
            }
        }
        $submission->answers()->delete();
        $submission->delete();

        return redirect()->route('forms.submissions.index')->with('success', 'Submission deleted successfully.');
    }

    /**
     * Export all submissions for a given form as a CSV.
     */
    public function export_csv(Form $form)
    {
        $user = auth()->user();
        if (! $this->userCanViewFormSubmissions($user, $form)) {
            abort(403, 'You must be granted explicit form-level access to view/export submissions for this form.');
        }
        // 1. Fetch lookups for decoding relational data types
        $branches = \App\Models\Branch::pluck('name', 'id')->toArray();
        $departments = \App\Models\Department::pluck('name', 'id')->toArray();
        $employees = \App\Models\Employee::get()->mapWithKeys(function ($e) {
            $name = trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code;
            return [$e->id => $name];
        })->toArray();

        // 2. Extract distinct Questions acting as Columns
        $allQuestions = \App\Models\FormQuestion::whereHas('section.formVersion', function ($q) use ($form) {
            $q->where('form_id', $form->id);
        })->with('inputType')->get();

        $headersMap = [];
        foreach ($allQuestions as $q) {
            if (($q->inputType->type_identifier ?? '') === 'title') {
                continue;
            }
            if ($q->local_id && !isset($headersMap[$q->local_id])) {
                $headersMap[$q->local_id] = [
                    'label' => $q->label,
                    'type' => $q->inputType->type_identifier ?? 'text'
                ];
            }
        }

        // 3. Fetch submissions
        $submissions = FormSubmission::whereHas('formVersion', function ($q) use ($form) {
            $q->where('form_id', $form->id);
        })
            ->with(['user', 'answers.question'])
            ->orderByDesc('id')
            ->get();

        // 4. Stream response (UTF-8 + BOM so Excel shows Amharic/other Unicode correctly)
        $cleanTitle = trim(preg_replace('/[\\\\\/:\*\?"<>\|]/', '_', $form->title)) ?: 'Form_' . $form->id;
        $filename = "{$cleanTitle}_Submissions.csv";
        $asciiFallback = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $filename) ?: "form_{$form->id}_submissions.csv";
        $encodedFilename = rawurlencode($filename);

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$asciiFallback}\"; filename*=UTF-8''{$encodedFilename}",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($submissions, $headersMap, $branches, $departments, $employees) {
            $file = fopen('php://output', 'w');

            // UTF-8 BOM — same approach as Evaluation Results / detailed form export
            fputs($file, "\xEF\xBB\xBF");

            // Build CSV Header
            $headerRow = ['Record ID', 'Status', 'Submission Type', 'Submitted By', 'Submission Date'];
            foreach ($headersMap as $qData) {
                $headerRow[] = rtrim($qData['label'], '?'); // Clean trailing question marks
            }
            fputcsv($file, $headerRow);

            // Output Rows
            foreach ($submissions as $sub) {
                $empName = $sub->user->name ?? 'Unknown User';

                $row = [
                    '#' . $sub->id,
                    strtoupper($sub->status ?? 'PENDING'),
                    $sub->is_qa_manager ? 'QA Manager' : 'Standard Inspector',
                    $empName,
                    $sub->created_at->format('Y-m-d H:i:s')
                ];

                $ansMap = [];
                foreach ($sub->answers as $ans) {
                    if ($ans->question && $ans->question->local_id) {
                        $ansMap[$ans->question->local_id] = clone $ans;
                    }
                }

                foreach ($headersMap as $localId => $qData) {
                    if (!isset($ansMap[$localId])) {
                        $row[] = '';
                        continue;
                    }

                    $ans = $ansMap[$localId];
                    if ($qData['type'] === 'number') {
                        $row[] = ($ans->value_text !== null && $ans->value_text !== '')
                            ? $ans->value_text
                            : ($ans->value_boolean !== null ? (string) (int) $ans->value_boolean : '');
                    } elseif ($ans->value_boolean !== null) {
                        $row[] = ($ans->value_text && $ans->value_text !== '1' && $ans->value_text !== '0')
                            ? $ans->value_text
                            : ($ans->value_boolean ? 'Yes' : 'No');
                    } else {
                        $val = trim((string) $ans->value_text);
                        if ($qData['type'] === 'branch_lookup') {
                            $val = $branches[$val] ?? $val;
                        } elseif ($qData['type'] === 'department_lookup') {
                            $val = $departments[$val] ?? $val;
                        } elseif ($qData['type'] === 'employee_lookup') {
                            $val = $employees[$val] ?? $val;
                        }

                        // Ignore huge signature payload for brevity in CSV
                        if (str_starts_with($val, 'data:image/')) {
                            $val = '[Signature Attached]';
                        }

                        $row[] = $val;
                    }
                }
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Detailed Export of all questions and answers for a given form into an Excel (.xlsx) or CSV file.
     * Supports optional fiscal year, fiscal month, date range, branch, and status filters.
     */
    public function export_detail(Request $request, Form $form)
    {
        $user = auth()->user();
        if (! $this->userCanViewFormSubmissions($user, $form)) {
            abort(403, 'You must be granted explicit form-level access to view/export submissions for this form.');
        }

        $format = strtolower((string) $request->query('format', 'xlsx'));

        // 1. Reference lookups
        $allBranches = \App\Models\Branch::get(['id', 'name', 'branch_code', 'is_sales_generating']);
        $branchMap = $allBranches->keyBy('id');
        $branches = $allBranches->pluck('name', 'id')->toArray();
        $branchCodes = $allBranches->pluck('branch_code', 'id')->toArray();

        $departments = \App\Models\Department::pluck('name', 'id')->toArray();
        $employeeModels = \App\Models\Employee::get(['id', 'first_name', 'last_name', 'employee_code']);
        $employees = $employeeModels->mapWithKeys(function ($e) {
            $name = trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code;
            return [$e->id => $name];
        })->toArray();
        $employeeCodes = $employeeModels->pluck('employee_code', 'id')->toArray();

        $fiscalYears = \App\Models\FiscalYear::orderBy('gregorian_start_date')->get(['id', 'name', 'gregorian_start_date', 'gregorian_end_date']);
        $fiscalMonths = \App\Models\FiscalMonth::orderBy('gregorian_start_date')->get(['id', 'fiscal_year_id', 'name', 'gregorian_start_date', 'gregorian_end_date']);

        // 2. Extract all distinct questions across all versions of this form, preserving section & question order
        $sections = \App\Models\FormSection::whereHas('formVersion', function ($q) use ($form) {
                $q->where('form_id', $form->id);
            })
            ->with(['questions' => function ($q) {
                $q->orderBy('order_index')->with(['inputType', 'choices']);
            }])
            ->orderBy('order_index')
            ->get();

        $headersMap = [];
        foreach ($sections as $sec) {
            foreach ($sec->questions as $q) {
                $tId = $q->inputType?->type_identifier ?? 'text';
                if ($tId === 'title') {
                    continue; // Skip static section title elements
                }

                $key = $q->local_id ?: ('q_' . $q->id);
                if (!isset($headersMap[$key])) {
                    $choiceMap = [];
                    foreach ($q->choices as $choice) {
                        $choiceMap[(string) $choice->value] = $choice->label;
                        $choiceMap[(string) $choice->id] = $choice->label;
                    }

                    $headersMap[$key] = [
                        'id' => $q->id,
                        'local_id' => $q->local_id,
                        'label' => rtrim($q->label, '? '),
                        'type' => $tId,
                        'choices' => $choiceMap,
                    ];
                }
            }
        }

        // 3. Query submissions
        $subQuery = FormSubmission::whereHas('formVersion', function ($q) use ($form) {
                $q->where('form_id', $form->id);
            })
            ->with([
                'user:id,name,employee_id',
                'user.employee.branch:id,name,branch_code',
                'answers.question.inputType',
                'answers.question.choices',
            ])
            ->orderByDesc('created_at');

        // Apply date & status filters at query level
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $status = $request->query('status');

        if ($startDate) {
            $subQuery->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $subQuery->whereDate('created_at', '<=', $endDate);
        }
        if ($status && $status !== 'all') {
            $subQuery->where('status', $status);
        }

        $submissions = $subQuery->get();

        // 4. Resolve branch and fiscal periods for each submission
        $fiscalYearId = $request->query('fiscal_year_id');
        $fiscalMonthId = $request->query('fiscal_month_id');
        $branchIdFilter = $request->query('branch_id');

        $rows = [];
        foreach ($submissions as $sub) {
            // Resolve branch
            $branchAns = $sub->answers->first(function ($a) {
                return ($a->question?->inputType?->type_identifier ?? '') === 'branch_lookup';
            });

            $branchId = null;
            $branchName = null;
            $branchCode = null;

            if ($branchAns && $branchAns->value_text) {
                $val = trim($branchAns->value_text);
                if (is_numeric($val) && isset($branchMap[(int) $val])) {
                    $branchId = (int) $val;
                    $branchName = $branchMap[(int) $val]->name;
                    $branchCode = $branchMap[(int) $val]->branch_code;
                } else {
                    $matched = $allBranches->first(fn($b) => strcasecmp($b->name, $val) === 0);
                    if ($matched) {
                        $branchId = $matched->id;
                        $branchName = $matched->name;
                        $branchCode = $matched->branch_code;
                    } else {
                        $branchName = $val;
                        $branchId = 'custom_' . md5($val);
                    }
                }
            }

            if (!$branchId) {
                $empBranch = $sub->user?->employee?->branch;
                if ($empBranch) {
                    $branchId = $empBranch->id;
                    $branchName = $empBranch->name;
                    $branchCode = $empBranch->branch_code;
                } else {
                    $branchId = 'unassigned';
                    $branchName = 'Unassigned';
                }
            }

            // Resolve fiscal periods
            $submittedAt = Carbon::parse($sub->created_at);
            $matchedYear = $fiscalYears->first(fn($fy) => $submittedAt->between(
                Carbon::parse($fy->gregorian_start_date),
                Carbon::parse($fy->gregorian_end_date)
            ));
            $matchedMonth = $fiscalMonths->first(fn($fm) => $submittedAt->between(
                Carbon::parse($fm->gregorian_start_date),
                Carbon::parse($fm->gregorian_end_date)
            ));

            // Apply in-memory fiscal & branch filters if requested
            if ($fiscalYearId && $fiscalYearId !== 'all') {
                if (!$matchedYear || (string) $matchedYear->id !== (string) $fiscalYearId) {
                    continue;
                }
            }

            if ($fiscalMonthId && $fiscalMonthId !== 'all') {
                if (!$matchedMonth || (string) $matchedMonth->id !== (string) $fiscalMonthId) {
                    continue;
                }
            }

            if ($branchIdFilter && $branchIdFilter !== 'all') {
                if ((string) $branchId !== (string) $branchIdFilter) {
                    continue;
                }
            }

            // Submitter details
            $submitterName = $sub->user?->name ?? 'Unknown';
            $submitterCode = $employeeCodes[$sub->user?->employee_id ?? ''] ?? '';

            // Map answers by local_id and by question_id
            $ansByLocalId = [];
            $ansByQId = [];
            foreach ($sub->answers as $ans) {
                if ($ans->question) {
                    if ($ans->question->local_id) {
                        $ansByLocalId[$ans->question->local_id] = $ans;
                    }
                    $ansByQId[$ans->question->id] = $ans;
                }
            }

            // Base row columns
            $row = [
                '#' . $sub->id,
                strtoupper($sub->status ?: 'PENDING'),
                $sub->is_qa_manager ? 'QA Manager' : 'Standard Inspector',
                $branchName ?? 'Unassigned',
                $branchCode ?? '',
                $submitterName,
                $submitterCode,
                $sub->created_at ? $sub->created_at->format('Y-m-d H:i:s') : '',
                $matchedYear?->name ?? '',
                $matchedMonth?->name ?? '',
            ];

            // Append each question's answer
            foreach ($headersMap as $key => $qMeta) {
                $ans = $ansByLocalId[$key] ?? ($ansByQId[$qMeta['id']] ?? null);
                if (!$ans) {
                    $row[] = '';
                    continue;
                }

                $type = $qMeta['type'];

                if ($type === 'number') {
                    $row[] = ($ans->value_text !== null && $ans->value_text !== '')
                        ? $ans->value_text
                        : ($ans->value_boolean !== null ? (string) (int) $ans->value_boolean : '');
                } elseif ($type === 'boolean') {
                    if ($ans->value_text && !in_array($ans->value_text, ['0', '1', 'yes', 'no'], true)) {
                        $row[] = $ans->value_text;
                    } else {
                        $row[] = ($ans->value_boolean !== null)
                            ? ($ans->value_boolean ? 'Yes' : 'No')
                            : ($ans->value_text === '1' ? 'Yes' : ($ans->value_text === '0' ? 'No' : $ans->value_text));
                    }
                } elseif ($type === 'branch_lookup') {
                    $val = trim((string) $ans->value_text);
                    $row[] = $branches[$val] ?? $val;
                } elseif ($type === 'department_lookup') {
                    $val = trim((string) $ans->value_text);
                    $row[] = $departments[$val] ?? $val;
                } elseif ($type === 'employee_lookup') {
                    $val = trim((string) $ans->value_text);
                    $row[] = $employees[$val] ?? $val;
                } elseif (str_starts_with((string) $ans->value_text, 'data:image/')) {
                    $row[] = '[Signature Attached]';
                } else {
                    $val = trim((string) $ans->value_text);
                    // Check if question has defined choices
                    if (!empty($qMeta['choices'])) {
                        // Check if answer is a JSON array of choice keys
                        $decodedChoices = json_decode($val, true);
                        if (is_array($decodedChoices)) {
                            $labels = array_map(fn($c) => $qMeta['choices'][(string) $c] ?? (string) $c, $decodedChoices);
                            $row[] = implode(', ', $labels);
                        } elseif (isset($qMeta['choices'][$val])) {
                            $row[] = $qMeta['choices'][$val];
                        } else {
                            $row[] = $val;
                        }
                    } else {
                        $row[] = $val;
                    }
                }
            }

            $rows[] = $row;
        }

        // 5. Header row
        $baseHeaders = [
            'Record ID',
            'Status',
            'Submission Type',
            'Branch',
            'Branch Code',
            'Submitted By',
            'Employee Code',
            'Submission Date',
            'Fiscal Year',
            'Fiscal Month',
        ];

        $questionHeaders = [];
        foreach ($headersMap as $qMeta) {
            $questionHeaders[] = $qMeta['label'];
        }

        $allHeaders = array_merge($baseHeaders, $questionHeaders);

        // 6. Generate filename
        $cleanTitle = trim(preg_replace('/[\\\\\/:\*\?"<>\|]/', '_', $form->title)) ?: 'Form_' . $form->id;
        $timestamp = date('Y_m_d_His');

        // CSV export
        if ($format === 'csv') {
            $filename = "{$cleanTitle}_Detail_Submissions_{$timestamp}.csv";
            $asciiFallback = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $filename) ?: "form_{$form->id}_submissions.csv";
            $encodedFilename = rawurlencode($filename);
            $headers = [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$asciiFallback}\"; filename*=UTF-8''{$encodedFilename}",
                'Pragma' => 'no-cache',
                'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
                'Expires' => '0',
            ];

            return response()->stream(function () use ($allHeaders, $rows) {
                $file = fopen('php://output', 'w');
                // UTF-8 BOM for Excel
                fputs($file, "\xEF\xBB\xBF");
                fputcsv($file, $allHeaders);
                foreach ($rows as $row) {
                    fputcsv($file, $row);
                }
                fclose($file);
            }, 200, $headers);
        }

        // Default: Native OpenXML Excel (.xlsx) with automatic fallback to CSV
        try {
            $xlsxFilename = "{$cleanTitle}_Detail_Submissions_{$timestamp}.xlsx";
            $xlsxWriter = new SimpleXlsxWriter();
            return $xlsxWriter->download($xlsxFilename, $allHeaders, $rows, substr($cleanTitle, 0, 31));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('XLSX export failed, falling back to CSV: ' . $e->getMessage());

            $csvFilename = "{$cleanTitle}_Detail_Submissions_{$timestamp}.csv";
            $asciiFallback = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $csvFilename) ?: "form_{$form->id}_submissions.csv";
            $encodedFilename = rawurlencode($csvFilename);
            $csvHeaders = [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$asciiFallback}\"; filename*=UTF-8''{$encodedFilename}",
                'Pragma' => 'no-cache',
                'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
                'Expires' => '0',
            ];

            return response()->stream(function () use ($allHeaders, $rows) {
                $file = fopen('php://output', 'w');
                // UTF-8 BOM for Excel
                fputs($file, "\xEF\xBB\xBF");
                fputcsv($file, $allHeaders);
                foreach ($rows as $row) {
                    fputcsv($file, $row);
                }
                fclose($file);
            }, 200, $csvHeaders);
        }
    }

    /**
     * Employee-level results for the Training post-assessment pass rate KPI.
     * Filters submissions by fiscal period early; returns slim paginated rows.
     */
    public function evaluation_results(Request $request): \Inertia\Response|StreamedResponse
    {
        $kpiName = 'Training post-assessment pass rate';
        $needle = strtolower($kpiName);

        $kpiRows = \App\Models\KpiLibrary::with(['forms:id,title', 'kpiItem:id,name'])
            ->where(function ($query) use ($needle) {
                $query->whereRaw('LOWER(TRIM(name)) = ?', [$needle])
                    ->orWhereHas('kpiItem', function ($itemQuery) use ($needle) {
                        $itemQuery->whereRaw('LOWER(TRIM(name)) = ?', [$needle]);
                    });
            })
            ->get();

        $linkedForms = $kpiRows
            ->flatMap(fn ($kpi) => $kpi->forms)
            ->unique('id')
            ->sortBy('title')
            ->values();

        $user = auth()->user();
        // Evaluation Results scoping uses the six form-category permissions (not position sync).
        if (
            $user
            && ! $user->can('view form submissions')
            && InspectorChecklistChampionAccess::hasAnyEvaluationFormPermission($user)
        ) {
            $championFormIds = InspectorChecklistChampionAccess::accessibleFormIdsFromEvaluationPermissions($user);
            $linkedForms = $linkedForms
                ->filter(fn ($form) => in_array((int) $form->id, $championFormIds, true))
                ->values();
        } elseif (
            $user
            && ! $user->can('view form submissions')
        ) {
            // No full access and no category permission — nothing to show.
            $linkedForms = collect();
        }

        $pageState = 'ready';
        if ($kpiRows->isEmpty()) {
            $pageState = 'missing_kpi';
        } elseif ($linkedForms->isEmpty()) {
            $pageState = 'no_forms';
        }

        $fiscalYears = \App\Models\FiscalYear::orderBy('gregorian_start_date')
            ->get(['id', 'name', 'gregorian_start_date', 'gregorian_end_date']);
        $fiscalMonths = \App\Models\FiscalMonth::orderBy('gregorian_start_date')
            ->get(['id', 'fiscal_year_id', 'name', 'gregorian_start_date', 'gregorian_end_date']);

        $today = Carbon::today();
        $currentFiscalYear = $fiscalYears->first(fn ($year) => $today->between(
            Carbon::parse($year->gregorian_start_date),
            Carbon::parse($year->gregorian_end_date)
        ));
        $currentFiscalMonth = $fiscalMonths->first(fn ($month) => $today->between(
            Carbon::parse($month->gregorian_start_date),
            Carbon::parse($month->gregorian_end_date)
        ));

        $search = trim((string) $request->input('search', ''));
        $formFilter = (string) $request->input('form_id', 'all');
        $statusFilter = (string) $request->input('status', 'all');
        $actionFilter = (string) $request->input('next_action', 'all');
        $yearFilter = $request->has('fiscal_year_id')
            ? (string) $request->input('fiscal_year_id', 'all')
            : ($currentFiscalYear?->id ? (string) $currentFiscalYear->id : 'all');
        $monthFilter = $request->has('fiscal_month_id')
            ? (string) $request->input('fiscal_month_id', 'all')
            : ($currentFiscalMonth?->id ? (string) $currentFiscalMonth->id : 'all');

        $trainingTypes = TrainingType::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name']);
        $trainingModules = RecurringTrainingModule::query()
            ->orderBy('training_name')
            ->get(['id', 'training_name'])
            ->map(fn ($module) => ['id' => $module->id, 'name' => $module->training_name]);

        $rows = collect();

        if ($pageState === 'ready') {
            $formIds = $linkedForms->pluck('id')->all();
            if ($formFilter !== 'all' && ctype_digit($formFilter) && in_array((int) $formFilter, $formIds, true)) {
                $formIds = [(int) $formFilter];
            }

            $submissionsQuery = FormSubmission::query()
                ->whereHas('formVersion', fn ($query) => $query->whereIn('form_id', $formIds));

            if ($monthFilter !== 'all' && ctype_digit($monthFilter)) {
                $month = $fiscalMonths->firstWhere('id', (int) $monthFilter);
                if ($month) {
                    $submissionsQuery->whereBetween('created_at', [
                        Carbon::parse($month->gregorian_start_date)->startOfDay(),
                        Carbon::parse($month->gregorian_end_date)->endOfDay(),
                    ]);
                }
            } elseif ($yearFilter !== 'all' && ctype_digit($yearFilter)) {
                $year = $fiscalYears->firstWhere('id', (int) $yearFilter);
                if ($year) {
                    $submissionsQuery->whereBetween('created_at', [
                        Carbon::parse($year->gregorian_start_date)->startOfDay(),
                        Carbon::parse($year->gregorian_end_date)->endOfDay(),
                    ]);
                }
            }

            $hasScoreSnapshotColumn = Schema::hasColumn('form_submissions', 'evaluation_score_snapshot');
            $submissionColumns = ['id', 'form_version_id', 'created_at'];
            if ($hasScoreSnapshotColumn) {
                $submissionColumns[] = 'evaluation_score_snapshot';
                $submissionColumns[] = 'evaluation_score_snapshot_at';
            }

            $submissions = $submissionsQuery
                ->with([
                    'formVersion:id,form_id',
                    'formVersion.form:id,title',
                ])
                ->orderByDesc('id')
                ->get($submissionColumns);

            $needsLiveScoring = $submissions->filter(
                fn (FormSubmission $submission) => ! $hasScoreSnapshotColumn || $submission->evaluation_score_snapshot === null
            );

            if ($needsLiveScoring->isNotEmpty()) {
                $needsLiveScoring->load([
                    'formVersion.sections',
                    'answers.question.inputType',
                    'answers.question.choices',
                    'answers.question.section',
                ]);
            }

            $employeeIds = $this->collectReferencedEmployeeIds($needsLiveScoring);
            $employees = $employeeIds === []
                ? collect()
                : \App\Models\Employee::query()
                    ->whereIn('id', $employeeIds)
                    ->get(['id', 'first_name', 'last_name', 'employee_code', 'department_id', 'branch_id'])
                    ->keyBy('id');

            $departments = \App\Models\Department::pluck('name', 'id');
            $branches = \App\Models\Branch::pluck('name', 'id');

            $overrides = EvaluationResultOverride::query()
                ->with(['trainingType:id,name', 'requestedModule:id,training_name'])
                ->whereIn('form_id', $formIds)
                ->get()
                ->keyBy(fn (EvaluationResultOverride $override) => $override->employee_id . '|' . $override->form_id . '|' . $override->fiscal_month_id);

            $fiscalYearBounds = $fiscalYears->map(fn ($year) => [
                'id' => $year->id,
                'name' => $year->name,
                'start' => Carbon::parse($year->gregorian_start_date)->startOfDay()->timestamp,
                'end' => Carbon::parse($year->gregorian_end_date)->endOfDay()->timestamp,
            ])->values();
            $fiscalMonthBounds = $fiscalMonths->map(fn ($month) => [
                'id' => $month->id,
                'name' => $month->name,
                'start' => Carbon::parse($month->gregorian_start_date)->startOfDay()->timestamp,
                'end' => Carbon::parse($month->gregorian_end_date)->endOfDay()->timestamp,
            ])->values();

            // One result row per submission that names the employee (no employee|form|month collapse).
            $built = [];
            foreach ($submissions as $submission) {
                $employeeScores = $submission->evaluation_score_snapshot;
                if ($employeeScores === null) {
                    $this->_calculateEmployeeScores($submission, $employees);
                    $this->attachLookupSubjectScore($submission, $employees);
                    $employeeScores = array_values($submission->employee_scores ?? []);
                    if ($hasScoreSnapshotColumn) {
                        $this->persistEvaluationScoreSnapshot($submission, $employeeScores);
                    }
                } elseif (! is_array($employeeScores)) {
                    $employeeScores = [];
                }

                $submittedAt = Carbon::parse($submission->created_at)->timestamp;
                $matchedYear = $fiscalYearBounds->first(
                    fn (array $year) => $submittedAt >= $year['start'] && $submittedAt <= $year['end']
                );
                $matchedMonth = $fiscalMonthBounds->first(
                    fn (array $month) => $submittedAt >= $month['start'] && $submittedAt <= $month['end']
                );

                $formId = $submission->formVersion?->form_id;
                $formTitle = $submission->formVersion?->form?->title ?? 'Unknown form';

                foreach ($employeeScores as $score) {
                    $employeeId = $score['id'] ?? null;
                    if (! $employeeId || ! $formId) {
                        continue;
                    }

                    $percentage = $score['percentage'] ?? null;
                    $outcome = $this->postAssessmentOutcome($percentage === null ? null : (float) $percentage);
                    $departmentId = $score['department_id'] ?? null;
                    $branchId = $score['branch_id'] ?? null;

                    $nextAction = 'na';
                    $nextActionLabel = $this->nextActionLabel($nextAction);
                    $trainingTypeId = null;
                    $trainingTypeName = null;
                    $requestedTrainingDate = null;
                    $requestedModuleId = null;
                    $requestExtraInfo = null;

                    if ($matchedMonth) {
                        $override = $overrides->get($employeeId . '|' . $formId . '|' . $matchedMonth['id']);
                        if ($override) {
                            $nextAction = $override->next_action;
                            $nextActionLabel = $this->nextActionLabel($nextAction);
                            $trainingTypeId = $override->training_type_id;
                            $trainingTypeName = $override->trainingType?->name;
                            $requestedTrainingDate = $override->requested_training_date?->format('Y-m-d');
                            $requestedModuleId = $override->requested_module_id;
                            $requestExtraInfo = $override->request_extra_info;
                        }
                    }

                    $built[] = [
                        'employee_id' => $employeeId,
                        'employee_name' => $score['name'] ?? 'Unknown employee',
                        'department_name' => $departmentId ? ($departments[$departmentId] ?? 'Unknown department') : '—',
                        'branch_name' => $branchId ? ($branches[$branchId] ?? 'Unknown branch') : '—',
                        'form_id' => $formId,
                        'form_title' => $formTitle,
                        'submission_id' => $submission->id,
                        'fiscal_year_id' => $matchedYear['id'] ?? null,
                        'fiscal_year_name' => $matchedYear['name'] ?? null,
                        'fiscal_month_id' => $matchedMonth['id'] ?? null,
                        'fiscal_month_name' => $matchedMonth['name'] ?? 'Outside fiscal calendar',
                        'score' => $percentage === null ? null : (float) $percentage,
                        'status' => $outcome['status'],
                        'status_label' => $outcome['status_label'],
                        'next_action' => $nextAction,
                        'next_action_label' => $nextActionLabel,
                        'training_type_id' => $trainingTypeId,
                        'training_type_name' => $trainingTypeName,
                        'requested_training_date' => $requestedTrainingDate,
                        'requested_module_id' => $requestedModuleId,
                        'request_extra_info' => $requestExtraInfo,
                    ];
                }
            }

            $rows = collect($built)
                ->filter(function (array $row) use ($search, $statusFilter, $actionFilter) {
                    if ($search !== '') {
                        $haystack = mb_strtolower($row['employee_name'] . ' ' . $row['department_name']);
                        if (! str_contains($haystack, mb_strtolower($search))) {
                            return false;
                        }
                    }
                    if ($statusFilter !== 'all' && $row['status'] !== $statusFilter) {
                        return false;
                    }
                    if ($actionFilter !== 'all' && $row['next_action'] !== $actionFilter) {
                        return false;
                    }

                    return true;
                })
                ->sortBy([
                    ['employee_name', 'asc'],
                    ['form_title', 'asc'],
                    ['submission_id', 'desc'],
                ])
                ->values();
        }

        $summary = [
            'rows' => $rows->count(),
            'employees' => $rows->pluck('employee_id')->unique()->count(),
            'pass' => $rows->where('status', 'pass')->count(),
            'fail' => $rows->where('status', 'fail')->count(),
            'warning' => $rows->where('next_action', 'warning')->count(),
            'reward' => $rows->where('next_action', 'reward')->count(),
            'training' => $rows->where('next_action', 'training')->count(),
            'not_scored' => $rows->where('status', 'not_scored')->count(),
        ];

        if ($request->input('export') === 'csv') {
            return $this->streamEvaluationResultsCsv($rows);
        }

        $perPage = 25;
        $page = max(1, (int) $request->input('page', 1));
        $paginator = new LengthAwarePaginator(
            $rows->forPage($page, $perPage)->values(),
            $rows->count(),
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );

        return Inertia::render('Forms/EvaluationResults', [
            'kpiName' => $kpiName,
            'pageState' => $pageState,
            'linkedForms' => $linkedForms->map(fn ($form) => [
                'id' => $form->id,
                'title' => $form->title,
            ])->values(),
            'rows' => $paginator,
            'summary' => $summary,
            'trainingTypes' => $trainingTypes,
            'trainingModules' => $trainingModules,
            'fiscalYears' => $fiscalYears->map(fn ($year) => ['id' => $year->id, 'name' => $year->name])->values(),
            'fiscalMonths' => $fiscalMonths->map(fn ($month) => [
                'id' => $month->id,
                'fiscal_year_id' => $month->fiscal_year_id,
                'name' => $month->name,
            ])->values(),
            'currentFiscalYearId' => $currentFiscalYear?->id,
            'currentFiscalMonthId' => $currentFiscalMonth?->id,
            'filters' => [
                'search' => $search,
                'form_id' => $formFilter,
                'status' => $statusFilter,
                'next_action' => $actionFilter,
                'fiscal_year_id' => $yearFilter,
                'fiscal_month_id' => $monthFilter,
            ],
        ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, array<string, mixed>>  $rows
     */
    private function streamEvaluationResultsCsv($rows): StreamedResponse
    {
        $filename = 'evaluation_results_' . date('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($rows) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF");
            fputcsv($file, [
                'branch',
                'department',
                'employee_id',
                'employee_name',
                'form',
                'fiscal_year',
                'fiscal_month',
                'score',
            ]);
            foreach ($rows as $row) {
                fputcsv($file, [
                    $row['branch_name'],
                    $row['department_name'],
                    $row['employee_id'],
                    $row['employee_name'],
                    $row['form_title'],
                    $row['fiscal_year_name'] ?? '',
                    $row['fiscal_month_name'] ?? '',
                    $row['score'] === null ? '' : number_format((float) $row['score'], 1, '.', ''),
                ]);
            }
            fclose($file);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function update_evaluation_result_override(Request $request): RedirectResponse
    {
        if ($request->input('training_type_id') === '' || $request->input('training_type_id') === 'none') {
            $request->merge(['training_type_id' => null]);
        }
        if ($request->input('requested_module_id') === '' || $request->input('requested_module_id') === 'none') {
            $request->merge(['requested_module_id' => null]);
        }
        if ($request->input('requested_training_date') === '') {
            $request->merge(['requested_training_date' => null]);
        }
        if ($request->input('request_extra_info') === '') {
            $request->merge(['request_extra_info' => null]);
        }
        if ($request->input('score') === '') {
            $request->merge(['score' => null]);
        }
        if ($request->input('status_label') === '') {
            $request->merge(['status_label' => null]);
        }

        $isTraining = $request->input('next_action') === 'training';

        $validated = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'form_id' => ['required', 'exists:forms,id'],
            'fiscal_year_id' => ['required', 'exists:fiscal_years,id'],
            'fiscal_month_id' => [
                'required',
                'exists:fiscal_months,id',
                Rule::exists('fiscal_months', 'id')->where(
                    fn ($q) => $q->where('fiscal_year_id', $request->input('fiscal_year_id'))
                ),
            ],
            'next_action' => ['required', Rule::in(['na', 'warning', 'reward', 'training', 'not_scored'])],
            'training_type_id' => [
                Rule::requiredIf($isTraining),
                'nullable',
                'exists:training_types,id',
            ],
            'requested_training_date' => [
                Rule::requiredIf($isTraining),
                'nullable',
                'date',
            ],
            'requested_module_id' => [
                Rule::requiredIf($isTraining),
                'nullable',
                'exists:recurring_training_modules,id',
            ],
            'request_extra_info' => ['nullable', 'string'],
            'score' => ['nullable', 'numeric'],
            'status_label' => ['nullable', 'string', 'max:100'],
        ]);

        if ($validated['next_action'] !== 'training') {
            $validated['training_type_id'] = null;
            $validated['requested_training_date'] = null;
            $validated['requested_module_id'] = null;
            $validated['request_extra_info'] = null;
        }

        $user = auth()->user();
        if (
            $user
            && ! $user->can('view form submissions')
            && ! InspectorChecklistChampionAccess::canAccessFormViaEvaluationPermissions($user, (int) $validated['form_id'])
        ) {
            abort(403, 'You can only update evaluation results for your assigned inspector checklist forms.');
        }

        EvaluationResultOverride::updateOrCreate(
            [
                'employee_id' => $validated['employee_id'],
                'form_id' => $validated['form_id'],
                'fiscal_month_id' => $validated['fiscal_month_id'],
            ],
            [
                'fiscal_year_id' => $validated['fiscal_year_id'],
                'next_action' => $validated['next_action'],
                'training_type_id' => $validated['training_type_id'] ?? null,
                'requested_training_date' => $validated['requested_training_date'] ?? null,
                'requested_module_id' => $validated['requested_module_id'] ?? null,
                'request_extra_info' => $validated['request_extra_info'] ?? null,
                'updated_by' => auth()->id(),
            ]
        );

        if (in_array($validated['next_action'], ['warning', 'reward'], true)) {
            $prefill = $this->buildEvaluationMemoPrefill(
                (int) $validated['employee_id'],
                (int) $validated['form_id'],
                (int) $validated['fiscal_year_id'],
                (int) $validated['fiscal_month_id'],
                $validated['next_action'],
                $validated['score'] ?? null,
                $validated['status_label'] ?? null,
            );

            return Redirect::route('memos.create')
                ->with('memo_prefill', $prefill)
                ->with('message', 'Evaluation result updated. Review and publish the memorandum.');
        }

        return Redirect::back()->with('message', 'Evaluation result updated successfully!');
    }

    public function post_assessment_results(Request $request): \Inertia\Response|StreamedResponse
    {
        return $this->evaluation_results($request);
    }

    /**
     * Checklists identify the assessed person with an employee lookup, not a roster.
     * The first lookup is the subject. Later lookups are sign-off names and are skipped.
     */
    private function attachLookupSubjectScore($submission, $employeesCollection): void
    {
        if (!empty($submission->employee_scores)) {
            return;
        }

        $lookup = $submission->answers
            ->filter(function ($answer) {
                $type = $answer->question?->inputType?->type_identifier ?? '';

                return $type === 'employee_lookup' && is_numeric($answer->value_text);
            })
            ->sortBy(function ($answer) {
                $sectionOrder = $answer->question?->section?->order_index ?? 9999;
                $questionOrder = $answer->question?->order_index ?? 9999;

                return sprintf('%05d-%05d-%08d', $sectionOrder, $questionOrder, $answer->id);
            })
            ->first();

        if (!$lookup) {
            return;
        }

        $employee = $this->employeeFromCollection($employeesCollection, (int) $lookup->value_text);
        if (!$employee) {
            return;
        }

        $totalPoints = 0;
        $earnedPoints = 0;
        $empIdStr = (string) $employee->id;
        $empDeptIdStr = (string) $employee->department_id;
        $empSectionScores = [];
        $sectionsById = $submission->formVersion?->sections?->keyBy('id') ?? collect();

        foreach ($submission->answers as $ans) {
            $qType = $ans->question?->inputType?->type_identifier ?? 'text';
            $sec = $ans->question?->section ?? $sectionsById->get($ans->question?->form_section_id);
            $secId = $sec ? (int) $sec->id : 0;
            $secWeight = ($sec && $sec->weight !== null && $sec->weight > 0) ? (float) $sec->weight : null;

            if ($qType === 'select_one' || $qType === 'boolean') {
                $isScored = false;
                $isYes = false;

                if ($ans->value_boolean !== null) {
                    $isScored = true;
                    $isYes = (bool) $ans->value_boolean;
                } elseif ($ans->value_text === '0' || $ans->value_text === '1' || $ans->value_text === 'አዎ' || $ans->value_text === 'አይ') {
                    $isScored = true;
                    $isYes = ($ans->value_text === '1' || $ans->value_text === 'አዎ');
                } else {
                    $choice = $ans->question?->choices?->first(function ($c) use ($ans) {
                        return (string) $c->id === (string) $ans->value_text
                            || (string) $c->label === (string) $ans->value_text
                            || (string) $c->value === (string) $ans->value_text;
                    });
                    if ($choice && ($choice->value === '1' || $choice->value === '0' || $choice->label === 'አዎ' || $choice->label === 'አይ')) {
                        $isScored = true;
                        $isYes = ($choice->value === '1' || $choice->label === 'አዎ');
                    }
                }

                if ($isScored) {
                    $ansTargets = $ans->targeted_employees;
                    if (is_string($ansTargets)) {
                        $ansTargets = json_decode($ansTargets, true);
                    }
                    $ansTargetEmpIds = is_array($ansTargets) ? array_map('strval', $ansTargets) : [];

                    $targetDepts = $ans->question?->department_targets ?? [];
                    if (is_string($targetDepts)) {
                        $targetDepts = json_decode($targetDepts, true);
                    }
                    $targetDeptIds = is_array($targetDepts) ? array_map('strval', $targetDepts) : [];
                    $expandedTargetDeptIds = [];
                    foreach ($targetDeptIds as $tId) {
                        $expandedTargetDeptIds = array_merge($expandedTargetDeptIds, \App\Models\Department::getAliasedDepartmentIds($tId));
                    }
                    $expandedTargetDeptIds = array_unique(array_map('strval', $expandedTargetDeptIds));

                    $isTargeted = false;
                    if (!empty($ansTargetEmpIds)) {
                        $isTargeted = in_array($empIdStr, $ansTargetEmpIds, true);
                    } elseif (!empty($expandedTargetDeptIds)) {
                        $isTargeted = in_array($empDeptIdStr, $expandedTargetDeptIds, true);
                    } else {
                        $isTargeted = true;
                    }

                    if ($isTargeted) {
                        $qWeight = ($ans->question && $ans->question->weight !== null && $ans->question->weight > 0)
                            ? (float) $ans->question->weight
                            : 1.0;

                        $totalPoints += $qWeight;
                        if ($isYes) {
                            $earnedPoints += $qWeight;
                        }

                        if (!isset($empSectionScores[$secId])) {
                            $empSectionScores[$secId] = ['weight' => $secWeight, 'earned' => 0, 'total' => 0];
                        }
                        $empSectionScores[$secId]['total'] += $qWeight;
                        if ($isYes) {
                            $empSectionScores[$secId]['earned'] += $qWeight;
                        }
                    }
                }
            }

            if ($qType === 'employee_evaluation_grid') {
                $targets = $ans->targeted_employees;
                if (is_string($targets)) {
                    $targets = json_decode($targets, true);
                }
                if (!is_array($targets)) {
                    $targets = [];
                }
                $numVal = is_numeric($ans->value_text) ? (float) $ans->value_text : 0;
                if (in_array($empIdStr, array_map('strval', $targets), true)) {
                    if ($numVal > 0) {
                        $earnedPoints += $numVal;
                    }
                    $totalPoints += max(1, $numVal);

                    if (!isset($empSectionScores[$secId])) {
                        $empSectionScores[$secId] = ['weight' => $secWeight, 'earned' => 0, 'total' => 0];
                    }
                    if ($numVal > 0) {
                        $empSectionScores[$secId]['earned'] += $numVal;
                    }
                    $empSectionScores[$secId]['total'] += max(1, $numVal);
                }
            }
        }

        $hasCustomSectionWeights = false;
        foreach ($empSectionScores as $sData) {
            if ($sData['weight'] !== null && $sData['weight'] > 0) {
                $hasCustomSectionWeights = true;
                break;
            }
        }

        if ($hasCustomSectionWeights && !empty($empSectionScores)) {
            $empWeightedSum = 0;
            $empWeightTotal = 0;
            foreach ($empSectionScores as $sData) {
                if ($sData['total'] > 0 && $sData['weight'] !== null && (float) $sData['weight'] > 0) {
                    $w = (float) $sData['weight'];
                    $pct = ($sData['earned'] / $sData['total']) * 100;
                    $empWeightedSum += $pct * $w;
                    $empWeightTotal += $w;
                }
            }
            $pct = $empWeightTotal > 0 ? round($empWeightedSum / $empWeightTotal, 1) : null;
            if ($empWeightTotal > 0 && $pct !== null) {
                $totalPoints = round($empWeightTotal, 2);
                $earnedPoints = round(($pct / 100) * $empWeightTotal, 2);
            }
        } else {
            $pct = $totalPoints > 0 ? round(($earnedPoints / $totalPoints) * 100, 1) : null;
        }
        $submission->calculated_score = $pct;

        $submission->employee_scores = [[
            'id' => $employee->id,
            'name' => trim($employee->first_name . ' ' . $employee->last_name) ?: $employee->employee_code,
            'department_id' => $employee->department_id,
            'branch_id' => $employee->branch_id,
            'total_points' => $totalPoints,
            'earned_points' => $earnedPoints,
            'percentage' => $pct,
        ]];
    }

    private function postAssessmentOutcome(?float $score): array
    {
        if ($score === null) {
            return [
                'status' => 'not_scored',
                'status_label' => 'Not scored',
            ];
        }

        if ($score >= 75) {
            return [
                'status' => 'pass',
                'status_label' => 'Pass',
            ];
        }

        return [
            'status' => 'fail',
            'status_label' => 'Fail',
        ];
    }

    private function nextActionLabel(string $nextAction): string
    {
        return match ($nextAction) {
            'na' => 'NA',
            'warning' => 'Warning',
            'reward' => 'Reward',
            'training' => 'Training',
            'not_scored' => 'Not scored',
            default => ucfirst(str_replace('_', ' ', $nextAction)),
        };
    }

    /**
     * Resolve an employee from a collection that may be keyed by id or sequential.
     */
    private function employeeFromCollection($employeesCollection, int $employeeId): ?\App\Models\Employee
    {
        $employee = $employeesCollection->get($employeeId);
        if ($employee && (int) ($employee->id ?? 0) === $employeeId) {
            return $employee;
        }

        return $employeesCollection->firstWhere('id', $employeeId);
    }

    /**
     * Collect employee IDs referenced by roster/lookup answers for live scoring.
     *
     * @param  \Illuminate\Support\Collection<int, FormSubmission>  $submissions
     * @return list<int>
     */
    private function collectReferencedEmployeeIds($submissions): array
    {
        $ids = [];

        foreach ($submissions as $submission) {
            foreach ($submission->answers ?? [] as $answer) {
                $type = $answer->question?->inputType?->type_identifier ?? '';
                if ($type === 'employee_attendance_roster' && $answer->value_text) {
                    $decoded = json_decode($answer->value_text, true);
                    if (is_array($decoded)) {
                        foreach ($decoded as $empId) {
                            if (is_numeric($empId)) {
                                $ids[] = (int) $empId;
                            }
                        }
                    }
                }

                if ($type === 'employee_lookup' && is_numeric($answer->value_text)) {
                    $ids[] = (int) $answer->value_text;
                }

                $targets = $answer->targeted_employees;
                if (is_string($targets)) {
                    $targets = json_decode($targets, true);
                }
                if (is_array($targets)) {
                    foreach ($targets as $empId) {
                        if (is_numeric($empId)) {
                            $ids[] = (int) $empId;
                        }
                    }
                }
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * Persist a score snapshot produced by the same live scoring helpers.
     *
     * Uses a direct update so in-memory scoring attributes (employee_scores /
     * calculated_score) are never written as real columns.
     *
     * @param  list<array<string, mixed>>  $employeeScores
     */
    private function persistEvaluationScoreSnapshot(FormSubmission $submission, array $employeeScores): void
    {
        if (! Schema::hasColumn('form_submissions', 'evaluation_score_snapshot')) {
            return;
        }

        $payload = array_values($employeeScores);
        $now = now();

        \Illuminate\Support\Facades\DB::table('form_submissions')
            ->where('id', $submission->id)
            ->update([
                'evaluation_score_snapshot' => json_encode($payload),
                'evaluation_score_snapshot_at' => $now->toDateTimeString(),
                'updated_at' => $now->toDateTimeString(),
            ]);

        $submission->setAttribute('evaluation_score_snapshot', $payload);
        $submission->setAttribute('evaluation_score_snapshot_at', $now);
        $submission->syncOriginalAttribute('evaluation_score_snapshot');
        $submission->syncOriginalAttribute('evaluation_score_snapshot_at');
    }

    /**
     * Recompute and store evaluation score snapshot using current scoring helpers.
     */
    public function refreshEvaluationScoreSnapshot(FormSubmission|int $submission): array
    {
        if (! $submission instanceof FormSubmission) {
            $submission = FormSubmission::query()->findOrFail($submission);
        }

        $submission->load([
            'formVersion.sections',
            'answers.question.inputType',
            'answers.question.choices',
            'answers.question.section',
        ]);

        $employeeIds = $this->collectReferencedEmployeeIds(collect([$submission]));
        $employees = $employeeIds === []
            ? collect()
            : \App\Models\Employee::query()
                ->whereIn('id', $employeeIds)
                ->get(['id', 'first_name', 'last_name', 'employee_code', 'department_id', 'branch_id'])
                ->keyBy('id');

        $this->_calculateEmployeeScores($submission, $employees);
        $this->attachLookupSubjectScore($submission, $employees);

        $employeeScores = array_values($submission->employee_scores ?? []);
        $this->persistEvaluationScoreSnapshot($submission, $employeeScores);

        return $employeeScores;
    }

    private const WARNING_MEMO_TEMPLATE_NAME = 'የማስጠንቀቂያ ደብዳቤ';

    private const REWARD_MEMO_TEMPLATE_NAME = 'የምስጋና ደብዳቤ';

    /**
     * @return array{
     *     title: string,
     *     content: string,
     *     recipient_name: string,
     *     departments: list<string>,
     *     selected_branch_id: string|null,
     *     selected_department_id: string|null,
     *     is_head_office: bool,
     *     selected_template_id: string|null
     * }
     */
    private function buildEvaluationMemoPrefill(
        int $employeeId,
        int $formId,
        int $fiscalYearId,
        int $fiscalMonthId,
        string $nextAction,
        mixed $score,
        ?string $statusLabel,
    ): array {
        $employee = Employee::query()->find($employeeId);
        $employeeName = trim(($employee?->first_name ?? '') . ' ' . ($employee?->last_name ?? ''));
        if ($employeeName === '') {
            $employeeName = $employee?->employee_code ?: 'Employee #' . $employeeId;
        }

        $formTitle = Form::query()->whereKey($formId)->value('title') ?: 'Evaluation form';
        $fiscalMonthName = FiscalMonth::query()->whereKey($fiscalMonthId)->value('name') ?: 'Unknown month';

        $fallbackTitle = $nextAction === 'reward'
            ? "Employee Reward Recommendation – {$employeeName} – {$formTitle} ({$fiscalMonthName})"
            : "Performance Warning – {$employeeName} – {$formTitle} ({$fiscalMonthName})";

        $templateName = $nextAction === 'reward'
            ? self::REWARD_MEMO_TEMPLATE_NAME
            : self::WARNING_MEMO_TEMPLATE_NAME;

        $template = MemoTemplate::query()
            ->where('template_name', $templateName)
            ->latest()
            ->first();

        $title = $fallbackTitle;
        $content = '';
        $selectedTemplateId = null;

        if ($template) {
            $selectedTemplateId = $template->template_id;
            $title = filled($template->title)
                ? trim($template->title) . " – {$employeeName} ({$fiscalMonthName})"
                : $fallbackTitle;

            $content = trim((string) $template->content);
        }

        $hrDepartment = Department::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->first(function (Department $department) {
                $normalized = strtolower(trim($department->name));
                $compact = preg_replace('/[\s\-_]+/', '', $normalized) ?? $normalized;

                return $normalized === 'hr'
                    || str_contains($normalized, 'human resource')
                    || str_contains($compact, 'hrdepartment')
                    || (bool) preg_match('/\bhr\b/', $normalized);
            });

        $hrName = $hrDepartment?->name ?: 'HR';

        $headOffice = Branch::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->first(function (Branch $branch) {
                $normalized = strtolower($branch->name);
                $compact = preg_replace('/[\s\-_]+/', '', $normalized) ?? $normalized;

                return str_contains($normalized, 'head office') || str_contains($compact, 'headoffice');
            });

        return [
            'title' => $title,
            'content' => $content,
            'recipient_name' => $hrName,
            'departments' => [$hrName],
            'selected_branch_id' => $headOffice ? 'branch_' . $headOffice->id : null,
            'selected_department_id' => $hrDepartment ? 'dept_' . $hrDepartment->id : null,
            'is_head_office' => (bool) $headOffice,
            'selected_template_id' => $selectedTemplateId,
        ];
    }
}

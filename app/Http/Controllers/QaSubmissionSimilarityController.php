<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use App\Models\FormSubmission;
use App\Models\FormSubmissionAnswer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class QaSubmissionSimilarityController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        if (! $user || ! $user->can('submit form as qa manager')) {
            abort(403, 'Only QA managers can access submission similarity monitoring.');
        }

        $fiscalYears = FiscalYear::query()
            ->orderBy('gregorian_start_date')
            ->get(['id', 'name', 'gregorian_start_date', 'gregorian_end_date']);
        $fiscalMonths = FiscalMonth::query()
            ->orderBy('gregorian_start_date')
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

        $yearFilter = $request->has('fiscal_year_id')
            ? (string) $request->input('fiscal_year_id', 'all')
            : ($currentFiscalYear?->id ? (string) $currentFiscalYear->id : 'all');
        $monthFilter = $request->has('fiscal_month_id')
            ? (string) $request->input('fiscal_month_id', 'all')
            : ($currentFiscalMonth?->id ? (string) $currentFiscalMonth->id : 'all');

        $baseQuery = FormSubmission::query()
            ->whereHas('formVersion.form', fn ($q) => $q->whereIn('form_type', ['1', '2']));

        // 1) Fiscal window first — largest cut.
        if ($monthFilter !== 'all' && ctype_digit($monthFilter)) {
            $month = $fiscalMonths->firstWhere('id', (int) $monthFilter);
            if ($month) {
                $baseQuery->whereBetween('created_at', [
                    Carbon::parse($month->gregorian_start_date)->startOfDay(),
                    Carbon::parse($month->gregorian_end_date)->endOfDay(),
                ]);
            }
        } elseif ($yearFilter !== 'all' && ctype_digit($yearFilter)) {
            $year = $fiscalYears->firstWhere('id', (int) $yearFilter);
            if ($year) {
                $baseQuery->whereBetween('created_at', [
                    Carbon::parse($year->gregorian_start_date)->startOfDay(),
                    Carbon::parse($year->gregorian_end_date)->endOfDay(),
                ]);
            }
        }

        // Must include FK columns (form_input_type_id, form_section_id) or nested relations stay null.
        // local_id is required to align answers across different form versions.
        $answerRelations = [
            'formVersion:id,form_id',
            'formVersion.form:id,title,form_type',
            'answers:id,form_submission_id,form_question_id,sub_question_identifier,value_text,value_boolean',
            'answers.question:id,form_section_id,form_input_type_id,order_index,label,local_id',
            'answers.question.inputType:id,type_identifier',
            'answers.question.section:id,order_index',
        ];

        // 2–3) Split QA vs inspector after form_type + date.
        $qaSubmissions = (clone $baseQuery)
            ->where('is_qa_manager', true)
            ->with($answerRelations)
            ->orderBy('created_at')
            ->get();

        $inspectorSubmissions = (clone $baseQuery)
            ->where('is_qa_manager', false)
            ->with($answerRelations)
            ->orderBy('created_at')
            ->get();

        $employeeIds = [];
        foreach ($qaSubmissions->concat($inspectorSubmissions) as $submission) {
            $employeeId = $this->firstEmployeeLookupId($submission);
            if ($employeeId) {
                $employeeIds[] = $employeeId;
            }
        }

        $employees = $employeeIds === []
            ? collect()
            : Employee::query()
                ->whereIn('id', array_values(array_unique($employeeIds)))
                ->get(['id', 'first_name', 'last_name', 'department_id', 'branch_id'])
                ->keyBy('id');

        $branches = Branch::pluck('name', 'id');
        $departments = Department::pluck('name', 'id');

        $inspectorsByKey = [];
        foreach ($inspectorSubmissions as $inspector) {
            $key = $this->pairKey($inspector);
            if ($key === null) {
                continue;
            }
            $inspectorsByKey[$key][] = $inspector;
        }

        $rows = [];
        foreach ($qaSubmissions as $qa) {
            $key = $this->pairKey($qa);
            if ($key === null || empty($inspectorsByKey[$key])) {
                continue;
            }

            $inspector = $this->closestInTime($qa, $inspectorsByKey[$key]);
            if (! $inspector) {
                continue;
            }

            $formType = (string) ($qa->formVersion?->form?->form_type ?? '');
            $similarity = $this->compareAnswers($qa, $inspector);

            $branchName = '—';
            $departmentName = '—';
            $employeeName = '—';

            if ($formType === '1') {
                $branchId = $this->firstBranchLookupId($qa);
                $branchName = $branchId && isset($branches[$branchId]) ? $branches[$branchId] : '—';
            } else {
                $employeeId = $this->firstEmployeeLookupId($qa);
                $employee = $employeeId ? $employees->get($employeeId) : null;
                if ($employee) {
                    $employeeName = trim($employee->first_name . ' ' . $employee->last_name) ?: ('Employee #' . $employee->id);
                    $branchName = $employee->branch_id && isset($branches[$employee->branch_id])
                        ? $branches[$employee->branch_id]
                        : '—';
                    $departmentName = $employee->department_id && isset($departments[$employee->department_id])
                        ? $departments[$employee->department_id]
                        : '—';
                }
            }

            $rows[] = [
                'qa_submission_id' => $qa->id,
                'inspector_submission_id' => $inspector->id,
                'branch_name' => $branchName,
                'department_name' => $departmentName,
                'employee_name' => $employeeName,
                'form_id' => $qa->formVersion?->form_id,
                'form_title' => $qa->formVersion?->form?->title ?? 'Unknown form',
                'form_type' => $formType,
                'form_type_label' => $formType === '1' ? 'Type 1' : ($formType === '2' ? 'Type 2' : $formType),
                'similar_questions' => $similarity['shared_count'],
                'similarity_percent' => $similarity['percent'],
                'qa_submitted_at' => optional($qa->created_at)?->toDateTimeString(),
                'inspector_submitted_at' => optional($inspector->created_at)?->toDateTimeString(),
            ];
        }

        $rows = collect($rows)
            ->sortBy([
                ['qa_submitted_at', 'desc'],
                ['form_title', 'asc'],
            ])
            ->values();

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

        return Inertia::render('Forms/QaSimilarity/Index', [
            'rows' => $paginator,
            'fiscalYears' => $fiscalYears->map(fn ($year) => [
                'id' => $year->id,
                'name' => $year->name,
            ])->values(),
            'fiscalMonths' => $fiscalMonths->map(fn ($month) => [
                'id' => $month->id,
                'fiscal_year_id' => $month->fiscal_year_id,
                'name' => $month->name,
            ])->values(),
            'filters' => [
                'fiscal_year_id' => $yearFilter,
                'fiscal_month_id' => $monthFilter,
            ],
        ]);
    }

    private function pairKey(FormSubmission $submission): ?string
    {
        $formType = (string) ($submission->formVersion?->form?->form_type ?? '');
        $formId = $submission->formVersion?->form_id;
        if (! $formId || ($formType !== '1' && $formType !== '2')) {
            return null;
        }

        $day = optional($submission->created_at)?->toDateString();
        if (! $day) {
            return null;
        }

        if ($formType === '1') {
            $branchId = $this->firstBranchLookupId($submission);
            if (! $branchId) {
                return null;
            }

            return "1|{$formId}|{$day}|b{$branchId}";
        }

        $employeeId = $this->firstEmployeeLookupId($submission);
        if (! $employeeId) {
            return null;
        }

        return "2|{$formId}|{$day}|e{$employeeId}";
    }

    private function firstBranchLookupId(FormSubmission $submission): ?int
    {
        $answer = $submission->answers
            ->filter(function (FormSubmissionAnswer $answer) {
                $type = $answer->question?->inputType?->type_identifier ?? '';

                return $type === 'branch_lookup' && is_numeric($answer->value_text);
            })
            ->sortBy(function (FormSubmissionAnswer $answer) {
                $sectionOrder = $answer->question?->section?->order_index ?? 9999;
                $questionOrder = $answer->question?->order_index ?? 9999;

                return sprintf('%05d-%05d-%08d', $sectionOrder, $questionOrder, $answer->id);
            })
            ->first();

        return $answer ? (int) $answer->value_text : null;
    }

    private function firstEmployeeLookupId(FormSubmission $submission): ?int
    {
        $answer = $submission->answers
            ->filter(function (FormSubmissionAnswer $answer) {
                $type = $answer->question?->inputType?->type_identifier ?? '';

                return $type === 'employee_lookup' && is_numeric($answer->value_text);
            })
            ->sortBy(function (FormSubmissionAnswer $answer) {
                $sectionOrder = $answer->question?->section?->order_index ?? 9999;
                $questionOrder = $answer->question?->order_index ?? 9999;

                return sprintf('%05d-%05d-%08d', $sectionOrder, $questionOrder, $answer->id);
            })
            ->first();

        return $answer ? (int) $answer->value_text : null;
    }

    /**
     * @param  list<FormSubmission>  $candidates
     */
    private function closestInTime(FormSubmission $qa, array $candidates): ?FormSubmission
    {
        $qaTs = optional($qa->created_at)->getTimestamp();
        if ($qaTs === null) {
            return null;
        }

        $best = null;
        $bestDelta = null;
        foreach ($candidates as $candidate) {
            $candidateTs = optional($candidate->created_at)->getTimestamp();
            if ($candidateTs === null) {
                continue;
            }
            $delta = abs($candidateTs - $qaTs);
            if ($bestDelta === null || $delta < $bestDelta) {
                $best = $candidate;
                $bestDelta = $delta;
            }
        }

        return $best;
    }

    /**
     * @return array{shared_count: int, match_count: int, percent: float}
     */
    private function compareAnswers(FormSubmission $qa, FormSubmission $inspector): array
    {
        $qaMap = $this->answeredMap($qa);
        $inspectorMap = $this->answeredMap($inspector);

        $sharedKeys = array_values(array_intersect(array_keys($qaMap), array_keys($inspectorMap)));
        $sharedCount = count($sharedKeys);
        if ($sharedCount === 0) {
            return [
                'shared_count' => 0,
                'match_count' => 0,
                'percent' => 0.0,
            ];
        }

        $matchCount = 0;
        foreach ($sharedKeys as $key) {
            if ($qaMap[$key] === $inspectorMap[$key]) {
                $matchCount++;
            }
        }

        return [
            'shared_count' => $sharedCount,
            'match_count' => $matchCount,
            'percent' => round(($matchCount / $sharedCount) * 100, 1),
        ];
    }

    /**
     * Only Single Choice (`select_one`) answers count toward similarity.
     *
     * @return array<string, string>
     */
    private function answeredMap(FormSubmission $submission): array
    {
        $map = [];

        foreach ($submission->answers as $answer) {
            $type = $answer->question?->inputType?->type_identifier ?? '';
            // Single Choice checklist items only — require an explicit yes/no boolean (0 or 1).
            if ($type !== 'select_one' || $answer->value_boolean === null) {
                continue;
            }

            $normalized = $this->normalizeAnswer($answer);
            if ($normalized === null) {
                continue;
            }

            // Prefer local_id so QA/inspector submissions on different form versions still align.
            $localId = trim((string) ($answer->question?->local_id ?? ''));
            $questionKey = $localId !== ''
                ? 'local:' . $localId
                : 'qid:' . $answer->form_question_id;

            $subKey = $answer->sub_question_identifier ?? '';
            $map[$questionKey . '|' . $subKey] = $normalized;
        }

        return $map;
    }

    private function normalizeAnswer(FormSubmissionAnswer $answer): ?string
    {
        if ($answer->value_boolean !== null) {
            return $answer->value_boolean ? '1' : '0';
        }

        $text = trim((string) ($answer->value_text ?? ''));
        if ($text === '') {
            return null;
        }

        $lower = mb_strtolower($text);
        if (in_array($lower, ['1', 'yes', 'true'], true) || $text === 'አዎ') {
            return '1';
        }
        if (in_array($lower, ['0', 'no', 'false'], true) || $text === 'አይ') {
            return '0';
        }

        return $text;
    }
}

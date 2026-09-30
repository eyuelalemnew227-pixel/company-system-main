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
                        'label' => $q->label,
                        'input_type' => $q->inputType->type_identifier ?? 'text',
                        'is_required' => (bool) $q->is_required,
                        'choices' => $choices,
                    ];
                }

                $sections[] = [
                    'id' => $sec->id,
                    'title' => $sec->title,
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
        $statusFilter = $request->query('status');
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        $perPageParam = $request->query('per_page', 100);
        $format = strtolower((string) $request->query('format', 'json'));

        // Pre-fetch reference dictionaries to optimize resolution
        $branches = Branch::pluck('name', 'id')->toArray();
        $departments = Department::pluck('name', 'id')->toArray();
        $employees = Employee::get()->mapWithKeys(function ($e) {
            return [$e->id => trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code];
        })->toArray();

        // Base query
        $query = FormSubmission::with([
            'formVersion.form',
            'user:id,name,email',
            'user.employee.branch:id,name',
            'answers.question.choices',
            'answers.question.inputType',
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
        $data = collect($submissions)->map(function ($sub) use ($branches, $departments, $employees) {
            return $this->formatSubmissionRow($sub, $branches, $departments, $employees);
        });

        // Apply branch filter if provided
        if ($branchIdFilter) {
            $data = $data->filter(function ($row) use ($branchIdFilter, $branches) {
                return (string) $row['branch_id'] === (string) $branchIdFilter
                    || (isset($branches[$row['branch_id']]) && strcasecmp($branches[$row['branch_id']], $branchIdFilter) === 0);
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
            'user:id,name',
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
    private function formatSubmissionRow($sub, array $branches, array $departments, array $employees): array
    {
        $branchId = null;
        $branchName = null;

        $answersFlat = [];
        $answersDetailed = [];

        foreach ($sub->answers as $ans) {
            $question = $ans->question;
            $qLabel = $question?->label ?? ('question_' . $ans->form_question_id);
            $type = $question?->inputType?->type_identifier ?? 'text';
            $val = $ans->value_text;

            // Resolve lookups & choices
            if ($type === 'branch_lookup') {
                if (isset($branches[$val])) {
                    $branchId = (string) $val;
                    $branchName = $branches[$val];
                    $resolvedVal = $branches[$val];
                } else {
                    $resolvedVal = $val;
                    $branchName = $val;
                    $branchId = 'custom_' . md5($val);
                }
            } elseif ($type === 'department_lookup') {
                $resolvedVal = $departments[$val] ?? $val;
            } elseif ($type === 'employee_lookup') {
                $resolvedVal = $employees[$val] ?? $val;
            } elseif ($question && $question->choices->isNotEmpty()) {
                $c = $question->choices->first(function ($choice) use ($ans) {
                    return (string) $choice->id === (string) $ans->value_text
                        || (string) $choice->value === (string) $ans->value_text
                        || (string) $choice->label === (string) $ans->value_text;
                });
                $resolvedVal = $c ? $c->label : ($ans->value_text ?? ($ans->value_boolean !== null ? ($ans->value_boolean ? 'Yes' : 'No') : null));
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

            $detailItem = [
                'question_id' => $ans->form_question_id,
                'question' => $qLabel,
                'input_type' => $type,
            ];

            // If input_type is signature, do not return "value"
            if (!$isSignature) {
                $detailItem['value'] = $resolvedVal;
                $detailItem['raw_value'] = $ans->value_text ?? ($ans->value_boolean !== null ? (string) $ans->value_boolean : null);
            } else {
                $detailItem['has_signature'] = !empty($ans->value_text);
            }

            $answersDetailed[] = $detailItem;
        }

        // Fallback branch if not filled in form
        if (!$branchId) {
            $empBranch = $sub->user?->employee?->branch;
            if ($empBranch) {
                $branchId = (string) $empBranch->id;
                $branchName = $empBranch->name;
            } else {
                $branchId = 'unassigned';
                $branchName = 'Unassigned';
            }
        }

        return [
            'submission_id' => $sub->id,
            'form_id' => $sub->formVersion?->form_id,
            'form_title' => $sub->formVersion?->form?->title ?? 'Unknown Form',
            'status' => $sub->status ?: 'pending',
            'branch_id' => $branchId,
            'submitted_by' => $sub->user?->name ?? 'Unknown',
            'submitted_at' => $sub->created_at ? $sub->created_at->toDateTimeString() : null,
            'answers_flat' => $answersFlat,
        ];
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
            $baseHeaders = ['submission_id', 'form_id', 'form_title', 'status', 'branch_id', 'submitted_by', 'submitted_at'];
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
                    $row['branch_id'],
                    $row['submitted_by'],
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

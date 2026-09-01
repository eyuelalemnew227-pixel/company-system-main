<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\FormSubmission;
use Inertia\Inertia;

class FormSubmissionAdminController extends Controller
{
    /**
     * List all form directories globally.
     */
    public function all_index()
    {
        $user = auth()->user();
        $user = auth()->user();
        $forms = Form::withCount('submissions')
            ->where(function ($query) use ($user) {
                $query->where('created_by', $user->id)
                    ->orWhereHas('user_permissions', function ($q) use ($user) {
                        $q->where('user_id', $user->id)->where('can_view_submissions', true);
                    });
            })
            ->orderBy('title')
            ->get();

        return Inertia::render('Forms/Submissions/Index', [
            'forms' => $forms
        ]);
    }

    /**
     * Show isolated submissions strictly bound to one Form.
     */
    public function form_submissions(Form $form)
    {
        $user = auth()->user();
        if ($form->created_by !== $user->id) {
            $hasAccess = $form->user_permissions()->where('user_id', $user->id)->where('can_view_submissions', true)->exists();
            if (!$hasAccess) {
                abort(403, 'You must be granted explicit form-level access to view submissions for this form.');
            }
        }

        $submissions = FormSubmission::whereHas('formVersion', function ($q) use ($form) {
            $q->where('form_id', $form->id);
        })
            ->with(['user:id,name', 'formVersion:id,version_number', 'answers.question.inputType'])
            ->orderByDesc('id')
            ->get();

        $submissions->each(function ($sub) {
            $yesAnswers = 0;
            $totalBoolQuestions = 0;
            foreach ($sub->answers as $ans) {
                $qType = $ans->question->inputType->type_identifier ?? 'text';
                if ($qType === 'select_one' && ($ans->value_text === '0' || $ans->value_text === '1')) {
                    $totalBoolQuestions++;
                    if ($ans->value_text === '1') {
                        $yesAnswers++;
                    }
                }
            }
            $sub->calculated_score = $totalBoolQuestions > 0 ? round(($yesAnswers / $totalBoolQuestions) * 100, 1) : null;
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

        return Inertia::render('Forms/Submissions/FormSubmissions', [
            'form' => $form,
            'submissions' => $submissions,
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
            'formVersion.form',
            'formVersion.sections.questions.inputType',
            'answers.question.inputType'
        ])->findOrFail($submissionId);

        $user = auth()->user();
        if ($submission->formVersion->form->created_by !== $user->id) {
            if (!$submission->formVersion->form->user_permissions()->where('user_id', $user->id)->where('can_view_submissions', true)->exists()) {
                abort(403, 'You must be granted explicit form-level access to view submissions for this form.');
            }
        }

        $branches = \App\Models\Branch::select('id', 'name')->get();
        $departments = \App\Models\Department::select('id', 'name')->get();
        $employees = \App\Models\Employee::get()->map(function ($e) {
            return [
                'id' => $e->id,
                'name' => trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code,
            ];
        });

        $yesAnswers = 0;
        $totalBoolQuestions = 0;
        foreach ($submission->answers as $ans) {
            $qType = $ans->question->inputType->type_identifier ?? 'text';
            if ($qType === 'select_one' && ($ans->value_text === '0' || $ans->value_text === '1')) {
                $totalBoolQuestions++;
                if ($ans->value_text === '1') {
                    $yesAnswers++;
                }
            }
        }
        $submission->calculated_score = $totalBoolQuestions > 0 ? round(($yesAnswers / $totalBoolQuestions) * 100, 1) : null;

        return Inertia::render('Forms/Submissions/Show', [
            'form' => $submission->formVersion->form, // Keep old prop structure to limit UI rewrites
            'submission' => $submission,
            'branches' => $branches,
            'departments' => $departments,
            'employees' => $employees,
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

        $branches = \App\Models\Branch::select('id', 'name')->get();
        $departments = \App\Models\Department::select('id', 'name')->get();
        $employees = \App\Models\Employee::get()->map(function ($e) {
            return [
                'id' => $e->id,
                'name' => trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code,
                'branch_id' => $e->branch_id,
                'department_id' => $e->department_id,
            ];
        });

        return Inertia::render('Forms/Fill', [
            'form' => $submission->formVersion->form,
            'formVersion' => $submission->formVersion,
            'submission' => $submission,
            'parsedAnswers' => $parsedAnswers,
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
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($submission, $validated) {
            $submission->answers()->delete();

            foreach ($validated['answers'] as $questionId => $answerValue) {
                $boolVal = null;
                if (is_bool($answerValue)) {
                    $boolVal = $answerValue;
                } else if (in_array(strtolower((string) $answerValue), ['yes', 'true', '1'], true)) {
                    $boolVal = true;
                } else if (in_array(strtolower((string) $answerValue), ['no', 'false', '0'], true)) {
                    $boolVal = false;
                }

                \App\Models\FormSubmissionAnswer::create([
                    'form_submission_id' => $submission->id,
                    'form_question_id' => $questionId,
                    'value_text' => is_bool($answerValue) ? ($answerValue ? 'yes' : 'no') : (is_array($answerValue) ? json_encode($answerValue) : (string) $answerValue),
                    'value_boolean' => $boolVal,
                ]);
            }
        });

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
        if ($form->created_by !== $user->id) {
            if (!$form->user_permissions()->where('user_id', $user->id)->where('can_view_submissions', true)->exists()) {
                abort(403, 'You must be granted explicit form-level access to view/export submissions for this form.');
            }
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

        // 4. Stream response
        $headers = [
            "Content-type" => "text/csv",
            "Content-Disposition" => "attachment; filename=\"{$form->title}_Submissions.csv\"",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $callback = function () use ($submissions, $headersMap, $branches, $departments, $employees) {
            $file = fopen('php://output', 'w');

            // Build CSV Header
            $headerRow = ['Record ID', 'Status', 'Submitted By', 'Submission Date'];
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
                    if ($ans->value_boolean !== null) {
                        $row[] = $ans->value_boolean ? 'Yes' : 'No';
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
}

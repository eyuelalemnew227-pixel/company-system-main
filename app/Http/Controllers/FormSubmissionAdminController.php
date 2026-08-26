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
        $forms = Form::withCount('submissions')
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
        $submissions = FormSubmission::whereHas('formVersion', function ($q) use ($form) {
            $q->where('form_id', $form->id);
        })
            ->with(['user:id,name', 'formVersion:id,version_number', 'answers.question.inputType'])
            ->orderByDesc('id')
            ->get();

        $branches = \App\Models\Branch::pluck('name', 'id')->toArray();
        $departments = \App\Models\Department::pluck('name', 'id')->toArray();
        $employees = \App\Models\Employee::get()->mapWithKeys(function ($e) {
            $name = trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code;
            return [$e->id => $name];
        })->toArray();

        return Inertia::render('Forms/Submissions/FormSubmissions', [
            'form' => $form,
            'submissions' => $submissions,
            'branches' => $branches,
            'departments' => $departments,
            'employees' => $employees,
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

        $branches = \App\Models\Branch::select('id', 'name')->get();
        $departments = \App\Models\Department::select('id', 'name')->get();
        $employees = \App\Models\Employee::get()->map(function ($e) {
            return [
                'id' => $e->id,
                'name' => trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code,
            ];
        });

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
        $submission = FormSubmission::findOrFail($submissionId);

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
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected'
        ]);

        $submission = FormSubmission::findOrFail($submissionId);
        $submission->update(['status' => $validated['status']]);

        return back()->with('success', 'Status updated successfully.');
    }

    /**
     * Delete the submission entirely.
     */
    public function destroy(string $submissionId)
    {
        $submission = FormSubmission::findOrFail($submissionId);
        $submission->answers()->delete();
        $submission->delete();

        return redirect()->route('forms.submissions.index')->with('success', 'Submission deleted successfully.');
    }

    /**
     * Export all submissions for a given form as a CSV.
     */
    public function export_csv(Form $form)
    {
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

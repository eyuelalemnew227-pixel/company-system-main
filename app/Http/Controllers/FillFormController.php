<?php

namespace App\Http\Controllers;

use App\Models\Form;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class FillFormController extends Controller
{
    public function show(string $id)
    {
        $form = Form::findOrFail($id);

        $user = auth()->user();
        if (!$user->hasPermissionTo('fill forms')) {
            abort(403, 'You do not have the global capability to fill forms.');
        }

        if ($form->created_by !== $user->id) {
            if ($form->status !== 'active') {
                abort(403, 'This form is currently inactive and cannot accept new submissions.');
            }

            $hasAccess = $form->user_permissions()
                ->where('user_id', $user->id)
                ->where('can_fill_submissions', true)
                ->exists();

            if (!$hasAccess) {
                abort(403, 'You have not been granted explicit access to fill out this specific form.');
            }
        }

        $version = $form->versions()->latest()->first();
        if (!$version) {
            abort(404, 'Form has no active version.');
        }

        $version->load(['sections.questions.inputType', 'sections.questions.choices']);

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
            'form' => $form,
            'formVersion' => $version,
            'branches' => $branches,
            'departments' => $departments,
            'employees' => $employees
        ]);
    }

    public function store(Request $request, string $id)
    {
        $form = Form::findOrFail($id);

        $user = auth()->user();
        if (!$user->hasPermissionTo('fill forms')) {
            abort(403, 'You do not have the global capability to fill forms.');
        }
        if ($form->created_by !== $user->id) {
            if ($form->status !== 'active') {
                abort(403, 'This form is currently inactive and cannot accept new submissions.');
            }
            $hasAccess = $form->user_permissions()
                ->where('user_id', $user->id)
                ->where('can_fill_submissions', true)
                ->exists();
            if (!$hasAccess) {
                abort(403, 'You have not been granted explicit access to fill out this specific form.');
            }
        }

        $version = $form->versions()->latest()->first();

        \Illuminate\Support\Facades\Log::info('INCOMING FORM', $request->all());
        file_put_contents(storage_path('logs/debug_payload.json'), json_encode($request->all(), JSON_PRETTY_PRINT));

        $validated = $request->validate([
            'answers' => 'required|array',
        ]);

        DB::transaction(function () use ($version, $validated) {
            $submission = \App\Models\FormSubmission::create([
                'form_version_id' => $version->id,
                'user_id' => auth()->id(),
                'status' => 'pending',
            ]);

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

        return redirect()->route('forms.available')->with('success', 'Checklist submitted successfully.');
    }
}

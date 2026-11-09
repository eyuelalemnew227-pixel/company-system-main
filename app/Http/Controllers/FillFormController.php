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

        $branches = \App\Models\Branch::where('is_sales_generating', 1)->select('id', 'name', 'is_sales_generating')->get();
        $departments = \App\Models\Department::select('id', 'name')->get();
        $employees = \App\Models\Employee::where('status', 'active')->get()->map(function ($e) {
            return [
                'id' => $e->id,
                'name' => trim($e->first_name . ' ' . $e->last_name) ?: $e->employee_code,
                'branch_id' => $e->branch_id,
                'department_id' => $e->department_id,
                'status' => $e->status,
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

        $version->loadMissing(['sections.questions.inputType', 'sections.questions.choices']);

        $allQuestionsMap = [];
        foreach ($version->sections as $sec) {
            foreach ($sec->questions as $q) {
                if (!empty($q->local_id)) {
                    $allQuestionsMap[(string) $q->local_id] = $q;
                }
                if (!empty($q->id)) {
                    $allQuestionsMap[(string) $q->id] = $q;
                }
            }
        }

        $validationErrors = [];
        foreach ($version->sections as $sec) {
            if (!$this->isSectionVisible($sec, $allQuestionsMap, $validated['answers'])) {
                continue;
            }

            foreach ($sec->questions as $q) {
                if (!$this->isQuestionVisible($q, $allQuestionsMap, $validated['answers'])) {
                    continue;
                }

                $tId = $q->inputType->type_identifier ?? '';
                if ($tId === 'title') {
                    continue;
                }

                $isEmployeeLookup = $tId === 'employee_lookup';
                $isRequired = (bool) $q->is_required || $isEmployeeLookup;

                if ($isRequired) {
                    $ans = $validated['answers'][$q->id] ?? null;
                    $isEmpty = $ans === null || $ans === '' || (is_array($ans) && empty($ans));
                    if ($isEmpty) {
                        $validationErrors["answers.{$q->id}"] = $isEmployeeLookup
                            ? "Please select an employee for '{$q->label}' (mandatory)."
                            : "The '{$q->label}' field is required.";
                    }
                }
            }
        }

        if (!empty($validationErrors)) {
            return back()->withErrors($validationErrors)->withInput();
        }

        DB::transaction(function () use ($version, $validated, $allQuestionsMap) {
            $submission = \App\Models\FormSubmission::create([
                'form_version_id' => $version->id,
                'user_id' => auth()->id(),
                'status' => 'pending',
            ]);

            $employees = \App\Models\Employee::get();

            $globalRosterArr = [];
            foreach ($version->sections as $sec) {
                if (!$this->isSectionVisible($sec, $allQuestionsMap, $validated['answers'])) {
                    continue;
                }
                foreach ($sec->questions as $q) {
                    if (!$this->isQuestionVisible($q, $allQuestionsMap, $validated['answers'])) {
                        continue;
                    }
                    $tId = $q->inputType->type_identifier ?? '';
                    if ($tId === 'employee_attendance_roster' && isset($validated['answers'][$q->id])) {
                        $ans = $validated['answers'][$q->id];
                        if (is_array($ans)) {
                            $globalRosterArr = array_unique(array_merge($globalRosterArr, $ans));
                        }
                    }
                }
            }

            foreach ($version->sections as $section) {
                if (!$this->isSectionVisible($section, $allQuestionsMap, $validated['answers'])) {
                    continue;
                }

                $localRosterArr = [];
                foreach ($section->questions as $q) {
                    if (!$this->isQuestionVisible($q, $allQuestionsMap, $validated['answers'])) {
                        continue;
                    }
                    $tId = $q->inputType->type_identifier ?? '';
                    if ($tId === 'employee_attendance_roster') {
                        if (isset($validated['answers'][$q->id])) {
                            $ans = $validated['answers'][$q->id];
                            $localRosterArr = is_array($ans) ? $ans : [];
                        }
                    }
                }

                foreach ($section->questions as $q) {
                    if (!$this->isQuestionVisible($q, $allQuestionsMap, $validated['answers'])) {
                        continue;
                    }
                    if (!array_key_exists($q->id, $validated['answers'])) {
                        continue;
                    }
                    $answerValue = $validated['answers'][$q->id];

                    $deptTargets = $q->department_targets ?? [];
                    $responsibleEmpIds = [];

                    if (!empty($deptTargets)) {
                        $rosterForMatching = !empty($localRosterArr) ? $localRosterArr : $globalRosterArr;
                        foreach ($rosterForMatching as $empIdStr) {
                            $emp = $employees->firstWhere('id', (int) $empIdStr);
                            if ($emp) {
                                if (in_array((string) $emp->department_id, array_map('strval', $deptTargets), true)) {
                                    $responsibleEmpIds[] = (string) $empIdStr;
                                }
                            }
                        }
                    }

                    $tId = $q->inputType->type_identifier ?? '';

                    if ($tId === 'title') {
                        continue;
                    }

                    if ($tId === 'employee_evaluation_grid' && is_array($answerValue)) {
                        // Decompose Grid 
                        foreach ($answerValue as $empIdStr => $evals) {
                            if (!is_array($evals))
                                continue;
                            $empId = [(string) $empIdStr]; // Map single employee array for isolated tracking

                            foreach ($evals as $subQLabel => $val) {
                                if ($subQLabel === 'remark' && ($val === '' || $val === null))
                                    continue;

                                \App\Models\FormSubmissionAnswer::create([
                                    'form_submission_id' => $submission->id,
                                    'form_question_id' => $q->id,
                                    'sub_question_identifier' => $subQLabel === 'single' ? null : $subQLabel,
                                    'value_text' => (string) $val,
                                    'value_boolean' => null,
                                    'targeted_employees' => $empId,
                                ]);
                            }
                        }
                    } elseif ($tId === 'select_one') {
                        $selectedChoice = $q->choices->first(function ($c) use ($answerValue) {
                            return (string) $c->id === (string) $answerValue;
                        });

                        if (!$selectedChoice) {
                            $selectedChoice = $q->choices->first(function ($c) use ($answerValue) {
                                return strtolower(trim((string) $c->label)) === strtolower(trim((string) $answerValue));
                            });
                        }

                        if (!$selectedChoice) {
                            $selectedChoice = $q->choices->first(function ($c) use ($answerValue) {
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
                            'form_question_id' => $q->id,
                            'value_text' => $valText,
                            'value_boolean' => $boolVal,
                            'targeted_employees' => empty($responsibleEmpIds) ? null : $responsibleEmpIds, // Generic targets
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
                            'form_question_id' => $q->id,
                            'value_text' => $valText,
                            'value_boolean' => $boolVal,
                            'targeted_employees' => empty($responsibleEmpIds) ? null : $responsibleEmpIds, // Generic targets
                        ]);
                    }
                }
            }
        });

        return redirect()->route('forms.available')->with('success', 'Checklist submitted successfully.');
    }

    private function isSectionVisible($sec, array $allQuestionsMap, array $answers): bool
    {
        $logic = $sec->visibility_logic;
        if (empty($logic) || empty($logic['target_local_id'])) {
            return true;
        }

        $targetKey = (string) $logic['target_local_id'];
        $targetQ = $allQuestionsMap[$targetKey] ?? null;
        if (!$targetQ) {
            return true;
        }

        $givenAnswer = $answers[$targetQ->id] ?? null;
        return $this->evaluateVisibilityLogic($logic, $givenAnswer, $targetQ);
    }

    private function isQuestionVisible($q, array $allQuestionsMap, array $answers): bool
    {
        $logic = $q->visibility_logic;
        if (empty($logic) || empty($logic['target_local_id'])) {
            return true;
        }

        $targetKey = (string) $logic['target_local_id'];
        $targetQ = $allQuestionsMap[$targetKey] ?? null;
        if (!$targetQ) {
            return true;
        }

        $givenAnswer = $answers[$targetQ->id] ?? null;
        return $this->evaluateVisibilityLogic($logic, $givenAnswer, $targetQ);
    }

    private function evaluateVisibilityLogic(?array $logic, $givenAnswer, $targetQ = null): bool
    {
        if (empty($logic) || empty($logic['target_local_id'])) {
            return true;
        }

        $operator = $logic['operator'] ?? 'equals';
        $requiredValue = $logic['value'] ?? null;

        // If target question has not been answered yet
        if ($givenAnswer === null || $givenAnswer === '' || (is_array($givenAnswer) && empty($givenAnswer))) {
            return $operator === 'not_equals';
        }

        $normalizeBool = function ($val) {
            if ($val === true || $val === 1 || $val === '1' || $val === 'true' || strtolower((string) $val) === 'yes') return true;
            if ($val === false || $val === 0 || $val === '0' || $val === 'false' || strtolower((string) $val) === 'no') return false;
            return null;
        };

        $boolAnswer = $normalizeBool($givenAnswer);
        $boolReq = $normalizeBool($requiredValue);

        $isMatch = false;
        if ($boolAnswer !== null && $boolReq !== null) {
            $isMatch = ($boolAnswer === $boolReq);
        } elseif (is_array($givenAnswer)) {
            $normalizedReq = strtolower(trim((string) $requiredValue));
            foreach ($givenAnswer as $v) {
                if (strtolower(trim((string) $v)) === $normalizedReq) {
                    $isMatch = true;
                    break;
                }
            }
        } else {
            $strGiven = strtolower(trim((string) $givenAnswer));
            $strReq = strtolower(trim((string) $requiredValue));
            $isMatch = ($strGiven === $strReq);

            if (!$isMatch && $targetQ && isset($targetQ->choices)) {
                $matchedChoice = $targetQ->choices->first(function ($c) use ($givenAnswer) {
                    return (string) $c->id === (string) $givenAnswer
                        || strtolower(trim((string) $c->value)) === strtolower(trim((string) $givenAnswer))
                        || strtolower(trim((string) $c->label)) === strtolower(trim((string) $givenAnswer));
                });
                if ($matchedChoice) {
                    $cVal = strtolower(trim((string) $matchedChoice->value));
                    $cLabel = strtolower(trim((string) $matchedChoice->label));
                    $cId = (string) $matchedChoice->id;
                    if ($strReq === $cVal || $strReq === $cLabel || $strReq === $cId) {
                        $isMatch = true;
                    }
                }
            }
        }

        return $operator === 'not_equals' ? !$isMatch : $isMatch;
    }
}


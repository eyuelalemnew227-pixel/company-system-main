<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\FiscalMonth;
use App\Models\FiscalYear;
use App\Models\FormSubmission;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ChecklistScoringService
{
    /**
     * Calculate employee scores for a single submission.
     */
    public function calculateEmployeeScores(FormSubmission $submission, $employeesCollection): FormSubmission
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
            $emp = is_array($employeesCollection)
                ? ($employeesCollection[(int)$empId] ?? $employeesCollection[(string)$empId] ?? null)
                : ($employeesCollection->get((int)$empId) ?? $employeesCollection->get((string)$empId) ?? $employeesCollection->firstWhere('id', (int) $empId));
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

        foreach ($submission->answers as $ans) {
            $qType = $ans->question?->inputType?->type_identifier ?? 'text';
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
                    $totalBoolQuestions++;
                    if ($isYes) {
                        $yesAnswers++;
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

                    foreach ($employeeScoresMatrix as $empKey => &$empScore) {
                        $isTargeted = false;
                        $empIdStr = (string) $empScore['id'];

                        if (!empty($ansTargetEmpIds)) {
                            $isTargeted = in_array($empIdStr, $ansTargetEmpIds, true);
                        } elseif (!empty($targetDeptIds)) {
                            $isTargeted = in_array((string) $empScore['department_id'], $targetDeptIds, true);
                        } else {
                            $isTargeted = true;
                        }

                        if ($isTargeted) {
                            $empScore['total_points']++;
                            if ($isYes) {
                                $empScore['earned_points']++;
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
                    }
                }
            }
        }

        $scoresList = [];
        foreach ($employeeScoresMatrix as $empKey => &$empScore) {
            if ($empScore['total_points'] > 0) {
                $empScore['percentage'] = round(($empScore['earned_points'] / $empScore['total_points']) * 100, 1);
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
            $submission->calculated_score = $totalBoolQuestions > 0 ? round(($yesAnswers / $totalBoolQuestions) * 100, 1) : null;
        }

        return $submission;
    }

    /**
     * Attach single subject score if employee_lookup was used without roster.
     */
    public function attachLookupSubjectScore(FormSubmission $submission, $employeesCollection): void
    {
        if (!empty($submission->employee_scores)) {
            return;
        }

        $lookup = null;
        foreach ($submission->answers as $a) {
            if (($a->question?->inputType?->type_identifier ?? '') === 'employee_lookup' && is_numeric($a->value_text)) {
                $lookup = $a;
                break;
            }
        }

        if (!$lookup) {
            return;
        }

        $empIdNum = (int) $lookup->value_text;
        $employee = is_array($employeesCollection)
            ? ($employeesCollection[$empIdNum] ?? $employeesCollection[(string)$empIdNum] ?? null)
            : ($employeesCollection->get($empIdNum) ?? $employeesCollection->get((string)$empIdNum) ?? $employeesCollection->firstWhere('id', $empIdNum));
        if (!$employee) {
            return;
        }

        $totalPoints = 0;
        $earnedPoints = 0;
        $empIdStr = (string) $employee->id;
        $empDeptIdStr = (string) $employee->department_id;

        foreach ($submission->answers as $ans) {
            $qType = $ans->question?->inputType?->type_identifier ?? 'text';
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

                    $isTargeted = false;
                    if (!empty($ansTargetEmpIds)) {
                        $isTargeted = in_array($empIdStr, $ansTargetEmpIds, true);
                    } elseif (!empty($targetDeptIds)) {
                        $isTargeted = in_array($empDeptIdStr, $targetDeptIds, true);
                    } else {
                        $isTargeted = true;
                    }

                    if ($isTargeted) {
                        $totalPoints++;
                        if ($isYes) {
                            $earnedPoints++;
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
                }
            }
        }

        $pct = $totalPoints > 0 ? round(($earnedPoints / $totalPoints) * 100, 1) : null;
        $submission->calculated_score = $pct;

        $submission->employee_scores = [[
            'id' => $employee->id,
            'name' => trim($employee->first_name . ' ' . $employee->last_name) ?: ($employee->employee_code ?? "Employee #{$employee->id}"),
            'employee_code' => $employee->employee_code,
            'department_id' => $employee->department_id,
            'branch_id' => $employee->branch_id,
            'total_points' => $totalPoints,
            'earned_points' => $earnedPoints,
            'percentage' => $pct,
        ]];
    }

    /**
     * Get the aggregated employee checklist summary for dashboard.
     */
    public function getEmployeeChecklistSummary(array $filters = []): array
    {
        @ini_set('memory_limit', '512M');

        $fiscalYearId = $filters['fiscal_year_id'] ?? null;
        $fiscalMonthId = $filters['fiscal_month_id'] ?? null;
        $branchIdFilter = $filters['branch_id'] ?? null;
        $deptIdFilter = $filters['department_id'] ?? null;
        $completionFilter = $filters['completion_status'] ?? 'all';
        $search = trim($filters['search'] ?? '');
        $startDate = !empty($filters['start_date']) ? $filters['start_date'] : null;
        $endDate = !empty($filters['end_date']) ? $filters['end_date'] : null;

        $validVersionIds = \Illuminate\Support\Facades\DB::table('form_versions')
            ->join('forms', 'form_versions.form_id', '=', 'forms.id')
            ->whereIn('forms.form_type', ['1', '2'])
            ->pluck('form_versions.id')
            ->toArray();

        $query = FormSubmission::query()->whereIn('form_version_id', $validVersionIds);

        // Date range / Fiscal period filtering: custom date range takes priority if provided
        if ($startDate && $endDate) {
            try {
                $query->whereBetween('created_at', [
                    Carbon::parse($startDate)->startOfDay(),
                    Carbon::parse($endDate)->endOfDay(),
                ]);
            } catch (\Exception $e) {
                // Ignore date parse errors
            }
        } elseif ($startDate) {
            try {
                $query->where('created_at', '>=', Carbon::parse($startDate)->startOfDay());
            } catch (\Exception $e) {
                // Ignore date parse errors
            }
        } elseif ($endDate) {
            try {
                $query->where('created_at', '<=', Carbon::parse($endDate)->endOfDay());
            } catch (\Exception $e) {
                // Ignore date parse errors
            }
        } elseif ($fiscalMonthId && $fiscalMonthId !== 'all') {
            $month = FiscalMonth::find($fiscalMonthId);
            if ($month && $month->gregorian_start_date && $month->gregorian_end_date) {
                $query->whereBetween('created_at', [
                    Carbon::parse($month->gregorian_start_date)->startOfDay(),
                    Carbon::parse($month->gregorian_end_date)->endOfDay(),
                ]);
            }
        } elseif ($fiscalYearId && $fiscalYearId !== 'all') {
            $year = FiscalYear::find($fiscalYearId);
            if ($year && $year->gregorian_start_date && $year->gregorian_end_date) {
                $query->whereBetween('created_at', [
                    Carbon::parse($year->gregorian_start_date)->startOfDay(),
                    Carbon::parse($year->gregorian_end_date)->endOfDay(),
                ]);
            }
        }

        $employees = Employee::get(['id', 'first_name', 'last_name', 'employee_code', 'department_id', 'branch_id'])->keyBy('id');
        $branches = Branch::pluck('name', 'id')->toArray();
        $departments = Department::pluck('name', 'id')->toArray();

        $employeeMap = [];

        $query->with([
            'formVersion.form:id,title,form_type',
            'answers.question.inputType:id,type_identifier',
            'answers.question.choices:id,form_question_id,value,label',
        ])->chunkById(50, function ($submissions) use (&$employeeMap, $employees, $branches, $departments) {
            foreach ($submissions as $sub) {
                $formType = (string) ($sub->formVersion?->form?->form_type ?? '');
                if ($formType !== '1' && $formType !== '2') {
                    continue;
                }

            // Extract branch lookup from submission if employee has no branch
            $branchLookup = $sub->answers->first(function ($a) {
                return ($a->question?->inputType?->type_identifier ?? '') === 'branch_lookup' && is_numeric($a->value_text);
            });
            $subBranchId = $branchLookup ? (int) $branchLookup->value_text : null;

            if ($formType === '1') {
                // Form 1 calculation: score strictly based on targeted_employees column in form_submission_answers
                $empStats = [];
                $rosterAnswer = $sub->answers->first(function ($a) {
                    return ($a->question?->inputType?->type_identifier ?? '') === 'employee_attendance_roster';
                });
                $presentIds = [];
                if ($rosterAnswer && $rosterAnswer->value_text) {
                    $decodedRoster = json_decode($rosterAnswer->value_text, true);
                    if (is_array($decodedRoster)) {
                        $presentIds = $decodedRoster;
                    }
                }
                if (empty($presentIds)) {
                    $lookupAnswer = $sub->answers->first(function ($a) {
                        return ($a->question?->inputType?->type_identifier ?? '') === 'employee_lookup' && is_numeric($a->value_text);
                    });
                    if ($lookupAnswer) {
                        $presentIds = [(string) $lookupAnswer->value_text];
                    }
                }

                foreach ($sub->answers as $ans) {
                    $targets = $ans->targeted_employees;
                    if (is_string($targets)) {
                        $targets = json_decode($targets, true);
                    }
                    if (!is_array($targets)) {
                        $targets = [];
                    }

                    // Fallback to department_targets + roster if targeted_employees was empty
                    if (empty($targets) && !empty($presentIds)) {
                        $deptTargets = $ans->question?->department_targets ?? [];
                        if (is_string($deptTargets)) {
                            $deptTargets = json_decode($deptTargets, true);
                        }
                        if (is_array($deptTargets) && !empty($deptTargets)) {
                            $dSet = array_flip(array_map('strval', $deptTargets));
                            foreach ($presentIds as $pId) {
                                $pEmp = $employees->get((int) $pId) ?? $employees->get((string) $pId);
                                if ($pEmp && isset($dSet[(string) $pEmp->department_id])) {
                                    $targets[] = (string) $pId;
                                }
                            }
                        }
                    }

                    if (empty($targets)) {
                        continue;
                    }

                    $val = trim((string) $ans->value_text);
                    $isYes = null;

                    if ($val === '1' || $val === 'አዎ') {
                        $isYes = true;
                    } elseif ($val === '0' || $val === 'አይ') {
                        $isYes = false;
                    }

                    // Only use value_text = 1 and value_text = 0. Exclude all other remarks/values.
                    if ($isYes === null) {
                        continue;
                    }

                    foreach ($targets as $empIdStr) {
                        $empIdNum = (int) $empIdStr;
                        if (!$empIdNum) {
                            continue;
                        }
                        if (!isset($empStats[$empIdNum])) {
                            $empStats[$empIdNum] = ['total' => 0, 'passed' => 0];
                        }
                        $empStats[$empIdNum]['total']++;
                        if ($isYes) {
                            $empStats[$empIdNum]['passed']++;
                        }
                    }
                }

                foreach ($empStats as $empIdNum => $st) {
                    if ($st['total'] === 0) {
                        continue;
                    }
                    $pct = round(($st['passed'] / $st['total']) * 100, 1);
                    $emp = $employees->get($empIdNum) ?? $employees->get((string) $empIdNum);
                    $branchId = $emp?->branch_id ?? $subBranchId;
                    $deptId = $emp?->department_id;
                    $deptName = $deptId && isset($departments[$deptId]) ? $departments[$deptId] : '—';

                    if (!isset($employeeMap[$empIdNum])) {
                        $employeeMap[$empIdNum] = [
                            'employee_id' => $empIdNum,
                            'employee_name' => $emp ? trim($emp->first_name . ' ' . $emp->last_name) : "Employee #{$empIdNum}",
                            'employee_code' => $emp?->employee_code,
                            'branch_id' => $branchId,
                            'branch_name' => $branchId && isset($branches[$branchId]) ? $branches[$branchId] : '—',
                            'department_id' => $deptId,
                            'department_name' => $deptName,
                            'type_1_total' => 0,
                            'type_1_passed' => 0,
                            'type_1_count' => 0,
                            'type_2_total' => 0,
                            'type_2_passed' => 0,
                            'type_2_count' => 0,
                        ];
                    }

                    if ($branchId && (!$employeeMap[$empIdNum]['branch_id'] || $employeeMap[$empIdNum]['branch_name'] === '—')) {
                        $employeeMap[$empIdNum]['branch_id'] = $branchId;
                        $employeeMap[$empIdNum]['branch_name'] = $branches[$branchId] ?? '—';
                    }

                    if ($deptId && (!$employeeMap[$empIdNum]['department_id'] || $employeeMap[$empIdNum]['department_name'] === '—')) {
                        $employeeMap[$empIdNum]['department_id'] = $deptId;
                        $employeeMap[$empIdNum]['department_name'] = $departments[$deptId] ?? '—';
                    }

                    $employeeMap[$empIdNum]['type_1_total'] += $st['total'];
                    $employeeMap[$empIdNum]['type_1_passed'] += $st['passed'];
                    $employeeMap[$empIdNum]['type_1_count']++;
                }
            } elseif ($formType === '2') {
                // Form 2 calculation: standard form scoring using subject lookup or roster
                $this->calculateEmployeeScores($sub, $employees);
                $this->attachLookupSubjectScore($sub, $employees);

                foreach ($sub->employee_scores ?? [] as $scoreData) {
                    $empId = $scoreData['id'] ?? null;
                    if (!$empId || $scoreData['percentage'] === null) {
                        continue;
                    }

                    $emp = $employees->get($empId) ?? $employees->get((string) $empId);
                    $branchId = $scoreData['branch_id'] ?? $emp?->branch_id ?? $subBranchId;
                    $deptId = $emp?->department_id;
                    $deptName = $deptId && isset($departments[$deptId]) ? $departments[$deptId] : '—';

                    if (!isset($employeeMap[$empId])) {
                        $employeeMap[$empId] = [
                            'employee_id' => $empId,
                            'employee_name' => $scoreData['name'],
                            'employee_code' => $scoreData['employee_code'] ?? null,
                            'branch_id' => $branchId,
                            'branch_name' => $branchId && isset($branches[$branchId]) ? $branches[$branchId] : '—',
                            'department_id' => $deptId,
                            'department_name' => $deptName,
                            'type_1_total' => 0,
                            'type_1_passed' => 0,
                            'type_1_count' => 0,
                            'type_2_total' => 0,
                            'type_2_passed' => 0,
                            'type_2_count' => 0,
                        ];
                    }

                    if ($branchId && (!$employeeMap[$empId]['branch_id'] || $employeeMap[$empId]['branch_name'] === '—')) {
                        $employeeMap[$empId]['branch_id'] = $branchId;
                        $employeeMap[$empId]['branch_name'] = $branches[$branchId] ?? '—';
                    }

                    if ($deptId && (!$employeeMap[$empId]['department_id'] || $employeeMap[$empId]['department_name'] === '—')) {
                        $employeeMap[$empId]['department_id'] = $deptId;
                        $employeeMap[$empId]['department_name'] = $departments[$deptId] ?? '—';
                    }

                    $employeeMap[$empId]['type_2_total'] += ($scoreData['total_points'] ?? 0);
                    $employeeMap[$empId]['type_2_passed'] += ($scoreData['earned_points'] ?? 0);
                    $employeeMap[$empId]['type_2_count']++;
                }
            }
        }
        });

        $rows = [];
        $totalScore1Sum = 0;
        $totalScore1Count = 0;
        $totalScore2Sum = 0;
        $totalScore2Count = 0;
        $bothCompletedCount = 0;

        foreach ($employeeMap as $empId => $data) {
            $hasType1 = ($data['type_1_total'] > 0);
            $hasType2 = ($data['type_2_total'] > 0);

            $score1 = $hasType1 ? round(($data['type_1_passed'] / $data['type_1_total']) * 100, 1) : null;
            $score2 = $hasType2 ? round(($data['type_2_passed'] / $data['type_2_total']) * 100, 1) : null;

            $avg = null;
            if ($score1 !== null && $score2 !== null) {
                $avg = round(($score1 + $score2) / 2, 1);
                $bothCompletedCount++;
            } elseif ($score1 !== null) {
                $avg = $score1;
            } elseif ($score2 !== null) {
                $avg = $score2;
            }

            if ($score1 !== null) {
                $totalScore1Sum += $score1;
                $totalScore1Count++;
            }

            if ($score2 !== null) {
                $totalScore2Sum += $score2;
                $totalScore2Count++;
            }

            // Apply completion status filter
            if ($completionFilter === 'both' && (!$hasType1 || !$hasType2)) {
                continue;
            }
            if ($completionFilter === 'type_1_only' && (!$hasType1 || $hasType2)) {
                continue;
            }
            if ($completionFilter === 'type_2_only' && ($hasType1 || !$hasType2)) {
                continue;
            }

            // Apply branch filter
            if ($branchIdFilter && $branchIdFilter !== 'all' && (string) $data['branch_id'] !== (string) $branchIdFilter) {
                continue;
            }

            // Apply department filter
            if ($deptIdFilter && $deptIdFilter !== 'all' && (string) ($data['department_id'] ?? '') !== (string) $deptIdFilter) {
                continue;
            }

            // Apply search filter (employee name, branch, or department)
            if ($search !== '') {
                $term = mb_strtolower($search);
                $matchesName = str_contains(mb_strtolower($data['employee_name']), $term);
                $matchesBranch = str_contains(mb_strtolower($data['branch_name']), $term);
                $matchesDept = !empty($data['department_name']) ? str_contains(mb_strtolower($data['department_name']), $term) : false;
                $matchesCode = $data['employee_code'] ? str_contains(mb_strtolower($data['employee_code']), $term) : false;
                if (!$matchesName && !$matchesBranch && !$matchesDept && !$matchesCode) {
                    continue;
                }
            }

            $rows[] = [
                'employee_id' => $empId,
                'employee_name' => $data['employee_name'],
                'employee_code' => $data['employee_code'],
                'branch_id' => $data['branch_id'],
                'branch' => $data['branch_name'],
                'department_id' => $data['department_id'] ?? null,
                'department' => $data['department_name'] ?? '—',
                'score_type_1' => $score1,
                'score_type_2' => $score2,
                'avg_score' => $avg,
                'type_1_count' => $data['type_1_count'],
                'type_2_count' => $data['type_2_count'],
            ];
        }

        // Sort by Branch name, then Employee name by default
        usort($rows, function ($a, $b) {
            $cmpBranch = strcmp($a['branch'], $b['branch']);
            if ($cmpBranch !== 0) {
                return $cmpBranch;
            }
            return strcmp($a['employee_name'], $b['employee_name']);
        });

        $metrics = [
            'total_employees' => count($rows),
            'both_completed_count' => $bothCompletedCount,
            'avg_type_1' => $totalScore1Count > 0 ? round($totalScore1Sum / $totalScore1Count, 1) : null,
            'avg_type_2' => $totalScore2Count > 0 ? round($totalScore2Sum / $totalScore2Count, 1) : null,
            'overall_avg' => ($totalScore1Count + $totalScore2Count) > 0
                ? round(($totalScore1Sum + $totalScore2Sum) / ($totalScore1Count + $totalScore2Count), 1)
                : null,
        ];

        return [
            'rows' => $rows,
            'metrics' => $metrics,
        ];
    }
}

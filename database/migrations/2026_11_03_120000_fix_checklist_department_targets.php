<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Fix Form 16 (Barista 1) question department targets
        // Set milk & coffee quality questions to department 120 (Barista)
        DB::table('form_questions')->whereIn('id', [8720, 8721, 9418, 9419])->update([
            'department_targets' => json_encode(['120'])
        ]);

        // Set storage & inventory questions to department 105 (Branch Manager)
        DB::table('form_questions')->whereIn('id', [
            8722, 8723, 8724, 8727, 8728, 8729,
            9420, 9421, 9422, 9425, 9426, 9427
        ])->update([
            'department_targets' => json_encode(['105'])
        ]);

        // 2. Fix Form 18 (Waiter 1) discipline questions to department 60 (Waiter)
        DB::table('form_questions')->whereIn('id', [9375, 9376])->update([
            'department_targets' => json_encode(['60'])
        ]);

        // 3. Fix Form 17 (Cashier 1) questions to department 95 (Cashier)
        DB::table('form_questions')->whereIn('id', [9389, 9390, 9391])->update([
            'department_targets' => json_encode(['95'])
        ]);

        // 4. Update existing Form 16 submission answers targeted_employees
        $f16SubIds = DB::table('form_submissions')
            ->join('form_versions', 'form_submissions.form_version_id', '=', 'form_versions.id')
            ->where('form_versions.form_id', 16)
            ->pluck('form_submissions.id');

        $employees = DB::table('employees')->select('id', 'department_id')->get()->keyBy('id');

        foreach ($f16SubIds as $subId) {
            $rosterRow = DB::table('form_submission_answers')
                ->where('form_submission_id', $subId)
                ->whereIn('form_question_id', [8710, 9408])
                ->first();

            if (!$rosterRow || !$rosterRow->value_text) {
                continue;
            }

            $rosterIds = json_decode($rosterRow->value_text, true);
            if (!is_array($rosterIds)) {
                continue;
            }

            $baristaIds = [];
            $managerIds = [];
            foreach ($rosterIds as $empId) {
                $e = $employees->get((int) $empId);
                if ($e) {
                    if ($e->department_id == 120) {
                        $baristaIds[] = (string) $empId;
                    }
                    if ($e->department_id == 105) {
                        $managerIds[] = (string) $empId;
                    }
                }
            }

            if (!empty($baristaIds)) {
                DB::table('form_submission_answers')
                    ->where('form_submission_id', $subId)
                    ->whereIn('form_question_id', [8720, 8721, 9418, 9419])
                    ->update(['targeted_employees' => json_encode($baristaIds)]);
            }

            if (!empty($managerIds)) {
                DB::table('form_submission_answers')
                    ->where('form_submission_id', $subId)
                    ->whereIn('form_question_id', [
                        8722, 8723, 8724, 8727, 8728, 8729,
                        9420, 9421, 9422, 9425, 9426, 9427
                    ])
                    ->update(['targeted_employees' => json_encode($managerIds)]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert question department targets
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix existing records where answers to number input fields had value_boolean mistakenly populated
        DB::table('form_submission_answers')
            ->whereIn('form_question_id', function ($query) {
                $query->select('form_questions.id')
                    ->from('form_questions')
                    ->join('form_input_types', 'form_questions.form_input_type_id', '=', 'form_input_types.id')
                    ->where('form_input_types.type_identifier', 'number');
            })
            ->whereNotNull('value_boolean')
            ->update([
                'value_boolean' => null,
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cannot reliably restore erroneous boolean values
    }
};

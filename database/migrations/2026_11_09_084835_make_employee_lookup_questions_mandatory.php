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
        $lookupType = DB::table('form_input_types')
            ->where('type_identifier', 'employee_lookup')
            ->first();

        if ($lookupType) {
            DB::table('form_questions')
                ->where('form_input_type_id', $lookupType->id)
                ->where('is_required', false)
                ->update(['is_required' => true]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op to preserve question required integrity
    }
};

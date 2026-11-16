<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('form_sections', function (Blueprint $table) {
            $table->integer('exact_required_answers')->nullable()->after('weight');
        });

        // Migrate any previous min_required_answers to exact_required_answers
        DB::statement("UPDATE form_sections SET exact_required_answers = min_required_answers WHERE min_required_answers IS NOT NULL AND min_required_answers > 0 AND (exact_required_answers IS NULL OR exact_required_answers = 0)");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_sections', function (Blueprint $table) {
            $table->dropColumn('exact_required_answers');
        });
    }
};


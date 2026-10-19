<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('td_kpi_assignments', function (Blueprint $table) {
            $table->timestamp('submitted_at')->nullable()->after('post_assessment_score');
            $table->foreignId('submitted_by')
                ->nullable()
                ->after('submitted_at')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('td_kpi_assignment_questions', function (Blueprint $table) {
            $table->text('response')->nullable()->after('order_index');
        });
    }

    public function down(): void
    {
        Schema::table('td_kpi_assignment_questions', function (Blueprint $table) {
            $table->dropColumn('response');
        });

        Schema::table('td_kpi_assignments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('submitted_by');
            $table->dropColumn('submitted_at');
        });
    }
};

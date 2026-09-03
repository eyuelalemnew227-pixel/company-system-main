<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('training_feedback_responses')) {
            Schema::table('training_feedback_responses', function (Blueprint $table) {
                if (!Schema::hasColumn('training_feedback_responses', 'department_id')) {
                    $table->foreignId('department_id')->nullable()->after('branch_id')->constrained('departments')->onDelete('set null');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('training_feedback_responses')) {
            Schema::table('training_feedback_responses', function (Blueprint $table) {
                if (Schema::hasColumn('training_feedback_responses', 'department_id')) {
                    $table->dropForeign(['department_id']);
                    $table->dropColumn('department_id');
                }
            });
        }
    }
};

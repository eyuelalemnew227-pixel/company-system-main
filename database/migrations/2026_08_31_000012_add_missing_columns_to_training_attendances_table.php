<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_attendances', function (Blueprint $table) {
            if (!Schema::hasColumn('training_attendances', 'training_schedule_id')) {
                $table->foreignId('training_schedule_id')->nullable()->after('id');
            }
            if (!Schema::hasColumn('training_attendances', 'training_schedule_item_id')) {
                $table->foreignId('training_schedule_item_id')->nullable()->after('training_schedule_id');
            }
            if (!Schema::hasColumn('training_attendances', 'user_type')) {
                $table->string('user_type')->default('branch_manager')->after('user_id');
            }
            if (!Schema::hasColumn('training_attendances', 'name')) {
                $table->string('name')->nullable()->after('user_type');
            }
            if (!Schema::hasColumn('training_attendances', 'branch_or_department')) {
                $table->string('branch_or_department')->nullable()->after('name');
            }
            if (!Schema::hasColumn('training_attendances', 'session_date')) {
                $table->date('session_date')->nullable()->after('branch_or_department');
            }
            if (!Schema::hasColumn('training_attendances', 'recorded_by_user_id')) {
                $table->foreignId('recorded_by_user_id')->nullable()->after('notes');
            }
        });
    }

    public function down(): void
    {
        //
    }
};

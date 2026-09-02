<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('training_attendances')) {
            Schema::table('training_attendances', function (Blueprint $table) {
                if (!Schema::hasColumn('training_attendances', 'trainee_name')) {
                    $table->string('trainee_name')->nullable()->after('name');
                }
                if (!Schema::hasColumn('training_attendances', 'branch_name')) {
                    $table->string('branch_name')->nullable()->after('branch_or_department');
                }
                if (!Schema::hasColumn('training_attendances', 'department_name')) {
                    $table->string('department_name')->nullable()->after('branch_name');
                }
                if (!Schema::hasColumn('training_attendances', 'phone_number')) {
                    $table->string('phone_number')->nullable()->after('department_name');
                }
                if (!Schema::hasColumn('training_attendances', 'training_agenda_id')) {
                    $table->unsignedBigInteger('training_agenda_id')->nullable()->after('training_schedule_item_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('training_attendances')) {
            Schema::table('training_attendances', function (Blueprint $table) {
                $columns = ['trainee_name', 'branch_name', 'department_name', 'phone_number', 'training_agenda_id'];
                foreach ($columns as $col) {
                    if (Schema::hasColumn('training_attendances', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};

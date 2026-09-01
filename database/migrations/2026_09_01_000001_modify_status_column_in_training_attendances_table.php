<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('training_attendances')) {
            DB::statement("ALTER TABLE training_attendances MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'on_time'");
            if (Schema::hasColumn('training_attendances', 'training_agenda_id')) {
                DB::statement("ALTER TABLE training_attendances MODIFY COLUMN training_agenda_id BIGINT UNSIGNED NULL DEFAULT NULL");
            }
            if (Schema::hasColumn('training_attendances', 'trainee_name')) {
                DB::statement("ALTER TABLE training_attendances MODIFY COLUMN trainee_name VARCHAR(191) NULL DEFAULT NULL");
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('training_attendances')) {
            DB::statement("ALTER TABLE training_attendances MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'on_time'");
        }
    }
};

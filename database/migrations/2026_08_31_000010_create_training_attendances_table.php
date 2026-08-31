<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('training_attendances')) {
            Schema::create('training_attendances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('training_schedule_id')->nullable()->constrained('training_schedules')->onDelete('cascade');
                $table->foreignId('training_schedule_item_id')->nullable()->constrained('training_schedule_items')->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
                $table->string('user_type')->default('branch_manager'); // branch_manager, trainer
                $table->string('name');
                $table->string('branch_or_department')->nullable();
                $table->date('session_date');
                $table->string('status')->default('on_time'); // on_time, late, absent
                $table->text('notes')->nullable();
                $table->foreignId('recorded_by_user_id')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('training_attendances');
    }
};

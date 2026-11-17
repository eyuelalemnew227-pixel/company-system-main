<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evaluation_result_overrides', function (Blueprint $table) {
            $table->date('requested_training_date')->nullable()->after('training_type_id');
            $table->foreignId('requested_module_id')
                ->nullable()
                ->after('requested_training_date')
                ->constrained('recurring_training_modules')
                ->nullOnDelete();
            $table->text('request_extra_info')->nullable()->after('requested_module_id');
        });
    }

    public function down(): void
    {
        Schema::table('evaluation_result_overrides', function (Blueprint $table) {
            $table->dropConstrainedForeignId('requested_module_id');
            $table->dropColumn(['requested_training_date', 'request_extra_info']);
        });
    }
};

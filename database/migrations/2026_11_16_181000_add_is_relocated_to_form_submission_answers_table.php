<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('form_submission_answers', function (Blueprint $table) {
            if (!Schema::hasColumn('form_submission_answers', 'is_relocated')) {
                $table->boolean('is_relocated')->default(false)->after('value_boolean')->index();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_submission_answers', function (Blueprint $table) {
            if (Schema::hasColumn('form_submission_answers', 'is_relocated')) {
                $table->dropIndex(['is_relocated']);
                $table->dropColumn('is_relocated');
            }
        });
    }
};


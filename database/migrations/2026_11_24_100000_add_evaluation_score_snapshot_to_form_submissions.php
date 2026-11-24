<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_submissions', function (Blueprint $table) {
            if (! Schema::hasColumn('form_submissions', 'evaluation_score_snapshot')) {
                $table->json('evaluation_score_snapshot')->nullable()->after('status');
            }
            if (! Schema::hasColumn('form_submissions', 'evaluation_score_snapshot_at')) {
                $table->timestamp('evaluation_score_snapshot_at')->nullable()->after('evaluation_score_snapshot');
            }
        });
    }

    public function down(): void
    {
        Schema::table('form_submissions', function (Blueprint $table) {
            if (Schema::hasColumn('form_submissions', 'evaluation_score_snapshot_at')) {
                $table->dropColumn('evaluation_score_snapshot_at');
            }
            if (Schema::hasColumn('form_submissions', 'evaluation_score_snapshot')) {
                $table->dropColumn('evaluation_score_snapshot');
            }
        });
    }
};

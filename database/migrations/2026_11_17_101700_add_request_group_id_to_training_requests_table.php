<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('training_requests', 'request_group_id')) {
                $table->uuid('request_group_id')->nullable()->after('id');
                $table->index('request_group_id');
            }
        });

        $ids = DB::table('training_requests')
            ->whereNull('request_group_id')
            ->orderBy('id')
            ->pluck('id');

        foreach ($ids as $id) {
            DB::table('training_requests')
                ->where('id', $id)
                ->update(['request_group_id' => (string) Str::uuid()]);
        }
    }

    public function down(): void
    {
        Schema::table('training_requests', function (Blueprint $table) {
            if (Schema::hasColumn('training_requests', 'request_group_id')) {
                $table->dropIndex(['request_group_id']);
                $table->dropColumn('request_group_id');
            }
        });
    }
};

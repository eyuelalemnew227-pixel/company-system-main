<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_assets', function (Blueprint $table) {
            if (!Schema::hasColumn('ticket_assets', 'bar_code')) {
                $table->string('bar_code', 150)->nullable()->after('article_code');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ticket_assets', function (Blueprint $table) {
            if (Schema::hasColumn('ticket_assets', 'bar_code')) {
                $table->dropColumn('bar_code');
            }
        });
    }
};

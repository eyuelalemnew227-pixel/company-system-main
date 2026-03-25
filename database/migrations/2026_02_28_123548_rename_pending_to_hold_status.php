<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->renameColumn('pending_reason', 'hold_reason');
        });

        DB::table('tickets')->where('status', 'pending')->update(['status' => 'hold']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('tickets')->where('status', 'hold')->update(['status' => 'pending']);

        Schema::table('tickets', function (Blueprint $table) {
            $table->renameColumn('hold_reason', 'pending_reason');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update tickets table
        DB::table('tickets')
            ->where('status', 'assigned')
            ->update(['status' => 'not_started']);

        // Update ticket_status_history table
        DB::table('ticket_status_history')
            ->where('old_status', 'assigned')
            ->update(['old_status' => 'not_started']);

        DB::table('ticket_status_history')
            ->where('new_status', 'assigned')
            ->update(['new_status' => 'not_started']);

        // Update ticket_activity_logs table
        DB::table('ticket_activity_logs')
            ->where('old_status', 'assigned')
            ->update(['old_status' => 'not_started']);

        DB::table('ticket_activity_logs')
            ->where('new_status', 'assigned')
            ->update(['new_status' => 'not_started']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('tickets')
            ->where('status', 'not_started')
            ->update(['status' => 'assigned']);

        DB::table('ticket_status_history')
            ->where('old_status', 'not_started')
            ->update(['old_status' => 'assigned']);

        DB::table('ticket_status_history')
            ->where('new_status', 'not_started')
            ->update(['new_status' => 'assigned']);

        DB::table('ticket_activity_logs')
            ->where('old_status', 'not_started')
            ->update(['old_status' => 'assigned']);

        DB::table('ticket_activity_logs')
            ->where('new_status', 'not_started')
            ->update(['new_status' => 'assigned']);
    }
};

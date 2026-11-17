<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('td_kpi_assignments', function (Blueprint $table) {
            if (! Schema::hasColumn('td_kpi_assignments', 'proposed_training_start_at')) {
                $table->dateTime('proposed_training_start_at')->nullable()->after('assigned_training_content_id');
            }
            if (! Schema::hasColumn('td_kpi_assignments', 'proposed_training_end_at')) {
                $table->dateTime('proposed_training_end_at')->nullable()->after('proposed_training_start_at');
            }
            if (! Schema::hasColumn('td_kpi_assignments', 'actual_training_start_at')) {
                $table->dateTime('actual_training_start_at')->nullable()->after('proposed_training_end_at');
            }
            if (! Schema::hasColumn('td_kpi_assignments', 'actual_training_end_at')) {
                $table->dateTime('actual_training_end_at')->nullable()->after('actual_training_start_at');
            }
        });

        if (Schema::hasColumn('td_kpi_assignments', 'proposed_training_date')) {
            DB::statement('UPDATE td_kpi_assignments SET proposed_training_start_at = proposed_training_date, proposed_training_end_at = proposed_training_date WHERE proposed_training_date IS NOT NULL');
        }

        if (Schema::hasColumn('td_kpi_assignments', 'actual_training_at')) {
            DB::statement('UPDATE td_kpi_assignments SET actual_training_start_at = actual_training_at, actual_training_end_at = actual_training_at WHERE actual_training_at IS NOT NULL');
        }

        Schema::table('td_kpi_assignments', function (Blueprint $table) {
            if (Schema::hasColumn('td_kpi_assignments', 'actual_training_at')) {
                $table->dropColumn('actual_training_at');
            }
            if (Schema::hasColumn('td_kpi_assignments', 'proposed_training_date')) {
                $table->dropColumn('proposed_training_date');
            }
        });

        Schema::table('training_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('training_requests', 'first_proposed_start_at')) {
                $table->dateTime('first_proposed_start_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('training_requests', 'first_proposed_end_at')) {
                $table->dateTime('first_proposed_end_at')->nullable()->after('first_proposed_start_at');
            }
            if (! Schema::hasColumn('training_requests', 'current_proposed_start_at')) {
                $table->dateTime('current_proposed_start_at')->nullable()->after('first_proposed_end_at');
            }
            if (! Schema::hasColumn('training_requests', 'current_proposed_end_at')) {
                $table->dateTime('current_proposed_end_at')->nullable()->after('current_proposed_start_at');
            }
            if (! Schema::hasColumn('training_requests', 'coordinator_actual_start_at')) {
                $table->dateTime('coordinator_actual_start_at')->nullable()->after('current_proposed_end_at');
            }
            if (! Schema::hasColumn('training_requests', 'coordinator_actual_end_at')) {
                $table->dateTime('coordinator_actual_end_at')->nullable()->after('coordinator_actual_start_at');
            }
            if (! Schema::hasColumn('training_requests', 'requester_actual_start_at')) {
                $table->dateTime('requester_actual_start_at')->nullable()->after('actual_date_verdict');
            }
            if (! Schema::hasColumn('training_requests', 'requester_actual_end_at')) {
                $table->dateTime('requester_actual_end_at')->nullable()->after('requester_actual_start_at');
            }
        });

        DB::statement('UPDATE training_requests SET
            first_proposed_start_at = first_proposed_at,
            first_proposed_end_at = first_proposed_at,
            current_proposed_start_at = current_proposed_at,
            current_proposed_end_at = current_proposed_at,
            coordinator_actual_start_at = coordinator_actual_at,
            coordinator_actual_end_at = coordinator_actual_at,
            requester_actual_start_at = requester_actual_at,
            requester_actual_end_at = requester_actual_at
        ');

        Schema::table('training_requests', function (Blueprint $table) {
            foreach (['first_proposed_at', 'current_proposed_at', 'coordinator_actual_at', 'requester_actual_at'] as $column) {
                if (Schema::hasColumn('training_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('proposed_datetime_change_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('proposed_datetime_change_requests', 'current_proposed_start_at')) {
                $table->dateTime('current_proposed_start_at')->nullable()->after('assigned_training_content');
            }
            if (! Schema::hasColumn('proposed_datetime_change_requests', 'current_proposed_end_at')) {
                $table->dateTime('current_proposed_end_at')->nullable()->after('current_proposed_start_at');
            }
            if (! Schema::hasColumn('proposed_datetime_change_requests', 'requested_proposed_start_at')) {
                $table->dateTime('requested_proposed_start_at')->nullable()->after('current_proposed_end_at');
            }
            if (! Schema::hasColumn('proposed_datetime_change_requests', 'requested_proposed_end_at')) {
                $table->dateTime('requested_proposed_end_at')->nullable()->after('requested_proposed_start_at');
            }
        });

        DB::statement('UPDATE proposed_datetime_change_requests SET
            current_proposed_start_at = current_proposed_at,
            current_proposed_end_at = current_proposed_at,
            requested_proposed_start_at = requested_proposed_at,
            requested_proposed_end_at = requested_proposed_at
        ');

        Schema::table('proposed_datetime_change_requests', function (Blueprint $table) {
            foreach (['current_proposed_at', 'requested_proposed_at'] as $column) {
                if (Schema::hasColumn('proposed_datetime_change_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('proposed_datetime_change_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('proposed_datetime_change_requests', 'current_proposed_at')) {
                $table->dateTime('current_proposed_at')->nullable()->after('assigned_training_content');
            }
            if (! Schema::hasColumn('proposed_datetime_change_requests', 'requested_proposed_at')) {
                $table->dateTime('requested_proposed_at')->nullable()->after('current_proposed_at');
            }
        });

        DB::statement('UPDATE proposed_datetime_change_requests SET
            current_proposed_at = current_proposed_start_at,
            requested_proposed_at = requested_proposed_start_at
        ');

        Schema::table('proposed_datetime_change_requests', function (Blueprint $table) {
            foreach ([
                'current_proposed_start_at',
                'current_proposed_end_at',
                'requested_proposed_start_at',
                'requested_proposed_end_at',
            ] as $column) {
                if (Schema::hasColumn('proposed_datetime_change_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('training_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('training_requests', 'first_proposed_at')) {
                $table->dateTime('first_proposed_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('training_requests', 'current_proposed_at')) {
                $table->dateTime('current_proposed_at')->nullable()->after('first_proposed_at');
            }
            if (! Schema::hasColumn('training_requests', 'coordinator_actual_at')) {
                $table->dateTime('coordinator_actual_at')->nullable()->after('current_proposed_at');
            }
            if (! Schema::hasColumn('training_requests', 'requester_actual_at')) {
                $table->dateTime('requester_actual_at')->nullable()->after('actual_date_verdict');
            }
        });

        DB::statement('UPDATE training_requests SET
            first_proposed_at = first_proposed_start_at,
            current_proposed_at = current_proposed_start_at,
            coordinator_actual_at = coordinator_actual_start_at,
            requester_actual_at = requester_actual_start_at
        ');

        Schema::table('training_requests', function (Blueprint $table) {
            foreach ([
                'first_proposed_start_at',
                'first_proposed_end_at',
                'current_proposed_start_at',
                'current_proposed_end_at',
                'coordinator_actual_start_at',
                'coordinator_actual_end_at',
                'requester_actual_start_at',
                'requester_actual_end_at',
            ] as $column) {
                if (Schema::hasColumn('training_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('td_kpi_assignments', function (Blueprint $table) {
            if (! Schema::hasColumn('td_kpi_assignments', 'proposed_training_date')) {
                $table->dateTime('proposed_training_date')->nullable()->after('assigned_training_content_id');
            }
            if (! Schema::hasColumn('td_kpi_assignments', 'actual_training_at')) {
                $table->dateTime('actual_training_at')->nullable()->after('proposed_training_date');
            }
        });

        DB::statement('UPDATE td_kpi_assignments SET
            proposed_training_date = proposed_training_start_at,
            actual_training_at = actual_training_start_at
        ');

        Schema::table('td_kpi_assignments', function (Blueprint $table) {
            foreach ([
                'proposed_training_start_at',
                'proposed_training_end_at',
                'actual_training_start_at',
                'actual_training_end_at',
            ] as $column) {
                if (Schema::hasColumn('td_kpi_assignments', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

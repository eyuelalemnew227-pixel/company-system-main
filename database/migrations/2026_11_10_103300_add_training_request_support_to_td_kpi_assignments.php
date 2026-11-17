<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->dropForeignKeyIfExists('td_kpi_assignments', 'evaluation_result_override_id');

        DB::statement('ALTER TABLE td_kpi_assignments MODIFY evaluation_result_override_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE td_kpi_assignments MODIFY proposed_training_date DATETIME NULL');

        Schema::table('td_kpi_assignments', function (Blueprint $table) {
            if (! Schema::hasColumn('td_kpi_assignments', 'training_request_id')) {
                $table->foreignId('training_request_id')
                    ->nullable()
                    ->after('evaluation_result_override_id')
                    ->constrained('training_requests')
                    ->cascadeOnDelete();
            }

            if (! Schema::hasColumn('td_kpi_assignments', 'actual_training_at')) {
                $table->dateTime('actual_training_at')->nullable()->after('proposed_training_date');
            }
        });

        if (! $this->indexExists('td_kpi_assignments', 'td_kpi_assign_request_assessment_unique')) {
            Schema::table('td_kpi_assignments', function (Blueprint $table) {
                $table->unique(
                    ['training_request_id', 'assessment_id'],
                    'td_kpi_assign_request_assessment_unique'
                );
            });
        }

        if (! $this->foreignKeyExists('td_kpi_assignments', 'evaluation_result_override_id')) {
            Schema::table('td_kpi_assignments', function (Blueprint $table) {
                $table->foreign('evaluation_result_override_id')
                    ->references('id')
                    ->on('evaluation_result_overrides')
                    ->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        if ($this->indexExists('td_kpi_assignments', 'td_kpi_assign_request_assessment_unique')) {
            Schema::table('td_kpi_assignments', function (Blueprint $table) {
                $table->dropUnique('td_kpi_assign_request_assessment_unique');
            });
        }

        $this->dropForeignKeyIfExists('td_kpi_assignments', 'training_request_id');
        $this->dropForeignKeyIfExists('td_kpi_assignments', 'evaluation_result_override_id');

        Schema::table('td_kpi_assignments', function (Blueprint $table) {
            if (Schema::hasColumn('td_kpi_assignments', 'training_request_id')) {
                $table->dropColumn('training_request_id');
            }
            if (Schema::hasColumn('td_kpi_assignments', 'actual_training_at')) {
                $table->dropColumn('actual_training_at');
            }
        });

        DB::statement('ALTER TABLE td_kpi_assignments MODIFY proposed_training_date DATE NULL');
        DB::statement('ALTER TABLE td_kpi_assignments MODIFY evaluation_result_override_id BIGINT UNSIGNED NOT NULL');

        if (! $this->foreignKeyExists('td_kpi_assignments', 'evaluation_result_override_id')) {
            Schema::table('td_kpi_assignments', function (Blueprint $table) {
                $table->foreign('evaluation_result_override_id')
                    ->references('id')
                    ->on('evaluation_result_overrides')
                    ->cascadeOnDelete();
            });
        }
    }

    private function dropForeignKeyIfExists(string $table, string $column): void
    {
        $constraints = DB::select(
            'SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND COLUMN_NAME = ?
               AND REFERENCED_TABLE_NAME IS NOT NULL',
            [$table, $column]
        );

        foreach ($constraints as $constraint) {
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$constraint->CONSTRAINT_NAME}`");
        }
    }

    private function foreignKeyExists(string $table, string $column): bool
    {
        $constraints = DB::select(
            'SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND COLUMN_NAME = ?
               AND REFERENCED_TABLE_NAME IS NOT NULL',
            [$table, $column]
        );

        return $constraints !== [];
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $indexes = DB::select(
            'SELECT INDEX_NAME FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND INDEX_NAME = ?',
            [$table, $indexName]
        );

        return $indexes !== [];
    }
};

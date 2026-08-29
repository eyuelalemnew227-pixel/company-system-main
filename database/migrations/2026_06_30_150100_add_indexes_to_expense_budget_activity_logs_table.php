<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('expense_budget_activity_logs')) {
            return;
        }

        Schema::table('expense_budget_activity_logs', function (Blueprint $table) {
            if (! $this->indexExists('expense_budget_activity_logs', 'eb_activity_logs_budget_created_idx')) {
                $table->index(['expense_budget_id', 'created_at'], 'eb_activity_logs_budget_created_idx');
            }

            if (! $this->indexExists('expense_budget_activity_logs', 'eb_activity_logs_item_created_idx')) {
                $table->index(['expense_budget_item_id', 'created_at'], 'eb_activity_logs_item_created_idx');
            }

            if (! $this->indexExists('expense_budget_activity_logs', 'eb_activity_logs_user_created_idx')) {
                $table->index(['user_id', 'created_at'], 'eb_activity_logs_user_created_idx');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('expense_budget_activity_logs')) {
            return;
        }

        Schema::table('expense_budget_activity_logs', function (Blueprint $table) {
            $table->dropIndex('eb_activity_logs_budget_created_idx');
            $table->dropIndex('eb_activity_logs_item_created_idx');
            $table->dropIndex('eb_activity_logs_user_created_idx');
        });
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $connection = Schema::getConnection();
        if ($connection->getDriverName() === 'sqlite') {
            $indexes = $connection->select("PRAGMA index_list('{$table}')");
            foreach ($indexes as $index) {
                if (($index->name ?? null) === $indexName) {
                    return true;
                }
            }
            return false;
        }

        $database = $connection->getDatabaseName();

        $result = $connection->select(
            'SELECT 1 FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ? LIMIT 1',
            [$database, $table, $indexName],
        );

        return $result !== [];
    }
};

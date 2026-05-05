<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pre_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('pre_orders', 'first_name')) {
                $table->string('first_name')->nullable()->after('order_number');
            }
            if (!Schema::hasColumn('pre_orders', 'father_name')) {
                $table->string('father_name')->nullable()->after('first_name');
            }
            if (!Schema::hasColumn('pre_orders', 'surname')) {
                $table->string('surname')->nullable()->after('father_name');
            }
        });

        // Copy existing client_name data into first_name (only where first_name is still empty)
        if (Schema::hasColumn('pre_orders', 'client_name')) {
            DB::statement('UPDATE pre_orders SET first_name = client_name WHERE first_name IS NULL OR first_name = \'\'');
        }

        // Make first_name non-nullable
        Schema::table('pre_orders', function (Blueprint $table) {
            $table->string('first_name')->nullable(false)->change();
        });

        // Drop client_name if it still exists
        if (Schema::hasColumn('pre_orders', 'client_name')) {
            Schema::table('pre_orders', function (Blueprint $table) {
                $table->dropColumn('client_name');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasColumn('pre_orders', 'client_name')) {
            Schema::table('pre_orders', function (Blueprint $table) {
                $table->string('client_name')->nullable()->after('order_number');
            });

            // Restore client_name from concatenated name parts
            DB::statement("UPDATE pre_orders SET client_name = TRIM(CONCAT_WS(' ', first_name, father_name, surname))");

            Schema::table('pre_orders', function (Blueprint $table) {
                $table->string('client_name')->nullable(false)->change();
            });
        }

        Schema::table('pre_orders', function (Blueprint $table) {
            foreach (['first_name', 'father_name', 'surname'] as $col) {
                if (Schema::hasColumn('pre_orders', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

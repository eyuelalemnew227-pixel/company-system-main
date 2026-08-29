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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'signature_type')) {
                $table->string('signature_type', 20)->default('typed')->nullable()->after('remember_token');
            }
            if (!Schema::hasColumn('users', 'signature_data')) {
                $table->text('signature_data')->nullable()->after('signature_type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'signature_type')) {
                $table->dropColumn('signature_type');
            }
            if (Schema::hasColumn('users', 'signature_data')) {
                $table->dropColumn('signature_data');
            }
        });
    }
};

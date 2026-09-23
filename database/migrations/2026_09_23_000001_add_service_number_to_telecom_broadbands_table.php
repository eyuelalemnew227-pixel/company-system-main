<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('telecom_broadbands', function (Blueprint $table) {
            if (!Schema::hasColumn('telecom_broadbands', 'service_number')) {
                $table->string('service_number')->nullable()->after('account_number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('telecom_broadbands', function (Blueprint $table) {
            if (Schema::hasColumn('telecom_broadbands', 'service_number')) {
                $table->dropColumn('service_number');
            }
        });
    }
};

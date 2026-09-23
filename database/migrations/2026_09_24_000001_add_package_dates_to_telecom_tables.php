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
        Schema::table('telecom_phone_numbers', function (Blueprint $table) {
            if (!Schema::hasColumn('telecom_phone_numbers', 'package_start_date')) {
                $table->date('package_start_date')->nullable()->after('package_type');
            }
            if (!Schema::hasColumn('telecom_phone_numbers', 'package_expiry_date')) {
                $table->date('package_expiry_date')->nullable()->after('package_start_date');
            }
        });

        Schema::table('telecom_broadbands', function (Blueprint $table) {
            if (!Schema::hasColumn('telecom_broadbands', 'package_start_date')) {
                $table->date('package_start_date')->nullable()->after('package_type');
            }
            if (!Schema::hasColumn('telecom_broadbands', 'package_expiry_date')) {
                $table->date('package_expiry_date')->nullable()->after('package_start_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('telecom_phone_numbers', function (Blueprint $table) {
            $table->dropColumn(['package_start_date', 'package_expiry_date']);
        });

        Schema::table('telecom_broadbands', function (Blueprint $table) {
            $table->dropColumn(['package_start_date', 'package_expiry_date']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('beneficiary_branch_id')->nullable()->after('requestor_branch_id')->constrained('branches')->nullOnDelete();
            $table->foreignId('beneficiary_department_id')->nullable()->after('beneficiary_branch_id')->constrained('departments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['beneficiary_branch_id']);
            $table->dropForeign(['beneficiary_department_id']);
            $table->dropColumn(['beneficiary_branch_id', 'beneficiary_department_id']);
        });
    }
};

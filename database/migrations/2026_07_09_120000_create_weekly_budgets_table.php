<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();
            $table->foreignId('fiscal_month_id')->constrained('fiscal_months')->cascadeOnDelete();
            $table->unsignedTinyInteger('week_number'); // fiscal week number, calculated from fiscal year start date (e.g. July 7), not ISO/Gregorian week
            $table->date('week_start_date');             // start date of the fiscal week
            $table->date('week_end_date');               // end date of the fiscal week
            $table->enum('request_type', ['urgent', 'normal'])->default('normal');
            $table->enum('status_finance', ['pending', 'approved', 'rejected', 'paid', 'on-hold'])->default('pending');
            $table->enum('status_department', ['pending', 'approved', 'rejected', 'on-hold'])->default('pending');
            $table->enum('status_ceo', ['pending', 'approved', 'rejected', 'on-hold'])->default('pending');
            $table->decimal('amount', 15, 2);
            $table->text('description')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['request_type', 'status_finance', 'status_ceo']);
            $table->index(['department_id', 'branch_id']);
            $table->index(['fiscal_year_id', 'fiscal_month_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_budgets');
    }
};
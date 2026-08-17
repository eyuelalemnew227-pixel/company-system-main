<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bank_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years');
            $table->foreignId('fiscal_month_id')->constrained('fiscal_months');
            $table->integer('week_number');
            $table->foreignId('bank_id')->constrained('banks');
            $table->foreignId('bank_branch_id')->constrained('bank_branches');
            $table->decimal('amount', 15, 2);
            $table->string('currency')->default('ETB');
            $table->decimal('exchange_rate', 10, 4)->default(1.0000);
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_balances');
    }
};

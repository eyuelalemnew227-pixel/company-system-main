<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Service Providers (Ethio Telecom, Safaricom, etc.)
        Schema::create('telecom_providers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('support_contact')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Phone Numbers / SIM Cards / Landlines
        Schema::create('telecom_phone_numbers', function (Blueprint $table) {
            $table->id();
            $table->string('phone_number')->unique();
            $table->string('account_number')->nullable();
            $table->string('sim_card_number')->nullable();
            $table->foreignId('telecom_provider_id')->nullable()->constrained('telecom_providers')->nullOnDelete();
            $table->string('service_type')->default('Mobile Voice'); // Mobile Voice, Mobile Data, Fixed Line, CUG, Shortcode
            $table->string('package_type')->nullable(); // Postpaid Enterprise, Flexi 15GB, etc.
            $table->decimal('monthly_cost', 12, 2)->default(0.00);
            $table->string('billing_type')->default('Postpaid'); // Postpaid, Prepaid
            $table->string('assigned_type')->default('Unassigned'); // Employee, Branch, Department, Pool, Unassigned
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('status')->default('Active'); // Active, Suspended, Inactive, Cancelled
            $table->date('issue_date')->nullable();
            $table->date('renewal_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Broadband & WTTx Connections
        Schema::create('telecom_broadbands', function (Blueprint $table) {
            $table->id();
            $table->string('account_number')->nullable(); // Account or Circuit ID
            $table->string('connection_name'); // e.g. Head Office WTTx, Bole Branch Fiber
            $table->string('connection_type')->default('WTTx (Fixed Wireless)'); // WTTx, Fiber, Broadband ADSL, Leased Line, Satellite
            $table->foreignId('telecom_provider_id')->nullable()->constrained('telecom_providers')->nullOnDelete();
            $table->string('package_type')->nullable(); // e.g. Business Fiber 50Mbps, WTTx Unlimited 20Mbps
            $table->string('bandwidth_speed')->nullable(); // e.g. 20 Mbps, 50 Mbps, 100 Mbps
            $table->decimal('monthly_cost', 12, 2)->default(0.00);
            $table->string('billing_type')->default('Postpaid'); // Postpaid, Prepaid
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('installation_address')->nullable();
            $table->string('ip_address')->nullable(); // Static IP / Router IP
            $table->text('equipment_details')->nullable(); // Router / Modem Serial & model
            $table->date('contract_start_date')->nullable();
            $table->date('contract_expiry_date')->nullable();
            $table->string('status')->default('Active'); // Active, Suspended, Inactive, Pending Installation
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telecom_broadbands');
        Schema::dropIfExists('telecom_phone_numbers');
        Schema::dropIfExists('telecom_providers');
    }
};

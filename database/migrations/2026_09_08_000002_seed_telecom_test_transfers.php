<?php

use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\TelecomBroadband;
use App\Models\TelecomPhoneNumber;
use App\Models\TelecomProvider;
use App\Models\TelecomTransfer;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        // 1. Ensure at least one telecom provider exists
        $provider = TelecomProvider::firstOrCreate(
            ['name' => 'Ethio Telecom'],
            ['code' => 'ETC', 'contact_phone' => '994', 'support_email' => 'support@ethiotelecom.et', 'is_active' => true]
        );

        $branch = Branch::first();
        $department = Department::first();
        $employee = Employee::first();

        // 2. Seed Test SIM Cards & Phone Lines
        $sim1 = TelecomPhoneNumber::firstOrCreate(
            ['phone_number' => '+251911002233'],
            [
                'account_number' => 'ACC-911002233',
                'sim_card_number' => '8925101000123456789',
                'telecom_provider_id' => $provider->id,
                'service_type' => 'Voice & Data SIM',
                'package_type' => 'Corporate Executive Plan (50GB + Unlimited Voice)',
                'monthly_cost' => 1250.00,
                'billing_type' => 'Postpaid',
                'assigned_type' => $employee ? 'Employee' : ($branch ? 'Branch' : 'Unassigned'),
                'employee_id' => $employee?->id,
                'branch_id' => $branch?->id,
                'status' => 'Active',
                'notes' => 'Test Executive SIM Card for Transfer Testing',
            ]
        );

        $sim2 = TelecomPhoneNumber::firstOrCreate(
            ['phone_number' => '+251922114455'],
            [
                'account_number' => 'ACC-922114455',
                'sim_card_number' => '8925101000987654321',
                'telecom_provider_id' => $provider->id,
                'service_type' => 'Broadband SIM / Voucher',
                'package_type' => 'Monthly Unlimited Data Voucher',
                'monthly_cost' => 850.00,
                'billing_type' => 'Prepaid',
                'assigned_type' => $branch ? 'Branch' : 'Unassigned',
                'branch_id' => $branch?->id,
                'status' => 'Active',
                'notes' => 'Test SIM Card & Broadband Voucher Code',
            ]
        );

        // 3. Seed Test Broadband Connections & Vouchers
        $bb1 = TelecomBroadband::firstOrCreate(
            ['connection_name' => 'HQ Main Fiber Connection'],
            [
                'account_number' => 'CIR-55443321',
                'connection_type' => 'Fiber Optic Broadband',
                'telecom_provider_id' => $provider->id,
                'package_type' => 'Dedicated Enterprise 100Mbps',
                'bandwidth_speed' => '100 Mbps',
                'monthly_cost' => 15000.00,
                'billing_type' => 'Postpaid',
                'branch_id' => $branch?->id,
                'department_id' => $department?->id,
                'status' => 'Active',
                'notes' => 'Primary High-Speed Enterprise Circuit',
            ]
        );

        $bb2 = TelecomBroadband::firstOrCreate(
            ['connection_name' => 'Kaldis Branch Broadband Voucher #102'],
            [
                'account_number' => 'VCH-ETHIO-2026-991',
                'connection_type' => 'Broadband Voucher / Code',
                'telecom_provider_id' => $provider->id,
                'package_type' => 'Monthly WTTx Voucher 500GB',
                'bandwidth_speed' => '50 Mbps',
                'monthly_cost' => 3500.00,
                'billing_type' => 'Prepaid',
                'branch_id' => $branch?->id,
                'status' => 'Active',
                'notes' => 'Branch Backup Broadband Voucher',
            ]
        );

        // 4. Create initial sample transfer record
        TelecomTransfer::firstOrCreate(
            ['reference_number' => $sim1->phone_number . ' (SIM: ' . $sim1->sim_card_number . ')'],
            [
                'telecom_type' => 'phone',
                'item_id' => $sim1->id,
                'to_employee_id' => $employee?->id,
                'to_branch_id' => $branch?->id,
                'to_department_id' => $department?->id,
                'transfer_reason' => 'Initial test transfer to establish baseline record.',
                'transferred_by' => 1,
            ]
        );

        TelecomTransfer::firstOrCreate(
            ['reference_number' => $bb2->connection_name . ' (Account: ' . $bb2->account_number . ')'],
            [
                'telecom_type' => 'broadband',
                'item_id' => $bb2->id,
                'to_branch_id' => $branch?->id,
                'to_department_id' => $department?->id,
                'transfer_reason' => 'Broadband Voucher transferred to branch for regional backup.',
                'transferred_by' => 1,
            ]
        );
    }

    public function down(): void
    {
        // No destruct action needed
    }
};

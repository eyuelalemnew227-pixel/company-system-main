<?php

use App\Models\Department;
use App\Models\TicketMainCategory;
use App\Models\TicketSubCategory;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add ticket_id to telegram_groups table
        if (Schema::hasTable('telegram_groups') && !Schema::hasColumn('telegram_groups', 'ticket_id')) {
            Schema::table('telegram_groups', function (Blueprint $table) {
                $table->foreignId('ticket_id')
                    ->nullable()
                    ->after('notes')
                    ->constrained('tickets')
                    ->nullOnDelete();
            });
        }

        // 2. Find IT department
        $itDept = Department::where('name', 'IT')
            ->orWhere('id', 127)
            ->first();

        if ($itDept) {
            // Create or retrieve main category under IT
            $mainCategory = TicketMainCategory::firstOrCreate(
                [
                    'department_id' => $itDept->id,
                    'name'          => 'Telecom & Communication',
                ],
                [
                    'is_active' => true,
                ]
            );

            // Create or retrieve subcategory
            TicketSubCategory::firstOrCreate(
                [
                    'ticket_main_category_id' => $mainCategory->id,
                    'name'                    => 'Telegram Group Request',
                ],
                [
                    'is_active' => true,
                ]
            );
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('telegram_groups') && Schema::hasColumn('telegram_groups', 'ticket_id')) {
            Schema::table('telegram_groups', function (Blueprint $table) {
                $table->dropForeign(['ticket_id']);
                $table->dropColumn('ticket_id');
            });
        }
    }
};

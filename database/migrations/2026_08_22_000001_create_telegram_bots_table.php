<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add Memo Bot credentials to telegram_settings if missing
        Schema::table('telegram_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('telegram_settings', 'memo_bot_token')) {
                $table->string('memo_bot_token')->nullable()->after('budget_bot_username');
            }
            if (!Schema::hasColumn('telegram_settings', 'memo_bot_username')) {
                $table->string('memo_bot_username')->nullable()->after('memo_bot_token');
            }
        });

        // 2. Create telegram_bots table for dynamic bot creation
        if (!Schema::hasTable('telegram_bots')) {
            Schema::create('telegram_bots', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->string('bot_token')->nullable();
                $table->string('bot_username')->nullable();
                $table->string('webhook_url')->nullable();
                $table->boolean('is_active')->default(true);
                $table->text('description')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });

            // Seed default system bots
            $now = now();
            DB::table('telegram_bots')->insert([
                [
                    'name' => 'Helpdesk & Ticketing Bot',
                    'slug' => 'helpdesk',
                    'bot_token' => env('TELEGRAM_HELPDESK_BOT_TOKEN', env('TELEGRAM_BOT_TOKEN')),
                    'bot_username' => null,
                    'webhook_url' => null,
                    'is_active' => true,
                    'description' => 'Dedicated bot for customer & internal IT support ticketing system.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'name' => 'Budget System Bot',
                    'slug' => 'budget',
                    'bot_token' => env('TELEGRAM_BUDGET_BOT_TOKEN'),
                    'bot_username' => null,
                    'webhook_url' => null,
                    'is_active' => true,
                    'description' => 'Dedicated bot for weekly budget requests, approvals, and disbursement alerts.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'name' => 'Internal Memorandum Bot',
                    'slug' => 'memo',
                    'bot_token' => env('TELEGRAM_MEMO_BOT_TOKEN'),
                    'bot_username' => null,
                    'webhook_url' => null,
                    'is_active' => true,
                    'description' => 'Dedicated bot for internal company memorandums and official document dispatches.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('telegram_bots');

        Schema::table('telegram_settings', function (Blueprint $table) {
            if (Schema::hasColumn('telegram_settings', 'memo_bot_username')) {
                $table->dropColumn('memo_bot_username');
            }
            if (Schema::hasColumn('telegram_settings', 'memo_bot_token')) {
                $table->dropColumn('memo_bot_token');
            }
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('telegram_users') || !Schema::hasTable('telegram_customers')) {
            return;
        }

        $now = now()->toDateTimeString();

        DB::table('telegram_users')->orderBy('id')->chunk(200, function ($users) use ($now) {
            foreach ($users as $user) {
                if (empty($user->chat_id)) {
                    continue;
                }

                $existing = DB::table('telegram_customers')
                    ->where('chat_id', (string) $user->chat_id)
                    ->first();

                if (!$existing) {
                    DB::table('telegram_customers')->insert([
                        'chat_id' => (string) $user->chat_id,
                        'username' => $user->username ?: null,
                        'first_name' => $user->first_name ?: null,
                        'last_name' => $user->last_name ?: null,
                        'phone_number' => $user->phone_number ?: null,
                        'language' => $user->language ?: 'en',
                        'state' => $user->state ?: 'idle',
                        'created_at' => $user->created_at ?: $now,
                        'updated_at' => $now,
                    ]);
                } else {
                    $updates = [];
                    if (empty($existing->username) && !empty($user->username)) {
                        $updates['username'] = $user->username;
                    }
                    if (empty($existing->first_name) && !empty($user->first_name)) {
                        $updates['first_name'] = $user->first_name;
                    }
                    if (empty($existing->last_name) && !empty($user->last_name)) {
                        $updates['last_name'] = $user->last_name;
                    }
                    if (empty($existing->phone_number) && !empty($user->phone_number)) {
                        $updates['phone_number'] = $user->phone_number;
                    }
                    if (!empty($updates)) {
                        $updates['updated_at'] = $now;
                        DB::table('telegram_customers')
                            ->where('id', $existing->id)
                            ->update($updates);
                    }
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Data copy migration - no structural rollback needed
    }
};

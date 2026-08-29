<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The original `settings` migration's `group` enum omits `security`, which
 * both the seeded settings and the Settings UI need. doctrine/dbal isn't
 * installed, so the enum can't be widened via ->change() — rebuild the table
 * instead (it's still empty at this point in the migration history).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings_new', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->enum('group', ['general', 'branding', 'telegram', 'email', 'gamification', 'security']);
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->enum('type', ['text', 'boolean', 'number', 'json'])->default('text');
            $table->foreignUlid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('updated_at')->useCurrent();
        });

        DB::statement('INSERT INTO settings_new SELECT * FROM settings');

        Schema::drop('settings');
        Schema::rename('settings_new', 'settings');
    }

    public function down(): void
    {
        Schema::create('settings_old', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->enum('group', ['general', 'branding', 'telegram', 'email', 'gamification']);
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->enum('type', ['text', 'boolean', 'number', 'json'])->default('text');
            $table->foreignUlid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('updated_at')->useCurrent();
        });

        DB::statement("INSERT INTO settings_old SELECT * FROM settings WHERE `group` != 'security'");

        Schema::drop('settings');
        Schema::rename('settings_old', 'settings');
    }
};

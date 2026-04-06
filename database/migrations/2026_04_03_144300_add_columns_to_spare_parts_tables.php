<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Add columns to spare_part_categories
        Schema::table('spare_part_categories', function (Blueprint $table) {
            if (!Schema::hasColumn('spare_part_categories', 'name')) {
                $table->string('name')->after('id');
            }
        });

        // Add columns to spare_parts
        Schema::table('spare_parts', function (Blueprint $table) {
            if (!Schema::hasColumn('spare_parts', 'article_code')) {
                $table->string('article_code')->nullable()->after('id');
            }
            if (!Schema::hasColumn('spare_parts', 'name')) {
                $table->string('name')->after('article_code');
            }
            if (!Schema::hasColumn('spare_parts', 'description')) {
                $table->text('description')->nullable()->after('name');
            }
            if (!Schema::hasColumn('spare_parts', 'spare_part_category_id')) {
                $table->foreignId('spare_part_category_id')->after('description')->constrained()->cascadeOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('spare_parts', function (Blueprint $table) {
            $table->dropForeign(['spare_part_category_id']);
            $table->dropColumn(['article_code', 'name', 'description', 'spare_part_category_id']);
        });

        Schema::table('spare_part_categories', function (Blueprint $table) {
            $table->dropColumn(['name']);
        });
    }
};

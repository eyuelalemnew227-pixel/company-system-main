<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('form_submissions', function (Blueprint $table) {
            if (!Schema::hasColumn('form_submissions', 'is_qa_manager')) {
                $table->boolean('is_qa_manager')->default(false)->after('user_id')->index();
            }
            if (!Schema::hasColumn('form_submissions', 'qa_manager_id')) {
                $table->foreignId('qa_manager_id')->nullable()->after('is_qa_manager')->constrained('users')->nullOnDelete();
            }
        });

        // Register the QA Manager submission permission
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $perm = Permission::firstOrCreate([
            'name' => 'submit form as qa manager',
            'guard_name' => 'web',
        ]);

        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin && !$superAdmin->hasPermissionTo($perm)) {
            $superAdmin->givePermissionTo($perm);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_submissions', function (Blueprint $table) {
            if (Schema::hasColumn('form_submissions', 'qa_manager_id')) {
                $table->dropForeign(['qa_manager_id']);
                $table->dropColumn('qa_manager_id');
            }
            if (Schema::hasColumn('form_submissions', 'is_qa_manager')) {
                $table->dropIndex(['is_qa_manager']);
                $table->dropColumn('is_qa_manager');
            }
        });

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        Permission::where('name', 'submit form as qa manager')->delete();
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};


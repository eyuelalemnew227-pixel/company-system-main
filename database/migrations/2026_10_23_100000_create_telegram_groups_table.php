<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telegram_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');                                      // Group Display Name
            $table->string('chat_id')->unique()->nullable();             // Telegram Chat ID (set when bot joins)
            $table->string('username')->nullable();                      // @username for public groups
            $table->string('group_type')->default('Group');              // Group, Supergroup, Channel
            $table->string('category')->nullable();                      // Operations, HR, IT, Marketing, Branch, etc.
            $table->string('purpose')->nullable();                       // Short description of the group purpose
            $table->text('description')->nullable();                     // Detailed description
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('managed_by')->nullable();                    // Person / team responsible
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('Active');                 // Active, Inactive, Archived
            $table->string('invite_link')->nullable();                   // Telegram invite link
            $table->string('qr_code_path')->nullable();                  // Path to stored QR code image
            $table->boolean('is_public')->default(false);               // Public or Private
            $table->integer('member_count')->nullable();                 // Last known member count
            $table->timestamp('link_generated_at')->nullable();          // When invite link was last generated
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Permissions migration inline
        $permissions = [
            'telecom.telegram_groups.view',
            'telecom.telegram_groups.create',
            'telecom.telegram_groups.update',
            'telecom.telegram_groups.delete',
            'telecom.telegram_groups.manage_links',
        ];

        foreach ($permissions as $perm) {
            if (!\Spatie\Permission\Models\Permission::where('name', $perm)->exists()) {
                \Spatie\Permission\Models\Permission::create(['name' => $perm, 'guard_name' => 'web']);
            }
        }

        // Assign to Super Admin
        $superAdmin = \Spatie\Permission\Models\Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            foreach ($permissions as $perm) {
                $p = \Spatie\Permission\Models\Permission::where('name', $perm)->first();
                if ($p && !$superAdmin->hasPermissionTo($p)) {
                    $superAdmin->givePermissionTo($p);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_groups');
    }
};

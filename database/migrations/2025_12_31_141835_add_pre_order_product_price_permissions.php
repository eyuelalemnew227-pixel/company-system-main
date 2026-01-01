<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        \Spatie\Permission\Models\Permission::create(['name' => 'update pre-order product regular price']);
        \Spatie\Permission\Models\Permission::create(['name' => 'update pre-order product walkin price']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \Spatie\Permission\Models\Permission::whereIn('name', [
            'update pre-order product regular price',
            'update pre-order product walkin price'
        ])->delete();
    }
};

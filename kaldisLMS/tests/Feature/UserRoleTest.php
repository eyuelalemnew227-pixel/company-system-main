<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('admin can create a user with an employee profile', function () {
    $admin = makeEmployeeUser('admin');
    $employeeRole = Role::where('slug', 'employee')->firstOrFail();

    $response = $this->actingAs($admin)->post('/users', [
        'name' => 'New Hire', 'email' => 'newhire@kaldis.et', 'password' => 'password123',
        'role_id' => $employeeRole->id, 'employee_number' => 'KC-9001', 'position' => 'Barista',
    ]);

    $response->assertSessionHasNoErrors();
    $user = User::where('email', 'newhire@kaldis.et')->firstOrFail();
    expect($user->role_id)->toBe($employeeRole->id);
    expect($user->employee->employee_number)->toBe('KC-9001');
});

test('employee cannot access the users admin page', function () {
    $employee = makeEmployeeUser('employee');

    $this->actingAs($employee)->get('/users')->assertForbidden();
});

test('a user cannot deactivate their own account', function () {
    $admin = makeEmployeeUser('admin');

    $this->actingAs($admin)->delete("/users/{$admin->id}")->assertStatus(400);
});

test('deactivating a user suspends both the account and employee record', function () {
    $admin = makeEmployeeUser('admin');
    $target = makeEmployeeUser('employee');

    $this->actingAs($admin)->delete("/users/{$target->id}")->assertSessionHasNoErrors();

    expect($target->fresh()->status)->toBe('suspended');
    expect($target->employee->fresh()->status)->toBe('suspended');
});

test('admin role permissions cannot be modified since it has wildcard access', function () {
    $admin = makeEmployeeUser('admin');
    $adminRole = Role::where('slug', 'admin')->firstOrFail();

    $this->actingAs($admin)->put("/roles/{$adminRole->id}/permissions", [
        'permission_slug' => 'user.view', 'granted' => false,
    ])->assertForbidden();
});

test('granting a permission to a custom role takes effect immediately', function () {
    $admin = makeEmployeeUser('admin');
    $coordinatorRole = Role::where('slug', 'coordinator')->firstOrFail();
    $permSlug = 'badge.manage';

    expect($coordinatorRole->fresh()->permissions()->where('slug', $permSlug)->exists())->toBeFalse();

    $this->actingAs($admin)->put("/roles/{$coordinatorRole->id}/permissions", [
        'permission_slug' => $permSlug, 'granted' => true,
    ])->assertSessionHasNoErrors();

    expect($coordinatorRole->fresh()->permissions()->where('slug', $permSlug)->exists())->toBeTrue();

    $coordinator = User::factory()->create(['role_id' => $coordinatorRole->id]);
    expect($coordinator->hasPermission($permSlug))->toBeTrue();
});

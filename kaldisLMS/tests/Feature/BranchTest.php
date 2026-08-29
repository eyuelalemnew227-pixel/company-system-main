<?php

use App\Models\Branch;
use App\Models\Department;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('coordinator can create a branch', function () {
    $coordinator = makeEmployeeUser('coordinator');

    $response = $this->actingAs($coordinator)->post('/branches', [
        'name' => 'Hawassa Branch', 'code' => 'hawassa', 'city' => 'Hawassa',
    ]);

    $response->assertSessionHasNoErrors();
    $branch = Branch::where('name', 'Hawassa Branch')->firstOrFail();
    expect($branch->code)->toBe('HAWASSA');
});

test('duplicate branch code is rejected', function () {
    $coordinator = makeEmployeeUser('coordinator');
    Branch::create(['name' => 'Existing', 'code' => 'EXIST']);

    $this->actingAs($coordinator)->post('/branches', ['name' => 'New Branch', 'code' => 'exist'])
        ->assertStatus(422);
});

test('employee cannot manage branches', function () {
    $employee = makeEmployeeUser('employee');

    $this->actingAs($employee)->post('/branches', ['name' => 'X', 'code' => 'X'])->assertForbidden();
});

test('a department can be added under a branch', function () {
    $coordinator = makeEmployeeUser('coordinator');
    $branch = Branch::create(['name' => 'Piazza', 'code' => 'PIAZZA']);

    $response = $this->actingAs($coordinator)->post("/branches/{$branch->id}/departments", [
        'name' => 'Kitchen', 'code' => 'kit',
    ]);

    $response->assertSessionHasNoErrors();
    $dept = Department::where('branch_id', $branch->id)->firstOrFail();
    expect($dept->code)->toBe('KIT');
});

test('branches index shows nested department employee counts', function () {
    $coordinator = makeEmployeeUser('coordinator');
    $branch = Branch::create(['name' => 'Bole', 'code' => 'BOLE']);
    $dept = Department::create(['branch_id' => $branch->id, 'name' => 'Ops', 'code' => 'OPS']);
    makeEmployeeUser('employee')->employee->update(['branch_id' => $branch->id, 'department_id' => $dept->id]);

    $response = $this->actingAs($coordinator)->get('/branches');

    $response->assertInertia(fn ($page) => $page
        ->where('branches.0.departments.0.employeeCount', 1));
});

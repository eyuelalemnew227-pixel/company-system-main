<?php

use App\Models\Badge;
use App\Models\Branch;
use App\Models\Employee;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('company leaderboard ranks employees by total points descending', function () {
    $viewer = makeEmployeeUser('employee');
    $top = makeEmployeeUser('employee');
    $top->employee->update(['total_points' => 500]);
    $viewer->employee->update(['total_points' => 50]);

    $response = $this->actingAs($viewer)->get('/leaderboard?scope=company');

    $response->assertInertia(function ($page) use ($top) {
        $entries = $page->toArray()['props']['entries'];
        expect($entries[0]['employeeId'])->toBe($top->employee->id);
        expect($entries[0]['points'])->toBe(500);
    });
});

test('branch scope filters to only employees in the same branch', function () {
    $branchA = Branch::create(['name' => 'Branch A', 'code' => 'BR-A']);
    $branchB = Branch::create(['name' => 'Branch B', 'code' => 'BR-B']);

    $me = makeEmployeeUser('employee');
    $me->employee->update(['branch_id' => $branchA->id, 'total_points' => 20]);

    $sameBranch = makeEmployeeUser('employee');
    $sameBranch->employee->update(['branch_id' => $branchA->id, 'total_points' => 30]);

    $otherBranch = makeEmployeeUser('employee');
    $otherBranch->employee->update(['branch_id' => $branchB->id, 'total_points' => 999]);

    $response = $this->actingAs($me)->get('/leaderboard?scope=branch');

    $response->assertInertia(function ($page) use ($otherBranch) {
        $entries = collect($page->toArray()['props']['entries']);
        expect($entries->pluck('employeeId'))->not->toContain($otherBranch->employee->id);
    });
});

test('badge.manage permission is required to create a badge', function () {
    $employee = makeEmployeeUser('employee');

    $this->actingAs($employee)->post('/badges', [
        'name' => 'Test Badge', 'description' => 'desc', 'criteria_type' => 'courses_count',
    ])->assertForbidden();

    $manager = makeEmployeeUser('training_manager');
    $this->actingAs($manager)->post('/badges', [
        'name' => 'Test Badge', 'description' => 'desc', 'criteria_type' => 'courses_count', 'criteria_value' => 3, 'points' => 25,
    ])->assertSessionHasNoErrors();

    expect(Badge::where('name', 'Test Badge')->exists())->toBeTrue();
});

test('badge progress reflects completed courses for the courses_count criteria', function () {
    Badge::create(['name' => 'Bookworm', 'description' => 'desc', 'icon' => '📚', 'criteria_type' => 'courses_count', 'criteria_value' => 5, 'points' => 50]);
    $employee = makeEmployeeUser('employee');

    $response = $this->actingAs($employee)->get('/badges');

    $response->assertInertia(fn ($page) => $page->where('badges.0.progress.target', 5)->where('badges.0.earned', false));
});

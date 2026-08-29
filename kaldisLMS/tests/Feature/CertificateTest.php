<?php

use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('issuing pending certificates creates one per completed enrollment without a certificate', function () {
    $manager = makeEmployeeUser('training_manager');
    $employee = makeEmployeeUser('employee');
    $course = Course::create(['title' => 'Cert Course', 'slug' => 'cert-course', 'description' => '', 'difficulty' => 'beginner', 'status' => 'published']);
    $enrollment = Enrollment::create(['course_id' => $course->id, 'employee_id' => $employee->employee->id, 'status' => 'completed', 'completion_date' => now()]);

    $response = $this->actingAs($manager)->post('/certificates/issue-pending');

    $response->assertSessionHasNoErrors();
    $cert = Certificate::where('enrollment_id', $enrollment->id)->first();
    expect($cert)->not->toBeNull();
    expect($cert->certificate_number)->toStartWith('KA-'.now()->year.'-');
});

test('a valid certificate can be verified publicly by number', function () {
    $admin = makeEmployeeUser('admin');
    $employee = makeEmployeeUser('employee');
    $course = Course::create(['title' => 'Verify Course', 'slug' => 'verify-course', 'description' => '', 'difficulty' => 'beginner', 'status' => 'published']);
    Certificate::create([
        'employee_id' => $employee->employee->id, 'course_id' => $course->id,
        'certificate_number' => 'KA-2026-TEST01', 'issue_date' => now(), 'is_revoked' => false,
    ]);

    $response = $this->actingAs($admin)->getJson('/certificates/verify/lookup?number=KA-2026-TEST01');

    $response->assertOk();
    $response->assertJsonPath('status', 'valid');
    $response->assertJsonPath('certificate.number', 'KA-2026-TEST01');
});

test('a revoked certificate reports revoked status with reason', function () {
    $manager = makeEmployeeUser('training_manager');
    $employee = makeEmployeeUser('employee');
    $course = Course::create(['title' => 'Revoke Course', 'slug' => 'revoke-course', 'description' => '', 'difficulty' => 'beginner', 'status' => 'published']);
    $cert = Certificate::create([
        'employee_id' => $employee->employee->id, 'course_id' => $course->id,
        'certificate_number' => 'KA-2026-REV001', 'issue_date' => now(), 'is_revoked' => false,
    ]);

    $this->actingAs($manager)->post("/certificates/{$cert->id}/revoke", ['reason' => 'Issued in error'])
        ->assertSessionHasNoErrors();

    expect($cert->fresh()->is_revoked)->toBeTrue();

    $response = $this->actingAs($employee)->getJson('/certificates/verify/lookup?number=KA-2026-REV001');
    $response->assertJsonPath('status', 'revoked');
    $response->assertJsonPath('certificate.revokedReason', 'Issued in error');
});

test('employee only sees their own certificates', function () {
    $employeeA = makeEmployeeUser('employee');
    $employeeB = makeEmployeeUser('employee');
    $course = Course::create(['title' => 'Own Cert Course', 'slug' => 'own-cert-course', 'description' => '', 'difficulty' => 'beginner', 'status' => 'published']);
    Certificate::create(['employee_id' => $employeeA->employee->id, 'course_id' => $course->id, 'certificate_number' => 'KA-2026-A1', 'issue_date' => now(), 'is_revoked' => false]);
    Certificate::create(['employee_id' => $employeeB->employee->id, 'course_id' => $course->id, 'certificate_number' => 'KA-2026-B1', 'issue_date' => now(), 'is_revoked' => false]);

    $response = $this->actingAs($employeeA)->get('/certificates');

    $response->assertInertia(fn ($page) => $page->has('certificates', 1)->where('certificates.0.certificateNumber', 'KA-2026-A1'));
});

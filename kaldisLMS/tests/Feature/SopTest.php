<?php

use App\Models\SopAcknowledgement;
use App\Models\SopDocument;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    Storage::fake('public');
});

test('coordinator can create an SOP with a file attachment', function () {
    $coordinator = makeEmployeeUser('coordinator');
    $file = UploadedFile::fake()->create('policy.pdf', 500, 'application/pdf');

    $response = $this->actingAs($coordinator)->post('/sop', [
        'title' => 'Cash Handling Policy', 'version' => '1.0', 'category' => 'Cash Handling',
        'content' => 'Count the drawer twice daily.', 'requires_acknowledgement' => true, 'file' => $file,
    ]);

    $response->assertSessionHasNoErrors();
    $sop = SopDocument::where('title', 'Cash Handling Policy')->firstOrFail();
    expect($sop->file_path)->not->toBeNull();
    Storage::disk('public')->assertExists($sop->file_path);
});

test('employee cannot create an SOP', function () {
    $employee = makeEmployeeUser('employee');

    $this->actingAs($employee)->post('/sop', [
        'title' => 'Should fail', 'version' => '1.0', 'category' => 'Operations',
    ])->assertForbidden();
});

test('employee can acknowledge an SOP with a digital signature', function () {
    $employee = makeEmployeeUser('employee');
    $sop = SopDocument::create(['title' => 'Hygiene SOP', 'version' => '1.0', 'category' => 'Hygiene', 'status' => 'active', 'requires_acknowledgement' => true]);

    $response = $this->actingAs($employee)->post("/sop/{$sop->id}/acknowledge", ['digital_signature' => $employee->name]);

    $response->assertSessionHasNoErrors();
    $ack = SopAcknowledgement::where('sop_id', $sop->id)->where('employee_id', $employee->employee->id)->first();
    expect($ack)->not->toBeNull();
    expect($ack->digital_signature)->toBe($employee->name);
});

test('acknowledging twice does not create duplicate records', function () {
    $employee = makeEmployeeUser('employee');
    $sop = SopDocument::create(['title' => 'Safety SOP', 'version' => '1.0', 'category' => 'Safety', 'status' => 'active', 'requires_acknowledgement' => true]);

    $this->actingAs($employee)->post("/sop/{$sop->id}/acknowledge", ['digital_signature' => 'Signature A']);
    $this->actingAs($employee)->post("/sop/{$sop->id}/acknowledge", ['digital_signature' => 'Signature B']);

    expect(SopAcknowledgement::where('sop_id', $sop->id)->count())->toBe(1);
});

test('deleting an sop archives it instead of hard-deleting', function () {
    $coordinator = makeEmployeeUser('coordinator');
    $sop = SopDocument::create(['title' => 'Old SOP', 'version' => '1.0', 'category' => 'Operations', 'status' => 'active']);

    $this->actingAs($coordinator)->delete("/sop/{$sop->id}")->assertSessionHasNoErrors();

    expect($sop->fresh()->status)->toBe('archived');
});

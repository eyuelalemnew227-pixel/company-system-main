<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Certificate;
use App\Models\Enrollment;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CertificateController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user->hasPermission('certificate.issue');
        $status = $request->query('status', '');
        $search = trim((string) $request->query('search', ''));

        $query = Certificate::with(['employee:id,first_name,last_name,employee_number,position', 'course:id,title'])
            ->orderByDesc('issue_date')
            ->limit(500);

        if (! $isAdmin) {
            if (! $user->employee) {
                return Inertia::render('Certificates/Index', ['certificates' => [], 'isAdmin' => false]);
            }
            $query->where('employee_id', $user->employee->id);
        }

        if ($status === 'revoked') {
            $query->where('is_revoked', true);
        } elseif ($status === 'expired') {
            $query->where('is_revoked', false)->where('expiry_date', '<', now());
        } elseif ($status === 'valid') {
            $query->where('is_revoked', false)->where(fn ($q) => $q->whereNull('expiry_date')->orWhere('expiry_date', '>=', now()));
        }

        if ($search && $isAdmin) {
            $query->where(function ($q) use ($search) {
                $q->where('certificate_number', 'like', "%{$search}%")
                    ->orWhereHas('employee', fn ($e) => $e->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%"));
            });
        }

        $now = now();
        $certificates = $query->get()->map(function (Certificate $c) use ($now) {
            $status = $c->is_revoked ? 'revoked' : (($c->expiry_date && $c->expiry_date->lt($now)) ? 'expired' : 'valid');

            return [
                'id' => $c->id,
                'certificateNumber' => $c->certificate_number,
                'employeeId' => $c->employee_id,
                'employeeName' => "{$c->employee->first_name} {$c->employee->last_name}",
                'employeeNumber' => $c->employee->employee_number,
                'position' => $c->employee->position,
                'courseId' => $c->course_id,
                'courseTitle' => $c->course->title,
                'issueDate' => $c->issue_date,
                'expiryDate' => $c->expiry_date,
                'isRevoked' => $c->is_revoked,
                'revokedReason' => $c->revoked_reason,
                'status' => $status,
            ];
        });

        return Inertia::render('Certificates/Index', [
            'certificates' => $certificates,
            'isAdmin' => $isAdmin,
        ]);
    }

    public function issuePending(Request $request)
    {
        Gate::authorize('permission', 'certificate.issue');

        $enrollments = Enrollment::where('status', 'completed')
            ->whereDoesntHave('certificates')
            ->with(['course:id,title', 'employee:id,first_name,last_name'])
            ->get();

        $issuedCount = 0;
        foreach ($enrollments as $enrollment) {
            $certNumber = $this->generateCertNumber();
            $expiryDate = now()->addYears(2);

            Certificate::create([
                'employee_id' => $enrollment->employee_id,
                'course_id' => $enrollment->course_id,
                'enrollment_id' => $enrollment->id,
                'certificate_number' => $certNumber,
                'issue_date' => now(),
                'expiry_date' => $expiryDate,
                'qr_code_data' => json_encode([
                    'number' => $certNumber, 'employeeId' => $enrollment->employee_id,
                    'courseId' => $enrollment->course_id, 'issueDate' => now()->toISOString(),
                ]),
                'is_revoked' => false,
            ]);

            $notification = Notification::create([
                'type' => 'certificate', 'title' => 'New Certificate Issued 🎓',
                'body' => "Congratulations! You have been issued a certificate for \"{$enrollment->course->title}\". Certificate #{$certNumber}.",
                'action_url' => "/certificates?cert={$certNumber}", 'channels' => 'inapp',
            ]);
            $notification->recipients()->create(['employee_id' => $enrollment->employee_id]);

            $issuedCount++;
        }

        if ($issuedCount > 0) {
            ActivityLog::create([
                'user_id' => $request->user()->id, 'action' => 'certificate.issue_pending', 'module' => 'certificates',
                'entity_type' => 'Certificate', 'new_value' => "{$issuedCount} certificates issued",
            ]);
        }

        return back()->with('success', $issuedCount > 0 ? "Issued {$issuedCount} certificate(s)." : 'No pending certificates to issue.');
    }

    public function revoke(Request $request, Certificate $certificate)
    {
        Gate::authorize('permission', 'certificate.revoke');

        $data = $request->validate(['reason' => ['required', 'string', 'min:3']]);

        $certificate->load(['employee:id,first_name,last_name', 'course:id,title']);
        $wasRevoked = $certificate->is_revoked;

        $certificate->update(['is_revoked' => true, 'revoked_reason' => $data['reason']]);

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => 'certificate.revoke', 'module' => 'certificates',
            'entity_type' => 'Certificate', 'entity_id' => $certificate->id,
            'old_value' => $wasRevoked ? 'revoked' : 'valid', 'new_value' => "revoked: {$data['reason']}",
        ]);

        $notification = Notification::create([
            'type' => 'certificate', 'title' => 'Certificate Revoked',
            'body' => "Your certificate #{$certificate->certificate_number} for \"{$certificate->course->title}\" has been revoked. Reason: {$data['reason']}",
            'channels' => 'inapp',
        ]);
        $notification->recipients()->create(['employee_id' => $certificate->employee_id]);

        return back()->with('success', "Certificate {$certificate->certificate_number} revoked.");
    }

    public function verifyPage(): Response
    {
        return Inertia::render('Certificates/Verify');
    }

    public function verify(Request $request)
    {
        $number = trim((string) $request->query('number', ''));
        if (! $number) {
            return response()->json(['error' => 'Certificate number is required'], 400);
        }

        $certificate = Certificate::with(['employee:id,first_name,last_name', 'course:id,title'])
            ->where('certificate_number', $number)->first();

        if (! $certificate) {
            return response()->json(['error' => 'Certificate not found'], 404);
        }

        $status = $certificate->is_revoked ? 'revoked' : (($certificate->expiry_date && $certificate->expiry_date->isPast()) ? 'expired' : 'valid');

        return response()->json([
            'status' => $status,
            'certificate' => [
                'number' => $certificate->certificate_number,
                'holderName' => "{$certificate->employee->first_name} {$certificate->employee->last_name}",
                'courseTitle' => $certificate->course->title,
                'issueDate' => $certificate->issue_date,
                'expiryDate' => $certificate->expiry_date,
                'revokedReason' => $certificate->revoked_reason,
            ],
        ]);
    }

    private function generateCertNumber(): string
    {
        $year = now()->year;
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $candidate = "KA-{$year}-".strtoupper(Str::random(6));
            if (! Certificate::where('certificate_number', $candidate)->exists()) {
                return $candidate;
            }
        }

        return "KA-{$year}-".strtoupper(Str::random(8));
    }
}

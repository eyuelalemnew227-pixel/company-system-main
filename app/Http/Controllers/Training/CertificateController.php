<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\Certificate;
use App\Models\Training\CertificateTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CertificateController extends Controller
{
    public function index(Request $request): Response
    {
        $certificates = Certificate::with(['employee.branch', 'employee.department', 'course'])
            ->latest()
            ->paginate(15);

        $templates = CertificateTemplate::all();

        return Inertia::render('training/certificates/index', [
            'certificates' => $certificates,
            'templates' => $templates,
        ]);
    }

    public function revoke(Certificate $certificate, Request $request): RedirectResponse
    {
        $request->validate(['reason' => 'required|string|max:255']);

        $certificate->update([
            'is_revoked' => true,
            'revoked_reason' => $request->reason,
        ]);

        return back()->with('success', 'Certificate revoked successfully.');
    }

    public function verifyPage(): Response
    {
        return Inertia::render('training/certificates/verify', [
            'certificate' => null,
            'searched' => false,
        ]);
    }

    public function verify(Request $request): Response
    {
        $number = $request->query('number');
        $certificate = null;

        if ($number) {
            $certificate = Certificate::with(['employee.branch', 'employee.department', 'course'])
                ->where('certificate_number', trim($number))
                ->first();
        }

        return Inertia::render('training/certificates/verify', [
            'certificate' => $certificate,
            'searched' => true,
            'queryNumber' => $number,
        ]);
    }
}

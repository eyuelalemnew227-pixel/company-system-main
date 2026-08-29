<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Employee;
use App\Models\SopAcknowledgement;
use App\Models\SopDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SopController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('permission', 'sop.view');
        $user = $request->user();

        $sops = SopDocument::whereIn('status', ['active', 'archived'])
            ->with('acknowledgements:id,sop_id,employee_id,acknowledged_at')
            ->orderByDesc('effective_date')->orderByDesc('created_at')
            ->get();

        $totalEmployees = Employee::where('status', 'active')->count();

        $rows = $sops->map(function (SopDocument $s) use ($totalEmployees, $user) {
            $ackCount = $s->acknowledgements->count();
            $myAck = $user->employee ? $s->acknowledgements->firstWhere('employee_id', $user->employee->id) : null;

            return [
                'id' => $s->id, 'title' => $s->title, 'version' => $s->version, 'category' => $s->category,
                'content' => $s->content, 'filePath' => $s->file_path ? Storage::url($s->file_path) : null,
                'effectiveDate' => $s->effective_date, 'requiresAcknowledgement' => $s->requires_acknowledgement,
                'status' => $s->status, 'createdAt' => $s->created_at,
                'acknowledgedCount' => $ackCount, 'totalEmployees' => $totalEmployees,
                'complianceRate' => $totalEmployees > 0 ? min(100, (int) round($ackCount / $totalEmployees * 100)) : 0,
                'myAcknowledgement' => $myAck ? ['id' => $myAck->id, 'acknowledgedAt' => $myAck->acknowledged_at] : null,
            ];
        });

        return Inertia::render('Sop/Index', [
            'sops' => $rows,
            'canManage' => $user->hasPermission('sop.manage'),
            'canAcknowledge' => $user->hasPermission('sop.acknowledge') && (bool) $user->employee,
        ]);
    }

    public function show(Request $request, SopDocument $sop): Response
    {
        Gate::authorize('permission', 'sop.view');
        $user = $request->user();
        $canManage = $user->hasPermission('sop.manage');

        $sop->load(['acknowledgements.employee.branch', 'acknowledgements.employee.department']);
        $totalEmployees = Employee::where('status', 'active')->count();
        $acknowledgedIds = $sop->acknowledgements->pluck('employee_id');

        $pending = [];
        if ($canManage) {
            $pending = Employee::where('status', 'active')->whereNotIn('id', $acknowledgedIds)
                ->with('branch:id,name')->orderBy('first_name')->orderBy('last_name')->get()
                ->map(fn (Employee $e) => [
                    'employeeId' => $e->id, 'name' => "{$e->first_name} {$e->last_name}",
                    'employeeNumber' => $e->employee_number, 'branch' => $e->branch->name ?? '—',
                ]);
        }

        $myAck = $user->employee ? $sop->acknowledgements->firstWhere('employee_id', $user->employee->id) : null;

        return Inertia::render('Sop/Show', [
            'sop' => [
                'id' => $sop->id, 'title' => $sop->title, 'version' => $sop->version, 'category' => $sop->category,
                'content' => $sop->content, 'filePath' => $sop->file_path ? Storage::url($sop->file_path) : null,
                'effectiveDate' => $sop->effective_date, 'requiresAcknowledgement' => $sop->requires_acknowledgement,
                'status' => $sop->status, 'createdAt' => $sop->created_at,
                'acknowledgedCount' => $sop->acknowledgements->count(), 'totalEmployees' => $totalEmployees,
                'complianceRate' => $totalEmployees > 0 ? min(100, (int) round($sop->acknowledgements->count() / $totalEmployees * 100)) : 0,
                'myAcknowledgement' => $myAck ? ['id' => $myAck->id, 'acknowledgedAt' => $myAck->acknowledged_at] : null,
                'acknowledgements' => $sop->acknowledgements->sortByDesc('acknowledged_at')->values()->map(fn (SopAcknowledgement $a) => [
                    'id' => $a->id, 'employeeId' => $a->employee_id,
                    'employeeName' => "{$a->employee->first_name} {$a->employee->last_name}",
                    'employeeNumber' => $a->employee->employee_number,
                    'branch' => $a->employee->branch->name ?? '—', 'department' => $a->employee->department->name ?? '—',
                    'acknowledgedAt' => $a->acknowledged_at, 'ipAddress' => $a->ip_address, 'digitalSignature' => $a->digital_signature,
                ]),
                'pending' => $pending,
            ],
            'canManage' => $canManage,
            'canAcknowledge' => $user->hasPermission('sop.acknowledge') && (bool) $user->employee,
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('permission', 'sop.manage');
        $data = $this->validated($request);

        $sop = SopDocument::create($data);

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => 'sop.create', 'module' => 'sop',
            'entity_type' => 'SopDocument', 'entity_id' => $sop->id,
            'new_value' => json_encode(['title' => $sop->title, 'version' => $sop->version]),
            'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'SOP created.');
    }

    public function update(Request $request, SopDocument $sop)
    {
        Gate::authorize('permission', 'sop.manage');
        $old = ['title' => $sop->title, 'version' => $sop->version];
        $data = $this->validated($request, $sop);

        $sop->update($data);

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => 'sop.update', 'module' => 'sop',
            'entity_type' => 'SopDocument', 'entity_id' => $sop->id,
            'old_value' => json_encode($old), 'new_value' => json_encode(['title' => $sop->title, 'version' => $sop->version]),
            'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'SOP updated.');
    }

    public function destroy(Request $request, SopDocument $sop)
    {
        Gate::authorize('permission', 'sop.manage');

        // Soft-delete: archive rather than hard-delete, since acknowledgements reference it.
        $sop->update(['status' => 'archived']);

        ActivityLog::create([
            'user_id' => $request->user()->id, 'action' => 'sop.delete', 'module' => 'sop',
            'entity_type' => 'SopDocument', 'entity_id' => $sop->id,
            'old_value' => json_encode(['title' => $sop->title, 'version' => $sop->version]),
            'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'SOP archived.');
    }

    public function acknowledge(Request $request, SopDocument $sop)
    {
        Gate::authorize('permission', 'sop.acknowledge');
        $user = $request->user();
        abort_unless($user->employee, 403, 'Only employees can acknowledge SOPs.');

        $data = $request->validate(['digital_signature' => ['required', 'string', 'min:2']]);

        $ack = SopAcknowledgement::firstOrCreate(
            ['sop_id' => $sop->id, 'employee_id' => $user->employee->id],
            ['acknowledged_at' => now(), 'ip_address' => $request->ip(), 'digital_signature' => $data['digital_signature']]
        );

        ActivityLog::create([
            'user_id' => $user->id, 'action' => 'sop.acknowledge', 'module' => 'sop',
            'entity_type' => 'SopAcknowledgement', 'entity_id' => $ack->id,
            'new_value' => "Acknowledged \"{$sop->title}\" v{$sop->version}",
            'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'SOP acknowledged successfully.');
    }

    private function validated(Request $request, ?SopDocument $existing = null): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'min:2'],
            'version' => ['required', 'string'],
            'category' => ['required', 'string'],
            'content' => ['nullable', 'string'],
            'effective_date' => ['nullable', 'date'],
            'requires_acknowledgement' => ['boolean'],
            'file' => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,png,jpg,jpeg'],
        ]);

        $result = [
            'title' => trim($data['title']),
            'version' => trim($data['version']),
            'category' => trim($data['category']),
            'content' => $data['content'] ?? null,
            'effective_date' => $data['effective_date'] ?? null,
            'requires_acknowledgement' => $data['requires_acknowledgement'] ?? true,
        ];

        if ($request->hasFile('file')) {
            if ($existing?->file_path) {
                Storage::disk('public')->delete($existing->file_path);
            }
            $result['file_path'] = $request->file('file')->store('sop', 'public');
        }

        return $result;
    }
}

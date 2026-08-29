<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Training\TrainingAttendance;
use App\Models\Training\TrainingEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgendaController extends Controller
{
    public function index(Request $request): Response
    {
        $events = TrainingEvent::with(['organizer', 'branch', 'attendances.employee'])
            ->orderBy('start_datetime', 'asc')
            ->get();

        $branches = Branch::orderBy('name')->get();

        return Inertia::render('training/agendas/index', [
            'events' => $events,
            'branches' => $branches,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:training,webinar,exam,meeting',
            'location' => 'nullable|string|max:255',
            'start_datetime' => 'required|date',
            'end_datetime' => 'nullable|date|after_or_equal:start_datetime',
            'branch_id' => 'nullable|exists:branches,id',
            'status' => 'required|in:scheduled,cancelled,completed',
        ]);

        $validated['organizer_id'] = $request->user()->id;

        TrainingEvent::create($validated);

        return back()->with('success', 'Training event scheduled successfully.');
    }

    public function checkIn(TrainingEvent $event, Request $request): RedirectResponse
    {
        $employee = $request->user()->employee;
        if (!$employee) {
            return back()->with('error', 'Employee record not found.');
        }

        TrainingAttendance::firstOrCreate([
            'event_id' => $event->id,
            'employee_id' => $employee->id,
        ], [
            'status' => 'present',
            'checked_in_at' => now(),
        ]);

        return back()->with('success', 'Checked in for event successfully!');
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    public function index(Request $request): Response
    {
        $month = $request->query('month');
        if ($month) {
            [$yy, $mm] = array_map('intval', explode('-', $month) + [null, null]);
            abort_if(! $yy || ! $mm, 400, 'Invalid month format. Use YYYY-MM.');
            $start = now()->setDate($yy, $mm, 1)->startOfDay();
        } else {
            $start = now()->startOfMonth();
            $month = $start->format('Y-m');
        }
        $end = (clone $start)->addMonthNoOverflow();

        $events = Event::whereBetween('start_datetime', [$start, $end])
            ->with(['organizer:id,name', 'branch:id,name'])
            ->orderBy('start_datetime')
            ->get()
            ->map(fn (Event $e) => [
                'id' => $e->id, 'title' => $e->title, 'type' => $e->type, 'location' => $e->location,
                'startDatetime' => $e->start_datetime, 'endDatetime' => $e->end_datetime, 'status' => $e->status,
                'organizerName' => $e->organizer->name ?? '—', 'branchName' => $e->branch->name ?? '—', 'branchId' => $e->branch_id,
            ]);

        return Inertia::render('Calendar/Index', [
            'events' => $events,
            'month' => $month,
            'canManage' => $request->user()->hasPermission('event.manage'),
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('permission', 'event.manage');

        $data = $request->validate([
            'title' => ['required', 'string'],
            'type' => ['required', 'string', 'in:training,webinar,exam,meeting'],
            'location' => ['nullable', 'string'],
            'start_datetime' => ['required', 'date'],
            'end_datetime' => ['nullable', 'date'],
            'branch_id' => ['nullable', 'exists:branches,id'],
        ]);

        Event::create([
            'title' => trim($data['title']),
            'type' => $data['type'],
            'location' => $data['location'] ?? null,
            'start_datetime' => $data['start_datetime'],
            'end_datetime' => $data['end_datetime'] ?? null,
            'organizer_id' => $request->user()->id,
            'branch_id' => $data['branch_id'] ?? null,
            'status' => 'scheduled',
        ]);

        return back()->with('success', 'Event created.');
    }
}

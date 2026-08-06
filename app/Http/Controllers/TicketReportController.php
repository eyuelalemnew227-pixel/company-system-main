<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketRating;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TicketReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Check permission & role authorization for Ticketing Report
        if (!$user->can('ticket.report.view') && !$user->can('ticket.view.all') && empty($user->managedDepartmentIds())) {
            abort(403, 'Unauthorized access to ticketing performance reports.');
        }

        // 1. Determine Date Range
        $period = $request->input('period', 'monthly');
        $departmentId = $request->input('department_id', 'all');

        $now = Carbon::now();
        if ($period === 'daily') {
            $startDate = $now->copy()->startOfDay();
            $endDate = $now->copy()->endOfDay();
        } elseif ($period === 'weekly') {
            $startDate = $now->copy()->startOfWeek();
            $endDate = $now->copy()->endOfWeek();
        } elseif ($period === 'custom' && $request->filled('start_date') && $request->filled('end_date')) {
            $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
            $endDate = Carbon::parse($request->input('end_date'))->endOfDay();
        } else {
            // Default: monthly (current month)
            $period = 'monthly';
            $startDate = $now->copy()->startOfMonth();
            $endDate = $now->copy()->endOfMonth();
        }

        // 2. Base Query Scoping
        $query = Ticket::query()
            ->whereBetween('created_at', [$startDate, $endDate]);

        if (!$user->can('ticket.view.all')) {
            $managedIds = $user->managedDepartmentIds();
            $query->whereIn('department_id', $managedIds);
        }

        if ($departmentId !== 'all' && is_numeric($departmentId)) {
            $query->where('department_id', (int) $departmentId);
        }

        $tickets = $query->with(['department', 'ratings', 'requestorBranch', 'assignments.assignee'])->get();

        // 3. Overview Metric Summaries
        $totalTickets = $tickets->count();
        $resolvedTickets = $tickets->filter(fn($t) => in_array($t->status?->value, ['done', 'ticket_approved', 'closed'], true));
        $resolvedCount = $resolvedTickets->count();

        $openCount = $tickets->filter(fn($t) => in_array($t->status?->value, ['pending_approval', 'approved', 'not_started', 'in_progress', 'hold'], true))->count();
        $escalatedCount = $tickets->filter(fn($t) => $t->status?->value === 'escalated')->count();

        $resolutionRate = $totalTickets > 0 ? round(($resolvedCount / $totalTickets) * 100, 1) : 0;

        // Calculate average resolution time in hours
        $resolutionTimesInHours = $resolvedTickets->map(function ($t) {
            $start = Carbon::parse($t->created_at);
            $end = Carbon::parse($t->updated_at);
            return $start->diffInMinutes($end) / 60.0;
        });
        $avgResolutionTimeHours = $resolutionTimesInHours->count() > 0 ? round($resolutionTimesInHours->avg(), 1) : 0;

        // Calculate average customer rating
        $ratings = TicketRating::whereIn('ticket_id', $tickets->pluck('id'))->get();
        $avgRating = $ratings->count() > 0 ? round($ratings->avg('stars'), 1) : 0;

        // 4. Technician Performance Breakdown
        $assignedUserIds = $tickets->flatMap(fn($t) => $t->assignments->pluck('assigned_to'))->filter()->unique()->all();

        $technicians = User::whereIn('id', $assignedUserIds)->with(['employee.department'])->get();

        $technicianPerformance = $technicians->map(function ($tech) use ($tickets) {
            $techTickets = $tickets->filter(function ($t) use ($tech) {
                return $t->assignments->pluck('assigned_to')->contains($tech->id);
            });

            $assignedCount = $techTickets->count();
            $resolved = $techTickets->filter(fn($t) => in_array($t->status?->value, ['done', 'ticket_approved', 'closed'], true));
            $resolvedTechCount = $resolved->count();

            $techResolutionHours = $resolved->map(function ($t) {
                return Carbon::parse($t->created_at)->diffInMinutes(Carbon::parse($t->updated_at)) / 60.0;
            });
            $avgTechHours = $techResolutionHours->count() > 0 ? round($techResolutionHours->avg(), 1) : 0;

            $techRatings = TicketRating::whereIn('ticket_id', $techTickets->pluck('id'))->get();
            $avgTechRating = $techRatings->count() > 0 ? round($techRatings->avg('stars'), 1) : 0;

            return [
                'id' => $tech->id,
                'name' => $tech->name,
                'email' => $tech->email,
                'department' => $tech->employee?->department?->name ?? 'N/A',
                'assigned_count' => $assignedCount,
                'resolved_count' => $resolvedTechCount,
                'avg_resolution_hours' => $avgTechHours,
                'avg_rating' => $avgTechRating,
                'completion_rate' => $assignedCount > 0 ? round(($resolvedTechCount / $assignedCount) * 100, 1) : 0,
            ];
        })->sortByDesc('resolved_count')->values()->all();

        // 4.5 Manager Performance Breakdown (Filtered by selected department if applicable)
        $managersQuery = DB::table('managers')
            ->join('employees', 'managers.employee_id', '=', 'employees.id')
            ->join('users', 'users.employee_id', '=', 'employees.id')
            ->join('departments', 'employees.department_id', '=', 'departments.id')
            ->select('users.id as user_id', 'users.name as manager_name', 'users.email', 'departments.id as dept_id', 'departments.name as dept_name');

        if ($departmentId !== 'all' && is_numeric($departmentId)) {
            $managersQuery->where('departments.id', (int) $departmentId);
        }

        if (!$user->can('ticket.view.all')) {
            $managedIds = $user->managedDepartmentIds();
            $managersQuery->whereIn('departments.id', $managedIds);
        }

        $managers = $managersQuery->get();

        $managerPerformance = $managers->map(function ($mgr) use ($tickets) {
            $deptTickets = $tickets->filter(fn($t) => (int)$t->department_id === (int)$mgr->dept_id);
            $totalCount = $deptTickets->count();
            $resolved = $deptTickets->filter(fn($t) => in_array($t->status?->value, ['done', 'ticket_approved', 'closed'], true));
            $resolvedCount = $resolved->count();
            $openCount = $deptTickets->filter(fn($t) => in_array($t->status?->value, ['pending_approval', 'approved', 'not_started', 'in_progress', 'hold'], true))->count();
            $escalatedCount = $deptTickets->filter(fn($t) => $t->status?->value === 'escalated')->count();

            $hours = $resolved->map(fn($t) => Carbon::parse($t->created_at)->diffInMinutes(Carbon::parse($t->updated_at)) / 60.0);
            $avgHours = $hours->count() > 0 ? round($hours->avg(), 1) : 0;

            return [
                'user_id' => $mgr->user_id,
                'manager_name' => $mgr->manager_name,
                'email' => $mgr->email,
                'department_id' => $mgr->dept_id,
                'department_name' => $mgr->dept_name,
                'total_tickets' => $totalCount,
                'resolved_tickets' => $resolvedCount,
                'open_tickets' => $openCount,
                'escalated_tickets' => $escalatedCount,
                'avg_resolution_hours' => $avgHours,
                'resolution_rate' => $totalCount > 0 ? round(($resolvedCount / $totalCount) * 100, 1) : 0,
            ];
        })->sortByDesc('total_tickets')->values()->all();

        // 5. Resolution Time by Priority
        $priorities = ['urgent', 'high', 'medium', 'low'];
        $resolutionByPriority = [];
        foreach ($priorities as $pri) {
            $priTickets = $resolvedTickets->filter(fn($t) => ($t->priority?->value ?? 'medium') === $pri);
            $hours = $priTickets->map(fn($t) => Carbon::parse($t->created_at)->diffInMinutes(Carbon::parse($t->updated_at)) / 60.0);
            $resolutionByPriority[$pri] = [
                'count' => $priTickets->count(),
                'avg_hours' => $hours->count() > 0 ? round($hours->avg(), 1) : 0,
            ];
        }

        // 6. Rating Breakdown (Distribution 1-5 Stars)
        $ratingDistribution = [
            5 => $ratings->where('stars', 5)->count(),
            4 => $ratings->where('stars', 4)->count(),
            3 => $ratings->where('stars', 3)->count(),
            2 => $ratings->where('stars', 2)->count(),
            1 => $ratings->where('stars', 1)->count(),
        ];

        // 7. Recent Feedback Log
        $feedbackLog = TicketRating::whereIn('ticket_id', $tickets->pluck('id'))
            ->with(['ticket.requestorBranch', 'user'])
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($r) {
                return [
                    'id' => $r->id,
                    'ticket_id' => $r->ticket_id,
                    'ticket_title' => $r->ticket?->title ?? "Ticket #{$r->ticket_id}",
                    'branch_name' => $r->ticket?->requestorBranch?->name ?? 'N/A',
                    'user_name' => $r->user?->name ?? 'User',
                    'stars' => $r->stars,
                    'comment' => $r->comment ?? $r->feedback ?? null,
                    'created_at' => $r->created_at?->toDateTimeString(),
                ];
            });

        $summary = [
            'total_tickets' => $totalTickets,
            'resolved_tickets' => $resolvedCount,
            'open_tickets' => $openCount,
            'escalated_tickets' => $escalatedCount,
            'resolution_rate' => $resolutionRate,
            'avg_resolution_hours' => $avgResolutionTimeHours,
            'avg_rating' => $avgRating,
        ];

        // Handle CSV Export Request
        if ($request->input('export') === 'csv') {
            $filename = "ticketing_performance_report_" . now()->format('Y_m_d_His') . ".csv";
            $headers = [
                "Content-type" => "text/csv; charset=UTF-8",
                "Content-Disposition" => "attachment; filename={$filename}",
                "Pragma" => "no-cache",
                "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
                "Expires" => "0"
            ];

            $callback = function () use ($summary, $managerPerformance, $technicianPerformance, $startDate, $endDate) {
                $file = fopen('php://output', 'w');
                fputs($file, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel

                fputcsv($file, ['TICKETING PERFORMANCE & ANALYTICS EXECUTIVE REPORT']);
                fputcsv($file, ['Period', "{$startDate->toDateString()} to {$endDate->toDateString()}"]);
                fputcsv($file, ['Total Tickets Created', $summary['total_tickets']]);
                fputcsv($file, ['Resolved Tickets', $summary['resolved_tickets']]);
                fputcsv($file, ['Open/Pending Tickets', $summary['open_tickets']]);
                fputcsv($file, ['Escalated Tickets', $summary['escalated_tickets']]);
                fputcsv($file, ['SLA Resolution Rate', $summary['resolution_rate'] . '%']);
                fputcsv($file, ['Avg Resolution Speed', $summary['avg_resolution_hours'] . ' hrs']);
                fputcsv($file, ['Avg Satisfaction Rating', $summary['avg_rating'] . ' / 5.0']);
                fputcsv($file, []);

                fputcsv($file, ['MANAGER PERFORMANCE OVERVIEW']);
                fputcsv($file, ['Manager Name', 'Email', 'Managed Department', 'Total Tickets', 'Resolved Cases', 'Open/Pending', 'Escalated', 'Avg Speed (hrs)', 'Completion Rate (%)']);
                foreach ($managerPerformance as $mgr) {
                    fputcsv($file, [
                        $mgr['manager_name'],
                        $mgr['email'],
                        $mgr['department_name'],
                        $mgr['total_tickets'],
                        $mgr['resolved_tickets'],
                        $mgr['open_tickets'],
                        $mgr['escalated_tickets'],
                        $mgr['avg_resolution_hours'],
                        $mgr['resolution_rate'] . '%',
                    ]);
                }
                fputcsv($file, []);

                fputcsv($file, ['TECHNICIAN PERFORMANCE OVERVIEW']);
                fputcsv($file, ['Technician Name', 'Email', 'Department', 'Assigned Tickets', 'Resolved Cases', 'Completion Rate (%)', 'Avg Speed (hrs)', 'Avg Rating']);
                foreach ($technicianPerformance as $tech) {
                    fputcsv($file, [
                        $tech['name'],
                        $tech['email'],
                        $tech['department'],
                        $tech['assigned_count'],
                        $tech['resolved_count'],
                        $tech['completion_rate'] . '%',
                        $tech['avg_resolution_hours'],
                        $tech['avg_rating'] . ' Stars',
                    ]);
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        }

        return Inertia::render('tickets/reports', [
            'filters' => [
                'period' => $period,
                'department_id' => (string) $departmentId,
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
            'summary' => $summary,
            'technicianPerformance' => $technicianPerformance,
            'managerPerformance' => $managerPerformance,
            'resolutionByPriority' => $resolutionByPriority,
            'ratingDistribution' => $ratingDistribution,
            'feedbackLog' => $feedbackLog,
            'options' => [
                'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            ],
        ]);
    }
}

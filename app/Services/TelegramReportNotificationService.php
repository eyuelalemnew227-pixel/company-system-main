<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketActivityLog;
use App\Models\TicketRating;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TelegramReportNotificationService
{
    public function __construct(
        private readonly TelegramBotService $botService
    ) {
    }

    /**
     * Send scheduled report (weekly or monthly) to all department managers.
     */
    public function sendReportsToAllManagers(string $period = 'weekly'): void
    {
        // Find managers who have employee records or roles
        $managers = User::query()
            ->join('employees', 'users.employee_id', '=', 'employees.id')
            ->join('managers', 'employees.id', '=', 'managers.employee_id')
            ->select('users.*')
            ->distinct()
            ->get();

        if ($managers->isEmpty()) {
            // Fallback: look for users with ticket.view.all or manager roles
            $managers = User::whereNotNull('telegram_chat_id')
                ->where(function ($q) {
                    $q->whereHas('roles', fn($r) => $r->whereIn('name', ['Super Admin', 'Ticket Super Admin', 'Ticket Department Manager', 'Department Manager']))
                      ->orWherePermissionTo('ticket.report.view');
                })->get();
        }

        foreach ($managers as $manager) {
            $this->sendReportToManager($manager, $period);
        }
    }

    /**
     * Generate and send a weekly or monthly Telegram report to a single manager.
     */
    public function sendReportToManager(User $manager, string $period = 'weekly'): bool
    {
        if (empty($manager->telegram_chat_id)) {
            Log::info("Telegram report skipped for user {$manager->id} ({$manager->name}): No telegram_chat_id.");
            return false;
        }

        $now = Carbon::now();
        if ($period === 'weekly') {
            $startDate = $now->copy()->subDays(7)->startOfDay();
            $endDate = $now->copy()->endOfDay();
            $periodLabel = "Weekly Report (Past 7 Days)";
        } else {
            $startDate = $now->copy()->startOfMonth();
            $endDate = $now->copy()->endOfMonth();
            $periodLabel = "Monthly Report (" . $now->format('F Y') . ")";
        }

        // Determine department IDs managed by this manager
        $departmentIds = $manager->managedDepartmentIds();

        // If manager has ticket.view.all or no specific department assigned, include all departments
        if (empty($departmentIds) && ($manager->can('ticket.view.all') || $manager->hasRole('Super Admin'))) {
            $departmentIds = Department::pluck('id')->toArray();
        }

        if (empty($departmentIds)) {
            Log::info("Telegram report skipped for user {$manager->id}: No managed departments found.");
            return false;
        }

        $departments = Department::whereIn('id', $departmentIds)->get();
        foreach ($departments as $dept) {
            $messageText = $this->buildDepartmentReportText($dept, $startDate, $endDate, $periodLabel);
            $this->botService->sendMessage($manager->telegram_chat_id, $messageText);
        }

        return true;
    }

    /**
     * Build report text for a specific department and date range.
     */
    public function buildDepartmentReportText(Department $dept, Carbon $startDate, Carbon $endDate, string $periodLabel): string
    {
        $tickets = Ticket::where('department_id', $dept->id)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with(['requestorBranch', 'mainCategory', 'subCategory', 'assignments.assignee', 'ratings'])
            ->get();

        $totalCases = $tickets->count();

        // Status Counts
        $notStartedCount = $tickets->filter(fn($t) => in_array($t->status?->value, ['not_started', 'pending_approval', 'approved'], true))->count();
        $inProgressCount = $tickets->filter(fn($t) => $t->status?->value === 'in_progress')->count();
        $holdCount = $tickets->filter(fn($t) => $t->status?->value === 'hold')->count();
        $escalatedCount = $tickets->filter(fn($t) => $t->status?->value === 'escalated')->count();
        $doneCount = $tickets->filter(fn($t) => $t->status?->value === 'done')->count();
        $rejectedByManagerCount = $tickets->filter(fn($t) => $t->status?->value === 'rejected')->count();

        // Rejections by Branch (logged in activity logs)
        $ticketIds = $tickets->pluck('id');
        $rejectedByBranchCount = TicketActivityLog::whereIn('ticket_id', $ticketIds)
            ->where('action', 'rejected')
            ->whereIn('old_status', ['done', 'ticket_approved'])
            ->count();

        $ticketApprovedCount = $tickets->filter(fn($t) => $t->status?->value === 'ticket_approved')->count();
        $closedCount = $tickets->filter(fn($t) => $t->status?->value === 'closed')->count();

        // Resolution Time & Rate
        $resolvedTickets = $tickets->filter(fn($t) => in_array($t->status?->value, ['done', 'ticket_approved', 'closed'], true));
        $resolvedCount = $resolvedTickets->count();
        $resolutionRate = $totalCases > 0 ? round(($resolvedCount / $totalCases) * 100, 1) : 0;

        $resolutionTimes = $resolvedTickets->map(function ($t) {
            return Carbon::parse($t->created_at)->diffInMinutes(Carbon::parse($t->updated_at)) / 60.0;
        });
        $avgResolutionHours = $resolutionTimes->count() > 0 ? round($resolutionTimes->avg(), 1) : 0;

        // Customer Satisfaction Rating
        $ratings = TicketRating::whereIn('ticket_id', $ticketIds)->get();
        $avgSatisfaction = $ratings->count() > 0 ? round($ratings->avg('stars'), 1) : 0;

        // Technician Performance (Top & Low rated)
        $techStats = [];
        foreach ($tickets as $t) {
            foreach ($t->assignments as $assign) {
                if ($assign->assignee) {
                    $techId = $assign->assignee->id;
                    if (!isset($techStats[$techId])) {
                        $techStats[$techId] = [
                            'name' => $assign->assignee->name,
                            'tickets' => 0,
                            'ratings' => [],
                        ];
                    }
                    $techStats[$techId]['tickets']++;
                    $tRatings = $t->ratings;
                    foreach ($tRatings as $r) {
                        $techStats[$techId]['ratings'][] = $r->stars;
                    }
                }
            }
        }

        $techSummary = collect($techStats)->map(function ($stat) {
            $avgR = count($stat['ratings']) > 0 ? round(array_sum($stat['ratings']) / count($stat['ratings']), 1) : 0;
            return [
                'name' => $stat['name'],
                'tickets' => $stat['tickets'],
                'avg_rating' => $avgR,
            ];
        });

        $topTech = $techSummary->sortByDesc('avg_rating')->first();
        $lowTech = $techSummary->where('avg_rating', '>', 0)->sortBy('avg_rating')->first();

        // Branch Demand (High & Low)
        $branchCounts = $tickets->groupBy(fn($t) => $t->requestorBranch?->name ?? 'Unspecified')
            ->map(fn($group) => $group->count())
            ->sortDesc();

        $highBranch = $branchCounts->keys()->first();
        $highBranchCount = $branchCounts->first() ?? 0;

        $lowBranch = $branchCounts->keys()->last();
        $lowBranchCount = $branchCounts->last() ?? 0;

        // Subcategory Demand (High & Low)
        $subCatCounts = $tickets->groupBy(fn($t) => $t->subCategory?->name ?? 'Unspecified')
            ->map(fn($group) => $group->count())
            ->sortDesc();

        $highSubCat = $subCatCounts->keys()->first();
        $highSubCatCount = $subCatCounts->first() ?? 0;

        $lowSubCat = $subCatCounts->keys()->last();
        $lowSubCatCount = $subCatCounts->last() ?? 0;

        // Category Demand (High)
        $mainCatCounts = $tickets->groupBy(fn($t) => $t->mainCategory?->name ?? 'General')
            ->map(fn($group) => $group->count())
            ->sortDesc();

        $highMainCat = $mainCatCounts->keys()->first() ?? 'General';
        $highMainCatCount = $mainCatCounts->first() ?? 0;

        $appUrl = config('app.url', 'http://localhost:8000');
        $reportUrl = "{$appUrl}/tickets/reports";

        // Format Telegram Message
        $text = "📊 <b>" . mb_strtoupper($periodLabel) . "</b>\n";
        $text .= "🏢 <b>Department:</b> " . e($dept->name) . "\n";
        $text .= "📅 <b>Range:</b> {$startDate->format('M d')} - {$endDate->format('M d, Y')}\n\n";

        $text .= "📈 <b>CASE SUMMARY</b>\n";
        $text .= "• 📋 <b>Total Cases:</b> {$totalCases}\n";
        $text .= "• ⏳ <b>Total Not Started:</b> {$notStartedCount}\n";
        $text .= "• 🔄 <b>Total In Progress:</b> {$inProgressCount}\n";
        $text .= "• ⏸️ <b>Total Hold:</b> {$holdCount}\n";
        $text .= "• 🚨 <b>Total Escalated:</b> {$escalatedCount}\n";
        $text .= "• ✅ <b>Total Done:</b> {$doneCount}\n";
        $text .= "• ❌ <b>Rejected by Dept Manager:</b> {$rejectedByManagerCount}\n";
        $text .= "• ↩️ <b>Rejected by Branch:</b> {$rejectedByBranchCount}\n";
        $text .= "• 🎯 <b>Total Ticket Approved:</b> {$ticketApprovedCount}\n";
        $text .= "• 🔒 <b>Total Closed:</b> {$closedCount}\n\n";

        $text .= "⚡ <b>RESOLUTION SLA & SATISFACTION</b>\n";
        $text .= "• 🎯 <b>Resolution Rate:</b> {$resolutionRate}%\n";
        $text .= "• ⏱️ <b>Avg Resolution Speed:</b> " . ($avgResolutionHours > 0 ? "{$avgResolutionHours} hrs" : "—") . "\n";
        $text .= "• ⭐ <b>Avg Satisfaction:</b> " . ($avgSatisfaction > 0 ? "{$avgSatisfaction} / 5.0 ⭐" : "No Ratings") . "\n\n";

        $text .= "👨‍💻 <b>TECHNICIAN HIGHLIGHTS</b>\n";
        if ($topTech) {
            $topRatingStr = $topTech['avg_rating'] > 0 ? "{$topTech['avg_rating']} ⭐" : "Unrated";
            $text .= "• 🌟 <b>Top Rated Technician:</b> " . e($topTech['name']) . " ({$topRatingStr}, {$topTech['tickets']} cases)\n";
        } else {
            $text .= "• 🌟 <b>Top Rated Technician:</b> N/A\n";
        }

        if ($lowTech && ($topTech['name'] ?? null) !== $lowTech['name']) {
            $lowRatingStr = $lowTech['avg_rating'] > 0 ? "{$lowTech['avg_rating']} ⭐" : "Unrated";
            $text .= "• ⚠️ <b>Low Rated Technician:</b> " . e($lowTech['name']) . " ({$lowRatingStr}, {$lowTech['tickets']} cases)\n\n";
        } else {
            $text .= "• ⚠️ <b>Low Rated Technician:</b> N/A\n\n";
        }

        $text .= "📍 <b>BRANCH DEMAND</b>\n";
        if ($totalCases > 0 && $highBranch) {
            $text .= "• 🔝 <b>High Requested Branch:</b> " . e($highBranch) . " ({$highBranchCount} cases)\n";
            $text .= "• 🔻 <b>Low Requested Branch:</b> " . e($lowBranch) . " ({$lowBranchCount} cases)\n\n";
        } else {
            $text .= "• 📍 <b>Branch Demand:</b> No branch data\n\n";
        }

        $text .= "🏷️ <b>CATEGORY & SUBCATEGORY DEMAND</b>\n";
        if ($totalCases > 0 && $highSubCat) {
            $text .= "• 🔝 <b>High Requested Category:</b> " . e($highMainCat) . " ({$highMainCatCount} cases)\n";
            $text .= "• 🔝 <b>High Requested Subcategory:</b> " . e($highSubCat) . " ({$highSubCatCount} cases)\n";
            $text .= "• 🔻 <b>Low Requested Subcategory:</b> " . e($lowSubCat) . " ({$lowSubCatCount} cases)\n\n";
        } else {
            $text .= "• 🏷️ <b>Category Demand:</b> No category data\n\n";
        }

        $text .= "🔗 <a href=\"{$reportUrl}\">View Full Interactive Report on WebApp</a>";

        return $text;
    }
}

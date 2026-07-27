<?php

namespace App\Http\Controllers;

use App\Models\WeeklyBudgetNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WeeklyBudgetNotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = WeeklyBudgetNotification::where('user_id', $request->user()->id)
            ->latest()
            ->limit(50)
            ->get();

        \Illuminate\Support\Facades\Log::info("Weekly Budget Notifications for user {$request->user()->id}: " . $notifications->count());

        $unreadCount = $notifications->whereNull('read_at')->count();

        if ($request->wantsJson()) {
            return response()->json([
                'data' => $notifications,
                'unread' => $unreadCount,
            ]);
        }

        return Inertia::render('Budget/WeeklyBudget/Notifications', [
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
        ]);
    }

    public function markRead(Request $request, WeeklyBudgetNotification $notification = null)
    {
        if ($notification) {
            $notification->update(['read_at' => now()]);
            return response()->json(['message' => 'Notification marked read']);
        }

        WeeklyBudgetNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked read']);
    }

    public function clear(Request $request)
    {
        WeeklyBudgetNotification::where('user_id', $request->user()->id)->delete();
        return response()->json(['message' => 'Notifications cleared']);
    }
}

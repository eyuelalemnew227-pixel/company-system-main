<?php

namespace App\Http\Controllers;

use App\Models\TicketNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TicketNotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = TicketNotification::where('user_id', $request->user()->id)
            ->latest()
            ->limit(50)
            ->get();

        \Illuminate\Support\Facades\Log::info("Notifications for user {$request->user()->id}: " . $notifications->count());

        $unreadCount = $notifications->whereNull('read_at')->count();

        if ($request->wantsJson()) {
            return response()->json([
                'data' => $notifications,
                'unread' => $unreadCount,
            ]);
        }

        return Inertia::render('tickets/Notifications', [
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
        ]);
    }

    public function markRead(Request $request, TicketNotification $notification = null)
    {
        if ($notification) {
            $notification->update(['read_at' => now()]);
            return response()->json(['message' => 'Notification marked read']);
        }

        TicketNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked read']);
    }

    public function clear(Request $request)
    {
        TicketNotification::where('user_id', $request->user()->id)->delete();

        return response()->json(['message' => 'Notifications cleared']);
    }
}

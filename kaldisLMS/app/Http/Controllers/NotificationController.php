<?php

namespace App\Http\Controllers;

use App\Models\NotificationRecipient;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $employee = $request->user()->employee;
        if (! $employee) {
            return response()->json(['notifications' => []]);
        }

        $notifications = NotificationRecipient::where('employee_id', $employee->id)
            ->with('notification')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn (NotificationRecipient $r) => [
                'id' => $r->id,
                'title' => $r->notification->title,
                'body' => $r->notification->body,
                'actionUrl' => $r->notification->action_url,
                'readAt' => $r->read_at,
            ]);

        return response()->json(['notifications' => $notifications]);
    }

    public function markRead(Request $request, NotificationRecipient $recipient)
    {
        abort_unless($recipient->employee_id === $request->user()->employee?->id, 403);

        $recipient->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function markAllRead(Request $request)
    {
        $employee = $request->user()->employee;
        if ($employee) {
            NotificationRecipient::where('employee_id', $employee->id)->whereNull('read_at')->update(['read_at' => now()]);
        }

        return response()->json(['ok' => true]);
    }
}

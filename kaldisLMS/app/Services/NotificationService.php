<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\App;

class NotificationService
{
    public function send(Employee $employee, string $type, string $title, string $body, ?string $actionUrl = null): void
    {
        $telegramAccount = $employee->telegramAccount()->where('is_verified', true)->first();
        $channels = $telegramAccount ? 'inapp,telegram' : 'inapp';

        $notification = Notification::create([
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'action_url' => $actionUrl,
            'channels' => $channels,
        ]);

        $recipient = $notification->recipients()->create([
            'employee_id' => $employee->id,
        ]);

        if ($telegramAccount) {
            $sent = App::make(TelegramService::class)->sendMessage($telegramAccount->chat_id, "<b>{$title}</b>\n{$body}");
            if ($sent) {
                $recipient->update(['telegram_sent_at' => now()]);
            }
        }
    }

    /** Notify every user whose role holds the given permission (e.g. admin alerts). */
    public function sendToPermissionHolders(string $permissionSlug, string $type, string $title, string $body, ?string $actionUrl = null): void
    {
        $users = User::whereHas('role', function ($q) use ($permissionSlug) {
            $q->where('slug', 'admin')->orWhereHas('permissions', fn ($p) => $p->where('slug', $permissionSlug));
        })->with('employee')->get();

        foreach ($users as $user) {
            if ($user->employee) {
                $this->send($user->employee, $type, $title, $body, $actionUrl);
            }
        }
    }
}

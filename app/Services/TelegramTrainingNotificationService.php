<?php

namespace App\Services;

use App\Models\Department;
use App\Models\TelegramSettings;
use App\Models\Training\TrainingAgenda;
use App\Models\Training\TrainingSchedule;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramTrainingNotificationService
{
    public function __construct(
        private readonly TelegramBotService $botService
    ) {}

    private function send(string $chatId, string $message): void
    {
        try {
            $settings = TelegramSettings::getInstance();
            if (!$settings->is_active || empty($chatId)) {
                return;
            }

            $token = $this->botService->getTrainingBotToken();
            if (empty($token)) {
                Log::warning("TelegramTrainingNotificationService send skipped: Training Bot token not configured.");
                return;
            }

            Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => (string) $chatId,
                'text' => $message,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
            ]);
        } catch (\Throwable $e) {
            Log::error("TelegramTrainingNotificationService send error: " . $e->getMessage());
        }
    }

    /**
     * Notification 1: Send Telegram alert to Training Department when a department submits an Agenda.
     */
    public function notifyAgendaSubmitted(TrainingAgenda $agenda): void
    {
        try {
            $settings = TelegramSettings::getInstance();
            if (!$settings->is_active) {
                return;
            }

            $deptName = $agenda->department ? $agenda->department->name : 'Department';
            $submitterName = $agenda->submittedBy ? $agenda->submittedBy->name : 'Department Manager';
            $targetRoles = is_array($agenda->target_trainees) ? implode(', ', $agenda->target_trainees) : ($agenda->target_trainees ?? 'All Staff');

            $message = "📋 <b>NEW TRAINING AGENDA SUBMITTED</b>\n\n";
            $message .= "<b>Department:</b> " . htmlspecialchars($deptName) . "\n";
            $message .= "<b>Submitted By:</b> " . htmlspecialchars($submitterName) . "\n";
            $message .= "<b>Training Title:</b> " . htmlspecialchars($agenda->title) . "\n";
            $message .= "<b>Duration:</b> {$agenda->allocated_minutes} minutes\n";
            $message .= "<b>Delivery Method:</b> " . htmlspecialchars($agenda->delivery_method) . "\n";
            $message .= "<b>Target Trainees:</b> " . htmlspecialchars($targetRoles) . "\n";

            if ($agenda->description) {
                $message .= "\n<b>Summary:</b> " . htmlspecialchars(mb_strimwidth($agenda->description, 0, 150, '...')) . "\n";
            }

            $message .= "\n<i>Please review and set the schedule in the Training Management System.</i>";

            // Send to default admin group chat or training department users
            if (!empty($settings->admin_chat_id)) {
                $this->send($settings->admin_chat_id, $message);
            }

            // Find Training Department Users or Users with permission/roles
            $trainingUsers = User::whereNotNull('telegram_chat_id')
                ->where('telegram_chat_id', '!=', '')
                ->where(function ($q) {
                    $q->whereHas('employee.department', function ($dq) {
                        $dq->where('name', 'LIKE', '%Training%')
                          ->orWhere('name', 'LIKE', '%HR%');
                    })->orWhereHas('roles', function ($rq) {
                        $rq->where('name', 'LIKE', '%Admin%')
                          ->orWhere('name', 'LIKE', '%Training%');
                    });
                })->get();

            foreach ($trainingUsers as $user) {
                if ($user->telegram_chat_id && $user->telegram_chat_id !== $settings->admin_chat_id) {
                    $this->send($user->telegram_chat_id, $message);
                }
            }
        } catch (\Exception $e) {
            Log::error("Telegram notifyAgendaSubmitted error: " . $e->getMessage());
        }
    }

    /**
     * Notification 2: Send Telegram notification to Department after Training Dept sets schedule slot for their Agenda.
     */
    public function notifyDepartmentScheduleSet(TrainingSchedule $schedule, Department $department): void
    {
        try {
            $settings = TelegramSettings::getInstance();
            if (!$settings->is_active) {
                return;
            }

            // Find schedule items for this department
            $items = $schedule->items()->where('department_id', $department->id)->get();

            $message = "📅 <b>TRAINING SCHEDULE PROPOSED FOR YOUR DEPARTMENT</b>\n\n";
            $message .= "<b>Department:</b> " . htmlspecialchars($department->name) . "\n";
            $message .= "<b>Master Schedule:</b> " . htmlspecialchars($schedule->title) . "\n";
            $message .= "<b>Date:</b> {$schedule->schedule_date}\n\n";
            $message .= "<b>Your Department Scheduled Slots:</b>\n";

            foreach ($items as $item) {
                $message .= "• <b>{$item->topic_title}</b>\n";
                $message .= "  Time: {$item->start_time} - {$item->end_time} ({$item->allocated_minutes} min)\n";
            }

            $message .= "\n<i>Please review and approve your schedule in the Training Portal.</i>";

            // Send to Department Head / Users with telegram_chat_id in this department via Employee relationship
            $deptUsers = User::whereNotNull('telegram_chat_id')
                ->where('telegram_chat_id', '!=', '')
                ->whereHas('employee', function ($eq) use ($department) {
                    $eq->where('department_id', $department->id);
                })
                ->get();

            foreach ($deptUsers as $user) {
                $this->send($user->telegram_chat_id, $message);
            }
        } catch (\Exception $e) {
            Log::error("Telegram notifyDepartmentScheduleSet error: " . $e->getMessage());
        }
    }

    /**
     * Notification 3: Broadcast Full Master Training Schedule to all Departments & Announced to Branches!
     */
    public function notifyMasterSchedulePublished(TrainingSchedule $schedule): void
    {
        try {
            $settings = TelegramSettings::getInstance();
            if (!$settings->is_active) {
                return;
            }

            $items = $schedule->items()->with('department')->orderBy('order_no', 'asc')->get();

            $message = "📢 <b>FINAL MASTER TRAINING SCHEDULE ANNOUNCEMENT</b>\n";
            $message .= "📌 <b>" . htmlspecialchars($schedule->title) . "</b>\n";
            $message .= "🗓 <b>Date:</b> {$schedule->schedule_date}\n";
            if ($schedule->venue) {
                $message .= "📍 <b>Venue / Platform:</b> " . htmlspecialchars($schedule->venue) . "\n";
            }
            $message .= "────────────────────────────\n\n";
            $message .= "<b>AGENDA & TIMETABLE:</b>\n\n";

            foreach ($items as $idx => $item) {
                $orderStr = $idx + 1;
                if ($item->is_break) {
                    $message .= "☕ <b>Break: {$item->topic_title}</b> ({$item->start_time} - {$item->end_time})\n\n";
                } else {
                    $deptName = $item->department ? $item->department->name : 'General';
                    $message .= "<b>{$orderStr}. " . htmlspecialchars($deptName) . "</b>\n";
                    $message .= "   └ <b>Topic:</b> " . htmlspecialchars($item->topic_title) . "\n";
                    $message .= "   └ <b>Duration:</b> {$item->allocated_minutes} min ({$item->start_time} - {$item->end_time})\n\n";
                }
            }

            $message .= "────────────────────────────\n";
            $message .= "<i>Branch Managers are kindly requested to attend and complete trainer evaluations after the sessions.</i>";

            $sentChatIds = [];

            // 1. Send to Admin Telegram Group
            if (!empty($settings->admin_chat_id)) {
                $this->send($settings->admin_chat_id, $message);
                $sentChatIds[] = (string) $settings->admin_chat_id;
            }

            // 2. Broadcast to all linked Branches directly (from branches table)
            $branches = \App\Models\Branch::whereNotNull('telegram_chat_id')->where('telegram_chat_id', '!=', '')->get();
            foreach ($branches as $branch) {
                $cid = (string) $branch->telegram_chat_id;
                if (!in_array($cid, $sentChatIds, true)) {
                    $this->send($cid, $message);
                    $sentChatIds[] = $cid;
                }
            }

            // 3. Broadcast to all users with Telegram Chat IDs (Department Heads & Managers)
            $allUsers = User::whereNotNull('telegram_chat_id')->where('telegram_chat_id', '!=', '')->get();
            foreach ($allUsers as $user) {
                $cid = (string) $user->telegram_chat_id;
                if (!in_array($cid, $sentChatIds, true)) {
                    $this->send($cid, $message);
                    $sentChatIds[] = $cid;
                }
            }
        } catch (\Exception $e) {
            Log::error("Telegram notifyMasterSchedulePublished error: " . $e->getMessage());
        }
    }
}

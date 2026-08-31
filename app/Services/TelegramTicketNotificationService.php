<?php

namespace App\Services;

use App\Models\Ticket;
use App\Models\User;
use App\Services\TelegramBotService;
use App\Services\TicketActionService;
use Illuminate\Support\Facades\Log;

class TelegramTicketNotificationService
{
    public function __construct(
        private readonly TelegramBotService $botService,
        private readonly TicketActionService $ticketActionService
    ) {
    }

    private function getAppUrl(): string
    {
        try {
            $settings = \App\Models\TelegramSettings::getInstance();
            if (!empty($settings->webhook_url) && str_starts_with($settings->webhook_url, 'https://')) {
                $parsed = parse_url($settings->webhook_url);
                if (!empty($parsed['scheme']) && !empty($parsed['host'])) {
                    $port = !empty($parsed['port']) ? ":{$parsed['port']}" : '';
                    return "{$parsed['scheme']}://{$parsed['host']}{$port}";
                }
            }
        } catch (\Throwable $e) {
            // fallback
        }

        if (app()->runningInConsole()) {
            return config('app.url', 'http://localhost:8000');
        }

        try {
            if (request()->header('x-forwarded-host')) {
                $proto = request()->header('x-forwarded-proto', 'https');
                $host = request()->header('x-forwarded-host');
                return "{$proto}://{$host}";
            }
            return request()->getSchemeAndHttpHost();
        } catch (\Throwable $e) {
            return config('app.url', 'http://localhost:8000');
        }
    }

    private function formatTicketHeader(Ticket $ticket): string
    {
        $ticket->loadMissing(['mainCategory', 'subCategory', 'requestorBranch', 'requestor']);

        $category = e($ticket->mainCategory?->name ?? 'General');
        $subCategory = e($ticket->subCategory?->name ?? 'N/A');

        $rawPriority = $ticket->priority;
        $priorityVal = is_object($rawPriority) && isset($rawPriority->value) ? $rawPriority->value : (is_string($rawPriority) ? $rawPriority : 'Normal');

        $rawStatus = $ticket->status;
        $statusVal = is_object($rawStatus) && isset($rawStatus->value) ? $rawStatus->value : (is_string($rawStatus) ? $rawStatus : 'pending_approval');

        $priorityBadge = $this->getPriorityBadge($priorityVal);
        $statusBadge = $this->getStatusBadge($statusVal);
        $branch = e($ticket->requestorBranch?->name ?? 'N/A');
        $phone = e($ticket->requestor_phone ?? $ticket->requestorBranch?->phone ?? 'N/A');

        $header = "🎫 <b>Ticket #{$ticket->id}</b>: " . e($ticket->title) . "\n" .
               "🏢 <b>Requestor Branch:</b> {$branch}\n" .
               "📞 <b>Phone:</b> {$phone}\n" .
               "📌 <b>Status:</b> {$statusBadge}\n" .
               "⚠️ <b>Priority:</b> {$priorityBadge}\n" .
               "🏷️ <b>Category:</b> {$category} / {$subCategory}";

        if ($ticket->deadline && !in_array($statusVal, ['closed', 'rejected'], true)) {
            if ($ticket->deadline->isPast()) {
                $header .= "\n⏳ <b>SLA Status:</b> 🔴 <b>OVERDUE by " . e($ticket->deadline->diffForHumans(['parts' => 2, 'syntax' => \Carbon\CarbonInterface::DIFF_ABSOLUTE])) . "</b>";
            } else {
                $header .= "\n⏰ <b>Deadline:</b> " . e($ticket->deadline->format('M d, Y g:i A')) . " (" . e($ticket->deadline->diffForHumans()) . ")";
            }
        }

        if (!empty($ticket->image_path)) {
            $imageUrl = "{$this->getAppUrl()}/storage/" . ltrim($ticket->image_path, '/');
            $header .= "\n🖼️ <b>Attachment:</b> <a href=\"{$imageUrl}\">View Photo Attachment</a>";
        }

        return $header;
    }

    private function getPriorityBadge(string $priority): string
    {
        return match (strtolower($priority)) {
            'urgent' => '🔴 Urgent',
            'high' => '🟠 High',
            'medium' => '🟡 Medium',
            'low' => '🔵 Low',
            default => '⚪ ' . ucfirst($priority),
        };
    }

    private function getStatusBadge(string $status): string
    {
        return match (strtolower($status)) {
            'pending_approval' => '🟡 Pending Manager Approval',
            'approved' => '🔵 Approved',
            'not_started' => '🔵 Assigned (Not Started)',
            'in_progress' => '▶️ In Progress',
            'hold' => '⏸️ On Hold',
            'escalated' => '🚨 Escalated to Manager',
            'done' => '🟢 Resolved (Waiting Branch Approval)',
            'ticket_approved' => '✅ Approved & Rated by Branch',
            'closed' => '⚪ Closed',
            'rejected' => '❌ Rejected',
            default => '📌 ' . ucwords(str_replace('_', ' ', $status)),
        };
    }

    public function buildTicketInlineButton(Ticket $ticket, string $recipientRole = 'manager'): array
    {
        $statusVal = is_object($ticket->status) ? $ticket->status->value : $ticket->status;
        $buttons = [];

        if (!in_array($statusVal, ['closed', 'rejected'])) {
            $row = [];
            if ($recipientRole === 'manager') {
                if ($statusVal === 'pending_approval') {
                    $row[] = ['text' => "👍 Approve & Assign Tech", 'callback_data' => "t_asgn_list_{$ticket->id}"];
                    $row[] = ['text' => "❌ Reject", 'callback_data' => "t_st_{$ticket->id}_rejected"];
                } elseif ($statusVal === 'ticket_approved') {
                    $row[] = ['text' => "🔒 Close Ticket", 'callback_data' => "t_st_{$ticket->id}_closed"];
                } else {
                    $row[] = ['text' => "🔄 Change Status", 'callback_data' => "t_st_menu_{$ticket->id}"];
                    $row[] = ['text' => "👨‍🔧 Reassign Tech", 'callback_data' => "t_asgn_list_{$ticket->id}"];
                }
            } elseif ($recipientRole === 'requestor') {
                if ($statusVal === 'done') {
                    $row[] = ['text' => "⭐ Rate & Approve Completion", 'callback_data' => "t_st_{$ticket->id}_ticket_approved"];
                    $row[] = ['text' => "❌ Reject Completion", 'callback_data' => "t_st_{$ticket->id}_rejected"];
                }
            } else {
                if (!in_array($statusVal, ['done', 'ticket_approved'])) {
                    $row[] = ['text' => "🔄 Change Status", 'callback_data' => "t_st_menu_{$ticket->id}"];
                }
            }
            if (!empty($row)) {
                $buttons[] = $row;
            }
        }

        $row2 = [
            ['text' => "👁️ View Ticket Detail", 'callback_data' => "t_view_{$ticket->id}"],
        ];
        $buttons[] = $row2;

        $appUrl = $this->getAppUrl();
        if (str_starts_with($appUrl, 'https://')) {
            $buttons[] = [
                ['text' => "🌐 Open in Web App", 'url' => "{$appUrl}/tickets/{$ticket->id}"],
            ];
        }

        return ['inline_keyboard' => $buttons];
    }

    /**
     * Step 1: Branch User submits new request -> Notify Department Manager(s) Only
     */
    public function notifyRequestSubmitted(Ticket $ticket): void
    {
        $header = $this->formatTicketHeader($ticket);
        $description = e(mb_strimwidth($ticket->description ?? '', 0, 150, '...'));
        $buttons = $this->buildTicketInlineButton($ticket, 'manager');

        $text = "📩 <b>NEW TICKET SUBMITTED</b>\n\n" .
               "{$header}\n" .
               "📝 <b>Description:</b> {$description}\n\n" .
               "<i>Please review and assign a technical staff.</i>";

        $managerIds = $this->ticketActionService->departmentManagerUserIds($ticket->department_id);
        if (!empty($managerIds)) {
            $this->botService->sendToUsers($managerIds, $text, $buttons);
        }
    }

    /**
     * Step 2: Department Manager assigns ticket -> Notify Assigned Technical AND Requested Branch
     */
    public function notifyTicketAssigned(Ticket $ticket, User $assignee, User $actor): void
    {
        $header = $this->formatTicketHeader($ticket);
        $assignedBy = e($actor->name);
        $deadline = $ticket->deadline ? $ticket->deadline->format('Y-m-d') : 'Not Set';

        $techButtons = $this->buildTicketInlineButton($ticket, 'technician');
        $branchButtons = $this->buildTicketInlineButton($ticket, 'requestor');

        // Notify Technical Staff
        $techText = "👨‍💻 <b>TICKET ASSIGNED TO YOU</b>\n\n" .
               "{$header}\n" .
               "📅 <b>Deadline:</b> {$deadline}\n" .
               "✍️ <b>Assigned By:</b> {$assignedBy}\n\n" .
               "<i>Please attend to this case.</i>";
        $this->botService->sendToUser($assignee, $techText, $techButtons);

        // Notify Requested Branch
        $branchText = "👨‍💻 <b>STAFF ASSIGNED TO TICKET</b>\n\n" .
                      "{$header}\n" .
                      "👨‍💻 <b>Assigned Technical:</b> " . e($assignee->name) . "\n" .
                      "📅 <b>Deadline:</b> {$deadline}\n" .
                      "✍️ <b>Assigned By:</b> {$assignedBy}\n\n" .
                      "<i>Technical staff has been assigned to your request.</i>";
        $assigneeChatId = !empty($assignee->telegram_chat_id) ? [(string) $assignee->telegram_chat_id] : [];
        $this->sendToBranchOrRequestor($ticket, $branchText, $branchButtons, $assigneeChatId);
    }

    private function sendToBranchOrRequestor(Ticket $ticket, string $text, ?array $replyMarkup = null, array $excludeChatIds = []): void
    {
        $requestorUser = $ticket->requestor ?? ($ticket->user_id ? User::find($ticket->user_id) : null);
        $branch = $ticket->requestorBranch
            ?? ($ticket->requestor_branch_id ? \App\Models\Branch::find($ticket->requestor_branch_id) : null)
            ?? ($requestorUser?->employee?->branch_id ? \App\Models\Branch::find($requestorUser->employee->branch_id) : null);
        $markup = $replyMarkup ?? $this->buildTicketInlineButton($ticket);

        $sentChatIds = array_map(fn($id) => (string) $id, $excludeChatIds);

        if ($branch && !empty($branch->telegram_chat_id)) {
            $branchChatId = (string) $branch->telegram_chat_id;
            if (!in_array($branchChatId, $sentChatIds, true)) {
                $this->botService->sendToBranch($branch, $text, $markup);
                $sentChatIds[] = $branchChatId;
            }
        }

        if ($requestorUser && !empty($requestorUser->telegram_chat_id)) {
            $userChatId = (string) $requestorUser->telegram_chat_id;
            if (!in_array($userChatId, $sentChatIds, true)) {
                $this->botService->sendToUser($requestorUser, $text, $markup);
                $sentChatIds[] = $userChatId;
            }
        }
    }

    /**
     * Step 3a: Technical changes status to Done -> Notify Branch AND Department Manager
     */
    public function notifyStatusDoneByTechnical(Ticket $ticket, User $technical): void
    {
        $header = $this->formatTicketHeader($ticket);
        $techName = e($technical->name);
        $buttons = $this->buildTicketInlineButton($ticket);

        // Message to Branch
        $branchText = "✅ <b>TICKET MARKED DONE</b>\n\n" .
                      "{$header}\n" .
                      "👨‍💻 <b>Technical:</b> {$techName}\n\n" .
                      "<i>Your request has been resolved. Please log in to approve and rate the service on the web.</i>";
        $this->sendToBranchOrRequestor($ticket, $branchText, $buttons);

        // Message to Department Manager(s)
        $managerIds = $this->ticketActionService->departmentManagerUserIds($ticket->department_id);
        if (!empty($managerIds)) {
            $managerText = "✅ <b>TICKET COMPLETED BY TECHNICAL</b>\n\n" .
                           "{$header}\n" .
                           "👨‍💻 <b>Technical:</b> {$techName}\n\n" .
                           "<i>Waiting for Branch User review and approval.</i>";
            $this->botService->sendToUsers($managerIds, $managerText, $buttons);
        }
    }

    /**
     * Step 3b: Technical changes status to Escalated -> Notify Department Manager AND Requested Branch
     */
    public function notifyStatusEscalated(Ticket $ticket, User $technical, ?string $reason): void
    {
        $header = $this->formatTicketHeader($ticket);
        $techName = e($technical->name);
        $escalationReason = e($reason ?? $ticket->escalation_reason ?? 'No reason provided');
        $buttons = $this->buildTicketInlineButton($ticket);

        // Message to Branch
        $branchText = "🚨 <b>TICKET ESCALATED</b>\n\n" .
                      "{$header}\n" .
                      "👨‍💻 <b>Technical:</b> {$techName}\n" .
                      "⚠️ <b>Escalation Reason:</b> {$escalationReason}\n\n" .
                      "<i>Your ticket has been escalated to the Department Manager for assistance.</i>";
        $this->sendToBranchOrRequestor($ticket, $branchText, $buttons);

        // Message to Department Manager(s)
        $managerIds = $this->ticketActionService->departmentManagerUserIds($ticket->department_id);
        if (!empty($managerIds)) {
            $managerText = "🚨 <b>TICKET ESCALATED BY TECHNICAL</b>\n\n" .
                           "{$header}\n" .
                           "👨‍💻 <b>Technical:</b> {$techName}\n" .
                           "⚠️ <b>Escalation Reason:</b> {$escalationReason}\n\n" .
                           "<i>Department Manager action required to resolve this case.</i>";
            $this->botService->sendToUsers($managerIds, $managerText, $buttons);
        }
    }

    /**
     * Step 4: Technical changes status to Hold -> Notify Requested Branch AND Department Manager
     */
    public function notifyStatusHold(Ticket $ticket, User $technical, ?string $reason): void
    {
        $header = $this->formatTicketHeader($ticket);
        $techName = e($technical->name);
        $holdReason = e($reason ?? 'No reason provided');
        $buttons = $this->buildTicketInlineButton($ticket);

        // Message to Branch
        $branchText = "⏸️ <b>TICKET PLACED ON HOLD</b>\n\n" .
                      "{$header}\n" .
                      "👨‍💻 <b>Technical:</b> {$techName}\n" .
                      "⚠️ <b>Hold Reason:</b> {$holdReason}\n\n" .
                      "<i>Your ticket has been temporarily placed on hold.</i>";
        $this->sendToBranchOrRequestor($ticket, $branchText, $buttons);

        // Message to Department Manager(s)
        $managerIds = $this->ticketActionService->departmentManagerUserIds($ticket->department_id);
        if (!empty($managerIds)) {
            $managerText = "⏸️ <b>TICKET PLACED ON HOLD BY TECHNICAL</b>\n\n" .
                           "{$header}\n" .
                           "👨‍💻 <b>Technical:</b> {$techName}\n" .
                           "⚠️ <b>Hold Reason:</b> {$holdReason}\n\n" .
                           "<i>Technical staff placed ticket #{$ticket->id} on hold.</i>";
            $this->botService->sendToUsers($managerIds, $managerText, $buttons);
        }
    }

    /**
     * Step 4: Manager fixes case and changes status from Escalated to Done -> Notify First Assigned Technical AND Branch
     */
    public function notifyEscalationResolvedByManager(Ticket $ticket, User $manager): void
    {
        $header = $this->formatTicketHeader($ticket);
        $managerName = e($manager->name);
        $buttons = $this->buildTicketInlineButton($ticket);

        // Find the first assigned technical (or current assignment)
        $firstAssignment = $ticket->assignments()->orderBy('created_at', 'asc')->with('assignee')->first();
        $firstTechnical = $firstAssignment?->assignee;

        if ($firstTechnical) {
            $techText = "🛠️ <b>ESCALATED CASE RESOLVED BY MANAGER</b>\n\n" .
                        "{$header}\n" .
                        "👔 <b>Manager:</b> {$managerName}\n\n" .
                        "<i>The escalated ticket #{$ticket->id} has been fixed and set to Done by the Manager.</i>";
            $this->botService->sendToUser($firstTechnical, $techText, $buttons);
        }

        // Notify Branch
        $branchText = "✅ <b>ESCALATED TICKET RESOLVED</b>\n\n" .
                      "{$header}\n" .
                      "👔 <b>Manager:</b> {$managerName}\n\n" .
                      "<i>The manager has resolved your ticket. Please log in to approve and rate the service.</i>";
        $this->sendToBranchOrRequestor($ticket, $branchText, $buttons);
    }

    /**
     * Step 5: Branch User Approves & Rates -> Notify Department Manager
     */
    public function notifyApprovedAndRated(Ticket $ticket, User $branchUser, int $stars, ?string $feedback): void
    {
        $managerIds = $this->ticketActionService->departmentManagerUserIds($ticket->department_id);
        if (empty($managerIds)) {
            return;
        }

        $header = $this->formatTicketHeader($ticket);
        $requestorName = e($branchUser->name);
        $starCount = $stars > 5 ? (int) round($stars / 3) : $stars;
        $ratingStars = str_repeat('⭐', max(1, min(5, $starCount)));
        $comments = e($feedback ?? 'No feedback provided');
        $buttons = $this->buildTicketInlineButton($ticket);

        $text = "⭐ <b>TICKET APPROVED & RATED BY BRANCH</b>\n\n" .
               "{$header}\n" .
               "👤 <b>Branch User:</b> {$requestorName}\n" .
               "🌟 <b>Rating:</b> {$ratingStars} ({$starCount}/5)\n" .
               "💬 <b>Feedback:</b> {$comments}\n\n" .
               "<i>Department Manager can now close the ticket.</i>";

        $this->botService->sendToUsers($managerIds, $text, $buttons);
    }

    /**
     * Step 6: Manager changes status to Closed -> Notify Branch AND Assigned Technical
     */
    public function notifyTicketClosed(Ticket $ticket, User $actor): void
    {
        $header = $this->formatTicketHeader($ticket);
        $actorName = e($actor->name);
        $buttons = $this->buildTicketInlineButton($ticket);

        // Notify Branch
        $branchText = "🔒 <b>TICKET CLOSED</b>\n\n" .
                      "{$header}\n" .
                      "👔 <b>Closed By:</b> {$actorName}\n\n" .
                      "<i>Ticket #{$ticket->id} is officially closed. Thank you!</i>";
        $this->sendToBranchOrRequestor($ticket, $branchText, $buttons);

        // Notify Assigned Technical
        $currentAssignment = $ticket->assignments()->where('is_current', true)->with('assignee')->first();
        if ($currentAssignment?->assignee) {
            $techText = "🔒 <b>TICKET CLOSED</b>\n\n" .
                        "{$header}\n" .
                        "👔 <b>Closed By:</b> {$actorName}\n\n" .
                        "<i>Ticket #{$ticket->id} has been verified and closed by the Manager.</i>";
            $this->botService->sendToUser($currentAssignment->assignee, $techText, $buttons);
        }
    }

    /**
     * Technical marks status as In Progress -> Notify Branch AND Manager
     */
    public function notifyStatusInProgress(Ticket $ticket, User $actor): void
    {
        $header = $this->formatTicketHeader($ticket);
        $actorName = e($actor->name);
        $buttons = $this->buildTicketInlineButton($ticket);

        $branchText = "⚙️ <b>TICKET IN PROGRESS</b>\n\n" .
                      "{$header}\n" .
                      "👨‍💻 <b>Updated By:</b> {$actorName}\n\n" .
                      "<i>Technical staff has started working on your request.</i>";
        $this->sendToBranchOrRequestor($ticket, $branchText, $buttons);

        $managerIds = $this->ticketActionService->departmentManagerUserIds($ticket->department_id);
        if (!empty($managerIds)) {
            $managerText = "⚙️ <b>TICKET IN PROGRESS</b>\n\n" .
                           "{$header}\n" .
                           "👨‍💻 <b>Updated By:</b> {$actorName}\n\n" .
                           "<i>Technical staff began working on Ticket #{$ticket->id}.</i>";
            $this->botService->sendToUsers($managerIds, $managerText, $buttons);
        }
    }

    /**
     * Manager Approves Ticket -> Notify Branch AND Technical
     */
    public function notifyTicketApprovedByManager(Ticket $ticket, User $manager): void
    {
        $header = $this->formatTicketHeader($ticket);
        $managerName = e($manager->name);
        $buttons = $this->buildTicketInlineButton($ticket);

        $branchText = "✅ <b>TICKET APPROVED BY MANAGER</b>\n\n" .
                      "{$header}\n" .
                      "👔 <b>Approved By:</b> {$managerName}\n\n" .
                      "<i>Your request has been approved by the Department Manager. Technical staff will be assigned shortly.</i>";
        $this->sendToBranchOrRequestor($ticket, $branchText, $buttons);
    }

    /**
     * Branch Approves Completion -> Notify Manager AND Technical
     */
    public function notifyTicketApprovedByBranch(Ticket $ticket, User $branchUser): void
    {
        $header = $this->formatTicketHeader($ticket);
        $userName = e($branchUser->name);
        $buttons = $this->buildTicketInlineButton($ticket);

        $managerIds = $this->ticketActionService->departmentManagerUserIds($ticket->department_id);
        if (!empty($managerIds)) {
            $managerText = "👍 <b>COMPLETION APPROVED BY BRANCH</b>\n\n" .
                           "{$header}\n" .
                           "👤 <b>Approved By:</b> {$userName}\n\n" .
                           "<i>Branch user confirmed request resolution. Ready to close.</i>";
            $this->botService->sendToUsers($managerIds, $managerText, $buttons);
        }
    }

    /**
     * Ticket Rejected -> Notify Branch
     */
    /**
     * Ticket Rejected by Manager -> Notify Requested Branch with Reason
     */
    public function notifyTicketRejectedByManager(Ticket $ticket, User $actor, ?string $reason): void
    {
        $header = $this->formatTicketHeader($ticket);
        $actorName = e($actor->name);
        $rejectReason = e($reason ?? $ticket->rejection_reason ?? 'No rejection reason provided');
        $buttons = $this->buildTicketInlineButton($ticket);

        $branchText = "❌ <b>TICKET REJECTED BY MANAGER</b>\n\n" .
                      "{$header}\n" .
                      "✍️ <b>Rejected By:</b> {$actorName}\n" .
                      "⚠️ <b>Rejection Reason:</b> {$rejectReason}\n\n" .
                      "<i>Your request was rejected by the Department Manager. Please review the reason above or contact your manager for details.</i>";
        $this->sendToBranchOrRequestor($ticket, $branchText, $buttons);
    }

    public function notifyTicketRejected(Ticket $ticket, User $actor, ?string $reason): void
    {
        $this->notifyTicketRejectedByManager($ticket, $actor, $reason);
    }

    /**
     * Completion Rejected by Request Branch -> Notify Department Manager AND Assigned Technical with Reason
     */
    public function notifyCompletionRejectedByBranch(Ticket $ticket, User $branchUser, ?string $reason): void
    {
        $header = $this->formatTicketHeader($ticket);
        $userName = e($branchUser->name);
        $rejectionReason = e($reason ?? $ticket->rejection_reason ?? 'No rejection reason provided');
        $buttons = $this->buildTicketInlineButton($ticket);

        $text = "❌ <b>TICKET COMPLETION REJECTED BY BRANCH</b>\n\n" .
                "{$header}\n" .
                "👤 <b>Branch User:</b> {$userName}\n" .
                "⚠️ <b>Rejection Reason:</b> {$rejectionReason}\n\n" .
                "<i>Ticket completion was rejected and reopened. Please review the reason above and attend to the issue.</i>";

        // Notify Department Manager(s)
        $managerIds = $this->ticketActionService->departmentManagerUserIds($ticket->department_id);
        if (!empty($managerIds)) {
            $this->botService->sendToUsers($managerIds, $text, $buttons);
        }

        // Notify Assigned Technical Staff
        $currentAssignment = $ticket->assignments()->where('is_current', true)->with('assignee')->first();
        if ($currentAssignment?->assignee) {
            $this->botService->sendToUser($currentAssignment->assignee, $text, $buttons);
        }
    }

    /**
     * Generic status change notification fallback
     */
    public function notifyGenericStatusChange(Ticket $ticket, \App\Enums\TicketStatus $toStatus, User $actor, ?string $reason): void
    {
        $header = $this->formatTicketHeader($ticket);
        $actorName = e($actor->name);
        $statusLabel = e(str_replace('_', ' ', strtoupper($toStatus->value)));
        $note = $reason ? "\n📝 <b>Note:</b> " . e($reason) : "";
        $buttons = $this->buildTicketInlineButton($ticket);

        $text = "🔄 <b>TICKET STATUS UPDATED: {$statusLabel}</b>\n\n" .
                "{$header}\n" .
                "👤 <b>Updated By:</b> {$actorName}{$note}";
        $this->sendToBranchOrRequestor($ticket, $text, $buttons);

        $managerIds = $this->ticketActionService->departmentManagerUserIds($ticket->department_id);
        if (!empty($managerIds)) {
            $this->botService->sendToUsers($managerIds, $text, $buttons);
        }
    }

    /**
     * Dispatch notification for new chat/discussion message sent on ticket
     */
    public function notifyTicketChatMessage(Ticket $ticket, User $sender, string $messageText): void
    {
        $ticket->loadMissing(['requestor', 'assignments.assignee']);
        $header = $this->formatTicketHeader($ticket);
        $senderName = e($sender->name);
        $cleanMessage = e(mb_strimwidth($messageText, 0, 300, '...'));
        
        $appUrl = $this->getAppUrl();
        $buttons = [
            'inline_keyboard' => [
                [
                    ['text' => "👁️ View Ticket & Reply", 'url' => "{$appUrl}/tickets/{$ticket->id}"],
                ]
            ]
        ];

        $text = "💬 <b>NEW TICKET DISCUSSION MESSAGE</b>\n\n" .
                "{$header}\n" .
                "👤 <b>From:</b> {$senderName}\n\n" .
                "📝 <b>Message:</b>\n<i>\"{$cleanMessage}\"</i>\n\n" .
                "<i>Tap below to open ticket and reply in system.</i>";

        $recipientIds = [];

        // 1. Add Requestor
        $requestorId = $ticket->user_id ?: $ticket->requestor?->id;
        if ($requestorId && $requestorId !== $sender->id) {
            $recipientIds[] = $requestorId;
        }

        // 2. Add Department Manager(s)
        $managerIds = $this->ticketActionService->departmentManagerUserIds($ticket->department_id);
        foreach ($managerIds as $mId) {
            if ($mId !== $sender->id) {
                $recipientIds[] = $mId;
            }
        }

        // 3. Add Assigned Technical
        $currentAssignee = $ticket->assignments()->where('is_current', true)->with('assignee')->first()?->assignee;
        if ($currentAssignee && $currentAssignee->id !== $sender->id) {
            $recipientIds[] = $currentAssignee->id;
        }

        $recipientIds = array_unique($recipientIds);

        if (!empty($recipientIds)) {
            $this->botService->sendToUsers($recipientIds, $text, $buttons);
        }
    }
}

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

        $rawSeverity = $ticket->severity;
        $severityVal = is_object($rawSeverity) && isset($rawSeverity->value) ? $rawSeverity->value : (is_string($rawSeverity) ? $rawSeverity : 'No Impact');

        $priority = e(ucfirst($priorityVal));
        $severity = e(ucfirst($severityVal));
        $branch = e($ticket->requestorBranch?->name ?? 'N/A');

        return "🎫 <b>Ticket #{$ticket->id}</b>: " . e($ticket->title) . "\n" .
               "📍 <b>Branch:</b> {$branch}\n" .
               "🏷️ <b>Category:</b> {$category} / {$subCategory}\n" .
               "⚠️ <b>Priority:</b> {$priority} | <b>Severity:</b> {$severity}";
    }

    private function buildTicketInlineButton(Ticket $ticket): array
    {
        $ticketUrl = "{$this->getAppUrl()}/tickets/{$ticket->id}";
        return [
            'inline_keyboard' => [
                [
                    [
                        'text' => "👁️ View Ticket #{$ticket->id}",
                        'url' => $ticketUrl,
                    ],
                ],
            ],
        ];
    }

    /**
     * Step 1: Branch User submits new request -> Notify Department Manager(s) Only
     */
    public function notifyRequestSubmitted(Ticket $ticket): void
    {
        $header = $this->formatTicketHeader($ticket);
        $requestor = e($ticket->requestor_full_name ?? $ticket->requestor?->name ?? 'Branch User');
        $description = e(mb_strimwidth($ticket->description ?? '', 0, 150, '...'));
        $buttons = $this->buildTicketInlineButton($ticket);

        $text = "📩 <b>NEW TICKET SUBMITTED</b>\n\n" .
               "{$header}\n" .
               "👤 <b>Requestor:</b> {$requestor}\n" .
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
        $requestor = e($ticket->requestor_full_name ?? 'Branch User');
        $phone = e($ticket->requestor_phone ?? 'N/A');

        $buttons = $this->buildTicketInlineButton($ticket);

        // Notify Technical Staff
        $techText = "👨‍💻 <b>TICKET ASSIGNED TO YOU</b>\n\n" .
               "{$header}\n" .
               "👤 <b>Requestor:</b> {$requestor} (📞 {$phone})\n" .
               "📅 <b>Deadline:</b> {$deadline}\n" .
               "✍️ <b>Assigned By:</b> {$assignedBy}\n\n" .
               "<i>Please attend to this case.</i>";
        $this->botService->sendToUser($assignee, $techText, $buttons);

        // Notify Requested Branch
        $branchText = "👨‍💻 <b>STAFF ASSIGNED TO TICKET</b>\n\n" .
                      "{$header}\n" .
                      "👨‍💻 <b>Assigned Technical:</b> " . e($assignee->name) . "\n" .
                      "📅 <b>Deadline:</b> {$deadline}\n" .
                      "✍️ <b>Assigned By:</b> {$assignedBy}\n\n" .
                      "<i>Technical staff has been assigned to your request.</i>";
        $assigneeChatId = !empty($assignee->telegram_chat_id) ? [(string) $assignee->telegram_chat_id] : [];
        $this->sendToBranchOrRequestor($ticket, $branchText, $buttons, $assigneeChatId);
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
}

<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\TelegramAccount;
use App\Models\TelegramConversationState;
use App\Models\TelegramRegistration;
use App\Services\NotificationService;
use App\Services\TelegramService;
use Illuminate\Http\Request;

class TelegramWebhookController extends Controller
{
    public function __construct(
        private readonly TelegramService $telegram,
        private readonly NotificationService $notifications,
    ) {}

    public function handle(Request $request, string $secret)
    {
        $expected = config('services.telegram.webhook_secret');
        if (! $expected || ! hash_equals($expected, $secret)) {
            abort(404);
        }

        $headerToken = $request->header('X-Telegram-Bot-Api-Secret-Token');
        if ($headerToken && ! hash_equals($expected, $headerToken)) {
            abort(404);
        }

        $chatId = (string) $request->input('message.chat.id', '');
        $text = trim((string) $request->input('message.text', ''));

        if ($chatId === '') {
            return response()->json(['ok' => true]);
        }

        $state = TelegramConversationState::where('chat_id', $chatId)->first();

        match (true) {
            $text === '/start' => $this->handleStart($chatId),
            $text === '/register' => $this->beginRegistration($chatId),
            $text === '/help' => $this->sendHelp($chatId),
            (bool) $state => $this->advanceRegistration($state, $chatId, $text),
            default => $this->telegram->sendMessage($chatId, "I didn't understand that. Send /help to see available commands."),
        };

        return response()->json(['ok' => true]);
    }

    private function handleStart(string $chatId): void
    {
        $account = $this->ensureTelegramAccount($chatId);

        if ($account->is_verified) {
            $this->telegram->sendMessage($chatId, 'Welcome back! Your Telegram account is already linked to Kaldi Academy.');

            return;
        }

        $this->telegram->sendMessage($chatId, implode("\n\n", [
            'Welcome to Kaldi Academy!',
            "If you already have an account, open your Profile page on the LMS and enter this code to link Telegram:\n\n<b>{$account->link_code}</b>",
            'New here? Send /register to request an account.',
        ]));
    }

    private function beginRegistration(string $chatId): void
    {
        // Ensures a TelegramAccount row exists even if /register is sent without /start first,
        // so the approval step later has a row to attach employee_id/is_verified to.
        $this->ensureTelegramAccount($chatId);

        TelegramConversationState::updateOrCreate(
            ['chat_id' => $chatId],
            ['step' => 'first_name', 'data' => [], 'updated_at' => now()]
        );

        $this->telegram->sendMessage($chatId, "Let's get you set up. What's your first name?");
    }

    private function ensureTelegramAccount(string $chatId): TelegramAccount
    {
        $account = TelegramAccount::firstOrCreate(
            ['chat_id' => $chatId],
            ['link_code' => $this->generateLinkCode()]
        );

        if (! $account->link_code && ! $account->is_verified) {
            $account->update(['link_code' => $this->generateLinkCode()]);
        }

        return $account;
    }

    private function sendHelp(string $chatId): void
    {
        $this->telegram->sendMessage($chatId, implode("\n", [
            '<b>Kaldi Academy Bot</b>',
            '/start — link this chat to your account or get a linking code',
            '/register — request a new employee account (subject to admin approval)',
            '/help — show this message',
        ]));
    }

    private function advanceRegistration(TelegramConversationState $state, string $chatId, string $text): void
    {
        $data = $state->data ?? [];

        switch ($state->step) {
            case 'first_name':
                $data['first_name'] = $text;
                $state->update(['step' => 'last_name', 'data' => $data, 'updated_at' => now()]);
                $this->telegram->sendMessage($chatId, 'And your last name?');
                break;

            case 'last_name':
                $data['last_name'] = $text;
                $state->update(['step' => 'email', 'data' => $data, 'updated_at' => now()]);
                $this->telegram->sendMessage($chatId, "What's your email address?");
                break;

            case 'email':
                if (! filter_var($text, FILTER_VALIDATE_EMAIL)) {
                    $this->telegram->sendMessage($chatId, "That doesn't look like a valid email. Please try again:");
                    break;
                }
                $data['email'] = strtolower($text);
                $state->update(['step' => 'phone', 'data' => $data, 'updated_at' => now()]);
                $this->telegram->sendMessage($chatId, "What's your phone number? (send - to skip)");
                break;

            case 'phone':
                $data['phone'] = $text === '-' ? null : $text;
                $branches = Branch::where('status', 'active')->orderBy('name')->get(['id', 'name']);
                $data['branch_options'] = $branches->pluck('id')->all();
                $state->update(['step' => 'branch', 'data' => $data, 'updated_at' => now()]);
                $list = $branches->values()->map(fn ($b, $i) => ($i + 1).". {$b->name}")->implode("\n");
                $this->telegram->sendMessage($chatId, "Which branch do you work at? Reply with the number:\n\n{$list}");
                break;

            case 'branch':
                $branchIds = $data['branch_options'] ?? [];
                $index = ((int) $text) - 1;

                if (! isset($branchIds[$index])) {
                    $this->telegram->sendMessage($chatId, 'Please reply with a valid number from the list.');
                    break;
                }

                $registration = TelegramRegistration::create([
                    'chat_id' => $chatId,
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'email' => $data['email'],
                    'phone' => $data['phone'] ?? null,
                    'branch_id' => $branchIds[$index],
                    'status' => 'pending',
                ]);

                $state->delete();

                $this->telegram->sendMessage($chatId, "Thanks, {$data['first_name']}! Your registration request has been submitted and is pending admin approval. We'll message you here once it's reviewed.");

                $this->notifications->sendToPermissionHolders(
                    'user.approve',
                    'system',
                    'New registration request',
                    "{$registration->first_name} {$registration->last_name} ({$registration->email}) requested access via the Telegram bot.",
                    '/users'
                );
                break;
        }
    }

    private function generateLinkCode(): string
    {
        do {
            $code = (string) random_int(100000, 999999);
        } while (TelegramAccount::where('link_code', $code)->exists());

        return $code;
    }
}

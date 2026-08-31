<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use PDO;
use Throwable;

class KaldisCommunicationController extends Controller
{
    private function getDbPath(): string
    {
        return base_path('telegramgroup_mgt/kaldis.db');
    }

    private function getConfigPath(): string
    {
        return base_path('telegramgroup_mgt/config.json');
    }

    private function getPdo(): PDO
    {
        $dbPath = $this->getDbPath();
        $dir = dirname($dbPath);
        if (!file_exists($dir)) {
            mkdir($dir, 0755, true);
        }

        $pdo = new PDO('sqlite:' . $dbPath, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        $pdo->exec('PRAGMA foreign_keys = ON');

        // Ensure tables exist
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS users (
                telegram_user_id INTEGER PRIMARY KEY,
                display_name TEXT NOT NULL,
                role TEXT NOT NULL,
                region TEXT,
                branch_name TEXT,
                department TEXT,
                can_forward INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS topic_bindings (
                group_key TEXT NOT NULL,
                thread_id INTEGER NOT NULL,
                topic_name TEXT NOT NULL,
                department TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (group_key, thread_id)
            )'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS communications (
                reference_no TEXT PRIMARY KEY,
                region TEXT NOT NULL,
                branch_name TEXT,
                topic_name TEXT NOT NULL,
                department TEXT NOT NULL,
                source_chat_id INTEGER NOT NULL,
                source_message_id INTEGER NOT NULL,
                source_thread_id INTEGER,
                sender_user_id INTEGER,
                sender_display_name TEXT NOT NULL,
                ho_chat_id INTEGER,
                ho_summary_message_id INTEGER,
                ho_message_id INTEGER,
                regional_manager_user_id INTEGER,
                department_head_user_id INTEGER,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )'
        );

        return $pdo;
    }

    private function readConfig(): array
    {
        $configPath = $this->getConfigPath();
        if (!file_exists($configPath)) {
            $examplePath = base_path('telegramgroup_mgt/config.example.json');
            if (file_exists($examplePath)) {
                copy($examplePath, $configPath);
            } else {
                file_put_contents($configPath, json_encode([
                    'bot_token' => '',
                    'region_groups' => [
                        'Region 1' => 0,
                        'Region 2' => 0
                    ],
                    'groups' => [
                        'Region 1' => 0,
                        'Region 2' => 0,
                        'Head Office' => 0
                    ],
                    'ho_group_chat_id' => 0,
                    'operations_director_user_id' => 0,
                    'database' => 'kaldis.db'
                ], JSON_PRETTY_PRINT));
            }
        }

        $content = file_get_contents($configPath);
        $data = json_decode($content, true) ?: [];

        $reg1 = $data['region_groups']['Region 1'] ?? ($data['groups']['Region 1'] ?? 0);
        $reg2 = $data['region_groups']['Region 2'] ?? ($data['groups']['Region 2'] ?? 0);
        $hoGroup = $data['ho_group_chat_id'] ?? ($data['groups']['Head Office'] ?? ($data['region_groups']['Head Office'] ?? 0));

        return [
            'bot_token' => $data['bot_token'] ?? '',
            'region_groups' => [
                'Region 1' => (int) $reg1,
                'Region 2' => (int) $reg2,
            ],
            'groups' => [
                'Region 1' => (int) $reg1,
                'Region 2' => (int) $reg2,
                'Head Office' => (int) $hoGroup,
            ],
            'ho_group_chat_id' => (int) $hoGroup,
            'operations_director_user_id' => $data['operations_director_user_id'] ?? 0,
            'database' => $data['database'] ?? 'kaldis.db'
        ];
    }

    public function index(Request $request): Response
    {
        $user = auth()->user();
        $canView = $user->hasRole(['Super Admin', 'Admin', 'Ticket Super Admin'])
            || $user->can('view telegram config')
            || $user->can('manage telegram config');

        if (!$canView) {
            abort(403, 'You do not have permission to view Kaldis Branch Communication.');
        }

        $pdo = $this->getPdo();
        $config = $this->readConfig();

        // Get Stats
        $totalComms = (int) ($pdo->query('SELECT COUNT(*) FROM communications')->fetchColumn() ?: 0);
        $recordedComms = (int) ($pdo->query("SELECT COUNT(*) FROM communications WHERE status = 'recorded'")->fetchColumn() ?: 0);
        $forwardedComms = (int) ($pdo->query("SELECT COUNT(*) FROM communications WHERE status = 'forwarded'")->fetchColumn() ?: 0);
        $respondedComms = (int) ($pdo->query("SELECT COUNT(*) FROM communications WHERE status = 'responded'")->fetchColumn() ?: 0);
        $totalUsers = (int) ($pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() ?: 0);
        $totalBindings = (int) ($pdo->query('SELECT COUNT(*) FROM topic_bindings')->fetchColumn() ?: 0);

        // Fetch Users Roster
        $usersStmt = $pdo->query('SELECT * FROM users ORDER BY role, display_name');
        $rosterUsers = $usersStmt->fetchAll() ?: [];

        // Fetch Topic Bindings
        $bindingsStmt = $pdo->query('SELECT * FROM topic_bindings ORDER BY group_key, topic_name');
        $topicBindings = $bindingsStmt->fetchAll() ?: [];

        // Fetch Recent Communications
        $search = $request->input('search');
        $regionFilter = $request->input('region');
        $statusFilter = $request->input('status');

        $query = 'SELECT * FROM communications WHERE 1=1';
        $params = [];

        if ($search) {
            $query .= ' AND (reference_no LIKE :search OR branch_name LIKE :search OR sender_display_name LIKE :search OR topic_name LIKE :search OR department LIKE :search)';
            $params[':search'] = '%' . $search . '%';
        }

        if ($regionFilter) {
            $query .= ' AND region = :region';
            $params[':region'] = $regionFilter;
        }

        if ($statusFilter) {
            $query .= ' AND status = :status';
            $params[':status'] = $statusFilter;
        }

        $query .= ' ORDER BY created_at DESC LIMIT 50';

        $commsStmt = $pdo->prepare($query);
        $commsStmt->execute($params);
        $communications = $commsStmt->fetchAll() ?: [];

        // Standard Topic Mapping Defaults
        $defaultTopicMapping = [
            'Announcements' => 'Operations',
            'Operations' => 'Operations',
            'HR' => 'HR',
            'Finance' => 'Finance',
            'Supply Chain' => 'Supply Chain',
            'IT' => 'IT',
            'Maintenance' => 'Maintenance',
            'F&B' => 'F&B',
            'T&D' => 'T&D',
            'QA' => 'QA',
            'Logistics & BI' => 'Logistics & BI',
            'Suggestions & Improvements' => 'Operations',
        ];

        // System Departments & Branches for dropdown selectors
        $departments = Department::where('is_active', true)->orderBy('name')->pluck('name');
        $branches = Branch::orderBy('name')->get(['id', 'name']);
        $systemUsers = User::orderBy('name')->get(['id', 'name', 'email', 'telegram_chat_id']);

        return Inertia::render('kaldis-communication/index', [
            'stats' => [
                'total_communications' => $totalComms,
                'recorded_communications' => $recordedComms,
                'forwarded_communications' => $forwardedComms,
                'responded_communications' => $respondedComms,
                'total_users' => $totalUsers,
                'total_bindings' => $totalBindings,
            ],
            'config' => $config,
            'rosterUsers' => $rosterUsers,
            'topicBindings' => $topicBindings,
            'communications' => $communications,
            'defaultTopicMapping' => $defaultTopicMapping,
            'departments' => $departments,
            'branches' => $branches,
            'systemUsers' => $systemUsers,
            'filters' => [
                'search' => $search ?? '',
                'region' => $regionFilter ?? '',
                'status' => $statusFilter ?? '',
            ],
            'canManage' => auth()->user()->hasRole(['Super Admin', 'Admin']) || auth()->user()->can('manage telegram config'),
        ]);
    }

    public function updateConfig(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'bot_token' => ['nullable', 'string', 'max:255'],
            'region_1_chat_id' => ['nullable', 'numeric'],
            'region_2_chat_id' => ['nullable', 'numeric'],
            'ho_group_chat_id' => ['nullable', 'numeric'],
            'operations_director_user_id' => ['nullable', 'numeric'],
        ]);

        $reg1 = (int) ($validated['region_1_chat_id'] ?? 0);
        $reg2 = (int) ($validated['region_2_chat_id'] ?? 0);
        $hoChat = (int) ($validated['ho_group_chat_id'] ?? 0);

        $configData = [
            'bot_token' => trim($validated['bot_token'] ?? ''),
            'region_groups' => [
                'Region 1' => $reg1,
                'Region 2' => $reg2,
            ],
            'groups' => [
                'Region 1' => $reg1,
                'Region 2' => $reg2,
                'Head Office' => $hoChat,
            ],
            'ho_group_chat_id' => $hoChat,
            'operations_director_user_id' => (int) ($validated['operations_director_user_id'] ?? 0),
            'database' => 'kaldis.db'
        ];

        file_put_contents($this->getConfigPath(), json_encode($configData, JSON_PRETTY_PRINT));

        // Auto-register Bot Commands with Telegram setMyCommands for all group chats
        if (!empty($configData['bot_token'])) {
            $this->registerCommandsToTelegram($configData['bot_token']);
        }

        return redirect()->back()->with('success', 'Kaldis Communication bot settings updated and Telegram slash commands registered for all groups!');
    }

    public function registerCommands(Request $request): RedirectResponse
    {
        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');

        if (empty($botToken)) {
            return redirect()->back()->withErrors(['commands' => 'Telegram Bot Token is not configured.']);
        }

        $success = $this->registerCommandsToTelegram($botToken, $error);

        if ($success) {
            return redirect()->back()->with('success', 'Successfully registered 13 topic commands in Telegram for all group chats and private chats!');
        }

        return redirect()->back()->withErrors(['commands' => "Telegram API Error: {$error}"]);
    }

    private function registerCommandsToTelegram(string $botToken, ?string &$error = null): bool
    {
        $commandsList = [
            ['command' => 'topics', 'description' => 'Open Kaldis Topics Directory'],
            ['command' => 'it', 'description' => 'Jump to IT Topic'],
            ['command' => 'hr', 'description' => 'Jump to HR Topic'],
            ['command' => 'finance', 'description' => 'Jump to Finance Topic'],
            ['command' => 'ops', 'description' => 'Jump to Operations Topic'],
            ['command' => 'supply', 'description' => 'Jump to Supply Chain Topic'],
            ['command' => 'maintenance', 'description' => 'Jump to Maintenance Topic'],
            ['command' => 'fb', 'description' => 'Jump to F&B Topic'],
            ['command' => 'td', 'description' => 'Jump to T&D Topic'],
            ['command' => 'qa', 'description' => 'Jump to QA Topic'],
            ['command' => 'logistics', 'description' => 'Jump to Logistics & BI Topic'],
            ['command' => 'suggestions', 'description' => 'Jump to Suggestions Topic'],
            ['command' => 'help', 'description' => 'Show User Registration & Commands Guide'],
        ];

        try {
            // Set commands for Default / Private chats
            $resp1 = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/setMyCommands", [
                'commands' => $commandsList,
                'scope' => ['type' => 'default'],
            ]);

            // Set commands for All Group Chats (Group & Supergroups!)
            $resp2 = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/setMyCommands", [
                'commands' => $commandsList,
                'scope' => ['type' => 'all_group_chats'],
            ]);

            $d1 = $resp1->json();
            $d2 = $resp2->json();

            if (($d1['ok'] ?? false) && ($d2['ok'] ?? false)) {
                return true;
            }

            $error = $d2['description'] ?? ($d1['description'] ?? 'Failed to setMyCommands');
            return false;
        } catch (\Throwable $e) {
            $error = $e->getMessage();
            return false;
        }
    }

    public function registerWebhook(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'webhook_url' => ['nullable', 'string', 'max:500'],
        ]);

        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');

        if (empty($botToken)) {
            return redirect()->back()->withErrors(['webhook' => 'Telegram Bot Token is not configured.']);
        }

        $inputUrl = trim($validated['webhook_url'] ?? '');
        if (!empty($inputUrl)) {
            $webhookUrl = $inputUrl;
            if (!str_contains($webhookUrl, '/api/telegram')) {
                $webhookUrl = rtrim($webhookUrl, '/') . '/api/telegram/kaldis-communication';
            }
        } else {
            $appUrl = config('app.url') ?: $request->schemeAndHttpHost();
            if (str_starts_with($appUrl, 'http://')) {
                $appUrl = 'https://' . substr($appUrl, 7);
            }
            $webhookUrl = rtrim($appUrl, '/') . '/api/telegram/kaldis-communication';
        }

        if (!str_starts_with($webhookUrl, 'https://')) {
            return redirect()->back()->withErrors(['webhook' => 'Telegram requires an HTTPS Webhook URL starting with https:// (e.g. https://your-domain.com or https://xxxx.ngrok-free.app). Please enter your HTTPS domain below.']);
        }

        try {
            $resp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/setWebhook", [
                'url' => $webhookUrl,
                'allowed_updates' => ['message', 'edited_message', 'channel_post', 'chat_member', 'my_chat_member', 'callback_query'],
            ]);

            $data = $resp->json();
            if ($data['ok'] ?? false) {
                return redirect()->back()->with('success', "Telegram Webhook set successfully to {$webhookUrl}! Live member auto-registration and commands are now active for all 3 groups.");
            }

            $err = $data['description'] ?? 'Failed to set webhook';
            return redirect()->back()->withErrors(['webhook' => "Telegram API Error: {$err}. Tip: Ensure your URL starts with https://"]);
        } catch (\Throwable $e) {
            return redirect()->back()->withErrors(['webhook' => "Network Error: " . $e->getMessage()]);
        }
    }

    public function storeBinding(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'group_key' => ['required', 'string'],
            'thread_id' => ['required', 'integer'],
            'topic_name' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:255'],
        ]);

        $pdo = $this->getPdo();
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $cleanTopic = trim($validated['topic_name']);

        // Check for duplicate topic in same group
        $checkStmt = $pdo->prepare(
            'SELECT thread_id FROM topic_bindings
             WHERE group_key = :group_key
               AND LOWER(TRIM(topic_name)) = LOWER(:topic_name)
               AND thread_id != :thread_id'
        );
        $checkStmt->execute([
            ':group_key' => $validated['group_key'],
            ':topic_name' => $cleanTopic,
            ':thread_id' => (int) $validated['thread_id'],
        ]);
        if ($checkStmt->fetch()) {
            return redirect()->back()->withErrors([
                'topic_name' => "Duplicate Topic Error: A topic named '{$cleanTopic}' already exists in {$validated['group_key']} Group!"
            ]);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO topic_bindings (group_key, thread_id, topic_name, department, created_at, updated_at)
             VALUES (:group_key, :thread_id, :topic_name, :department, :created_at, :updated_at)
             ON CONFLICT(group_key, thread_id) DO UPDATE SET
                 topic_name = excluded.topic_name,
                 department = excluded.department,
                 updated_at = excluded.updated_at'
        );

        $stmt->execute([
            ':group_key' => $validated['group_key'],
            ':thread_id' => $validated['thread_id'],
            ':topic_name' => $cleanTopic,
            ':department' => $validated['department'],
            ':created_at' => $now,
            ':updated_at' => $now,
        ]);

        return redirect()->back()->with('success', 'Topic binding saved successfully.');
    }

    public function updateBinding(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'group_key' => ['required', 'string'],
            'thread_id' => ['required', 'integer'],
            'topic_name' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:255'],
            'sync_to_telegram' => ['nullable', 'boolean'],
        ]);

        $pdo = $this->getPdo();
        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $cleanTopic = trim($validated['topic_name']);

        // Check for duplicate topic in same group
        $checkStmt = $pdo->prepare(
            'SELECT thread_id FROM topic_bindings
             WHERE group_key = :group_key
               AND LOWER(TRIM(topic_name)) = LOWER(:topic_name)
               AND thread_id != :thread_id'
        );
        $checkStmt->execute([
            ':group_key' => $validated['group_key'],
            ':topic_name' => $cleanTopic,
            ':thread_id' => (int) $validated['thread_id'],
        ]);
        if ($checkStmt->fetch()) {
            return redirect()->back()->withErrors([
                'topic_name' => "Duplicate Topic Error: Cannot rename topic to '{$cleanTopic}' because a topic with this name already exists in {$validated['group_key']} Group!"
            ]);
        }

        $chatId = null;
        if ($validated['group_key'] === 'Region 1') {
            $chatId = $config['region_groups']['Region 1'] ?? ($config['groups']['Region 1'] ?? null);
        } elseif ($validated['group_key'] === 'Region 2') {
            $chatId = $config['region_groups']['Region 2'] ?? ($config['groups']['Region 2'] ?? null);
        } elseif ($validated['group_key'] === 'Head Office' || str_starts_with($validated['group_key'], 'ho:')) {
            $chatId = $config['ho_group_chat_id'] ?? ($config['groups']['Head Office'] ?? null);
        }

        $telegramUpdated = false;
        $telegramError = null;

        if (!empty($validated['sync_to_telegram']) && !empty($botToken) && !empty($chatId)) {
            try {
                $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/editForumTopic", [
                    'chat_id' => (int) $chatId,
                    'message_thread_id' => (int) $validated['thread_id'],
                    'name' => $cleanTopic,
                ]);
                $data = $response->json();
                if ($data['ok'] ?? false) {
                    $telegramUpdated = true;
                } else {
                    $telegramError = $data['description'] ?? 'Failed to update topic on Telegram API';
                }
            } catch (\Throwable $e) {
                $telegramError = $e->getMessage();
            }
        }

        $stmt = $pdo->prepare(
            'UPDATE topic_bindings
             SET topic_name = :topic_name, department = :department, updated_at = :updated_at
             WHERE group_key = :group_key AND thread_id = :thread_id'
        );

        $stmt->execute([
            ':topic_name' => $cleanTopic,
            ':department' => $validated['department'],
            ':updated_at' => $now,
            ':group_key' => $validated['group_key'],
            ':thread_id' => $validated['thread_id'],
        ]);

        $msg = 'Topic binding updated successfully.';
        if ($telegramUpdated) {
            $msg .= ' Topic name was also updated in Telegram group!';
        } elseif ($telegramError) {
            $msg .= " (Note: Telegram group edit error: {$telegramError})";
        }

        return redirect()->back()->with('success', $msg);
    }

    public function deleteBinding(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'group_key' => ['required', 'string'],
            'thread_id' => ['required', 'integer'],
            'delete_from_telegram' => ['nullable', 'boolean'],
        ]);

        $pdo = $this->getPdo();
        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');

        $chatId = null;
        if ($validated['group_key'] === 'Region 1') {
            $chatId = $config['region_groups']['Region 1'] ?? null;
        } elseif ($validated['group_key'] === 'Region 2') {
            $chatId = $config['region_groups']['Region 2'] ?? null;
        } elseif ($validated['group_key'] === 'Head Office') {
            $chatId = $config['ho_group_chat_id'] ?? null;
        }

        $telegramDeleted = false;
        $telegramError = null;

        if (!empty($validated['delete_from_telegram']) && !empty($botToken) && !empty($chatId)) {
            try {
                $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/deleteForumTopic", [
                    'chat_id' => (int) $chatId,
                    'message_thread_id' => (int) $validated['thread_id'],
                ]);
                $data = $response->json();
                if ($data['ok'] ?? false) {
                    $telegramDeleted = true;
                } else {
                    $telegramError = $data['description'] ?? 'Failed to delete topic from Telegram API';
                }
            } catch (\Throwable $e) {
                $telegramError = $e->getMessage();
            }
        }

        $stmt = $pdo->prepare('DELETE FROM topic_bindings WHERE group_key = :group_key AND thread_id = :thread_id');
        $stmt->execute([
            ':group_key' => $validated['group_key'],
            ':thread_id' => $validated['thread_id'],
        ]);

        $msg = 'Topic binding removed from database.';
        if ($telegramDeleted) {
            $msg .= ' Forum topic was also deleted from Telegram group!';
        } elseif ($telegramError) {
            $msg .= " (Note: Could not delete topic from Telegram group: {$telegramError})";
        }

        return redirect()->back()->with('success', $msg);
    }

    public function storeUser(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'telegram_user_id' => ['required', 'numeric'],
            'display_name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'in:branch_manager,regional_manager,department_head,operations_director'],
            'region' => ['nullable', 'string', 'max:255'],
            'branch_name' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'can_forward' => ['nullable', 'boolean'],
        ]);

        $pdo = $this->getPdo();
        $now = gmdate('Y-m-d\TH:i:s\Z');

        $stmt = $pdo->prepare(
            'INSERT INTO users (
                telegram_user_id, display_name, role, region, branch_name, department, can_forward, created_at, updated_at
            ) VALUES (
                :telegram_user_id, :display_name, :role, :region, :branch_name, :department, :can_forward, :created_at, :updated_at
            ) ON CONFLICT(telegram_user_id) DO UPDATE SET
                display_name = excluded.display_name,
                role = excluded.role,
                region = excluded.region,
                branch_name = excluded.branch_name,
                department = excluded.department,
                can_forward = excluded.can_forward,
                updated_at = excluded.updated_at'
        );

        $stmt->execute([
            ':telegram_user_id' => (int) $validated['telegram_user_id'],
            ':display_name' => $validated['display_name'],
            ':role' => $validated['role'],
            ':region' => $validated['region'] ?? null,
            ':branch_name' => $validated['branch_name'] ?? null,
            ':department' => $validated['department'] ?? null,
            ':can_forward' => ($validated['role'] === 'regional_manager' || $validated['role'] === 'operations_director' || !empty($validated['can_forward'])) ? 1 : 0,
            ':created_at' => $now,
            ':updated_at' => $now,
        ]);

        // Auto-generate Telegram group invite link
        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');
        $inviteLink = null;
        $pmSent = false;

        $targetGroupKey = $validated['region'] ?? 'Region 1';
        if ($validated['role'] === 'department_head' || $validated['role'] === 'operations_director') {
            $targetGroupKey = 'Head Office';
        }

        $chatId = null;
        if ($targetGroupKey === 'Region 1') {
            $chatId = $config['region_groups']['Region 1'] ?? ($config['groups']['Region 1'] ?? null);
        } elseif ($targetGroupKey === 'Region 2') {
            $chatId = $config['region_groups']['Region 2'] ?? ($config['groups']['Region 2'] ?? null);
        } else {
            $chatId = $config['ho_group_chat_id'] ?? ($config['groups']['Head Office'] ?? null);
        }

        if (!empty($botToken) && !empty($chatId)) {
            try {
                $linkResp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/createChatInviteLink", [
                    'chat_id' => (int) $chatId,
                    'name' => 'Invite for ' . $validated['display_name'],
                ]);
                $linkData = $linkResp->json();
                if ($linkData['ok'] ?? false) {
                    $inviteLink = $linkData['result']['invite_link'] ?? null;
                }

                if ($inviteLink && !empty($validated['telegram_user_id'])) {
                    $pmResp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                        'chat_id' => (int) $validated['telegram_user_id'],
                        'text' => "☕ <b>Welcome to KALDIS Coffee, {$validated['display_name']}!</b>\n\nYou are registered in the staff roster. Click below to join your assigned <b>{$targetGroupKey}</b> Telegram Group:\n\n🔗 <a href=\"{$inviteLink}\">{$inviteLink}</a>",
                        'parse_mode' => 'HTML',
                    ]);
                    if ($pmResp->json('ok') ?? false) {
                        $pmSent = true;
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Auto invite generation error: " . $e->getMessage());
            }
        }

        $msg = "Roster user '{$validated['display_name']}' registered successfully.";
        if ($inviteLink) {
            $msg .= " Group Join Link generated: {$inviteLink}";
            if ($pmSent) {
                $msg .= " (Direct PM sent to user's Telegram!).";
            }
        }

        return redirect()->back()->with('success', $msg);
    }

    public function generateInviteLink(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'telegram_user_id' => ['required', 'numeric'],
            'group_key' => ['required', 'string'],
        ]);

        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');
        $userId = (int) $validated['telegram_user_id'];
        $groupKey = $validated['group_key'];

        $chatId = null;
        if ($groupKey === 'Region 1') {
            $chatId = $config['region_groups']['Region 1'] ?? ($config['groups']['Region 1'] ?? null);
        } elseif ($groupKey === 'Region 2') {
            $chatId = $config['region_groups']['Region 2'] ?? ($config['groups']['Region 2'] ?? null);
        } else {
            $chatId = $config['ho_group_chat_id'] ?? ($config['groups']['Head Office'] ?? null);
        }

        if (empty($botToken) || empty($chatId)) {
            return redirect()->back()->withErrors(['invite' => 'Bot Token or Group Chat ID is missing in settings.']);
        }

        try {
            $resp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/createChatInviteLink", [
                'chat_id' => (int) $chatId,
                'name' => "Invite for User ID {$userId}",
            ]);

            $data = $resp->json();
            if (($data['ok'] ?? false) && isset($data['result']['invite_link'])) {
                $link = $data['result']['invite_link'];

                $pmSent = false;
                try {
                    $pmResp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                        'chat_id' => $userId,
                        'text' => "☕ <b>KALDIS Staff Invitation</b>\n\nHere is your official link to join the <b>{$groupKey}</b> Telegram Group:\n\n🔗 <a href=\"{$link}\">{$link}</a>",
                        'parse_mode' => 'HTML',
                    ]);
                    $pmSent = $pmResp->json('ok') ?? false;
                } catch (\Throwable $e) {
                    // user might not have started bot private chat yet
                }

                $msg = "Generated official Join Link for {$groupKey}: {$link}";
                if ($pmSent) {
                    $msg .= " (Directly sent to user's Telegram PM!)";
                } else {
                    $msg .= " (PM not sent because user hasn't started private chat with bot yet. Copy & send link manually).";
                }

                return redirect()->back()->with('success', $msg);
            }

            $err = $data['description'] ?? 'Failed to create chat invite link.';
            return redirect()->back()->withErrors(['invite' => "Telegram Error: {$err}"]);
        } catch (\Throwable $e) {
            return redirect()->back()->withErrors(['invite' => "Network Error: " . $e->getMessage()]);
        }
    }

    public function updateUser(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'telegram_user_id' => ['required', 'numeric'],
            'display_name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'in:branch_manager,regional_manager,department_head,operations_director'],
            'region' => ['nullable', 'string', 'max:255'],
            'branch_name' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'can_forward' => ['nullable', 'boolean'],
        ]);

        $pdo = $this->getPdo();
        $now = gmdate('Y-m-d\TH:i:s\Z');

        $stmt = $pdo->prepare(
            'UPDATE users SET
                display_name = :display_name,
                role = :role,
                region = :region,
                branch_name = :branch_name,
                department = :department,
                can_forward = :can_forward,
                updated_at = :updated_at
             WHERE telegram_user_id = :telegram_user_id'
        );

        $stmt->execute([
            ':telegram_user_id' => (int) $validated['telegram_user_id'],
            ':display_name' => $validated['display_name'],
            ':role' => $validated['role'],
            ':region' => $validated['region'] ?? null,
            ':branch_name' => $validated['branch_name'] ?? null,
            ':department' => $validated['department'] ?? null,
            ':can_forward' => ($validated['role'] === 'regional_manager' || $validated['role'] === 'operations_director' || !empty($validated['can_forward'])) ? 1 : 0,
            ':updated_at' => $now,
        ]);

        return redirect()->back()->with('success', "Roster profile for '{$validated['display_name']}' updated successfully.");
    }

    public function syncMembersFromTelegram(Request $request): RedirectResponse
    {
        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');

        if (empty($botToken)) {
            return redirect()->back()->withErrors(['sync' => 'Telegram Bot Token is not configured. Please save your Bot Token first.']);
        }

        $pdo = $this->getPdo();
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $syncedCount = 0;

        $groups = [];
        $reg1 = $config['region_groups']['Region 1'] ?? ($config['groups']['Region 1'] ?? null);
        $reg2 = $config['region_groups']['Region 2'] ?? ($config['groups']['Region 2'] ?? null);
        $hoChat = $config['ho_group_chat_id'] ?? ($config['groups']['Head Office'] ?? null);

        if (!empty($reg1)) $groups['Region 1'] = (int) $reg1;
        if (!empty($reg2)) $groups['Region 2'] = (int) $reg2;
        if (!empty($hoChat)) $groups['Head Office'] = (int) $hoChat;

        $stmt = $pdo->prepare(
            'INSERT INTO users (
                telegram_user_id, display_name, role, region, branch_name, department, can_forward, created_at, updated_at
            ) VALUES (
                :telegram_user_id, :display_name, :role, :region, :branch_name, :department, :can_forward, :created_at, :updated_at
            ) ON CONFLICT(telegram_user_id) DO UPDATE SET
                display_name = CASE WHEN users.display_name IS NULL OR users.display_name = "" OR users.display_name LIKE "Telegram User%" THEN excluded.display_name ELSE users.display_name END,
                updated_at = excluded.updated_at'
        );

        // 1. Fetch Administrators & Members from Telegram API for each group (Region 1, Region 2 & Head Office)
        foreach ($groups as $groupKey => $chatId) {
            if (empty($chatId)) continue;

            try {
                $resp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/getChatAdministrators", [
                    'chat_id' => (int) $chatId,
                ]);

                $data = $resp->json();
                if (($data['ok'] ?? false) && is_array($data['result'] ?? null)) {
                    foreach ($data['result'] as $adminItem) {
                        $user = $adminItem['user'] ?? [];
                        if (($user['is_bot'] ?? false) === true) continue;

                        $userId = (int) ($user['id'] ?? 0);
                        if ($userId <= 0) continue;

                        $nameParts = [];
                        if (!empty($user['first_name'])) $nameParts[] = $user['first_name'];
                        if (!empty($user['last_name'])) $nameParts[] = $user['last_name'];
                        $displayName = implode(' ', $nameParts);
                        if (!empty($user['username'])) {
                            $displayName .= ($displayName !== '' ? " (@{$user['username']})" : "@{$user['username']}");
                        }
                        if (empty($displayName)) $displayName = "Telegram User {$userId}";

                        $defaultRole = ($groupKey === 'Head Office') ? 'department_head' : 'branch_manager';
                        $defaultDept = ($groupKey === 'Head Office') ? 'Operations' : null;

                        $stmt->execute([
                            ':telegram_user_id' => $userId,
                            ':display_name' => $displayName,
                            ':role' => $defaultRole,
                            ':region' => $groupKey,
                            ':branch_name' => null,
                            ':department' => $defaultDept,
                            ':can_forward' => ($defaultRole === 'department_head') ? 1 : 0,
                            ':created_at' => $now,
                            ':updated_at' => $now,
                        ]);

                        $syncedCount++;
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("getChatAdministrators error for group {$groupKey}: " . $e->getMessage());
            }
        }

        // 2. Also Sync from recent communication logs & group messages
        try {
            $commStmt = $pdo->query("SELECT DISTINCT sender_user_id, sender_display_name, region FROM communications WHERE sender_user_id IS NOT NULL AND sender_user_id > 0");
            $commRows = $commStmt->fetchAll();
            foreach ($commRows as $row) {
                $userId = (int) $row['sender_user_id'];
                $displayName = trim((string) $row['sender_display_name']);
                if (empty($displayName)) $displayName = "Telegram User {$userId}";
                $region = $row['region'] ?: 'Region 1';

                $stmt->execute([
                    ':telegram_user_id' => $userId,
                    ':display_name' => $displayName,
                    ':role' => ($region === 'Head Office') ? 'department_head' : 'branch_manager',
                    ':region' => $region,
                    ':branch_name' => null,
                    ':department' => ($region === 'Head Office') ? 'Operations' : null,
                    ':can_forward' => 0,
                    ':created_at' => $now,
                    ':updated_at' => $now,
                ]);

                $syncedCount++;
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Communications sender sync error: " . $e->getMessage());
        }

        return redirect()->back()->with('success', "Sync complete! Processed {$syncedCount} Telegram member records across Region 1, Region 2, and Head Office. Admin can now edit Branch, Department, and Display Name.");
    }

    public function fetchTelegramMember(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'telegram_user_id' => ['required', 'numeric'],
        ]);

        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');
        $userId = (int) $validated['telegram_user_id'];

        if (empty($botToken)) {
            return redirect()->back()->withErrors(['fetch' => 'Telegram Bot Token is not configured.']);
        }

        $groups = [
            'Head Office' => $config['ho_group_chat_id'] ?? ($config['groups']['Head Office'] ?? null),
            'Region 1' => $config['region_groups']['Region 1'] ?? ($config['groups']['Region 1'] ?? null),
            'Region 2' => $config['region_groups']['Region 2'] ?? ($config['groups']['Region 2'] ?? null),
        ];

        $fetchedName = null;
        $foundGroup = null;

        foreach ($groups as $groupKey => $chatId) {
            if (empty($chatId)) continue;
            try {
                $resp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/getChatMember", [
                    'chat_id' => (int) $chatId,
                    'user_id' => $userId,
                ]);

                $data = $resp->json();
                if (($data['ok'] ?? false) && isset($data['result']['user'])) {
                    $u = $data['result']['user'];
                    $nameParts = [];
                    if (!empty($u['first_name'])) $nameParts[] = $u['first_name'];
                    if (!empty($u['last_name'])) $nameParts[] = $u['last_name'];
                    $name = implode(' ', $nameParts);
                    if (!empty($u['username'])) {
                        $name .= ($name !== '' ? " (@{$u['username']})" : "@{$u['username']}");
                    }
                    if (!empty($name)) {
                        $fetchedName = $name;
                        $foundGroup = $groupKey;
                        break;
                    }
                }
            } catch (\Throwable $e) {
                // ignore
            }
        }

        if ($fetchedName) {
            $pdo = $this->getPdo();
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $role = ($foundGroup === 'Head Office') ? 'department_head' : 'branch_manager';
            $dept = ($foundGroup === 'Head Office') ? 'Operations' : null;

            $stmt = $pdo->prepare(
                'INSERT INTO users (
                    telegram_user_id, display_name, role, region, branch_name, department, can_forward, created_at, updated_at
                ) VALUES (
                    :telegram_user_id, :display_name, :role, :region, :branch_name, :department, :can_forward, :created_at, :updated_at
                ) ON CONFLICT(telegram_user_id) DO UPDATE SET
                    display_name = excluded.display_name,
                    region = COALESCE(users.region, excluded.region),
                    updated_at = excluded.updated_at'
            );

            $stmt->execute([
                ':telegram_user_id' => $userId,
                ':display_name' => $fetchedName,
                ':role' => $role,
                ':region' => $foundGroup,
                ':branch_name' => null,
                ':department' => $dept,
                ':can_forward' => 0,
                ':created_at' => $now,
                ':updated_at' => $now,
            ]);

            return redirect()->back()->with('success', "Found Telegram Member: '{$fetchedName}' ({$foundGroup})! Recorded into Roster.");
        }

        return redirect()->back()->withErrors(['fetch' => "User ID {$userId} was not found in Telegram groups. Ensure the member has joined Region 1, Region 2, or Head Office group."]);
    }

    public function deleteUser(int $telegramUserId): RedirectResponse
    {
        $pdo = $this->getPdo();
        $stmt = $pdo->prepare('DELETE FROM users WHERE telegram_user_id = :telegram_user_id');
        $stmt->execute([':telegram_user_id' => $telegramUserId]);

        return redirect()->back()->with('success', 'User removed from roster.');
    }

    public function updateStatus(string $referenceNo, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:recorded,forwarded,responded'],
        ]);

        $pdo = $this->getPdo();
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $stmt = $pdo->prepare('UPDATE communications SET status = :status, updated_at = :updated_at WHERE reference_no = :reference_no');
        $stmt->execute([
            ':status' => $validated['status'],
            ':updated_at' => $now,
            ':reference_no' => $referenceNo,
        ]);

        return redirect()->back()->with('success', "Communication {$referenceNo} status updated to {$validated['status']}.");
    }

    public function syncTopics(Request $request): RedirectResponse
    {
        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');
        $force = $request->boolean('force', false);

        if (empty($botToken)) {
            return redirect()->back()->withErrors(['sync' => 'Telegram Bot Token is not configured. Please save your Bot Token in settings first.']);
        }

        $groupsToSync = [];
        if (!empty($config['region_groups']['Region 1'])) {
            $groupsToSync['Region 1'] = (int) $config['region_groups']['Region 1'];
        }
        if (!empty($config['region_groups']['Region 2'])) {
            $groupsToSync['Region 2'] = (int) $config['region_groups']['Region 2'];
        }
        if (!empty($config['ho_group_chat_id'])) {
            $groupsToSync['Head Office'] = (int) $config['ho_group_chat_id'];
        }

        $targetGroup = $request->input('target_group', 'all');

        $groupsToSync = [];
        $reg1 = (int) ($config['region_groups']['Region 1'] ?? ($config['groups']['Region 1'] ?? 0));
        $reg2 = (int) ($config['region_groups']['Region 2'] ?? ($config['groups']['Region 2'] ?? 0));
        $hoChat = (int) ($config['ho_group_chat_id'] ?? ($config['groups']['Head Office'] ?? 0));

        if (($targetGroup === 'all' || $targetGroup === 'Region 1') && !empty($reg1)) {
            $groupsToSync['Region 1'] = $reg1;
        }
        if (($targetGroup === 'all' || $targetGroup === 'Region 2') && !empty($reg2)) {
            $groupsToSync['Region 2'] = $reg2;
        }
        if (($targetGroup === 'all' || $targetGroup === 'Head Office') && !empty($hoChat)) {
            $groupsToSync['Head Office'] = $hoChat;
            $groupsToSync['ho:' . $hoChat] = $hoChat;
        }

        if (empty($groupsToSync)) {
            return redirect()->back()->withErrors(['sync' => 'No matching Telegram Group Chat IDs configured. Please save your Chat IDs in settings first.']);
        }

        $defaultTopics = [
            'Announcements' => 'Operations',
            'Operations' => 'Operations',
            'HR' => 'HR',
            'Finance' => 'Finance',
            'Supply Chain' => 'Supply Chain',
            'IT' => 'IT',
            'Maintenance' => 'Maintenance',
            'F&B' => 'F&B',
            'T&D' => 'T&D',
            'QA' => 'QA',
            'Logistics & BI' => 'Logistics & BI',
            'Suggestions & Improvements' => 'Operations',
        ];

        $topicEmojis = [
            'Announcements' => '📢',
            'Operations' => '⚙️',
            'HR' => '💼',
            'Finance' => '💰',
            'Supply Chain' => '📦',
            'IT' => '💻',
            'Maintenance' => '🔧',
            'F&B' => '☕',
            'T&D' => '🎓',
            'QA' => '🛡️',
            'Logistics & BI' => '🚚',
            'Suggestions & Improvements' => '💡',
        ];

        $pdo = $this->getPdo();
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $createdCount = 0;
        $errors = [];

        foreach ($groupsToSync as $groupKey => $chatId) {
            if (empty($chatId)) {
                continue;
            }

            foreach ($defaultTopics as $topicName => $department) {
                // Strict duplicate restriction: Check if topic already exists in database for this group
                $checkStmt = $pdo->prepare(
                    'SELECT thread_id FROM topic_bindings
                     WHERE group_key = :group_key
                       AND (LOWER(TRIM(topic_name)) = LOWER(:topic_name) OR LOWER(topic_name) LIKE :like_topic)'
                );
                $checkStmt->execute([
                    ':group_key' => $groupKey,
                    ':topic_name' => strtolower(trim($topicName)),
                    ':like_topic' => '%' . strtolower(trim($topicName)) . '%',
                ]);
                $existing = $checkStmt->fetch();

                if ($existing) {
                    continue; // Skip creating duplicate topic!
                }

                $emoji = $topicEmojis[$topicName] ?? '📌';
                $formattedTopicName = "{$emoji} {$topicName}";

                // Call Telegram API createForumTopic
                try {
                    $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/createForumTopic", [
                        'chat_id' => $chatId,
                        'name' => $formattedTopicName,
                    ]);

                    $data = $response->json();

                    // Auto-handle group upgrade to supergroup migration
                    if (!($data['ok'] ?? false) && isset($data['parameters']['migrate_to_chat_id'])) {
                        $newChatId = (int) $data['parameters']['migrate_to_chat_id'];
                        if ($groupKey === 'Region 1') {
                            $config['region_groups']['Region 1'] = $newChatId;
                            $config['groups']['Region 1'] = $newChatId;
                        } elseif ($groupKey === 'Region 2') {
                            $config['region_groups']['Region 2'] = $newChatId;
                            $config['groups']['Region 2'] = $newChatId;
                        } elseif ($groupKey === 'Head Office' || str_starts_with($groupKey, 'ho:')) {
                            $config['ho_group_chat_id'] = $newChatId;
                            $config['groups']['Head Office'] = $newChatId;
                        }
                        file_put_contents($this->getConfigPath(), json_encode($config, JSON_PRETTY_PRINT));
                        $chatId = $newChatId;

                        // Retry createForumTopic with new supergroup Chat ID
                        $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/createForumTopic", [
                            'chat_id' => $chatId,
                            'name' => $formattedTopicName,
                        ]);
                        $data = $response->json();
                    }

                    if (($data['ok'] ?? false) && isset($data['result']['message_thread_id'])) {
                        $threadId = (int) $data['result']['message_thread_id'];

                        // Post initial welcome message into thread so Telegram lists topic in group UI
                        try {
                            \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                                'chat_id' => $chatId,
                                'message_thread_id' => $threadId,
                                'text' => "{$emoji} <b>{$topicName} Topic</b>\nHO Department: <b>{$department}</b>\n\n<i>Official KALDIS Communication Topic active. Members can use command <code>/" . strtolower(str_replace(' ', '', $topicName)) . "</code> to jump here.</i>",
                                'parse_mode' => 'HTML',
                            ]);
                        } catch (\Throwable $e) {
                            \Illuminate\Support\Facades\Log::warning("Initial thread message error: " . $e->getMessage());
                        }

                        // Save binding in database
                        $insertStmt = $pdo->prepare(
                            'INSERT INTO topic_bindings (group_key, thread_id, topic_name, department, created_at, updated_at)
                             VALUES (:group_key, :thread_id, :topic_name, :department, :created_at, :updated_at)
                             ON CONFLICT(group_key, thread_id) DO UPDATE SET
                                 topic_name = excluded.topic_name,
                                 department = excluded.department,
                                 updated_at = excluded.updated_at'
                        );

                        $insertStmt->execute([
                            ':group_key' => $groupKey,
                            ':thread_id' => $threadId,
                            ':topic_name' => $topicName,
                            ':department' => $department,
                            ':created_at' => $now,
                            ':updated_at' => $now,
                        ]);

                        $createdCount++;
                    } else {
                        $errorDesc = $data['description'] ?? 'Unknown API error';
                        if (str_contains($errorDesc, 'upgraded to a supergroup')) {
                            $errorDesc = "Group was upgraded to a supergroup. Please update Group Chat ID in Bot Configuration to your new Supergroup Chat ID starting with -100.";
                        }
                        $errors[] = "[{$groupKey}] '{$topicName}': {$errorDesc}";
                    }
                } catch (\Throwable $e) {
                    $errors[] = "[{$groupKey}] '{$topicName}': " . $e->getMessage();
                }
            }
        }

        if ($createdCount > 0) {
            $msg = "Successfully created and synced {$createdCount} forum topics with custom emojis across your Telegram groups!";
            if (count($errors) > 0) {
                $msg .= " (" . count($errors) . " errors: " . implode(', ', array_slice($errors, 0, 2)) . ")";
            }
            return redirect()->back()->with('success', $msg);
        }

        if (count($errors) > 0) {
            return redirect()->back()->withErrors(['sync' => implode(" | ", array_slice($errors, 0, 3))]);
        }

        return redirect()->back()->with('info', 'All topics are already bound. Use "Force Re-Sync" to recreate them on Telegram with emojis.');
    }

    public function bulkDeleteBindings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'bindings' => ['required', 'array'],
            'bindings.*.group_key' => ['required', 'string'],
            'bindings.*.thread_id' => ['required', 'integer'],
            'delete_from_telegram' => ['nullable', 'boolean'],
        ]);

        $pdo = $this->getPdo();
        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');
        $deleteFromTelegram = !empty($validated['delete_from_telegram']);

        $deletedCount = 0;
        $telegramDeletedCount = 0;

        $stmt = $pdo->prepare('DELETE FROM topic_bindings WHERE group_key = :group_key AND thread_id = :thread_id');

        foreach ($validated['bindings'] as $item) {
            $groupKey = $item['group_key'];
            $threadId = (int) $item['thread_id'];

            if ($deleteFromTelegram && !empty($botToken)) {
                $chatId = null;
                if ($groupKey === 'Region 1') {
                    $chatId = $config['region_groups']['Region 1'] ?? ($config['groups']['Region 1'] ?? null);
                } elseif ($groupKey === 'Region 2') {
                    $chatId = $config['region_groups']['Region 2'] ?? ($config['groups']['Region 2'] ?? null);
                } elseif ($groupKey === 'Head Office' || str_starts_with($groupKey, 'ho:')) {
                    $chatId = $config['ho_group_chat_id'] ?? ($config['groups']['Head Office'] ?? null);
                }

                if (!empty($chatId)) {
                    try {
                        $resp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(5)->post("https://api.telegram.org/bot{$botToken}/deleteForumTopic", [
                            'chat_id' => (int) $chatId,
                            'message_thread_id' => $threadId,
                        ]);
                        if ($resp->json('ok') ?? false) {
                            $telegramDeletedCount++;
                        }
                    } catch (\Throwable $e) {
                        \Illuminate\Support\Facades\Log::warning("Bulk delete topic error for {$threadId}: " . $e->getMessage());
                    }
                }
            }

            $stmt->execute([
                ':group_key' => $groupKey,
                ':thread_id' => $threadId,
            ]);
            $deletedCount++;
        }

        $msg = "Successfully removed {$deletedCount} topic bindings from system database.";
        if ($deleteFromTelegram) {
            $msg .= " Deleted {$telegramDeletedCount} topics directly from Telegram groups.";
        }

        return redirect()->back()->with('success', $msg);
    }

    public function updateModerationSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'anti_link_protection' => ['required', 'boolean'],
            'auto_welcome' => ['required', 'boolean'],
            'welcome_message' => ['nullable', 'string', 'max:1000'],
        ]);

        $config = $this->readConfig();
        $config['anti_link_protection'] = $validated['anti_link_protection'];
        $config['auto_welcome'] = $validated['auto_welcome'];
        $config['welcome_message'] = $validated['welcome_message'] ?? 'Welcome {name} to {group}! Please follow group rules.';

        file_put_contents($this->getConfigPath(), json_encode($config, JSON_PRETTY_PRINT));

        return redirect()->back()->with('success', 'Group moderation & welcome settings updated successfully.');
    }

    public function moderateMember(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'action' => ['required', 'string', 'in:ban,unban,kick'],
            'chat_id' => ['required', 'string'],
            'telegram_user_id' => ['required', 'numeric'],
        ]);

        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');

        if (empty($botToken)) {
            return redirect()->back()->withErrors(['moderation' => 'Bot Token is not configured.']);
        }

        $chatId = $validated['chat_id'];
        $userId = (int) $validated['telegram_user_id'];
        $action = $validated['action'];

        try {
            if ($action === 'ban') {
                $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/banChatMember", [
                    'chat_id' => $chatId,
                    'user_id' => $userId,
                ]);
            } elseif ($action === 'unban') {
                $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/unbanChatMember", [
                    'chat_id' => $chatId,
                    'user_id' => $userId,
                    'only_if_banned' => true,
                ]);
            } else { // kick (ban then unban)
                $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/banChatMember", [
                    'chat_id' => $chatId,
                    'user_id' => $userId,
                ]);
                \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/unbanChatMember", [
                    'chat_id' => $chatId,
                    'user_id' => $userId,
                ]);
            }

            $data = $response->json();
            if ($data['ok'] ?? false) {
                return redirect()->back()->with('success', "Member (User ID: {$userId}) successfully {$action}ned.");
            }

            $err = $data['description'] ?? 'Telegram API call failed.';
            return redirect()->back()->withErrors(['moderation' => "Telegram Error: {$err}"]);
        } catch (\Throwable $e) {
            return redirect()->back()->withErrors(['moderation' => "Network Error: " . $e->getMessage()]);
        }
    }

    public function broadcastChannel(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'chat_id' => ['required', 'string'],
            'message' => ['required', 'string', 'max:2000'],
            'pin' => ['nullable', 'boolean'],
        ]);

        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');

        if (empty($botToken)) {
            return redirect()->back()->withErrors(['broadcast' => 'Bot Token is not configured.']);
        }

        try {
            $resp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                'chat_id' => $validated['chat_id'],
                'text' => $validated['message'],
                'parse_mode' => 'HTML',
            ]);

            $data = $resp->json();
            if ($data['ok'] ?? false) {
                $messageId = $data['result']['message_id'] ?? null;

                if (!empty($validated['pin']) && $messageId) {
                    \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/pinChatMessage", [
                        'chat_id' => $validated['chat_id'],
                        'message_id' => $messageId,
                    ]);
                }

                return redirect()->back()->with('success', 'Broadcast message sent successfully.');
            }

            return redirect()->back()->withErrors(['broadcast' => 'Telegram Error: ' . ($data['description'] ?? 'Failed to send broadcast.')]);
        } catch (\Throwable $e) {
            return redirect()->back()->withErrors(['broadcast' => 'Network Error: ' . $e->getMessage()]);
        }
    }
}

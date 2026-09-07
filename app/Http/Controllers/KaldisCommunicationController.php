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
            'database' => $data['database'] ?? 'kaldis.db',
            'anti_link_protection' => !empty($data['anti_link_protection']),
            'auto_welcome' => !empty($data['auto_welcome']),
            'welcome_message' => $data['welcome_message'] ?? 'Welcome {name} to {group}! Please follow group rules.',
            'standard_topics' => array_key_exists('standard_topics', $data) ? $data['standard_topics'] : null,
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
        $answeredComms = (int) ($pdo->query("SELECT COUNT(*) FROM communications WHERE status IN ('responded', 'closed')")->fetchColumn() ?: 0);
        $unansweredComms = (int) ($pdo->query("SELECT COUNT(*) FROM communications WHERE status IN ('recorded', 'forwarded')")->fetchColumn() ?: 0);
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

        if ($statusFilter === 'answered') {
            $query .= " AND status IN ('responded', 'closed')";
        } elseif ($statusFilter === 'unanswered') {
            $query .= " AND status IN ('recorded', 'forwarded')";
        } elseif ($statusFilter) {
            $query .= ' AND status = :status';
            $params[':status'] = $statusFilter;
        }

        $query .= ' ORDER BY created_at DESC LIMIT 50';

        $commsStmt = $pdo->prepare($query);
        $commsStmt->execute($params);
        $communications = $commsStmt->fetchAll() ?: [];

        // Dynamic Standard Topic Mapping Defaults
        $defaultTopicMapping = $this->getStandardTopicMapping();

        // System Departments & Branches for dropdown selectors
        $departments = Department::where('is_active', true)->orderBy('name')->pluck('name');
        $branches = Branch::orderBy('name')->get(['id', 'name']);
        $systemUsers = User::where('is_active', true)->orderBy('name')->get(['id', 'name', 'email', 'telegram_chat_id']);

        return Inertia::render('kaldis-communication/index', [
            'stats' => [
                'total_communications' => $totalComms,
                'recorded_communications' => $recordedComms,
                'forwarded_communications' => $forwardedComms,
                'responded_communications' => $respondedComms,
                'answered_communications' => $answeredComms,
                'unanswered_communications' => $unansweredComms,
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
        $action = $request->input('action');
        if ($action === 'add_standard_topic') {
            return $this->storeStandardTopicPreset($request);
        }
        if ($action === 'update_standard_topic') {
            return $this->updateStandardTopicPreset($request);
        }
        if ($action === 'delete_standard_topic') {
            return $this->deleteStandardTopicPreset($request);
        }
        if ($action === 'clear_cache') {
            try {
                \Illuminate\Support\Facades\Artisan::call('route:clear');
                \Illuminate\Support\Facades\Artisan::call('config:clear');
                \Illuminate\Support\Facades\Artisan::call('view:clear');
            } catch (\Throwable $e) {
                // Ignore if console disabled
            }
            return redirect()->back()->with('success', 'Server route and app cache cleared successfully!');
        }

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

        $configData = $this->readConfig();
        $configData['bot_token'] = trim($validated['bot_token'] ?? '');
        $configData['region_groups'] = [
            'Region 1' => $reg1,
            'Region 2' => $reg2,
        ];
        $configData['groups'] = [
            'Region 1' => $reg1,
            'Region 2' => $reg2,
            'Head Office' => $hoChat,
        ];
        $configData['ho_group_chat_id'] = $hoChat;
        $configData['operations_director_user_id'] = (int) ($validated['operations_director_user_id'] ?? 0);
        $configData['database'] = 'kaldis.db';

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

    private function getStandardTopicMapping(): array
    {
        $config = $this->readConfig();
        $raw = $config['standard_topics'];

        $defaults = [
            ['name' => 'Announcements', 'department' => 'Operations', 'emoji' => '📢'],
            ['name' => 'Operations', 'department' => 'Operations', 'emoji' => '⚙️'],
            ['name' => 'HR', 'department' => 'HR', 'emoji' => '💼'],
            ['name' => 'Finance', 'department' => 'Finance', 'emoji' => '💰'],
            ['name' => 'Supply Chain', 'department' => 'Supply Chain', 'emoji' => '📦'],
            ['name' => 'IT', 'department' => 'IT', 'emoji' => '💻'],
            ['name' => 'Maintenance', 'department' => 'Maintenance', 'emoji' => '🔧'],
            ['name' => 'F&B', 'department' => 'F&B', 'emoji' => '☕'],
            ['name' => 'T&D', 'department' => 'T&D', 'emoji' => '🎓'],
            ['name' => 'QA', 'department' => 'QA', 'emoji' => '🛡️'],
            ['name' => 'BI', 'department' => 'BI', 'emoji' => '📊'],
            ['name' => 'Logistics', 'department' => 'Supply Chain', 'emoji' => '🚚'],
        ];

        if (!is_array($raw) || empty($raw)) {
            return $defaults;
        }

        $result = [];
        foreach ($raw as $key => $val) {
            if (is_array($val) && isset($val['name'])) {
                $result[] = [
                    'name' => trim((string) $val['name']),
                    'department' => trim((string) ($val['department'] ?? 'Operations')),
                    'emoji' => trim((string) ($val['emoji'] ?? '📌')),
                ];
            } elseif (is_string($key) && is_string($val)) {
                $result[] = [
                    'name' => trim($key),
                    'department' => trim($val),
                    'emoji' => $this->getDefaultEmojiForTopic($key),
                ];
            }
        }

        return !empty($result) ? $result : $defaults;
    }

    private function getDefaultEmojiForTopic(string $name): string
    {
        $norm = $this->normalizeTopicName($name);
        return match (true) {
            str_contains($norm, 'announce') => '📢',
            str_contains($norm, 'operation') => '⚙️',
            str_contains($norm, 'hr') || str_contains($norm, 'human') => '💼',
            str_contains($norm, 'finance') || str_contains($norm, 'budget') => '💰',
            str_contains($norm, 'supply') || str_contains($norm, 'chain') => '📦',
            str_contains($norm, 'it') || str_contains($norm, 'tech') => '💻',
            str_contains($norm, 'maint') || str_contains($norm, 'repair') => '🔧',
            str_contains($norm, 'f&b') || str_contains($norm, 'food') => '☕',
            str_contains($norm, 't&d') || str_contains($norm, 'train') => '🎓',
            str_contains($norm, 'qa') || str_contains($norm, 'quality') => '🛡️',
            str_contains($norm, 'bi') || str_contains($norm, 'analytics') => '📊',
            str_contains($norm, 'logistic') => '🚚',
            default => '📌',
        };
    }

    private function registerCommandsToTelegram(string $botToken, ?string &$error = null): bool
    {
        $mapping = $this->getStandardTopicMapping();
        $commandsList = [
            ['command' => 'topics', 'description' => 'Open Kaldis Topics Directory'],
        ];

        foreach ($mapping as $item) {
            $rawName = $item['name'];
            $emoji = $item['emoji'] ?? '📌';
            $slug = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '', $rawName));
            if (!empty($slug)) {
                $commandsList[] = [
                    'command' => $slug,
                    'description' => "Jump to {$emoji} {$rawName} Topic",
                ];
            }
        }

        $commandsList[] = ['command' => 'help', 'description' => 'Show User Registration & Commands Guide'];

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

    public function purgeUnlistedBindings(Request $request): RedirectResponse
    {
        $deleteFromTelegram = $request->boolean('delete_from_telegram', false);
        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');
        $pdo = $this->getPdo();

        $mapping = $this->getStandardTopicMapping();
        $defaultTopics = array_column($mapping, 'name');

        $allowedNorms = array_map(fn($t) => $this->normalizeTopicName($t), $defaultTopics);
        $allInDb = $pdo->query('SELECT group_key, thread_id, topic_name FROM topic_bindings')->fetchAll() ?: [];
        $purgedCount = 0;
        $telegramDeleted = 0;

        foreach ($allInDb as $b) {
            $norm = $this->normalizeTopicName($b['topic_name']);
            if (!in_array($norm, $allowedNorms, true)) {
                $groupKey = $b['group_key'];
                $threadId = (int) $b['thread_id'];

                if ($deleteFromTelegram && !empty($botToken)) {
                    $chatId = null;
                    if ($groupKey === 'Region 1') {
                        $chatId = $config['region_groups']['Region 1'] ?? ($config['groups']['Region 1'] ?? null);
                    } elseif ($groupKey === 'Region 2') {
                        $chatId = $config['region_groups']['Region 2'] ?? ($config['groups']['Region 2'] ?? null);
                    } elseif ($groupKey === 'Head Office' || str_starts_with($groupKey, 'ho:')) {
                        if (str_starts_with($groupKey, 'ho:')) {
                            $chatId = substr($groupKey, 3);
                        } else {
                            $chatId = $config['ho_group_chat_id'] ?? ($config['groups']['Head Office'] ?? null);
                        }
                    }

                    if (!empty($chatId)) {
                        try {
                            $resp = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(5)->post("https://api.telegram.org/bot{$botToken}/deleteForumTopic", [
                                'chat_id' => (int) $chatId,
                                'message_thread_id' => $threadId,
                            ]);
                            if ($resp->json('ok') ?? false) {
                                $telegramDeleted++;
                            }
                        } catch (\Throwable $e) {
                            // ignore API delete error
                        }
                    }
                }

                $isHo = ($groupKey === 'Head Office' || str_starts_with($groupKey, 'ho:')) ? 1 : 0;
                $delStmt = $pdo->prepare('DELETE FROM topic_bindings WHERE (group_key = :group_key OR (group_key LIKE "ho:%" AND :is_ho_1 = 1) OR (group_key = "Head Office" AND :is_ho_2 = 1)) AND thread_id = :thread_id');
                $delStmt->execute([':group_key' => $groupKey, ':is_ho_1' => $isHo, ':is_ho_2' => $isHo, ':thread_id' => $threadId]);
                $purgedCount++;
            }
        }

        if (!empty($botToken)) {
            $this->registerCommandsToTelegram($botToken);
        }

        $msg = "Purged {$purgedCount} unlisted topic bindings from system database!";
        if ($deleteFromTelegram && $telegramDeleted > 0) {
            $msg .= " Also deleted {$telegramDeleted} unlisted topics directly from Telegram groups.";
        }

        return redirect()->back()->with('success', $msg);
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

    private function normalizeTopicName(string $name): string
    {
        $clean = preg_replace('/[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]/u', '', $name);
        $clean = preg_replace('/\s+/u', ' ', trim($clean));
        return strtolower($clean ?: trim($name));
    }

    private function getTopicEmojis(): array
    {
        $mapping = $this->getStandardTopicMapping();
        $emojis = [];
        foreach ($mapping as $item) {
            $emojis[$item['name']] = $item['emoji'] ?? '📌';
        }
        return $emojis;
    }

    public function storeBinding(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'group_key' => ['required', 'string'],
            'thread_id' => ['nullable', 'numeric'],
            'topic_name' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:255'],
            'emoji' => ['nullable', 'string', 'max:10'],
            'create_on_telegram' => ['nullable', 'boolean'],
        ]);

        $pdo = $this->getPdo();
        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');
        $now = gmdate('Y-m-d\TH:i:s\Z');

        $rawTopic = trim($validated['topic_name']);
        $normalizedTopic = $this->normalizeTopicName($rawTopic);
        $groupKey = $validated['group_key'];
        $threadId = !empty($validated['thread_id']) ? (int) $validated['thread_id'] : 0;

        // Check for duplicate topic in same group
        $bindingsStmt = $pdo->prepare('SELECT thread_id, topic_name FROM topic_bindings WHERE group_key = :group_key');
        $bindingsStmt->execute([':group_key' => $groupKey]);
        $existingBindings = $bindingsStmt->fetchAll() ?: [];

        foreach ($existingBindings as $b) {
            $existingNorm = $this->normalizeTopicName($b['topic_name']);
            if ($existingNorm === $normalizedTopic && (int) $b['thread_id'] !== $threadId) {
                return redirect()->back()->withErrors([
                    'topic_name' => "Duplicate Topic Error: A topic named '{$rawTopic}' already exists in {$groupKey} Group!"
                ]);
            }
        }

        // Determine Chat ID
        $chatId = null;
        if ($groupKey === 'Region 1') {
            $chatId = $config['region_groups']['Region 1'] ?? ($config['groups']['Region 1'] ?? null);
        } elseif ($groupKey === 'Region 2') {
            $chatId = $config['region_groups']['Region 2'] ?? ($config['groups']['Region 2'] ?? null);
        } elseif ($groupKey === 'Head Office' || str_starts_with($groupKey, 'ho:')) {
            $chatId = $config['ho_group_chat_id'] ?? ($config['groups']['Head Office'] ?? null);
        }

        $topicEmojis = $this->getTopicEmojis();
        $emoji = !empty($validated['emoji']) ? trim($validated['emoji']) : ($topicEmojis[$rawTopic] ?? '📌');
        
        $cleanTopicName = trim(preg_replace('/[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]/u', '', $rawTopic));
        if (empty($cleanTopicName)) {
            $cleanTopicName = $rawTopic;
        }

        $formattedTopicName = "{$emoji} {$cleanTopicName}";
        $telegramCreated = false;
        $telegramError = null;

        // Auto-create topic on Telegram if thread_id is missing or create_on_telegram is requested
        if (($threadId <= 0 || !empty($validated['create_on_telegram'])) && !empty($botToken) && !empty($chatId)) {
            try {
                $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/createForumTopic", [
                    'chat_id' => (int) $chatId,
                    'name' => $formattedTopicName,
                ]);

                $data = $response->json();

                // Handle group upgrade to supergroup migration
                if (!($data['ok'] ?? false) && isset($data['parameters']['migrate_to_chat_id'])) {
                    $newChatId = (int) $data['parameters']['migrate_to_chat_id'];
                    if ($groupKey === 'Region 1') {
                        $config['region_groups']['Region 1'] = $newChatId;
                        $config['groups']['Region 1'] = $newChatId;
                    } elseif ($groupKey === 'Region 2') {
                        $config['region_groups']['Region 2'] = $newChatId;
                        $config['groups']['Region 2'] = $newChatId;
                    } else {
                        $config['ho_group_chat_id'] = $newChatId;
                        $config['groups']['Head Office'] = $newChatId;
                    }
                    file_put_contents($this->getConfigPath(), json_encode($config, JSON_PRETTY_PRINT));
                    $chatId = $newChatId;

                    $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/createForumTopic", [
                        'chat_id' => (int) $chatId,
                        'name' => $formattedTopicName,
                    ]);
                    $data = $response->json();
                }

                if (($data['ok'] ?? false) && isset($data['result']['message_thread_id'])) {
                    $threadId = (int) $data['result']['message_thread_id'];
                    $telegramCreated = true;

                    // Send welcome message into new thread
                    try {
                        $cmdSlug = strtolower(str_replace([' ', '&'], '', $cleanTopicName));
                        \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                            'chat_id' => (int) $chatId,
                            'message_thread_id' => $threadId,
                            'text' => "{$emoji} <b>{$cleanTopicName} Topic</b>\nTarget HO Department: <b>{$validated['department']}</b>\n\n<i>Official KALDIS Communication Topic active. Members can use command <code>/{$cmdSlug}</code> or <code>/topics</code> to jump here.</i>",
                            'parse_mode' => 'HTML',
                        ]);
                    } catch (\Throwable $e) {
                        \Illuminate\Support\Facades\Log::warning("Initial thread message error: " . $e->getMessage());
                    }
                } else {
                    $telegramError = $data['description'] ?? 'Failed to create topic on Telegram';
                }
            } catch (\Throwable $e) {
                $telegramError = $e->getMessage();
            }
        }

        if ($threadId <= 0) {
            $err = $telegramError ?: 'Could not create topic on Telegram. Please ensure Bot Token and Group Chat ID are valid, or provide a Thread ID manually.';
            return redirect()->back()->withErrors(['topic_name' => $err]);
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
            ':group_key' => $groupKey,
            ':thread_id' => $threadId,
            ':topic_name' => $cleanTopicName,
            ':department' => $validated['department'],
            ':created_at' => $now,
            ':updated_at' => $now,
        ]);

        // Auto re-register bot slash commands with Telegram
        if (!empty($botToken)) {
            $this->registerCommandsToTelegram($botToken);
        }

        $msg = "Topic binding '{$cleanTopicName}' saved successfully!";
        if ($telegramCreated) {
            $msg .= " Forum topic with emoji {$emoji} was automatically created in {$groupKey} Telegram group!";
        } elseif ($telegramError) {
            $msg .= " (Note: Telegram creation warning: {$telegramError})";
        }

        return redirect()->back()->with('success', $msg);
    }

    public function updateBinding(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'group_key' => ['required', 'string'],
            'thread_id' => ['required', 'integer'],
            'topic_name' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:255'],
            'emoji' => ['nullable', 'string', 'max:10'],
            'sync_to_telegram' => ['nullable', 'boolean'],
        ]);

        $pdo = $this->getPdo();
        $config = $this->readConfig();
        $botToken = trim($config['bot_token'] ?? '');
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $rawTopic = trim($validated['topic_name']);
        $normalizedTopic = $this->normalizeTopicName($rawTopic);
        $threadId = (int) $validated['thread_id'];
        $groupKey = $validated['group_key'];

        // Check for duplicate topic in same group
        $bindingsStmt = $pdo->prepare('SELECT thread_id, topic_name FROM topic_bindings WHERE group_key = :group_key');
        $bindingsStmt->execute([':group_key' => $groupKey]);
        $existingBindings = $bindingsStmt->fetchAll() ?: [];

        foreach ($existingBindings as $b) {
            $existingNorm = $this->normalizeTopicName($b['topic_name']);
            if ($existingNorm === $normalizedTopic && (int) $b['thread_id'] !== $threadId) {
                return redirect()->back()->withErrors([
                    'topic_name' => "Duplicate Topic Error: Cannot rename topic to '{$rawTopic}' because a topic with this name already exists in {$groupKey} Group!"
                ]);
            }
        }

        $cleanTopicName = trim(preg_replace('/[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]/u', '', $rawTopic));
        if (empty($cleanTopicName)) {
            $cleanTopicName = $rawTopic;
        }

        $topicEmojis = $this->getTopicEmojis();
        $emoji = !empty($validated['emoji']) ? trim($validated['emoji']) : ($topicEmojis[$cleanTopicName] ?? '📌');
        $formattedTopicName = "{$emoji} {$cleanTopicName}";

        $chatId = null;
        if ($groupKey === 'Region 1') {
            $chatId = $config['region_groups']['Region 1'] ?? ($config['groups']['Region 1'] ?? null);
        } elseif ($groupKey === 'Region 2') {
            $chatId = $config['region_groups']['Region 2'] ?? ($config['groups']['Region 2'] ?? null);
        } elseif ($groupKey === 'Head Office' || str_starts_with($groupKey, 'ho:')) {
            $chatId = $config['ho_group_chat_id'] ?? ($config['groups']['Head Office'] ?? null);
        }

        $telegramUpdated = false;
        $telegramError = null;

        if (!empty($validated['sync_to_telegram']) && !empty($botToken) && !empty($chatId)) {
            try {
                $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/editForumTopic", [
                    'chat_id' => (int) $chatId,
                    'message_thread_id' => $threadId,
                    'name' => $formattedTopicName,
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
            ':topic_name' => $cleanTopicName,
            ':department' => $validated['department'],
            ':updated_at' => $now,
            ':group_key' => $groupKey,
            ':thread_id' => $threadId,
        ]);

        if (!empty($botToken)) {
            $this->registerCommandsToTelegram($botToken);
        }

        $msg = 'Topic binding updated successfully.';
        if ($telegramUpdated) {
            $msg .= ' Topic name & emoji were updated in Telegram group!';
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

        $groupKey = $validated['group_key'];
        $threadId = (int) $validated['thread_id'];

        $chatId = null;
        if ($groupKey === 'Region 1') {
            $chatId = $config['region_groups']['Region 1'] ?? ($config['groups']['Region 1'] ?? null);
        } elseif ($groupKey === 'Region 2') {
            $chatId = $config['region_groups']['Region 2'] ?? ($config['groups']['Region 2'] ?? null);
        } elseif ($groupKey === 'Head Office' || str_starts_with($groupKey, 'ho:')) {
            if (str_starts_with($groupKey, 'ho:')) {
                $chatId = substr($groupKey, 3);
            } else {
                $chatId = $config['ho_group_chat_id'] ?? ($config['groups']['Head Office'] ?? null);
            }
        }

        $telegramDeleted = false;
        $telegramError = null;

        if (!empty($validated['delete_from_telegram']) && !empty($botToken) && !empty($chatId)) {
            try {
                $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/deleteForumTopic", [
                    'chat_id' => (int) $chatId,
                    'message_thread_id' => $threadId,
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

        $isHo = ($groupKey === 'Head Office' || str_starts_with($groupKey, 'ho:')) ? 1 : 0;
        $stmt = $pdo->prepare('DELETE FROM topic_bindings WHERE (group_key = :group_key OR (group_key LIKE "ho:%" AND :is_ho_1 = 1) OR (group_key = "Head Office" AND :is_ho_2 = 1)) AND thread_id = :thread_id');
        $stmt->execute([
            ':group_key' => $groupKey,
            ':is_ho_1' => $isHo,
            ':is_ho_2' => $isHo,
            ':thread_id' => $threadId,
        ]);

        $msg = "Topic binding (Thread #{$threadId}) removed from system database.";
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
        }

        if (empty($groupsToSync)) {
            return redirect()->back()->withErrors(['sync' => 'No matching Telegram Group Chat IDs configured. Please save your Chat IDs in settings first.']);
        }

        $mapping = $this->getStandardTopicMapping();
        $defaultTopics = [];
        foreach ($mapping as $item) {
            $defaultTopics[$item['name']] = $item['department'];
        }

        $topicEmojis = $this->getTopicEmojis();
        $pdo = $this->getPdo();
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $createdCount = 0;
        $errors = [];

        foreach ($groupsToSync as $groupKey => $chatId) {
            if (empty($chatId)) {
                continue;
            }

            // Fetch existing bindings for this group to check normalized duplicates
            $bindingsStmt = $pdo->prepare('SELECT thread_id, topic_name FROM topic_bindings WHERE group_key = :group_key');
            $bindingsStmt->execute([':group_key' => $groupKey]);
            $existingBindings = $bindingsStmt->fetchAll() ?: [];
            $existingNorms = array_map(fn($b) => $this->normalizeTopicName($b['topic_name']), $existingBindings);

            foreach ($defaultTopics as $topicName => $department) {
                $normTopic = $this->normalizeTopicName($topicName);

                // Skip creating duplicate topic if it already exists (unless force is requested)
                if (!$force && in_array($normTopic, $existingNorms, true)) {
                    continue;
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
                        } else {
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
                            $cmdSlug = strtolower(str_replace([' ', '&'], '', $topicName));
                            \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                                'chat_id' => $chatId,
                                'message_thread_id' => $threadId,
                                'text' => "{$emoji} <b>{$topicName} Topic</b>\nHO Department: <b>{$department}</b>\n\n<i>Official KALDIS Communication Topic active. Members can use command <code>/{$cmdSlug}</code> or <code>/topics</code> to jump here.</i>",
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

        // Auto re-register slash commands
        if (!empty($botToken)) {
            $this->registerCommandsToTelegram($botToken);
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

        return redirect()->back()->with('info', 'All topics are already bound. Use "Force Sync with Emojis" to recreate missing ones.');
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
                    if (str_starts_with($groupKey, 'ho:')) {
                        $chatId = substr($groupKey, 3);
                    } else {
                        $chatId = $config['ho_group_chat_id'] ?? ($config['groups']['Head Office'] ?? null);
                    }
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

            $isHo = ($groupKey === 'Head Office' || str_starts_with($groupKey, 'ho:')) ? 1 : 0;
            $stmt = $pdo->prepare('DELETE FROM topic_bindings WHERE (group_key = :group_key OR (group_key LIKE "ho:%" AND :is_ho_1 = 1) OR (group_key = "Head Office" AND :is_ho_2 = 1)) AND thread_id = :thread_id');
            $stmt->execute([
                ':group_key' => $groupKey,
                ':is_ho_1' => $isHo,
                ':is_ho_2' => $isHo,
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

    public function storeStandardTopicPreset(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:255'],
            'emoji' => ['required', 'string', 'max:10'],
        ]);

        $topics = $this->getStandardTopicMapping();
        $normName = $this->normalizeTopicName($validated['name']);

        foreach ($topics as $t) {
            $tName = is_array($t) ? ($t['name'] ?? '') : (is_string($t) ? $t : '');
            if ($this->normalizeTopicName($tName) === $normName) {
                return redirect()->back()->withErrors([
                    'standard_topic' => "Standard topic preset '{$validated['name']}' already exists!"
                ]);
            }
        }

        $topics[] = [
            'name' => trim($validated['name']),
            'department' => trim($validated['department']),
            'emoji' => trim($validated['emoji']),
        ];

        $configPath = $this->getConfigPath();
        $rawConfig = file_exists($configPath) ? (json_decode(file_get_contents($configPath), true) ?: []) : [];
        $rawConfig['standard_topics'] = array_values($topics);
        file_put_contents($configPath, json_encode($rawConfig, JSON_PRETTY_PRINT));

        if (!empty($rawConfig['bot_token'])) {
            try {
                $this->registerCommandsToTelegram($rawConfig['bot_token']);
            } catch (\Throwable $e) {
                // Ignore telegram error during config save
            }
        }

        return redirect()->back()->with('success', "Standard topic preset '{$validated['name']}' added successfully!");
    }

    public function updateStandardTopicPreset(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'old_name' => ['nullable', 'string'],
            'name' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:255'],
            'emoji' => ['required', 'string', 'max:10'],
        ]);

        $oldName = !empty($validated['old_name']) ? $validated['old_name'] : $validated['name'];
        $topics = $this->getStandardTopicMapping();

        $oldNorm = $this->normalizeTopicName($oldName);
        $newNorm = $this->normalizeTopicName($validated['name']);

        if ($oldNorm !== $newNorm) {
            foreach ($topics as $t) {
                $tName = is_array($t) ? ($t['name'] ?? '') : (is_string($t) ? $t : '');
                if ($this->normalizeTopicName($tName) === $newNorm) {
                    return redirect()->back()->withErrors([
                        'standard_topic' => "Standard topic preset '{$validated['name']}' already exists!"
                    ]);
                }
            }
        }

        $updated = false;
        foreach ($topics as &$t) {
            $tName = is_array($t) ? ($t['name'] ?? '') : (is_string($t) ? $t : '');
            if ($this->normalizeTopicName($tName) === $oldNorm) {
                $t = [
                    'name' => trim($validated['name']),
                    'department' => trim($validated['department']),
                    'emoji' => trim($validated['emoji']),
                ];
                $updated = true;
                break;
            }
        }
        unset($t);

        if (!$updated) {
            return redirect()->back()->withErrors([
                'standard_topic' => "Original topic '{$oldName}' not found!"
            ]);
        }

        $configPath = $this->getConfigPath();
        $rawConfig = file_exists($configPath) ? (json_decode(file_get_contents($configPath), true) ?: []) : [];
        $rawConfig['standard_topics'] = array_values($topics);
        file_put_contents($configPath, json_encode($rawConfig, JSON_PRETTY_PRINT));

        if (!empty($rawConfig['bot_token'])) {
            try {
                $this->registerCommandsToTelegram($rawConfig['bot_token']);
            } catch (\Throwable $e) {
                // Ignore telegram error during config save
            }
        }

        return redirect()->back()->with('success', "Standard topic preset '{$validated['name']}' updated successfully!");
    }

    public function deleteStandardTopicPreset(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string'],
        ]);

        $topics = $this->getStandardTopicMapping();
        $normName = $this->normalizeTopicName($validated['name']);

        $newTopics = [];
        foreach ($topics as $t) {
            $tName = is_array($t) ? ($t['name'] ?? '') : (is_string($t) ? $t : '');
            if ($this->normalizeTopicName($tName) !== $normName) {
                $newTopics[] = is_array($t) ? $t : [
                    'name' => $tName,
                    'department' => 'Operations',
                    'emoji' => '📌'
                ];
            }
        }

        $configPath = $this->getConfigPath();
        $rawConfig = file_exists($configPath) ? (json_decode(file_get_contents($configPath), true) ?: []) : [];
        $rawConfig['standard_topics'] = array_values($newTopics);
        file_put_contents($configPath, json_encode($rawConfig, JSON_PRETTY_PRINT));

        if (!empty($rawConfig['bot_token'])) {
            try {
                $this->registerCommandsToTelegram($rawConfig['bot_token']);
            } catch (\Throwable $e) {
                // Ignore telegram error during config save
            }
        }

        return redirect()->back()->with('success', "Standard topic preset '{$validated['name']}' removed!");
    }
}

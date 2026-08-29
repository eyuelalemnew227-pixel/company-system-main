<?php
declare(strict_types=1);

namespace KaldisTelegram;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;
use PDO;
use RuntimeException;
use Throwable;

final class Roles
{
    public const BRANCH_MANAGER = 'branch_manager';
    public const REGIONAL_MANAGER = 'regional_manager';
    public const DEPARTMENT_HEAD = 'department_head';
    public const OPERATIONS_DIRECTOR = 'operations_director';
}

final class TopicDefaults
{
    public const DEFAULT_TOPIC_DEPARTMENT_MAP = [
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
}

final class UserProfile
{
    public function __construct(
        public int $telegramUserId,
        public string $displayName,
        public string $role,
        public ?string $region = null,
        public ?string $branchName = null,
        public ?string $department = null,
        public bool $canForward = false,
    ) {
    }
}

final class TopicBinding
{
    public function __construct(
        public string $groupKey,
        public int $threadId,
        public string $topicName,
        public string $department,
    ) {
    }
}

final class CommunicationRecord
{
    public function __construct(
        public string $referenceNo,
        public string $region,
        public ?string $branchName,
        public string $topicName,
        public string $department,
        public int $sourceChatId,
        public int $sourceMessageId,
        public ?int $sourceThreadId,
        public ?int $senderUserId,
        public string $senderDisplayName,
        public ?int $hoChatId = null,
        public ?int $hoSummaryMessageId = null,
        public ?int $hoMessageId = null,
        public ?int $regionalManagerUserId = null,
        public ?int $departmentHeadUserId = null,
        public string $status = 'recorded',
        public string $createdAt = '',
        public string $updatedAt = '',
    ) {
    }
}

final class Helpers
{
    public static function utcNow(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }

    public static function displayName(array $user): string
    {
        $parts = [];
        if (!empty($user['first_name'])) {
            $parts[] = (string) $user['first_name'];
        }
        if (!empty($user['last_name'])) {
            $parts[] = (string) $user['last_name'];
        }
        if ($parts !== []) {
            return trim(implode(' ', $parts));
        }

        if (!empty($user['username'])) {
            return (string) $user['username'];
        }

        return 'Unknown user';
    }

    public static function normalizeTopicName(string $topicName): string
    {
        $normalized = preg_replace('/\s+/u', ' ', trim($topicName));
        return $normalized ?? trim($topicName);
    }

    public static function parseCommandArguments(string $text): array
    {
        $pattern = '/"((?:\\\\.|[^"])*)"|\'((?:\\\\.|[^\'])*)\'|(\\S+)/u';
        preg_match_all($pattern, $text, $matches, PREG_SET_ORDER);

        $tokens = [];
        foreach ($matches as $match) {
            if ($match[1] !== '') {
                $tokens[] = stripcslashes($match[1]);
                continue;
            }

            if ($match[2] !== '') {
                $tokens[] = stripcslashes($match[2]);
                continue;
            }

            $tokens[] = $match[3];
        }

        return $tokens;
    }
}

final class Routing
{
    public static function buildReferenceNumber(
        string $prefix,
        string $regionCode,
        int $sequence,
        ?DateTimeInterface $onDate = null,
    ): string {
        $date = $onDate ?? new DateTimeImmutable('now', new DateTimeZone('UTC'));
        return sprintf('%s-%s-%s-%03d', $prefix, $regionCode, $date->format('Ymd'), $sequence);
    }
}

final class BotConfig
{
    public function __construct(
        public string $botToken,
        public string $databasePath = 'kaldis.sqlite',
        public int $pollTimeout = 25,
        public float $pollIntervalSeconds = 1.0,
        public ?int $operationsDirectorUserId = null,
        public array $regionGroups = [],
        public array $regionCodes = [],
        public ?int $hoGroupChatId = null,
    ) {
    }

    public static function fromFile(string $path): self
    {
        $raw = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        $regionGroups = [];
        foreach (($raw['region_groups'] ?? []) as $regionName => $chatId) {
            $regionGroups[(string) $regionName] = (int) $chatId;
        }

        $regionCodes = [];
        foreach (($raw['region_codes'] ?? []) as $regionName => $code) {
            $regionCodes[(string) $regionName] = (string) $code;
        }

        return new self(
            botToken: (string) $raw['bot_token'],
            databasePath: (string) ($raw['database_path'] ?? 'kaldis.sqlite'),
            pollTimeout: (int) ($raw['poll_timeout'] ?? 25),
            pollIntervalSeconds: (float) ($raw['poll_interval_seconds'] ?? 1.0),
            operationsDirectorUserId: self::nullableInt($raw['operations_director_user_id'] ?? null),
            regionGroups: $regionGroups,
            regionCodes: $regionCodes,
            hoGroupChatId: self::nullableInt($raw['ho_group_chat_id'] ?? null),
        );
    }

    public function regionForChatId(int $chatId): ?string
    {
        foreach ($this->regionGroups as $regionName => $configuredChatId) {
            if ($configuredChatId === $chatId) {
                return $regionName;
            }
        }

        return null;
    }

    public function regionCode(string $regionName): string
    {
        if (isset($this->regionCodes[$regionName]) && $this->regionCodes[$regionName] !== '') {
            return $this->regionCodes[$regionName];
        }

        $parts = preg_split('/\s+/u', trim($regionName)) ?: [];
        $letters = '';
        foreach ($parts as $part) {
            if ($part === '') {
                continue;
            }
            $letters .= strtoupper(substr($part, 0, 1));
        }

        return $letters !== '' ? $letters : strtoupper($regionName);
    }

    private static function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '' || $value === 0 || $value === '0') {
            return null;
        }

        return (int) $value;
    }
}

interface TelegramClientInterface
{
    /** @return array<int, array<string, mixed>> */
    public function getUpdates(?int $offset = null, int $timeout = 25): array;

    /** @return array<string, mixed> */
    public function sendMessage(
        int $chatId,
        string $text,
        ?int $messageThreadId = null,
        ?array $replyMarkup = null,
    ): array;

    /** @return array<string, mixed> */
    public function copyMessage(
        int $chatId,
        int $fromChatId,
        int $messageId,
        ?int $messageThreadId = null,
    ): array;

    /** @return array<string, mixed> */
    public function answerCallbackQuery(string $callbackQueryId, ?string $text = null): array;

    /** @return array<string, mixed> */
    public function editMessageReplyMarkup(int $chatId, int $messageId, ?array $replyMarkup): array;
}

final class TelegramClient implements TelegramClientInterface
{
    public function __construct(private string $token)
    {
    }

    public function getUpdates(?int $offset = null, int $timeout = 25): array
    {
        $params = ['timeout' => $timeout];
        if ($offset !== null) {
            $params['offset'] = $offset;
        }

        $response = $this->requestJson('getUpdates', $params);
        return $response['result'] ?? [];
    }

    public function sendMessage(
        int $chatId,
        string $text,
        ?int $messageThreadId = null,
        ?array $replyMarkup = null,
    ): array {
        $params = [
            'chat_id' => $chatId,
            'text' => $text,
            'disable_web_page_preview' => true,
        ];

        if ($messageThreadId !== null) {
            $params['message_thread_id'] = $messageThreadId;
        }

        if ($replyMarkup !== null) {
            $params['reply_markup'] = json_encode($replyMarkup, JSON_THROW_ON_ERROR);
        }

        $response = $this->requestJson('sendMessage', $params);
        return $response['result'] ?? [];
    }

    public function copyMessage(
        int $chatId,
        int $fromChatId,
        int $messageId,
        ?int $messageThreadId = null,
    ): array {
        $params = [
            'chat_id' => $chatId,
            'from_chat_id' => $fromChatId,
            'message_id' => $messageId,
        ];

        if ($messageThreadId !== null) {
            $params['message_thread_id'] = $messageThreadId;
        }

        $response = $this->requestJson('copyMessage', $params);
        return $response['result'] ?? [];
    }

    public function answerCallbackQuery(string $callbackQueryId, ?string $text = null): array
    {
        $params = ['callback_query_id' => $callbackQueryId];
        if ($text !== null && $text !== '') {
            $params['text'] = $text;
        }

        $response = $this->requestJson('answerCallbackQuery', $params);
        return $response['result'] ?? [];
    }

    public function editMessageReplyMarkup(int $chatId, int $messageId, ?array $replyMarkup): array
    {
        $params = [
            'chat_id' => $chatId,
            'message_id' => $messageId,
        ];

        if ($replyMarkup !== null) {
            $params['reply_markup'] = json_encode($replyMarkup, JSON_THROW_ON_ERROR);
        }

        $response = $this->requestJson('editMessageReplyMarkup', $params);
        return $response['result'] ?? [];
    }

    /** @return array<string, mixed> */
    private function requestJson(string $method, array $params): array
    {
        $url = sprintf('https://api.telegram.org/bot%s/%s', $this->token, $method);
        $options = [
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => http_build_query($params),
                'timeout' => 60,
            ],
        ];

        $context = stream_context_create($options);
        $body = @file_get_contents($url, false, $context);
        if ($body === false) {
            $error = error_get_last();
            throw new RuntimeException('Telegram API request failed: ' . ($error['message'] ?? 'unknown error'));
        }

        $decoded = json_decode($body, true);
        if (!is_array($decoded) || ($decoded['ok'] ?? false) !== true) {
            throw new RuntimeException('Telegram API error: ' . $body);
        }

        return $decoded;
    }
}

final class SQLiteStorage
{
    private ?PDO $pdo;

    public function __construct(string $path)
    {
        $this->pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        $this->pdo->exec('PRAGMA foreign_keys = ON');
        $this->createSchema();
    }

    public function close(): void
    {
        $this->pdo = null;
    }

    public function upsertUser(UserProfile $profile): void
    {
        $timestamp = Helpers::utcNow();
        $stmt = $this->pdo->prepare(
            'INSERT INTO users (
                telegram_user_id, display_name, role, region, branch_name, department,
                can_forward, created_at, updated_at
            ) VALUES (
                :telegram_user_id, :display_name, :role, :region, :branch_name, :department,
                :can_forward, :created_at, :updated_at
            )
            ON CONFLICT(telegram_user_id) DO UPDATE SET
                display_name = excluded.display_name,
                role = excluded.role,
                region = excluded.region,
                branch_name = excluded.branch_name,
                department = excluded.department,
                can_forward = excluded.can_forward,
                updated_at = excluded.updated_at'
        );
        $stmt->execute([
            ':telegram_user_id' => $profile->telegramUserId,
            ':display_name' => $profile->displayName,
            ':role' => $profile->role,
            ':region' => $profile->region,
            ':branch_name' => $profile->branchName,
            ':department' => $profile->department,
            ':can_forward' => $profile->canForward ? 1 : 0,
            ':created_at' => $timestamp,
            ':updated_at' => $timestamp,
        ]);
    }

    public function getUser(int $telegramUserId): ?UserProfile
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE telegram_user_id = :telegram_user_id');
        $stmt->execute([':telegram_user_id' => $telegramUserId]);
        $row = $stmt->fetch();
        return $row === false ? null : $this->hydrateUser($row);
    }

    public function getRegionalManager(string $region): ?UserProfile
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM users WHERE role = :role AND region = :region ORDER BY updated_at DESC LIMIT 1'
        );
        $stmt->execute([':role' => Roles::REGIONAL_MANAGER, ':region' => $region]);
        $row = $stmt->fetch();
        return $row === false ? null : $this->hydrateUser($row);
    }

    public function getDepartmentHead(string $department): ?UserProfile
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM users WHERE role = :role AND department = :department ORDER BY updated_at DESC LIMIT 1'
        );
        $stmt->execute([':role' => Roles::DEPARTMENT_HEAD, ':department' => $department]);
        $row = $stmt->fetch();
        return $row === false ? null : $this->hydrateUser($row);
    }

    public function getOperationsDirector(): ?UserProfile
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM users WHERE role = :role ORDER BY updated_at DESC LIMIT 1'
        );
        $stmt->execute([':role' => Roles::OPERATIONS_DIRECTOR]);
        $row = $stmt->fetch();
        return $row === false ? null : $this->hydrateUser($row);
    }

    public function bindTopic(TopicBinding $binding): void
    {
        $timestamp = Helpers::utcNow();
        $stmt = $this->pdo->prepare(
            'INSERT INTO topic_bindings (
                group_key, thread_id, topic_name, department, created_at, updated_at
            ) VALUES (
                :group_key, :thread_id, :topic_name, :department, :created_at, :updated_at
            )
            ON CONFLICT(group_key, thread_id) DO UPDATE SET
                topic_name = excluded.topic_name,
                department = excluded.department,
                updated_at = excluded.updated_at'
        );
        $stmt->execute([
            ':group_key' => $binding->groupKey,
            ':thread_id' => $binding->threadId,
            ':topic_name' => $binding->topicName,
            ':department' => $binding->department,
            ':created_at' => $timestamp,
            ':updated_at' => $timestamp,
        ]);
    }

    public function getTopicBinding(string $groupKey, int $threadId): ?TopicBinding
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM topic_bindings WHERE group_key = :group_key AND thread_id = :thread_id'
        );
        $stmt->execute([':group_key' => $groupKey, ':thread_id' => $threadId]);
        $row = $stmt->fetch();
        return $row === false ? null : $this->hydrateBinding($row);
    }

    /** @return TopicBinding[] */
    public function listTopicBindings(string $groupKey): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM topic_bindings WHERE group_key = :group_key ORDER BY topic_name'
        );
        $stmt->execute([':group_key' => $groupKey]);
        $rows = $stmt->fetchAll();
        return array_map(fn (array $row): TopicBinding => $this->hydrateBinding($row), $rows);
    }

    public function nextSequence(string $region, string $onDate): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total FROM communications WHERE region = :region AND substr(created_at, 1, 10) = :on_date'
        );
        $stmt->execute([':region' => $region, ':on_date' => $onDate]);
        $row = $stmt->fetch();
        return ((int) ($row['total'] ?? 0)) + 1;
    }

    public function insertCommunication(CommunicationRecord $record): void
    {
        $timestamp = Helpers::utcNow();
        if ($record->createdAt === '') {
            $record->createdAt = $timestamp;
        }
        $record->updatedAt = $timestamp;

        $stmt = $this->pdo->prepare(
            'INSERT INTO communications (
                reference_no, region, branch_name, topic_name, department,
                source_chat_id, source_message_id, source_thread_id,
                sender_user_id, sender_display_name,
                ho_chat_id, ho_summary_message_id, ho_message_id,
                regional_manager_user_id, department_head_user_id,
                status, created_at, updated_at
            ) VALUES (
                :reference_no, :region, :branch_name, :topic_name, :department,
                :source_chat_id, :source_message_id, :source_thread_id,
                :sender_user_id, :sender_display_name,
                :ho_chat_id, :ho_summary_message_id, :ho_message_id,
                :regional_manager_user_id, :department_head_user_id,
                :status, :created_at, :updated_at
            )'
        );

        $stmt->execute($this->recordToParams($record));
    }

    public function updateCommunication(CommunicationRecord $record): void
    {
        $record->updatedAt = Helpers::utcNow();
        $stmt = $this->pdo->prepare(
            'UPDATE communications SET
                region = :region,
                branch_name = :branch_name,
                topic_name = :topic_name,
                department = :department,
                source_chat_id = :source_chat_id,
                source_message_id = :source_message_id,
                source_thread_id = :source_thread_id,
                sender_user_id = :sender_user_id,
                sender_display_name = :sender_display_name,
                ho_chat_id = :ho_chat_id,
                ho_summary_message_id = :ho_summary_message_id,
                ho_message_id = :ho_message_id,
                regional_manager_user_id = :regional_manager_user_id,
                department_head_user_id = :department_head_user_id,
                status = :status,
                created_at = :created_at,
                updated_at = :updated_at
            WHERE reference_no = :reference_no'
        );

        $stmt->execute($this->recordToParams($record));
    }

    public function getCommunication(string $referenceNo): ?CommunicationRecord
    {
        $stmt = $this->pdo->prepare('SELECT * FROM communications WHERE reference_no = :reference_no');
        $stmt->execute([':reference_no' => $referenceNo]);
        $row = $stmt->fetch();
        return $row === false ? null : $this->hydrateRecord($row);
    }

    public function findCommunicationBySourceMessage(int $chatId, int $messageId): ?CommunicationRecord
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM communications WHERE source_chat_id = :source_chat_id AND source_message_id = :source_message_id'
        );
        $stmt->execute([
            ':source_chat_id' => $chatId,
            ':source_message_id' => $messageId,
        ]);
        $row = $stmt->fetch();
        return $row === false ? null : $this->hydrateRecord($row);
    }

    public function findCommunicationByHoMessageId(int $hoMessageId): ?CommunicationRecord
    {
        $stmt = $this->pdo->prepare('SELECT * FROM communications WHERE ho_message_id = :ho_message_id');
        $stmt->execute([':ho_message_id' => $hoMessageId]);
        $row = $stmt->fetch();
        return $row === false ? null : $this->hydrateRecord($row);
    }

    /** @return CommunicationRecord[] */
    public function listCommunications(int $limit = 20): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM communications ORDER BY created_at DESC LIMIT :limit'
        );
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        return array_map(fn (array $row): CommunicationRecord => $this->hydrateRecord($row), $rows);
    }

    /** @return UserProfile[] */
    public function getAllUsers(): array
    {
        $stmt = $this->pdo->query('SELECT * FROM users ORDER BY role, display_name');
        $rows = $stmt->fetchAll();
        return array_map(fn (array $row): UserProfile => $this->hydrateUser($row), $rows);
    }

    public function deleteUser(int $telegramUserId): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM users WHERE telegram_user_id = :telegram_user_id');
        return $stmt->execute([':telegram_user_id' => $telegramUserId]);
    }

    public function deleteTopicBinding(string $groupKey, int $threadId): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM topic_bindings WHERE group_key = :group_key AND thread_id = :thread_id');
        return $stmt->execute([':group_key' => $groupKey, ':thread_id' => $threadId]);
    }

    /** @return TopicBinding[] */
    public function getAllTopicBindings(): array
    {
        $stmt = $this->pdo->query('SELECT * FROM topic_bindings ORDER BY group_key, topic_name');
        $rows = $stmt->fetchAll();
        return array_map(fn (array $row): TopicBinding => $this->hydrateBinding($row), $rows);
    }

    public function updateCommunicationStatus(string $referenceNo, string $status): bool
    {
        $stmt = $this->pdo->prepare('UPDATE communications SET status = :status, updated_at = :updated_at WHERE reference_no = :reference_no');
        return $stmt->execute([
            ':status' => $status,
            ':updated_at' => Helpers::utcNow(),
            ':reference_no' => $referenceNo,
        ]);
    }

    /** @return array<string, mixed> */
    public function getSystemStats(): array
    {
        $totalComms = (int) ($this->pdo->query('SELECT COUNT(*) FROM communications')->fetchColumn() ?: 0);
        $recordedComms = (int) ($this->pdo->query("SELECT COUNT(*) FROM communications WHERE status = 'recorded'")->fetchColumn() ?: 0);
        $forwardedComms = (int) ($this->pdo->query("SELECT COUNT(*) FROM communications WHERE status = 'forwarded'")->fetchColumn() ?: 0);
        $respondedComms = (int) ($this->pdo->query("SELECT COUNT(*) FROM communications WHERE status = 'responded'")->fetchColumn() ?: 0);
        $totalUsers = (int) ($this->pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() ?: 0);
        $totalBindings = (int) ($this->pdo->query('SELECT COUNT(*) FROM topic_bindings')->fetchColumn() ?: 0);

        return [
            'total_communications' => $totalComms,
            'recorded_communications' => $recordedComms,
            'forwarded_communications' => $forwardedComms,
            'responded_communications' => $respondedComms,
            'total_users' => $totalUsers,
            'total_bindings' => $totalBindings,
        ];
    }

    private function createSchema(): void
    {
        $this->pdo->exec(
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

        $this->pdo->exec(
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

        $this->pdo->exec(
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
                updated_at TEXT NOT NULL,
                UNIQUE(source_chat_id, source_message_id)
            )'
        );
    }

    private function hydrateUser(array $row): UserProfile
    {
        return new UserProfile(
            telegramUserId: (int) $row['telegram_user_id'],
            displayName: (string) $row['display_name'],
            role: (string) $row['role'],
            region: $row['region'] !== null ? (string) $row['region'] : null,
            branchName: $row['branch_name'] !== null ? (string) $row['branch_name'] : null,
            department: $row['department'] !== null ? (string) $row['department'] : null,
            canForward: ((int) $row['can_forward']) === 1,
        );
    }

    private function hydrateBinding(array $row): TopicBinding
    {
        return new TopicBinding(
            groupKey: (string) $row['group_key'],
            threadId: (int) $row['thread_id'],
            topicName: (string) $row['topic_name'],
            department: (string) $row['department'],
        );
    }

    private function hydrateRecord(array $row): CommunicationRecord
    {
        return new CommunicationRecord(
            referenceNo: (string) $row['reference_no'],
            region: (string) $row['region'],
            branchName: $row['branch_name'] !== null ? (string) $row['branch_name'] : null,
            topicName: (string) $row['topic_name'],
            department: (string) $row['department'],
            sourceChatId: (int) $row['source_chat_id'],
            sourceMessageId: (int) $row['source_message_id'],
            sourceThreadId: $row['source_thread_id'] !== null ? (int) $row['source_thread_id'] : null,
            senderUserId: $row['sender_user_id'] !== null ? (int) $row['sender_user_id'] : null,
            senderDisplayName: (string) $row['sender_display_name'],
            hoChatId: $row['ho_chat_id'] !== null ? (int) $row['ho_chat_id'] : null,
            hoSummaryMessageId: $row['ho_summary_message_id'] !== null ? (int) $row['ho_summary_message_id'] : null,
            hoMessageId: $row['ho_message_id'] !== null ? (int) $row['ho_message_id'] : null,
            regionalManagerUserId: $row['regional_manager_user_id'] !== null ? (int) $row['regional_manager_user_id'] : null,
            departmentHeadUserId: $row['department_head_user_id'] !== null ? (int) $row['department_head_user_id'] : null,
            status: (string) $row['status'],
            createdAt: (string) $row['created_at'],
            updatedAt: (string) $row['updated_at'],
        );
    }

    /**
     * @return array<string, int|string|null>
     */
    private function recordToParams(CommunicationRecord $record): array
    {
        return [
            ':reference_no' => $record->referenceNo,
            ':region' => $record->region,
            ':branch_name' => $record->branchName,
            ':topic_name' => $record->topicName,
            ':department' => $record->department,
            ':source_chat_id' => $record->sourceChatId,
            ':source_message_id' => $record->sourceMessageId,
            ':source_thread_id' => $record->sourceThreadId,
            ':sender_user_id' => $record->senderUserId,
            ':sender_display_name' => $record->senderDisplayName,
            ':ho_chat_id' => $record->hoChatId,
            ':ho_summary_message_id' => $record->hoSummaryMessageId,
            ':ho_message_id' => $record->hoMessageId,
            ':regional_manager_user_id' => $record->regionalManagerUserId,
            ':department_head_user_id' => $record->departmentHeadUserId,
            ':status' => $record->status,
            ':created_at' => $record->createdAt,
            ':updated_at' => $record->updatedAt,
        ];
    }
}

final class KaldisBot
{
    public function __construct(
        private BotConfig $config,
        private SQLiteStorage $storage,
        private TelegramClientInterface $client,
    ) {
    }

    public function run(): void
    {
        $offset = null;
        while (true) {
            try {
                $updates = $this->client->getUpdates($offset, $this->config->pollTimeout);
                foreach ($updates as $update) {
                    if (!isset($update['update_id'])) {
                        continue;
                    }
                    $offset = (int) $update['update_id'] + 1;
                    $this->handleUpdate($update);
                }
                usleep((int) max(0, $this->config->pollIntervalSeconds * 1000000));
            } catch (Throwable $exception) {
                error_log('[KaldisBot] ' . $exception->getMessage());
                usleep(2000000);
            }
        }
    }

    /** @param array<string, mixed> $update */
    public function handleUpdate(array $update): void
    {
        if (isset($update['message'])) {
            $this->handleMessage($update['message']);
        } elseif (isset($update['callback_query'])) {
            $this->handleCallbackQuery($update['callback_query']);
        }
    }

    /** @param array<string, mixed> $message */
    public function handleMessage(array $message): void
    {
        $sender = is_array($message['from'] ?? null) ? $message['from'] : [];
        if (($sender['is_bot'] ?? false) === true) {
            return;
        }

        $chat = is_array($message['chat'] ?? null) ? $message['chat'] : [];
        $chatType = (string) ($chat['type'] ?? '');
        $chatId = (int) ($chat['id'] ?? 0);
        $text = (string) ($message['text'] ?? $message['caption'] ?? '');
        $threadId = isset($message['message_thread_id']) ? (int) $message['message_thread_id'] : null;
        $senderId = isset($sender['id']) ? (int) $sender['id'] : null;
        $senderName = Helpers::displayName($sender);

        if ($text !== '' && str_starts_with($text, '/')) {
            $tokens = Helpers::parseCommandArguments($text);
            $command = strtolower($tokens[0] ?? '');

            if ($command === '/bind_topic') {
                $this->handleBindTopicCommand($message, $tokens, $chatId, $threadId);
                return;
            }

            if ($chatType === 'private') {
                $this->handlePrivateCommand($message, $tokens, $senderId, $senderName);
                return;
            }

            return;
        }

        if ($chatType === 'private') {
            $this->client->sendMessage(
                $chatId,
                'Use /help to see the registration commands for the Kaldis communication bot.'
            );
            return;
        }

        if ($threadId === null) {
            return;
        }

        $groupKey = $this->groupKey($chatId);
        if ($groupKey === null) {
            return;
        }

        if (str_starts_with($groupKey, 'ho:')) {
            $binding = $this->storage->getTopicBinding($groupKey, $threadId);
            if ($binding !== null && isset($message['reply_to_message'])) {
                $this->processHoReply($message, $binding, $senderId, $senderName);
            }
            return;
        }

        $binding = $this->storage->getTopicBinding($groupKey, $threadId);
        if ($binding === null) {
            return;
        }

        $region = $this->regionForGroupKey($groupKey);
        if ($region === null) {
            return;
        }

        $this->createOrGetReference(
            chatId: $chatId,
            messageId: (int) ($message['message_id'] ?? 0),
            threadId: $threadId,
            region: $region,
            branchName: $this->storage->getUser($senderId ?? 0)?->branchName,
            topicName: $binding->topicName,
            department: $binding->department,
            senderId: $senderId,
            senderName: $senderName,
        );
    }

    /** @param array<string, mixed> $callbackQuery */
    public function handleCallbackQuery(array $callbackQuery): void
    {
        $callbackId = (string) ($callbackQuery['id'] ?? '');
        $data = (string) ($callbackQuery['data'] ?? '');
        $sender = is_array($callbackQuery['from'] ?? null) ? $callbackQuery['from'] : [];
        $senderId = isset($sender['id']) ? (int) $sender['id'] : null;
        $senderProfile = $senderId !== null ? $this->storage->getUser($senderId) : null;

        if (!str_starts_with($data, 'forward:')) {
            $this->client->answerCallbackQuery($callbackId, 'Unsupported action.');
            return;
        }

        $referenceNo = substr($data, strlen('forward:'));
        $record = $this->storage->getCommunication($referenceNo);
        if ($record === null) {
            $this->client->answerCallbackQuery($callbackId, 'Reference not found.');
            return;
        }

        if ($senderProfile === null || !in_array($senderProfile->role, [Roles::REGIONAL_MANAGER, Roles::OPERATIONS_DIRECTOR], true)) {
            $this->client->answerCallbackQuery($callbackId, 'Only a regional manager can forward this.');
            return;
        }

        if ($senderProfile->role === Roles::REGIONAL_MANAGER && $senderProfile->region !== $record->region) {
            $this->client->answerCallbackQuery($callbackId, 'This reference belongs to a different region.');
            return;
        }

        if ($record->hoMessageId !== null) {
            $this->client->answerCallbackQuery($callbackId, 'Already forwarded to Head Office.');
            return;
        }

        $hoGroupKey = $this->hoGroupKey();
        $hoThreadId = $this->topicThreadIdForDepartment($hoGroupKey, $record->department);
        if ($hoThreadId === null || $this->config->hoGroupChatId === null) {
            $this->client->answerCallbackQuery($callbackId, 'Head Office topic is not configured.');
            return;
        }

        $summaryText = sprintf(
            "Reference %s\nRegion: %s\nBranch: %s\nTopic: %s\nDepartment: %s",
            $record->referenceNo,
            $record->region,
            $record->branchName ?? 'Unassigned',
            $record->topicName,
            $record->department,
        );
        $summaryMessage = $this->client->sendMessage(
            $this->config->hoGroupChatId,
            $summaryText,
            $hoThreadId,
        );
        $copiedMessage = $this->client->copyMessage(
            $this->config->hoGroupChatId,
            $record->sourceChatId,
            $record->sourceMessageId,
            $hoThreadId,
        );

        $record->hoChatId = $this->config->hoGroupChatId;
        $record->hoSummaryMessageId = isset($summaryMessage['message_id']) ? (int) $summaryMessage['message_id'] : null;
        $record->hoMessageId = isset($copiedMessage['message_id']) ? (int) $copiedMessage['message_id'] : null;
        $record->status = 'forwarded';
        $record->regionalManagerUserId = $record->regionalManagerUserId
            ?? $this->storage->getRegionalManager($record->region)?->telegramUserId
            ?? $senderProfile->telegramUserId;
        $this->storage->updateCommunication($record);

        if ($this->config->operationsDirectorUserId !== null) {
            $this->client->sendMessage(
                $this->config->operationsDirectorUserId,
                sprintf('%s was forwarded to HO for %s.', $record->referenceNo, $record->department),
            );
        }

        $this->client->answerCallbackQuery($callbackId, 'Forwarded to Head Office.');
        if (isset($callbackQuery['message']) && is_array($callbackQuery['message'])) {
            $message = $callbackQuery['message'];
            $chatId = isset($message['chat']['id']) ? (int) $message['chat']['id'] : 0;
            $messageId = isset($message['message_id']) ? (int) $message['message_id'] : 0;
            if ($chatId !== 0 && $messageId !== 0) {
                $this->client->editMessageReplyMarkup($chatId, $messageId, null);
            }
        }
    }

    /** @param array<int, string> $tokens */
    private function handlePrivateCommand(array $message, array $tokens, ?int $senderId, string $senderName): void
    {
        $chatId = (int) ($message['chat']['id'] ?? 0);
        $command = strtolower($tokens[0] ?? '');

        if ($command === '/help') {
            $this->client->sendMessage(
                $chatId,
                "Kaldis bot commands:\n"
                    . '/register_branch "<region>" "<branch name>"' . "\n"
                    . '/register_manager "<region>"' . "\n"
                    . '/register_head "<department>"' . "\n"
                    . "/register_director\n"
                    . '/records [limit]'
            );
            return;
        }

        if ($command === '/register_branch' && $senderId !== null) {
            if (count($tokens) < 3) {
                $this->client->sendMessage($chatId, 'Usage: /register_branch "<region>" "<branch name>"');
                return;
            }

            $region = (string) $tokens[1];
            $branchName = trim(implode(' ', array_slice($tokens, 2)));
            $this->storage->upsertUser(new UserProfile(
                telegramUserId: $senderId,
                displayName: $senderName,
                role: Roles::BRANCH_MANAGER,
                region: $region,
                branchName: $branchName,
            ));
            $this->client->sendMessage($chatId, sprintf('Registered %s as branch manager for %s.', $senderName, $region));
            return;
        }

        if ($command === '/register_manager' && $senderId !== null) {
            if (count($tokens) < 2) {
                $this->client->sendMessage($chatId, 'Usage: /register_manager "<region>"');
                return;
            }

            $region = trim(implode(' ', array_slice($tokens, 1)));
            $this->storage->upsertUser(new UserProfile(
                telegramUserId: $senderId,
                displayName: $senderName,
                role: Roles::REGIONAL_MANAGER,
                region: $region,
                canForward: true,
            ));
            $this->client->sendMessage($chatId, sprintf('Registered %s as regional manager for %s.', $senderName, $region));
            return;
        }

        if ($command === '/register_head' && $senderId !== null) {
            if (count($tokens) < 2) {
                $this->client->sendMessage($chatId, 'Usage: /register_head "<department>"');
                return;
            }

            $department = trim(implode(' ', array_slice($tokens, 1)));
            $this->storage->upsertUser(new UserProfile(
                telegramUserId: $senderId,
                displayName: $senderName,
                role: Roles::DEPARTMENT_HEAD,
                department: $department,
            ));
            $this->client->sendMessage($chatId, sprintf('Registered %s as department head for %s.', $senderName, $department));
            return;
        }

        if ($command === '/register_director' && $senderId !== null) {
            $this->storage->upsertUser(new UserProfile(
                telegramUserId: $senderId,
                displayName: $senderName,
                role: Roles::OPERATIONS_DIRECTOR,
                canForward: true,
            ));
            $this->client->sendMessage($chatId, sprintf('Registered %s as operations director.', $senderName));
            return;
        }

        if ($command === '/records') {
            $limit = 5;
            if (isset($tokens[1]) && is_numeric($tokens[1])) {
                $limit = max(1, min(20, (int) $tokens[1]));
            }

            $records = $this->storage->listCommunications($limit);
            if ($records === []) {
                $this->client->sendMessage($chatId, 'No communication records yet.');
                return;
            }

            $lines = [];
            foreach ($records as $record) {
                $lines[] = sprintf(
                    '%s | %s | %s | %s | %s',
                    $record->referenceNo,
                    $record->region,
                    $record->branchName ?? 'Unassigned',
                    $record->topicName,
                    $record->status,
                );
            }

            $this->client->sendMessage($chatId, implode("\n", $lines));
            return;
        }

        $this->client->sendMessage($chatId, 'Command not recognized. Send /help for the available options.');
    }

    /** @param array<int, string> $tokens */
    private function handleBindTopicCommand(array $message, array $tokens, int $chatId, ?int $threadId): void
    {
        if ($threadId === null) {
            $this->client->sendMessage($chatId, 'Run /bind_topic inside a forum topic.');
            return;
        }

        $groupKey = $this->groupKey($chatId);
        if ($groupKey === null) {
            $this->client->sendMessage($chatId, 'This chat is not configured in the bot.');
            return;
        }

        if (count($tokens) < 2) {
            $this->client->sendMessage($chatId, 'Usage: /bind_topic "<topic name>" "<department>"');
            return;
        }

        $topicName = Helpers::normalizeTopicName((string) $tokens[1]);
        $department = Helpers::normalizeTopicName((string) ($tokens[2] ?? $tokens[1]));
        $this->storage->bindTopic(new TopicBinding($groupKey, $threadId, $topicName, $department));
        $this->client->sendMessage($chatId, sprintf("Bound topic '%s' to department '%s'.", $topicName, $department));
    }

    private function createOrGetReference(
        int $chatId,
        int $messageId,
        int $threadId,
        string $region,
        ?string $branchName,
        string $topicName,
        string $department,
        ?int $senderId,
        string $senderName,
    ): string {
        $existing = $this->storage->findCommunicationBySourceMessage($chatId, $messageId);
        if ($existing !== null) {
            return $existing->referenceNo;
        }

        $sequence = $this->storage->nextSequence($region, gmdate('Y-m-d'));
        $referenceNo = Routing::buildReferenceNumber('KALDIS', $this->config->regionCode($region), $sequence);
        $regionalManager = $this->storage->getRegionalManager($region);

        $record = new CommunicationRecord(
            referenceNo: $referenceNo,
            region: $region,
            branchName: $branchName,
            topicName: $topicName,
            department: $department,
            sourceChatId: $chatId,
            sourceMessageId: $messageId,
            sourceThreadId: $threadId,
            senderUserId: $senderId,
            senderDisplayName: $senderName,
            regionalManagerUserId: $regionalManager?->telegramUserId,
        );

        $this->storage->insertCommunication($record);
        $this->sendReferenceCard($chatId, $threadId, $region, $branchName, $topicName, $department, $referenceNo);

        return $referenceNo;
    }

    private function sendReferenceCard(
        int $chatId,
        int $threadId,
        string $region,
        ?string $branchName,
        string $topicName,
        string $department,
        string $referenceNo,
    ): void {
        $text = sprintf(
            "Reference %s\nRegion: %s\nBranch: %s\nTopic: %s\nDepartment: %s",
            $referenceNo,
            $region,
            $branchName ?? 'Unassigned',
            $topicName,
            $department,
        );
        $replyMarkup = [
            'inline_keyboard' => [
                [
                    [
                        'text' => '➡️ Forward to HO',
                        'callback_data' => 'forward:' . $referenceNo,
                    ],
                ],
            ],
        ];

        $this->client->sendMessage($chatId, $text, $threadId, $replyMarkup);
    }

    /** @param array<string, mixed> $message */
    private function processHoReply(array $message, TopicBinding $binding, ?int $senderId, string $senderName): void
    {
        $replyTo = is_array($message['reply_to_message'] ?? null) ? $message['reply_to_message'] : [];
        $repliedToMessageId = isset($replyTo['message_id']) ? (int) $replyTo['message_id'] : null;
        if ($repliedToMessageId === null) {
            return;
        }

        $record = $this->storage->findCommunicationByHoMessageId($repliedToMessageId);
        if ($record === null) {
            return;
        }

        $departmentHead = $this->storage->getDepartmentHead($binding->department);
        if ($departmentHead !== null && $senderId !== null && $senderId !== $departmentHead->telegramUserId) {
            return;
        }

        $regionalManagerId = $record->regionalManagerUserId;
        if ($regionalManagerId === null) {
            $regionalManagerId = $this->storage->getRegionalManager($record->region)?->telegramUserId;
        }

        if ($regionalManagerId !== null) {
            $responseText = sprintf(
                "Response received for %s\nDepartment: %s\nResponder: %s\nHO topic: %s\nMessage: %s",
                $record->referenceNo,
                $record->department,
                $senderName,
                $binding->topicName,
                (string) ($message['text'] ?? $message['caption'] ?? 'Response received'),
            );
            $this->client->sendMessage($regionalManagerId, $responseText);
        }

        $record->status = 'responded';
        $record->departmentHeadUserId = $senderId;
        $record->regionalManagerUserId = $regionalManagerId;
        $this->storage->updateCommunication($record);
    }

    private function groupKey(int $chatId): ?string
    {
        $region = $this->config->regionForChatId($chatId);
        if ($region !== null) {
            return 'region:' . $region;
        }

        if ($this->config->hoGroupChatId === $chatId) {
            return $this->hoGroupKey();
        }

        return null;
    }

    private function hoGroupKey(): string
    {
        return 'ho:head_office';
    }

    private function regionForGroupKey(string $groupKey): ?string
    {
        if (str_starts_with($groupKey, 'region:')) {
            return substr($groupKey, strlen('region:'));
        }

        return null;
    }

    private function topicThreadIdForDepartment(string $groupKey, string $department): ?int
    {
        foreach ($this->storage->listTopicBindings($groupKey) as $binding) {
            if (mb_strtolower($binding->department) === mb_strtolower($department)) {
                return $binding->threadId;
            }
        }

        return null;
    }
}

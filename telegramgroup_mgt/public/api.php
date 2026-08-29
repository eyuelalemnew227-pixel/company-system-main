<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

use KaldisTelegram\BotConfig;
use KaldisTelegram\SQLiteStorage;
use KaldisTelegram\TopicBinding;
use KaldisTelegram\UserProfile;

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$configPath = __DIR__ . '/../config.json';
if (!file_exists($configPath)) {
    $configPath = __DIR__ . '/../config.example.json';
}

try {
    $config = BotConfig::fromFile($configPath);
    $storage = new SQLiteStorage($config->databasePath);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'stats';
$rawInput = file_get_contents('php://input');
$jsonBody = [];
if ($rawInput !== false && $rawInput !== '') {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $jsonBody = $decoded;
    }
}

$input = array_merge($_GET, $_POST, $jsonBody);

try {
    switch ($action) {
        case 'stats':
            $stats = $storage->getSystemStats();
            $stats['configured_regions'] = array_keys($config->regionGroups);
            $stats['ho_configured'] = $config->hoGroupChatId !== null;
            $stats['director_configured'] = $config->operationsDirectorUserId !== null;
            echo json_encode(['success' => true, 'data' => $stats]);
            break;

        case 'communications':
            $limit = isset($input['limit']) ? max(1, min(100, (int) $input['limit'])) : 100;
            $records = $storage->listCommunications($limit);

            $statusFilter = trim((string) ($input['status'] ?? ''));
            $regionFilter = trim((string) ($input['region'] ?? ''));
            $deptFilter = trim((string) ($input['department'] ?? ''));
            $searchQuery = trim(mb_strtolower((string) ($input['q'] ?? '')));

            $filtered = [];
            foreach ($records as $record) {
                if ($statusFilter !== '' && $record->status !== $statusFilter) {
                    continue;
                }
                if ($regionFilter !== '' && $record->region !== $regionFilter) {
                    continue;
                }
                if ($deptFilter !== '' && $record->department !== $deptFilter) {
                    continue;
                }
                if ($searchQuery !== '') {
                    $haystack = mb_strtolower(
                        $record->referenceNo . ' ' .
                        $record->region . ' ' .
                        ($record->branchName ?? '') . ' ' .
                        $record->topicName . ' ' .
                        $record->department . ' ' .
                        $record->senderDisplayName
                    );
                    if (!str_contains($haystack, $searchQuery)) {
                        continue;
                    }
                }

                $filtered[] = [
                    'referenceNo' => $record->referenceNo,
                    'region' => $record->region,
                    'branchName' => $record->branchName,
                    'topicName' => $record->topicName,
                    'department' => $record->department,
                    'sourceChatId' => $record->sourceChatId,
                    'sourceMessageId' => $record->sourceMessageId,
                    'sourceThreadId' => $record->sourceThreadId,
                    'senderUserId' => $record->senderUserId,
                    'senderDisplayName' => $record->senderDisplayName,
                    'hoChatId' => $record->hoChatId,
                    'hoSummaryMessageId' => $record->hoSummaryMessageId,
                    'hoMessageId' => $record->hoMessageId,
                    'regionalManagerUserId' => $record->regionalManagerUserId,
                    'departmentHeadUserId' => $record->departmentHeadUserId,
                    'status' => $record->status,
                    'createdAt' => $record->createdAt,
                    'updatedAt' => $record->updatedAt,
                ];
            }

            echo json_encode(['success' => true, 'data' => $filtered]);
            break;

        case 'update_communication_status':
            $ref = (string) ($input['referenceNo'] ?? '');
            $status = (string) ($input['status'] ?? '');
            if ($ref === '' || !in_array($status, ['recorded', 'forwarded', 'responded'], true)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid reference number or status value']);
                break;
            }

            $success = $storage->updateCommunicationStatus($ref, $status);
            echo json_encode(['success' => $success]);
            break;

        case 'users':
            $users = $storage->getAllUsers();
            $data = array_map(static fn (UserProfile $u) => [
                'telegramUserId' => $u->telegramUserId,
                'displayName' => $u->displayName,
                'role' => $u->role,
                'region' => $u->region,
                'branchName' => $u->branchName,
                'department' => $u->department,
                'canForward' => $u->canForward,
            ], $users);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'save_user':
            $userId = (int) ($input['telegramUserId'] ?? 0);
            $displayName = trim((string) ($input['displayName'] ?? ''));
            $role = trim((string) ($input['role'] ?? ''));

            if ($userId <= 0 || $displayName === '' || $role === '') {
                http_response_code(400);
                echo json_encode(['error' => 'User ID, Display Name, and Role are required.']);
                break;
            }

            $profile = new UserProfile(
                telegramUserId: $userId,
                displayName: $displayName,
                role: $role,
                region: !empty($input['region']) ? (string) $input['region'] : null,
                branchName: !empty($input['branchName']) ? (string) $input['branchName'] : null,
                department: !empty($input['department']) ? (string) $input['department'] : null,
                canForward: !empty($input['canForward']),
            );

            $storage->upsertUser($profile);
            echo json_encode(['success' => true]);
            break;

        case 'delete_user':
            $userId = (int) ($input['telegramUserId'] ?? 0);
            if ($userId <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid Telegram User ID']);
                break;
            }

            $success = $storage->deleteUser($userId);
            echo json_encode(['success' => $success]);
            break;

        case 'bindings':
            $bindings = $storage->getAllTopicBindings();
            $data = array_map(static fn (TopicBinding $b) => [
                'groupKey' => $b->groupKey,
                'threadId' => $b->threadId,
                'topicName' => $b->topicName,
                'department' => $b->department,
            ], $bindings);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'save_binding':
            $groupKey = trim((string) ($input['groupKey'] ?? ''));
            $threadId = (int) ($input['threadId'] ?? 0);
            $topicName = trim((string) ($input['topicName'] ?? ''));
            $department = trim((string) ($input['department'] ?? ''));

            if ($groupKey === '' || $threadId <= 0 || $topicName === '' || $department === '') {
                http_response_code(400);
                echo json_encode(['error' => 'Group Key, Thread ID, Topic Name, and Department are required.']);
                break;
            }

            $storage->bindTopic(new TopicBinding($groupKey, $threadId, $topicName, $department));
            echo json_encode(['success' => true]);
            break;

        case 'delete_binding':
            $groupKey = trim((string) ($input['groupKey'] ?? ''));
            $threadId = (int) ($input['threadId'] ?? 0);

            if ($groupKey === '' || $threadId <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Group Key and Thread ID are required']);
                break;
            }

            $success = $storage->deleteTopicBinding($groupKey, $threadId);
            echo json_encode(['success' => $success]);
            break;

        case 'config':
            $rawConfig = file_exists(__DIR__ . '/../config.json')
                ? json_decode((string) file_get_contents(__DIR__ . '/../config.json'), true)
                : json_decode((string) file_get_contents(__DIR__ . '/../config.example.json'), true);

            if (is_array($rawConfig) && !empty($rawConfig['bot_token'])) {
                $rawConfig['bot_token_masked'] = substr($rawConfig['bot_token'], 0, 6) . '...' . substr($rawConfig['bot_token'], -4);
            }

            echo json_encode(['success' => true, 'data' => $rawConfig]);
            break;

        case 'save_config':
            $targetPath = __DIR__ . '/../config.json';
            $existing = file_exists($targetPath)
                ? json_decode((string) file_get_contents($targetPath), true)
                : [];

            if (isset($input['bot_token']) && trim((string) $input['bot_token']) !== '') {
                $existing['bot_token'] = trim((string) $input['bot_token']);
            }
            if (isset($input['database_path'])) {
                $existing['database_path'] = trim((string) $input['database_path']);
            }
            if (isset($input['poll_timeout'])) {
                $existing['poll_timeout'] = (int) $input['poll_timeout'];
            }
            if (isset($input['poll_interval_seconds'])) {
                $existing['poll_interval_seconds'] = (float) $input['poll_interval_seconds'];
            }
            if (isset($input['operations_director_user_id'])) {
                $existing['operations_director_user_id'] = (int) $input['operations_director_user_id'];
            }
            if (isset($input['ho_group_chat_id'])) {
                $existing['ho_group_chat_id'] = (int) $input['ho_group_chat_id'];
            }
            if (isset($input['region_groups']) && is_array($input['region_groups'])) {
                $existing['region_groups'] = $input['region_groups'];
            }
            if (isset($input['region_codes']) && is_array($input['region_codes'])) {
                $existing['region_codes'] = $input['region_codes'];
            }

            file_put_contents($targetPath, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Unknown action: ' . $action]);
            break;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}

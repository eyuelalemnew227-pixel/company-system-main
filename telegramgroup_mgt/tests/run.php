<?php
declare(strict_types=1);

require __DIR__ . '/../src/bootstrap.php';

use KaldisTelegram\BotConfig;
use KaldisTelegram\CommunicationRecord;
use KaldisTelegram\Helpers;
use KaldisTelegram\KaldisBot;
use KaldisTelegram\Roles;
use KaldisTelegram\Routing;
use KaldisTelegram\SQLiteStorage;
use KaldisTelegram\TelegramClientInterface;
use KaldisTelegram\TopicBinding;
use KaldisTelegram\UserProfile;

final class FakeTelegramClient implements TelegramClientInterface
{
    /** @var array<int, array<string, mixed>> */
    public array $sentMessages = [];

    /** @var array<int, array<string, mixed>> */
    public array $copiedMessages = [];

    /** @var array<int, array<string, mixed>> */
    public array $callbackAnswers = [];

    /** @var array<int, array<string, mixed>> */
    public array $editedReplyMarkups = [];

    public int $nextMessageId = 1000;

    public function getUpdates(?int $offset = null, int $timeout = 25): array
    {
        return [];
    }

    public function sendMessage(int $chatId, string $text, ?int $messageThreadId = null, ?array $replyMarkup = null): array
    {
        $messageId = $this->nextMessageId++;
        $this->sentMessages[] = compact('chatId', 'text', 'messageThreadId', 'replyMarkup', 'messageId');
        return ['message_id' => $messageId];
    }

    public function copyMessage(int $chatId, int $fromChatId, int $messageId, ?int $messageThreadId = null): array
    {
        $copiedMessageId = $this->nextMessageId++;
        $this->copiedMessages[] = compact('chatId', 'fromChatId', 'messageId', 'messageThreadId', 'copiedMessageId');
        return ['message_id' => $copiedMessageId];
    }

    public function answerCallbackQuery(string $callbackQueryId, ?string $text = null): array
    {
        $this->callbackAnswers[] = compact('callbackQueryId', 'text');
        return [];
    }

    public function editMessageReplyMarkup(int $chatId, int $messageId, ?array $replyMarkup): array
    {
        $this->editedReplyMarkups[] = compact('chatId', 'messageId', 'replyMarkup');
        return [];
    }

    public function deleteMessage(int $chatId, int $messageId): array
    {
        return [];
    }
}

function assertTrue(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function assertSameValue(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        $expectedText = var_export($expected, true);
        $actualText = var_export($actual, true);
        throw new RuntimeException($message . " Expected {$expectedText}, got {$actualText}");
    }
}

function runRoutingTests(): void
{
    $reference = Routing::buildReferenceNumber('KALDIS', 'R1', 7, new DateTimeImmutable('2026-08-10', new DateTimeZone('UTC')));
    assertSameValue('KALDIS-R1-20260810-007', $reference, 'Reference number format changed.');
    assertSameValue('suggestions & improvements', Helpers::normalizeTopicName('  Suggestions   &   Improvements '), 'Topic normalization failed.');
}

function runStorageTests(): void
{
    $path = tempnam(sys_get_temp_dir(), 'kaldis');
    if ($path === false) {
        throw new RuntimeException('Could not allocate temp file.');
    }

    $storage = new SQLiteStorage($path);
    $storage->upsertUser(new UserProfile(
        telegramUserId: 10,
        displayName: 'A Manager',
        role: Roles::REGIONAL_MANAGER,
        region: 'Region 1',
        canForward: true,
    ));
    assertTrue($storage->getUser(10) !== null, 'User was not stored.');

    $storage->bindTopic(new TopicBinding(
        groupKey: 'region:Region 1',
        threadId: 101,
        topicName: 'HR',
        department: 'HR',
    ));
    $binding = $storage->getTopicBinding('region:Region 1', 101);
    assertTrue($binding !== null, 'Topic binding was not stored.');
    assertSameValue('HR', $binding->department, 'Topic binding department mismatch.');

    $record = new CommunicationRecord(
        referenceNo: 'KALDIS-R1-20260810-001',
        region: 'Region 1',
        branchName: 'Kaldis Bole',
        topicName: 'HR',
        department: 'HR',
        sourceChatId: -1001,
        sourceMessageId: 55,
        sourceThreadId: 101,
        senderUserId: 10,
        senderDisplayName: 'A Manager',
    );
    $storage->insertCommunication($record);
    $fetched = $storage->getCommunication('KALDIS-R1-20260810-001');
    assertTrue($fetched !== null, 'Communication was not stored.');
    assertSameValue('Kaldis Bole', $fetched->branchName, 'Communication branch mismatch.');

    // Admin storage methods tests
    $allUsers = $storage->getAllUsers();
    assertTrue(count($allUsers) === 1, 'getAllUsers count mismatch.');

    $allBindings = $storage->getAllTopicBindings();
    assertTrue(count($allBindings) === 1, 'getAllTopicBindings count mismatch.');

    $stats = $storage->getSystemStats();
    assertSameValue(1, $stats['total_communications'], 'Stats total communications mismatch.');
    assertSameValue(1, $stats['recorded_communications'], 'Stats recorded communications mismatch.');
    assertSameValue(1, $stats['total_users'], 'Stats total users mismatch.');
    assertSameValue(1, $stats['total_bindings'], 'Stats total bindings mismatch.');

    $storage->updateCommunicationStatus('KALDIS-R1-20260810-001', 'forwarded');
    $updatedRef = $storage->getCommunication('KALDIS-R1-20260810-001');
    assertSameValue('forwarded', $updatedRef->status, 'updateCommunicationStatus failed.');

    $storage->deleteUser(10);
    assertTrue($storage->getUser(10) === null, 'deleteUser failed.');

    $storage->deleteTopicBinding('region:Region 1', 101);
    assertTrue($storage->getTopicBinding('region:Region 1', 101) === null, 'deleteTopicBinding failed.');

    $storage->close();
    @unlink($path);
}

function runBotFlowTests(): void
{
    $path = tempnam(sys_get_temp_dir(), 'kaldis');
    if ($path === false) {
        throw new RuntimeException('Could not allocate temp file.');
    }

    $config = new BotConfig(
        botToken: 'TEST_TOKEN',
        databasePath: $path,
        regionGroups: ['Region 1' => -1001],
        regionCodes: ['Region 1' => 'R1'],
        hoGroupChatId: -1002,
        operationsDirectorUserId: 999,
    );
    $storage = new SQLiteStorage($path);
    $client = new FakeTelegramClient();
    $bot = new KaldisBot($config, $storage, $client);

    $bot->handleMessage([
        'message_id' => 1,
        'from' => ['id' => 42, 'first_name' => 'Maya'],
        'chat' => ['id' => 42, 'type' => 'private'],
        'text' => '/register_manager "Region 1"',
    ]);
    $manager = $storage->getUser(42);
    assertTrue($manager !== null, 'Manager registration failed.');
    assertSameValue(Roles::REGIONAL_MANAGER, $manager->role, 'Manager role mismatch.');

    $bot->handleMessage([
        'message_id' => 2,
        'from' => ['id' => 42, 'first_name' => 'Maya'],
        'chat' => ['id' => -1001, 'type' => 'supergroup'],
        'message_thread_id' => 11,
        'text' => '/bind_topic "HR" "HR"',
    ]);
    $binding = $storage->getTopicBinding('region:Region 1', 11);
    assertTrue($binding !== null, 'Group topic binding failed.');

    $bot->handleMessage([
        'message_id' => 9,
        'from' => ['id' => 84, 'first_name' => 'Daniel'],
        'chat' => ['id' => -1002, 'type' => 'supergroup'],
        'message_thread_id' => 21,
        'text' => '/bind_topic "HR" "HR"',
    ]);

    $bot->handleMessage([
        'message_id' => 3,
        'from' => ['id' => 42, 'first_name' => 'Maya'],
        'chat' => ['id' => -1001, 'type' => 'supergroup'],
        'message_thread_id' => 11,
        'text' => 'Need replacement kettle',
    ]);
    $record = $storage->findCommunicationBySourceMessage(-1001, 3);
    assertTrue($record !== null, 'Communication record was not created.');
    $forwardCallback = null;
    foreach ($client->sentMessages as $sentMessage) {
        if (is_array($sentMessage['replyMarkup'] ?? null)) {
            $forwardCallback = $sentMessage;
        }
    }
    assertTrue($forwardCallback !== null, 'Forward card was not posted.');

    // Test 1: Non-authorized user attempt to forward
    $bot->handleCallbackQuery([
        'id' => 'cb-unauthorized',
        'from' => ['id' => 999, 'first_name' => 'BranchStaff'],
        'data' => 'forward:' . $record->referenceNo,
        'message' => [
            'chat' => ['id' => -1001],
            'message_id' => $forwardCallback['messageId'],
        ],
    ]);
    $lastCallback = end($client->callbackAnswers);
    assertTrue(str_contains($lastCallback['text'] ?? '', 'Only a Regional Manager or Operation Head'), 'Unauthorized forward callback answer mismatch.');

    // Test 2: Non-authorized user replying to message in region (must NOT resolve)
    $bot->handleMessage([
        'message_id' => 4,
        'from' => ['id' => 999, 'first_name' => 'BranchStaff'],
        'chat' => ['id' => -1001, 'type' => 'supergroup'],
        'message_thread_id' => 11,
        'reply_to_message' => ['message_id' => 3],
        'text' => 'I also checked the kettle',
    ]);
    $unresolved = $storage->getCommunication($record->referenceNo);
    assertSameValue('recorded', $unresolved->status, 'Communication should remain recorded after non-authorized user reply.');

    // Test 3: Authorized Regional Manager replying to text resolves communication
    $bot->handleMessage([
        'message_id' => 5,
        'from' => ['id' => 42, 'first_name' => 'Maya'],
        'chat' => ['id' => -1001, 'type' => 'supergroup'],
        'message_thread_id' => 11,
        'reply_to_message' => ['message_id' => 3],
        'text' => 'Resolved locally. Replacement delivered.',
    ]);
    $locallyResolved = $storage->getCommunication($record->referenceNo);
    assertSameValue('resolved', $locallyResolved->status, 'Local resolution status mismatch.');

    // Create another communication record to test Operation Head forwarding & local resolution
    $bot->handleMessage([
        'message_id' => 6,
        'from' => ['id' => 100, 'first_name' => 'Staff'],
        'chat' => ['id' => -1001, 'type' => 'supergroup'],
        'message_thread_id' => 11,
        'text' => 'Second regional issue',
    ]);
    $record2 = $storage->findCommunicationBySourceMessage(-1001, 6);
    assertTrue($record2 !== null, 'Second communication record was not created.');

    // Register user 88 as Operations Director (Operation Head)
    $storage->upsertUser(new UserProfile(
        telegramUserId: 88,
        displayName: 'Ops Head',
        role: Roles::OPERATIONS_DIRECTOR,
        canForward: true,
    ));

    // Test 4: Operation Head forwarding request
    $forwardCallback2 = end($client->sentMessages);
    $bot->handleCallbackQuery([
        'id' => 'cb-ops-head',
        'from' => ['id' => 88, 'first_name' => 'Ops Head'],
        'data' => 'forward:' . $record2->referenceNo,
        'message' => [
            'chat' => ['id' => -1001],
            'message_id' => $forwardCallback2['messageId'],
        ],
    ]);

    $forwarded = $storage->getCommunication($record2->referenceNo);
    assertSameValue('forwarded', $forwarded->status, 'Forward status mismatch.');
    assertTrue($forwarded->hoMessageId !== null, 'HO message was not stored.');

    $bot->handleMessage([
        'message_id' => 10,
        'from' => ['id' => 84, 'first_name' => 'Daniel'],
        'chat' => ['id' => -1002, 'type' => 'supergroup'],
        'message_thread_id' => 21,
        'reply_to_message' => ['message_id' => $forwarded->hoMessageId],
        'text' => 'Approved. Replacement scheduled.',
    ]);

    $responded = $storage->getCommunication($record2->referenceNo);
    assertSameValue('responded', $responded->status, 'Response status mismatch.');
    assertTrue(count($client->callbackAnswers) >= 1, 'Forward callback was not acknowledged.');
    assertTrue(count($client->editedReplyMarkups) >= 1, 'Forward button was not removed.');

    $storage->close();
    @unlink($path);
}

runRoutingTests();
runStorageTests();
runBotFlowTests();

echo "All PHP tests passed.\n";

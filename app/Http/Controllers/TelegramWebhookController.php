<?php

namespace App\Http\Controllers;

use App\Services\TelegramBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    public function handleHelpdesk(Request $request, TelegramBotService $botService): JsonResponse
    {
        try {
            $update = $request->all();
            if (!empty($update)) {
                $botService->handleWebhookUpdate($update);
            }
        } catch (\Throwable $e) {
            Log::error("Telegram helpdesk webhook error: " . $e->getMessage());
        }

        return response()->json(['status' => 'ok']);
    }

    public function handleBudget(Request $request, TelegramBotService $botService): JsonResponse
    {
        try {
            $update = $request->all();
            if (!empty($update)) {
                $botService->handleBudgetWebhookUpdate($update);
            }
        } catch (\Throwable $e) {
            Log::error("Telegram budget webhook error: " . $e->getMessage());
        }

        return response()->json(['status' => 'ok']);
    }

    public function handleMemo(Request $request, TelegramBotService $botService): JsonResponse
    {
        try {
            $update = $request->all();
            if (!empty($update)) {
                Log::info("Telegram Memo bot update received: ", $update);
                $botService->handleMemoWebhookUpdate($update);
            }
        } catch (\Throwable $e) {
            Log::error("Telegram memo webhook error: " . $e->getMessage());
        }

        return response()->json(['status' => 'ok']);
    }

    public function handleDynamicWebhook(string $slug, Request $request, TelegramBotService $botService): JsonResponse
    {
        try {
            $update = $request->all();
            if (!empty($update)) {
                $cleanSlug = strtolower(trim($slug));
                if (in_array($cleanSlug, ['helpdesk', 'helpdesk-bot', 'ticket', 'ticketing'], true)) {
                    $botService->handleWebhookUpdate($update);
                } elseif (in_array($cleanSlug, ['budget', 'budget-bot', 'budget-system-bot'], true)) {
                    $botService->handleBudgetWebhookUpdate($update);
                } elseif (in_array($cleanSlug, ['memo', 'memo-bot', 'internal-memorandum', 'internal-memorandum-bot'], true)) {
                    $botService->handleMemoWebhookUpdate($update);
                } elseif (in_array($cleanSlug, ['pre_order', 'pre-order', 'pre-order-bot'], true)) {
                    $botService->handlePreOrderWebhookUpdate($update);
                } elseif (in_array($cleanSlug, ['training', 'training-bot', 'training-and-lms', 'lms'], true)) {
                    $botService->handleTrainingWebhookUpdate($update);
                } elseif (in_array($cleanSlug, ['kaldis', 'kaldis-communication', 'communication', 'kaldis-bot'], true)) {
                    $this->handleKaldisCommunication($request);
                } else {
                    Log::info("Telegram dynamic bot update received for custom slug '{$slug}': ", $update);
                }
            }
        } catch (\Throwable $e) {
            Log::error("Telegram dynamic webhook error ({$slug}): " . $e->getMessage());
        }

        return response()->json(['status' => 'ok']);
    }

    public function handleKaldisCommunication(Request $request): JsonResponse
    {
        try {
            $update = $request->all();
            if (!empty($update)) {
                $configPath = base_path('telegramgroup_mgt/config.json');
                $dbPath = base_path('telegramgroup_mgt/kaldis.db');
                if (file_exists($configPath) && file_exists($dbPath)) {
                    require_once base_path('telegramgroup_mgt/src/bootstrap.php');

                    $config = \KaldisTelegram\BotConfig::fromFile($configPath);
                    $storage = new \KaldisTelegram\SQLiteStorage($dbPath);
                    $client = new \KaldisTelegram\TelegramClient($config->botToken);
                    $bot = new \KaldisTelegram\KaldisBot($config, $storage, $client);
                    $bot->handleUpdate($update);
                }
            }
        } catch (\Throwable $e) {
            Log::error("Telegram Kaldis communication webhook error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        }

        return response()->json(['status' => 'ok']);
    }

    public function handlePreOrderBot(Request $request, TelegramBotService $botService): JsonResponse
    {
        try {
            $update = $request->all();
            if (!empty($update)) {
                $botService->handlePreOrderWebhookUpdate($update);
            }
        } catch (\Throwable $e) {
            Log::error("Telegram pre-order webhook error: " . $e->getMessage());
        }

        return response()->json(['status' => 'ok']);
    }

    public function handleTraining(Request $request, TelegramBotService $botService): JsonResponse
    {
        try {
            $update = $request->all();
            if (!empty($update)) {
                Log::info("Telegram Training bot update received: ", $update);
                $botService->handleTrainingWebhookUpdate($update);
            }
        } catch (\Throwable $e) {
            Log::error("Telegram training webhook error: " . $e->getMessage());
        }

        return response()->json(['status' => 'ok']);
    }
}

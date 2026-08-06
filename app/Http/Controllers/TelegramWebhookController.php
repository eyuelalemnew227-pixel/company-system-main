<?php

namespace App\Http\Controllers;

use App\Services\TelegramBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    public function handle(Request $request, TelegramBotService $botService): JsonResponse
    {
        try {
            $update = $request->all();
            if (!empty($update)) {
                $botService->handleWebhookUpdate($update);
            }
        } catch (\Throwable $e) {
            Log::error("Telegram webhook handler error: " . $e->getMessage());
        }

        return response()->json(['status' => 'ok']);
    }
}

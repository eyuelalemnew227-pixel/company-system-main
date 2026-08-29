<?php

namespace App\Http\Controllers;

use App\Models\PreOrderBroadcast;
use App\Models\TelegramCustomer;
use App\Services\TelegramBotService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class PreOrderBroadcastController extends Controller
{
    public function index(Request $request): Response
    {
        $perPage = (int) $request->query('per_page', 15);
        $broadcasts = PreOrderBroadcast::with('creator:id,name')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        $totalCustomers = TelegramCustomer::count();

        return Inertia::render('pre-orders/broadcasts/index', [
            'broadcasts' => $broadcasts,
            'totalCustomers' => $totalCustomers,
            'filters' => [
                'per_page' => $request->query('per_page'),
            ],
        ]);
    }

    public function store(Request $request, TelegramBotService $botService): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string'],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('uploads/broadcasts', 'public');
        }

        $broadcast = PreOrderBroadcast::create([
            'title' => $validated['title'],
            'message' => $validated['message'],
            'image_path' => $imagePath,
            'target_group' => 'all',
            'sent_count' => 0,
            'created_by' => auth()->id(),
        ]);

        // Send broadcast to all registered Telegram customers in background or loop
        $customers = TelegramCustomer::whereNotNull('chat_id')->get(['chat_id']);
        $sentCount = 0;

        foreach ($customers as $customer) {
            try {
                if ($imagePath) {
                    $fullPath = storage_path('app/public/' . $imagePath);
                    $botService->sendPhotoMessage($customer->chat_id, $fullPath, "<b>" . e($broadcast->title) . "</b>\n\n" . $broadcast->message);
                } else {
                    $botService->sendRawMessage($customer->chat_id, "<b>" . e($broadcast->title) . "</b>\n\n" . $broadcast->message);
                }
                $sentCount++;
            } catch (\Throwable $e) {
                Log::error("Failed to send broadcast to chat_id {$customer->chat_id}: " . $e->getMessage());
            }
        }

        $broadcast->update(['sent_count' => $sentCount]);

        return redirect()->route('pre-orders.broadcasts.index')
            ->with('success', "Broadcast announcement sent successfully to {$sentCount} customers.");
    }
}

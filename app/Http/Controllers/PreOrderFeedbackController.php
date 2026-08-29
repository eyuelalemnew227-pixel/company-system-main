<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\PreOrderFeedback;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Inertia\Inertia;
use Inertia\Response;

class PreOrderFeedbackController extends Controller
{
    public function index(Request $request): Response
    {
        $query = PreOrderFeedback::query()->with('branch:id,name');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('chat_id', 'like', "%{$search}%")
                    ->orWhere('written_feedback', 'like', "%{$search}%")
                    ->orWhereHas('branch', function ($bq) use ($search) {
                        $bq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($branchId = $request->query('branch_id')) {
            $query->where('branch_id', $branchId);
        }

        if ($rating = $request->query('rating')) {
            $ratingVal = (int)$rating;
            $query->where(function ($q) use ($ratingVal) {
                $q->where('delivery_rating', $ratingVal)
                    ->orWhere('torta_rating', $ratingVal)
                    ->orWhere('service_rating', $ratingVal);
            });
        }

        if ($startDate = $request->query('start_date')) {
            $query->whereDate('created_at', '>=', $startDate);
        }

        if ($endDate = $request->query('end_date')) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        // Ratings Statistics
        $totalCount = PreOrderFeedback::count();
        $avgDelivery = PreOrderFeedback::avg('delivery_rating') ?? 0;
        $avgTorta = PreOrderFeedback::avg('torta_rating') ?? 0;
        $avgService = PreOrderFeedback::avg('service_rating') ?? 0;
        
        $overallSum = $avgDelivery + $avgTorta + $avgService;
        $overallAvg = $overallSum > 0 ? round($overallSum / 3, 1) : 0;

        $perPage = (int) $request->query('per_page', 15);
        $feedbacks = $query->orderByDesc('created_at')->paginate($perPage)->withQueryString();

        $branches = Branch::orderBy('name')->get(['id', 'name']);

        return Inertia::render('pre-orders/feedback/index', [
            'feedbacks' => $feedbacks,
            'branches' => $branches,
            'stats' => [
                'total_count' => $totalCount,
                'overall_avg' => round($overallAvg, 1),
                'delivery_avg' => round($avgDelivery, 1),
                'torta_avg' => round($avgTorta, 1),
                'service_avg' => round($avgService, 1),
            ],
            'filters' => [
                'search' => $request->query('search'),
                'branch_id' => $request->query('branch_id'),
                'rating' => $request->query('rating'),
                'start_date' => $request->query('start_date'),
                'end_date' => $request->query('end_date'),
                'per_page' => $request->query('per_page'),
            ],
        ]);
    }

    public function destroy(PreOrderFeedback $feedback): RedirectResponse
    {
        $feedback->delete();

        return redirect()->back()->with('success', 'Feedback entry deleted successfully.');
    }

    public function export(Request $request): StreamedResponse
    {
        $query = PreOrderFeedback::query()->with('branch:id,name');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('chat_id', 'like', "%{$search}%")
                    ->orWhere('written_feedback', 'like', "%{$search}%")
                    ->orWhereHas('branch', function ($bq) use ($search) {
                        $bq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($branchId = $request->query('branch_id')) {
            $query->where('branch_id', $branchId);
        }

        $feedbacks = $query->orderByDesc('created_at')->get();

        $response = new StreamedResponse(function () use ($feedbacks) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Chat ID', 'Branch', 'Delivery Rating', 'Torta Rating', 'Service Rating', 'Written Feedback', 'Date']);

            foreach ($feedbacks as $fb) {
                fputcsv($handle, [
                    $fb->id,
                    $fb->chat_id,
                    $fb->branch->name ?? 'N/A',
                    $fb->delivery_rating ?? 'N/A',
                    $fb->torta_rating ?? 'N/A',
                    $fb->service_rating ?? 'N/A',
                    $fb->written_feedback ?? '',
                    $fb->created_at->format('Y-m-d H:i:s'),
                ]);
            }
            fclose($handle);
        });

        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="pre_order_feedback_' . date('Y-m-d') . '.csv"');

        return $response;
    }
}

<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PurchaseInspectionApiService
{
    public const API_URL = 'https://kaldisbunnaet.com/api/api.php?endpoint=cup_cleaning_stationery&branchCode=11836&api_key=4f6e1e0a72a9a1c7b6e2d5c1c6d45d9d5f43b2d9a1e7c6a5c0e4f3b8c9d7a2e1';
    public const CACHE_KEY = 'purchase_inspection_api_items_grouped';
    public const CACHE_TTL = 1800; // 30 minutes

    /**
     * Get grouped categories and items from cache or API.
     */
    public function getGroupedCategories(bool $forceRefresh = false): array
    {
        $cached = Cache::get(self::CACHE_KEY);

        if (!$forceRefresh && !empty($cached['items'])) {
            return $cached;
        }

        $fresh = $this->fetchFromApi();

        if (!empty($fresh['items'])) {
            Cache::put(self::CACHE_KEY, $fresh, self::CACHE_TTL);
            return $fresh;
        }

        // If fresh fetch returned no items, use existing cache if available
        if (!empty($cached['items'])) {
            Log::warning('PurchaseInspectionApiService: Live fetch returned 0 items, using cached data.');
            return $cached;
        }

        return $fresh;
    }

    /**
     * Get distinct category names from API.
     */
    public function getCategoryNames(): array
    {
        $data = $this->getGroupedCategories();
        return $data['categories'] ?? [];
    }

    /**
     * Alias for getCategoryNames()
     */
    public function getCategories(): array
    {
        return $this->getCategoryNames();
    }

    /**
     * Get flat list of all API items.
     */
    public function getItems(bool $forceRefresh = false): array
    {
        $data = $this->getGroupedCategories($forceRefresh);
        return $data['items'] ?? [];
    }

    /**
     * Fetch live items from external API and organize by category.
     */
    public function fetchFromApi(): array
    {
        try {
            $response = Http::withoutVerifying()
                ->retry(2, 200)
                ->withOptions([
                    'force_ip_resolve' => 'v4',
                    'connect_timeout' => 10,
                    'curl' => [
                        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
                    ],
                ])
                ->timeout(30)
                ->get(self::API_URL);

            if (!$response->successful()) {
                Log::error('PurchaseInspectionApiService: API request failed with status ' . $response->status());
                return $this->fallbackStructure();
            }

            $json = $response->json();
            $items = $json['data'] ?? [];

            $categoriesMap = [];
            $allCategories = [];
            $flatItems = [];

            foreach ($items as $item) {
                $categoryName = trim($item['category'] ?? 'Uncategorized');
                if ($categoryName === '') {
                    $categoryName = 'Uncategorized';
                }

                if (!isset($categoriesMap[$categoryName])) {
                    $categoriesMap[$categoryName] = [
                        'name' => $categoryName,
                        'items' => [],
                    ];
                    $allCategories[] = $categoryName;
                }

                $formattedItem = [
                    'id' => (string) ($item['id'] ?? ''),
                    'article_id' => (string) ($item['article_id'] ?? ''),
                    'article_code' => trim((string) ($item['article_code'] ?? '')),
                    'article_name' => trim((string) ($item['article_name'] ?? '')),
                    'category' => $categoryName,
                    'uom' => trim((string) ($item['uom'] ?? 'Pcs')),
                    'total_balance' => (float) ($item['total_balance'] ?? 0),
                    'wac' => (float) ($item['wac'] ?? 0),
                    'total_value' => (float) ($item['total_value'] ?? 0),
                    'store_code' => (string) ($item['store_code'] ?? '11836'),
                ];

                $categoriesMap[$categoryName]['items'][] = $formattedItem;
                $flatItems[] = $formattedItem;
            }

            sort($allCategories);
            ksort($categoriesMap);

            return [
                'categories' => $allCategories,
                'grouped' => array_values($categoriesMap),
                'items' => $flatItems,
                'total_count' => count($items),
                'store_code' => '11836',
                'fetched_at' => now()->toIso8601String(),
            ];
        } catch (\Exception $e) {
            Log::error('PurchaseInspectionApiService Exception: ' . $e->getMessage());
            return $this->fallbackStructure();
        }
    }

    private function fallbackStructure(): array
    {
        return [
            'categories' => [],
            'grouped' => [],
            'items' => [],
            'total_count' => 0,
            'store_code' => '11836',
            'fetched_at' => now()->toIso8601String(),
        ];
    }
}

<?php

return [
	/*
	|--------------------------------------------------------------------------
	| External links shown in the sidebar
	|--------------------------------------------------------------------------
	|
	| Each section renders as a collapsible group in the sidebar. Use the
	| `permission` field to hide links for users who lack the corresponding
	| authorization (the same permission strings you already use elsewhere).
	| Icons should reference Lucide icon names that exist on the frontend.
	| Update the URLs below to your real Power BI/reporting links or add more
	| sections as needed.
	*/

	'sections' => [
		[
			'label' => 'Business Intelligence',
			'icon' => 'BarChart3',
			'items' => [
				[
					'title' => 'Power BI - Executive Overview',
					'href' => env('POWERBI_EXEC_OVERVIEW_URL', 'https://app.powerbi.com/'),
					'icon' => 'TrendingUp',
					'permission' => 'view dashboard',
					'external' => true,
				],
				[
					'title' => 'Power BI - Sales Performance',
					'href' => env('POWERBI_SALES_URL', 'https://app.powerbi.com/'),
					'icon' => 'ShoppingCart',
					'permission' => 'view pre-orders',
					'external' => true,
				],
				[
					'title' => 'Power BI - Inventory Health',
					'href' => env('POWERBI_INVENTORY_URL', 'https://app.powerbi.com/'),
					'icon' => 'Warehouse',
					'permission' => 'view inventory counts',
					'external' => true,
				],
			],
		],
	],
];

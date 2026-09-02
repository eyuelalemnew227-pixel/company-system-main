<?php

namespace App\Http\Middleware;

use App\Models\ExternalLinkSection;
use App\Support\ExpenseBudgetAccess;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware {
	/**
	 * The root template that's loaded on the first page visit.
	 *
	 * @see https://inertiajs.com/server-side-setup#root-template
	 *
	 * @var string
	 */
	protected $rootView = 'app';

	/**
	 * Determines the current asset version.
	 *
	 * @see https://inertiajs.com/asset-versioning
	 */
	public function version(Request $request): ?string {
		return parent::version($request);
	}

	/**
	 * Define the props that are shared by default.
	 *
	 * @see https://inertiajs.com/shared-data
	 *
	 * @return array<string, mixed>
	 */
	public function share(Request $request): array {
		[$message, $author] = str(Inspiring::quotes()->random())->explode('-');

		$user = $request->user();
		$isSuperAdmin = $user ? $user->hasRole('Super Admin') : false;

		$userPermissions = $user ? $user->getAllPermissions()->pluck('name')->unique()->values() : collect();
		$permissions = $user
			? ($isSuperAdmin
				? \Spatie\Permission\Models\Permission::pluck('name')->filter(function ($name) use ($userPermissions) {
					if (str_starts_with($name, 'memo.') || str_starts_with($name, 'training.online.') || str_starts_with($name, 'telecom.') || $name === 'view telecom management') {
						return $userPermissions->contains($name);
					}
					return true;
				})->values()
				: $userPermissions)
			: collect();

		return [
			...parent::share($request),
			'name' => config('app.name'),
			'quote' => ['message' => trim($message), 'author' => trim($author)],
			'auth' => [
				'user' => $user ? array_merge($user->toArray(), ['roles' => $user->roles->pluck('name')]) : null,
				'permissions' => $permissions,
				'roles' => $user ? $user->roles->pluck('name') : [],
				'canManageExpenseBudget' => $user
					? ExpenseBudgetAccess::canManage($user)
					: false,
				'hasActiveExpenseBudgetPeriod' => \App\Models\ExpenseBudgetPeriod::where('status', 'active')->exists(),
			],

			'ziggy' => fn(): array => [
				...(new Ziggy)->toArray(),
				'location' => $request->url(),
			],
			'externalLinks' => fn() => $this->externalLinks($request, $permissions->toArray()),
			'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
			'flash' => [
				'message' => fn() => $request->session()->get('message'),
				'just_created' => fn() => $request->session()->get('just_created'),
				'success' => fn() => $request->session()->get('success'),
				'error' => fn() => $request->session()->get('error'),
			]
		];
	}

	protected function externalLinks(Request $request, array $permissions = []): array
	{
		$user = $request->user();
		if (! $user) {
			return [];
		}

		// Must have view or manage permission to receive any external links
		if (! in_array('view external links', $permissions, true) && ! in_array('manage external links', $permissions, true)) {
			return [];
		}

		return ExternalLinkSection::query()
			->where('is_active', true)
			->with(['links' => function ($query) {
				$query->where('is_active', true)->orderBy('sort');
			}])
			->orderBy('sort')
			->get()
			->map(function (ExternalLinkSection $section) use ($permissions) {
				$items = $section->links
					->filter(function ($link) use ($permissions) {
						if (! $link->permission) {
							return true;
						}
						return in_array($link->permission, $permissions, true);
					})
					->map(function ($link) {
						return [
							'title' => $link->title,
							'href' => $link->href,
							'icon' => $link->icon,
							'permission' => $link->permission,
							'target' => $link->target,
							'rel' => $link->rel,
							'external' => $link->is_external,
						];
					})
					->values();

				if ($items->isEmpty()) {
					return null;
				}

				return [
					'label' => $section->label,
					'icon' => $section->icon,
					'items' => $items,
				];
			})
			->filter()
			->values()
			->toArray();
	}
}

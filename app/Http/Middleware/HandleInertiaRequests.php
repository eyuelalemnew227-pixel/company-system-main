<?php

namespace App\Http\Middleware;

use App\Models\ExternalLinkSection;
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

		$permissions = $request->user()
			? $request->user()->getAllPermissions()->pluck('name')
			: collect();

		return [
			...parent::share($request),
			'name' => config('app.name'),
			'quote' => ['message' => trim($message), 'author' => trim($author)],
			'auth' => [
				'user' => $request->user(),
				'permissions' => $permissions
			],
			'ziggy' => fn(): array => [
				...(new Ziggy)->toArray(),
				'location' => $request->url(),
			],
			'externalLinks' => fn() => $this->externalLinks($request, $permissions->toArray()),
			'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
			'flash' => [
				'message' => fn() => $request->session()->get('message'),
				'just_created' => fn() => $request->session()->get('just_created')
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

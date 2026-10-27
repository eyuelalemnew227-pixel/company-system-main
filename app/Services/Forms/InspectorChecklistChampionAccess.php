<?php

namespace App\Services\Forms;

use App\Models\Form;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Operation-department champions (barista / cashier / janitor / display / waiter)
 * may view submissions for their matching inspector checklist forms.
 */
class InspectorChecklistChampionAccess
{
    public const ROLE_NAME = 'Operation Champion';

    public const PERMISSION_NAME = 'view inspector checklist submissions';

    /**
     * Position keyword => substrings that identify matching inspector checklist form titles.
     *
     * @var array<string, list<string>>
     */
    public const CHAMPION_FORM_KEYWORDS = [
        'barista' => ['ባሬስታ', 'ባሪስታ', 'barista'],
        'cashier' => ['ካሸር', 'cashier'],
        'waiter' => ['ዌይተር', 'waiter'],
        'display' => ['ዲስፕሌይ', 'display'],
        'janitor' => ['ጃኒተር', 'janitor'],
    ];

    public static function isEligible(User $user): bool
    {
        return self::championTypeForUser($user) !== null;
    }

    /**
     * Returns barista|cashier|waiter|display|janitor when the user is an Operation
     * employee whose position title contains "champion" for that role.
     */
    public static function championTypeForUser(User $user): ?string
    {
        if (! $user->employee_id) {
            return null;
        }

        $row = DB::table('employees as e')
            ->join('positions as p', 'p.id', '=', 'e.position_id')
            ->join('departments as d', 'd.id', '=', 'e.department_id')
            ->where('e.id', $user->employee_id)
            ->where('e.status', 'active')
            ->whereRaw('LOWER(TRIM(d.name)) = ?', ['operation'])
            ->whereRaw('LOWER(p.title) LIKE ?', ['%champion%'])
            ->select(['p.title as position_title'])
            ->first();

        if (! $row) {
            return null;
        }

        $title = Str::lower(trim((string) $row->position_title));

        foreach (array_keys(self::CHAMPION_FORM_KEYWORDS) as $type) {
            if (str_contains($title, $type)) {
                return $type;
            }
        }

        // Also accept common misspelling "waitor"
        if (str_contains($title, 'waitor')) {
            return 'waiter';
        }

        return null;
    }

    public static function canViewForm(User $user, Form|int $form): bool
    {
        $type = self::championTypeForUser($user);
        if (! $type) {
            return false;
        }

        $formId = $form instanceof Form ? (int) $form->id : (int) $form;
        $title = $form instanceof Form
            ? (string) $form->title
            : (string) DB::table('forms')->where('id', $formId)->value('title');

        return self::formTitleMatchesType($title, $type);
    }

    /**
     * @return list<int>
     */
    public static function accessibleFormIds(User $user): array
    {
        $type = self::championTypeForUser($user);
        if (! $type) {
            return [];
        }

        $keywords = self::CHAMPION_FORM_KEYWORDS[$type] ?? [];

        return Form::query()
            ->where(function ($query) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $query->orWhere('title', 'like', '%' . $keyword . '%');
                }
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public static function formTitleMatchesType(string $title, string $type): bool
    {
        $keywords = self::CHAMPION_FORM_KEYWORDS[$type] ?? [];
        $haystack = Str::lower($title);

        foreach ($keywords as $keyword) {
            if (str_contains($haystack, Str::lower($keyword))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Assign/remove the Operation Champion role based on current eligibility.
     *
     * @return array{assigned:int,removed:int}
     */
    public static function syncRoleAssignments(): array
    {
        $role = \Spatie\Permission\Models\Role::findOrCreate(self::ROLE_NAME, 'web');
        $permission = \Spatie\Permission\Models\Permission::findOrCreate(self::PERMISSION_NAME, 'web');
        if (! $role->hasPermissionTo($permission)) {
            $role->givePermissionTo($permission);
        }

        $eligibleUserIds = self::eligibleUserIds();
        $assigned = 0;
        $removed = 0;

        $currentIds = DB::table('model_has_roles')
            ->where('role_id', $role->id)
            ->where('model_type', User::class)
            ->pluck('model_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        foreach ($eligibleUserIds as $userId) {
            $user = User::find($userId);
            if (! $user) {
                continue;
            }
            if (! $user->hasRole($role)) {
                $user->assignRole($role);
                $assigned++;
            }
        }

        foreach (array_diff($currentIds, $eligibleUserIds) as $userId) {
            $user = User::find($userId);
            if (! $user) {
                continue;
            }
            if ($user->hasRole($role)) {
                $user->removeRole($role);
                $removed++;
            }
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return ['assigned' => $assigned, 'removed' => $removed];
    }

    /**
     * @return list<int>
     */
    public static function eligibleUserIds(): array
    {
        return DB::table('users as u')
            ->join('employees as e', 'e.id', '=', 'u.employee_id')
            ->join('positions as p', 'p.id', '=', 'e.position_id')
            ->join('departments as d', 'd.id', '=', 'e.department_id')
            ->where('e.status', 'active')
            ->where(function ($q) {
                $q->whereNull('u.is_active')->orWhere('u.is_active', 1);
            })
            ->whereRaw('LOWER(TRIM(d.name)) = ?', ['operation'])
            ->whereRaw('LOWER(p.title) LIKE ?', ['%champion%'])
            ->where(function ($q) {
                foreach (array_keys(self::CHAMPION_FORM_KEYWORDS) as $type) {
                    $q->orWhereRaw('LOWER(p.title) LIKE ?', ['%' . $type . '%']);
                }
                $q->orWhereRaw('LOWER(p.title) LIKE ?', ['%waitor%']);
            })
            ->pluck('u.id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, Form>|iterable<Form>  $forms
     * @return Collection<int, Form>
     */
    public static function filterFormsForUser(User $user, iterable $forms): Collection
    {
        $collection = collect($forms);
        $type = self::championTypeForUser($user);
        if (! $type) {
            return $collection;
        }

        // Full submission viewers are not filtered here; callers decide.
        return $collection->filter(
            fn (Form $form) => self::formTitleMatchesType((string) $form->title, $type)
        )->values();
    }
}

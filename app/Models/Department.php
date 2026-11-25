<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Department extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::saved(function () {
            Cache::forget('departments_all_sorted');
            Cache::forget('all_department_aliases_map');
            Cache::forget('dashboard_departments');
        });
        static::deleted(function () {
            Cache::forget('departments_all_sorted');
            Cache::forget('all_department_aliases_map');
            Cache::forget('dashboard_departments');
        });
    }

    /**
     * Get all department IDs that share the same name (case-insensitive) as the given department.
     */
    public static function getAliasedDepartmentIds($deptId): array
    {
        $id = (int) $deptId;
        if ($id <= 0) {
            return [];
        }

        static $aliasCache = [];
        if (isset($aliasCache[$id])) {
            return $aliasCache[$id];
        }

        $allDepts = Cache::remember('all_department_aliases_map', 3600, function () {
            $depts = self::select('id', 'name')->get();
            $grouped = [];
            foreach ($depts as $d) {
                $key = mb_strtolower(trim($d->name));
                $grouped[$key][] = (int) $d->id;
            }
            $map = [];
            foreach ($grouped as $ids) {
                foreach ($ids as $deptIdVal) {
                    $map[$deptIdVal] = $ids;
                }
            }
            return $map;
        });

        $aliasCache[$id] = $allDepts[$id] ?? [$id];
        return $aliasCache[$id];
    }

    protected $fillable = [
        'name',
        'description',
        'is_active',
        'is_active_on_ticketing',
        'is_active_on_weekly_budget',
    ];
    public function branches()
    {
        return $this->belongsToMany(Branch::class);
    }
}

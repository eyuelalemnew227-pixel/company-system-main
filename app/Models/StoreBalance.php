<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreBalance extends Model
{
    protected $connection = 'synced_data';

    // Using the view that already maps store_code to branch_id and handles specific items
    protected $table = 'v_cup_cleaning_stationery';

    public $timestamps = false;

    /**
     * Get all stock balance rows for a given branch_id directly from the synced view.
     */
    public static function forBranch(int $branchId)
    {
        return static::where('branch_id', $branchId)
            ->where('article_code', 'NOT LIKE', '%HO') // Same base filter as API
            ->orderBy('category')
            ->orderBy('article_name')
            ->get([
                'article_code',
                'article_name',
                'uom',
                'category',
                'total_balance'
            ]);
    }
}

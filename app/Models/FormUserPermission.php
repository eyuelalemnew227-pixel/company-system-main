<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormUserPermission extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'form_id',
        'user_id',
        'can_edit_schema',
        'can_manage_access',
        'can_fill_submissions',
        'can_view_submissions',
        'can_edit_submissions',
        'can_delete_submissions',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'can_edit_schema' => 'boolean',
            'can_manage_access' => 'boolean',
            'can_fill_submissions' => 'boolean',
            'can_view_submissions' => 'boolean',
            'can_edit_submissions' => 'boolean',
            'can_delete_submissions' => 'boolean',
        ];
    }

    public function form()
    {
        return $this->belongsTo(Form::class);
    }

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormSubmission extends Model
{
    use HasFactory;

    protected $fillable = ['form_version_id', 'user_id', 'status'];

    protected static function booted()
    {
        static::saved(function () {
            if (!\Illuminate\Support\Facades\Cache::has('checklist_summary_ver')) {
                \Illuminate\Support\Facades\Cache::put('checklist_summary_ver', 2, 86400 * 30);
            } else {
                \Illuminate\Support\Facades\Cache::increment('checklist_summary_ver');
            }
        });

        static::deleted(function () {
            if (!\Illuminate\Support\Facades\Cache::has('checklist_summary_ver')) {
                \Illuminate\Support\Facades\Cache::put('checklist_summary_ver', 2, 86400 * 30);
            } else {
                \Illuminate\Support\Facades\Cache::increment('checklist_summary_ver');
            }
        });
    }

    public function formVersion()
    {
        return $this->belongsTo(FormVersion::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function answers()
    {
        return $this->hasMany(FormSubmissionAnswer::class);
    }
}

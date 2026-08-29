<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseLesson extends Model
{
    use HasUlids;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'course_id', 'title', 'type', 'content', 'file_path', 'duration_minutes',
        'sort_order', 'is_downloadable', 'completion_criteria', 'status',
    ];

    protected $casts = [
        'is_downloadable' => 'boolean',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function progress(): HasMany
    {
        return $this->hasMany(LessonProgress::class, 'lesson_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class, 'lesson_id');
    }
}

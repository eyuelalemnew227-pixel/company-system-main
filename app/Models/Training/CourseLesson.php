<?php

namespace App\Models\Training;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseLesson extends Model
{
    use HasFactory;

    protected $table = 'training_course_lessons';

    protected $fillable = [
        'course_id',
        'title',
        'type',
        'content',
        'file_path',
        'youtube_url',
        'youtube_video_id',
        'duration_minutes',
        'sort_order',
        'is_downloadable',
        'completion_criteria',
        'status',
    ];

    protected $casts = [
        'is_downloadable' => 'boolean',
    ];

    protected $appends = [
        'youtube_embed_url',
    ];

    public static function parseYouTubeId(?string $url): ?string
    {
        if (empty($url)) {
            return null;
        }

        // Match various YouTube URL formats
        $pattern = '/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i';
        if (preg_match($pattern, $url, $matches)) {
            return $matches[1];
        }

        return null;
    }

    public function getYoutubeEmbedUrlAttribute(): ?string
    {
        $id = $this->youtube_video_id ?? static::parseYouTubeId($this->youtube_url);
        return $id ? "https://www.youtube.com/embed/{$id}?rel=0&modestbranding=1" : null;
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class, 'course_id');
    }

    public function progress(): HasMany
    {
        return $this->hasMany(LessonProgress::class, 'lesson_id');
    }
}

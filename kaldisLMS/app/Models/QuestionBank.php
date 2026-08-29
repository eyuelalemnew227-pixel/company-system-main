<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuestionBank extends Model
{
    use HasUlids;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;
    protected $table = 'question_bank';

    protected $fillable = [
        'category_id', 'created_by', 'text', 'type', 'difficulty', 'tags', 'answer_data',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(CourseCategory::class, 'category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Decoded [{text, isCorrect}] answers. */
    public function getAnswersAttribute(): array
    {
        $decoded = json_decode($this->answer_data ?? '[]', true);

        return is_array($decoded) ? $decoded : [];
    }
}

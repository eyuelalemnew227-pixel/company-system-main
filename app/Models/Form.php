<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Form extends Model
{
    use HasFactory;

    protected $fillable = ['title', 'description', 'status'];

    public function versions()
    {
        return $this->hasMany(FormVersion::class);
    }

    public function submissions()
    {
        return $this->hasManyThrough(FormSubmission::class, FormVersion::class);
    }
}

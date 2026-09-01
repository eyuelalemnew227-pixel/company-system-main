<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Form extends Model
{
    use HasFactory;

    protected $fillable = ['title', 'description', 'status', 'created_by'];

    public function versions()
    {
        return $this->hasMany(FormVersion::class);
    }

    public function submissions()
    {
        return $this->hasManyThrough(FormSubmission::class, FormVersion::class);
    }

    public function user_permissions()
    {
        return $this->hasMany(FormUserPermission::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

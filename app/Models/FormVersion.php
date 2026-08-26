<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormVersion extends Model
{
    use HasFactory;

    protected $fillable = ['form_id', 'version_number', 'status'];

    public function form()
    {
        return $this->belongsTo(Form::class);
    }

    public function sections()
    {
        return $this->hasMany(FormSection::class)->orderBy('order_index');
    }
}

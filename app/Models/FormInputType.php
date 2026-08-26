<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormInputType extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'type_identifier', 'is_active'];
}

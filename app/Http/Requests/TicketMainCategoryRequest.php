<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TicketMainCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('ticket.manage.taxonomy') ?? false;
    }

    public function rules(): array
    {
        return [
            'department_id' => ['required', 'exists:departments,id'],
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}

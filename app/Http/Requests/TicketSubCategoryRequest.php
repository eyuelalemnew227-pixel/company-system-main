<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TicketSubCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('ticket.manage.taxonomy') ?? false;
    }

    public function rules(): array
    {
        return [
            'ticket_main_category_id' => ['required', 'exists:ticket_main_categories,id'],
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}

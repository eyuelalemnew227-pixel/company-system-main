<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TicketAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('ticket.manage.taxonomy') ?? false;
    }

    public function rules(): array
    {
        return [
            'department_id' => ['required', 'exists:departments,id'],
            'ticket_main_category_id' => ['nullable', 'exists:ticket_main_categories,id'],
            'ticket_sub_category_id' => ['nullable', 'exists:ticket_sub_categories,id'],
            'name' => ['required', 'string', 'max:150'],
            'article_code' => ['nullable', 'string', 'max:100'],
            'bar_code' => ['nullable', 'string', 'max:150'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}

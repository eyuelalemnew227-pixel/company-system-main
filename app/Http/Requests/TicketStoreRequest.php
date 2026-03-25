<?php

namespace App\Http\Requests;

use App\Enums\TicketSeverity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TicketStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('ticket.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'department_id' => ['required', 'exists:departments,id'],
            'ticket_main_category_id' => ['required', 'exists:ticket_main_categories,id'],
            'ticket_sub_category_id' => ['required', 'exists:ticket_sub_categories,id'],
            'ticket_asset_id' => ['nullable', 'exists:ticket_assets,id'],
            'description' => ['required', 'string'],
            'severity' => ['required', Rule::in(array_column(TicketSeverity::cases(), 'value'))],
            'preferred_deadline' => ['nullable', 'date', 'after_or_equal:today'],
        ];
    }
}
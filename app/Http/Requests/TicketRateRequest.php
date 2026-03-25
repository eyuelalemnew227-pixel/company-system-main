<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TicketRateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('ticket.rate') ?? false;
    }

    public function rules(): array
    {
        return [
            'stars' => ['required', 'integer', 'min:1', 'max:15'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ];
    }
}

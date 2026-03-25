<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TicketAssignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('ticket.assign') ?? false;
    }

    public function rules(): array
    {
        return [
            'assigned_to' => ['required', 'exists:users,id'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use App\Models\Ticket;
use Illuminate\Foundation\Http\FormRequest;

class TicketRateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $ticket = $this->route('ticket');
        if ($ticket instanceof Ticket) {
            return $this->user()->can('rate', $ticket);
        }

        return $this->user()?->can('ticket.rate') ?? false;
    }

    public function rules(): array
    {
        return [
            'stars' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ];
    }
}

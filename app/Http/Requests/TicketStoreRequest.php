<?php

namespace App\Http\Requests;

use App\Enums\TicketSeverity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TicketStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user)
            return false;

        // Allow if user has global create permission
        if ($user->can('ticket.create')) {
            return true;
        }

        // Allow if it's a spare part request for a ticket the user can view (Manager/Assignee)
        $parentTicketId = $this->input('parent_ticket_id');
        if ($parentTicketId) {
            $parentTicket = \App\Models\Ticket::find($parentTicketId);
            if ($parentTicket && $user->can('view', $parentTicket)) {
                return true;
            }
        }

        return false;
    }

    public function rules(): array
    {
        return [
            'department_id' => ['required', 'exists:departments,id'],
            'ticket_main_category_id' => ['required', 'exists:ticket_main_categories,id'],
            'ticket_sub_category_id' => ['required', 'exists:ticket_sub_categories,id'],
            'ticket_asset_id' => ['nullable', 'exists:ticket_assets,id'],
            'description' => ['nullable', 'string'],
            'severity' => [(request('ticket_main_category_id') == 22 ? 'nullable' : 'required'), Rule::in(array_column(TicketSeverity::cases(), 'value'))],
            'preferred_deadline' => ['nullable', 'date', 'after_or_equal:today'],
            'products' => ['nullable', 'array'],
            'products.*.product_id' => [
                'required_with:products',
                request('is_spare_part_request') ? 'exists:spare_parts,id' : 'exists:products,id'
            ],
            'products.*.quantity' => ['required_with:products', 'numeric', 'min:0'],
            'products.*.uom' => ['nullable', 'string', 'max:50'],
            'parent_ticket_id' => ['nullable', 'integer', 'exists:tickets,id'],
            'is_spare_part_request' => ['nullable', 'boolean'],
            'beneficiary_branch_id' => [
                request('is_spare_part_request') ? 'required' : 'nullable',
                'exists:branches,id'
            ],
            'beneficiary_department_id' => ['nullable', 'exists:departments,id'],
        ];
    }
}
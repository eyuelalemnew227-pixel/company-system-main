<?php

namespace App\Policies;

use App\Models\TicketMainCategory;
use App\Models\User;

class TicketMainCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('ticket.manage.taxonomy') || $user->can('ticket.view.all');
    }
}

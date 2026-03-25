<?php

namespace App\Http\Controllers;

use App\Models\TicketAsset;
use App\Models\TicketMainCategory;
use App\Models\TicketSubCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TicketSettingsController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', TicketMainCategory::class); // uses permission gate via policy or Gate

        return Inertia::render('tickets/settings', [
            'mainCategories' => TicketMainCategory::with('department')->orderBy('department_id')->orderBy('name')->paginate(20)->withQueryString(),
            'subCategories' => TicketSubCategory::with('mainCategory.department')->orderBy('ticket_main_category_id')->orderBy('name')->paginate(20)->withQueryString(),
            'assets' => TicketAsset::with(['department', 'mainCategory', 'subCategory'])->orderBy('department_id')->orderBy('name')->paginate(20)->withQueryString(),
        ]);
    }
}

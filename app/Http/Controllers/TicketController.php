<?php

namespace App\Http\Controllers;

use App\Enums\TicketPriority;
use App\Enums\TicketSeverity;
use App\Enums\TicketStatus;
use App\Http\Requests\TicketStatusRequest;
use App\Http\Requests\TicketStoreRequest;
use App\Http\Requests\TicketAssignRequest;
use App\Http\Requests\TicketRateRequest;
use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketAsset;
use App\Models\TicketMainCategory;
use App\Models\TicketSubCategory;
use App\Models\User;
use App\Services\TicketActionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TicketController extends Controller
{
    private const PURCHASE_DEPT_ID = 18068;
    private const PURCHASE_REQUEST_CAT_ID = 26;
    private const SPARE_PART_PURCHASE_REQUEST_CAT_ID = 27;

    public function __construct(
        private readonly TicketActionService $actionService,
        private readonly \App\Services\TicketStatusService $statusService
    ) {
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Ticket::query()->with(['department', 'mainCategory', 'subCategory', 'asset']);

        // 1. Authorization Scoping
        if ($user->can('ticket.view.all')) {
            // Full global access
        } else {
            $managedIds = $user->managedDepartmentIds();
            $query->where(function ($q) use ($user, $managedIds) {
                // Own requested tickets
                $q->where('user_id', $user->id)
                    // Tickets where user is currently or was assigned
                    ->orWhereHas('assignments', function ($sq) use ($user) {
                        $sq->where('assigned_to', $user->id);
                    })
                    // All tickets in departments they manage
                    ->orWhereIn('department_id', $managedIds);
            });
        }

        // 2. Filters & Search
        $query->when($request->search, function ($q, $search) {
            $q->where(function ($inner) use ($search) {
                $inner->where('id', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('requestor_full_name', 'like', "%{$search}%");
            });
        })
            ->when($request->status, fn($q, $v) => $q->where('status', $v))
            ->when($request->department_id, fn($q, $v) => $q->where('department_id', $v))
            ->when($request->severity, fn($q, $v) => $q->where('severity', $v))
            ->when($request->priority, fn($q, $v) => $q->where('priority', $v))
            ->when($request->main_category_id, fn($q, $v) => $q->where('ticket_main_category_id', $v))
            ->when($request->start_date, fn($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->end_date, fn($q, $v) => $q->whereDate('created_at', '<=', $v));

        $tickets = $query
            ->latest()
            ->paginate(15)
            ->withQueryString();

        // 3. Filter Options for UI
        return Inertia::render('tickets/index', [
            'tickets' => $tickets,
            'filters' => $request->only(['search', 'status', 'department_id', 'severity', 'main_category_id', 'start_date', 'end_date']),
            'can_create' => $user->can('ticket.create'),
            'options' => [
                'statuses' => array_column(TicketStatus::cases(), 'value'),
                'severities' => array_column(TicketSeverity::cases(), 'value'),
                'priorities' => array_column(TicketPriority::cases(), 'value'),
                'departments' => Department::select('id', 'name')->orderBy('name')->get(),
                'categories' => TicketMainCategory::select('id', 'name')->orderBy('name')->get(),
            ]
        ]);
    }

    public function create(Request $request)
    {
        $parentTicketId = $request->integer('parent_ticket_id');

        if ($parentTicketId) {
            $parentTicket = Ticket::findOrFail($parentTicketId);
            // Allow access if the user can view the parent ticket (covers Managers and Assignees)
            $this->authorize('view', $parentTicket);
        } else {
            $this->authorize('create', Ticket::class);
        }

        $isSparePartRequest = $request->boolean('spare_part_request');
        $purchaseRequestCatId = $isSparePartRequest ? self::SPARE_PART_PURCHASE_REQUEST_CAT_ID : self::PURCHASE_REQUEST_CAT_ID;

        // Synchronize ChildCategories for Purchase Request category if it exists
        if (TicketMainCategory::where('id', self::PURCHASE_REQUEST_CAT_ID)->exists()) {
            $childCategories = \App\Models\ChildCategory::where('status', 'Active')->get();
            foreach ($childCategories as $cc) {
                TicketSubCategory::updateOrCreate([
                    'ticket_main_category_id' => self::PURCHASE_REQUEST_CAT_ID,
                    'name' => $cc->child_name, // Match by name to satisfy unique constraint
                ], [
                    'child_category_id' => $cc->id,
                    'is_active' => true,
                ]);
            }
        }

        // Synchronize Spare Part Categories as TicketSubCategories for Spare Part Mode
        $spareCats = \App\Models\SparePartCategory::all();
        $sparePartSubCategories = [];
        foreach ($spareCats as $sc) {
            $sub = TicketSubCategory::updateOrCreate([
                'ticket_main_category_id' => self::SPARE_PART_PURCHASE_REQUEST_CAT_ID,
                'name' => $sc->name, // Match by name to satisfy unique constraint
            ], [
                'spare_part_category_id' => $sc->id,
                'is_active' => true,
            ]);
            $sparePartSubCategories[] = [
                'id' => $sub->id,
                'name' => $sub->name,
                'spare_part_category_id' => $sc->id,
            ];
        }

        $spareParts = \App\Models\SparePart::with('category:id,name')->orderBy('name')->get(['id', 'name', 'article_code', 'description', 'spare_part_category_id']);

        return Inertia::render('tickets/create', [
            'departments' => Department::where('is_active_on_ticketing', true)->orderBy('name')->get(),
            'mainCategories' => TicketMainCategory::where('is_active', true)
                ->with(['subCategories' => fn($q) => $q->where('is_active', true)])
                ->orderBy('name')->get(),
            'subCategories' => TicketSubCategory::where('is_active', true)->orderBy('name')->get(),
            'assets' => TicketAsset::where('is_active', true)->orderBy('name')->get(),
            'severities' => array_column(TicketSeverity::cases(), 'value'),
            'products' => \App\Models\Product::where('status', 'Active')->where('is_purchasable', true)->orderBy('product_name')->get(['id', 'product_name', 'product_code', 'child_category_id']),
            'purchaseRequestCatId' => $purchaseRequestCatId,
            'purchaseDeptId' => self::PURCHASE_DEPT_ID,
            // Spare part request props
            'isSparePartRequest' => $isSparePartRequest,
            'parentTicketId' => $request->integer('parent_ticket_id') ?: null,
            'sparePartCategories' => $sparePartSubCategories,
            'spareParts' => $spareParts,
            // Beneficiary selection
            'branches' => \App\Models\Branch::orderBy('name')->get(['id', 'name']),
            'allDepartments' => Department::orderBy('name')->get(['id', 'name']),
        ]);
    }


    public function store(TicketStoreRequest $request)
    {
        $user = $request->user();
        $employee = $user->employee;

        $validated = $request->validated();

        // Ensure cascading consistency
        $this->assertTaxonomyConsistency(
            $validated['department_id'],
            $validated['ticket_main_category_id'],
            $validated['ticket_sub_category_id'],
            $validated['ticket_asset_id'] ?? null
        );

        $title = $request->input('title');
        $sub = TicketSubCategory::find($validated['ticket_sub_category_id']);
        if (!$title) {
            $asset = ($validated['ticket_asset_id'] ?? null) ? TicketAsset::find($validated['ticket_asset_id']) : null;
            $title = $asset?->name ?: ($sub?->name ?: 'Ticket');
        }

        // Ensure description is never null (DB column is NOT NULL)
        if (empty($validated['description'])) {
            $validated['description'] = '';
        }

        // Special handling for Purchase Request categories
        if ($validated['ticket_main_category_id'] == self::PURCHASE_REQUEST_CAT_ID || $validated['ticket_main_category_id'] == self::SPARE_PART_PURCHASE_REQUEST_CAT_ID) {
            if (empty($validated['severity'])) {
                $validated['severity'] = \App\Enums\TicketSeverity::NoImpact->value;
            }
        }

        return DB::transaction(function () use ($validated, $user, $employee, $title, $request) {
            $ticket = Ticket::create([
                ...collect($validated)->except(['products', 'is_spare_part_request'])->toArray(),
                'user_id' => $user->id,
                'title' => $title,
                'status' => TicketStatus::PendingApproval,
                'requestor_full_name' => $employee ? ($employee->first_name . ' ' . $employee->last_name) : $user->name,
                'requestor_branch_id' => $employee?->branch_id,
                'requestor_department_id' => $employee?->department_id,
                'requestor_phone' => $employee?->phone,
            ]);

            // Save product requests if present
            if (!empty($validated['products'])) {
                $isSparePart = $validated['is_spare_part_request'] ?? false;
                foreach ($validated['products'] as $product) {
                    if (($product['quantity'] ?? 0) > 0) {
                        $ticket->productRequests()->create([
                            $isSparePart ? 'spare_part_id' : 'product_id' => $product['product_id'],
                            'quantity' => $product['quantity'],
                            'uom' => $product['uom'] ?? null,
                        ]);
                    }
                }
            }

            $this->actionService->logStatusHistory($ticket, $user, null, TicketStatus::PendingApproval->value, null);
            $this->actionService->logActivity($ticket, $user, 'created', null, TicketStatus::PendingApproval->value, null);
            $this->actionService->notifyCreated($ticket);

            return redirect()->route('tickets.show', $ticket)
                ->with('message', 'Ticket submitted and pending approval.')
                ->with('just_created', true);
        });
    }

    public function show(Request $request, Ticket $ticket)
    {
        $ticket->load([
            'department',
            'requestorBranch',
            'requestorDepartment',
            'beneficiaryBranch',
            'beneficiaryDepartment',
            'mainCategory',
            'subCategory',
            'asset',
            'assignments.assignee',
            'statusHistory.user',
            'activityLogs.user',
            'ratings',
            'productRequests.product.childCategory',
            'productRequests.sparePart.category',
        ]);
        $currentAssignment = $ticket->assignments()->where('is_current', true)->with('assignee')->first();
        $staffOptions = User::whereHas('employee', fn($q) => $q->where('department_id', $ticket->department_id))
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        $user = $request->user();
        $managerUserIds = $this->actionService->departmentManagerUserIds($ticket->department_id);
        $isManager = in_array($user->id, $managerUserIds);
        $isAssignee = $currentAssignment && $currentAssignment->assigned_to === $user->id;

        // Also allow super admin or users with specific permission to be seen as managers for workflow
        $hasManagerPower = $isManager || $user->hasRole('Ticket Super Admin');

        // Filter statuses based on allowed transitions from the current state
        $allowedTransitions = $this->statusService->getAllowedTransitions($ticket->status);

        // Staff can only set these statuses; managers get all
        $staffOnlyStatuses = [
            TicketStatus::InProgress->value,
            TicketStatus::Hold->value,
            TicketStatus::Escalated->value,
            TicketStatus::Done->value,
        ];

        // Base available statuses are the ones allowed by the transition matrix
        // (Managers previously saw everything, but per request, they should only see allowed transitions too)
        $availableStatuses = ($hasManagerPower || $user->can('ticket.view.all'))
            ? $allowedTransitions
            : array_intersect($allowedTransitions, $staffOnlyStatuses);

        // Assets available for this ticket's department + sub-category (for staff asset update)
        $assetOptions = TicketAsset::where('department_id', $ticket->department_id)
            ->where('ticket_sub_category_id', $ticket->ticket_sub_category_id)
            ->orderBy('name')
            ->get(['id', 'name', 'bar_code', 'article_code']);

        return Inertia::render('tickets/show', [
            'ticket' => $ticket,
            'currentAssignment' => $currentAssignment,
            'staffOptions' => $staffOptions,
            'statuses' => array_values($availableStatuses),
            'priorityOptions' => array_column(TicketPriority::cases(), 'value'),
            'assetOptions' => $assetOptions,
            'abilities' => $ticket->getAbilities($user),
        ]);
    }

    public function downloadProductsPdf(Ticket $ticket)
    {
        $ticket->load(['productRequests.product.childCategory', 'productRequests.sparePart.category', 'department', 'subCategory', 'mainCategory', 'requestorBranch']);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.requested-products', compact('ticket'));

        $filename = 'requested-products-ticket-' . $ticket->id . '.pdf';

        return $pdf->download($filename);
    }

    public function destroy(Ticket $ticket)
    {
        $this->authorize('delete', $ticket);
        $ticket->delete();

        return redirect()->route('tickets.index')->with('message', 'Ticket deleted successfully.');
    }

    public function updateStatus(TicketStatusRequest $request, Ticket $ticket)
    {
        $this->authorize('updateStatus', $ticket);

        $to = TicketStatus::from($request->input('status'));
        $user = $request->user();

        // Check if user is manager or has global permissions
        $managerUserIds = $this->actionService->departmentManagerUserIds($ticket->department_id);

        // Use non-strict comparison for IDs to handle potential string/int mismatches
        $isManager = false;
        foreach ($managerUserIds as $id) {
            if ((string) $id === (string) $user->id) {
                $isManager = true;
                break;
            }
        }

        $hasGlobalPower = $isManager || $user->hasRole('Ticket Super Admin') || $user->can('ticket.view.all');

        if (!$hasGlobalPower) {
            // Staff are only allowed to set these specific statuses
            $staffAllowed = [
                TicketStatus::InProgress->value,
                TicketStatus::Hold->value,
                TicketStatus::Escalated->value,
                TicketStatus::Done->value
            ];

            if (!in_array($to->value, $staffAllowed)) {
                return back()->withErrors(['status' => 'You are not allowed to set this status.']);
            }
        }

        $reason = $request->input('reason');
        $this->actionService->setStatus($ticket, $to, $user, $reason, [], $to === TicketStatus::Done ? 'done' : 'status_changed');

        return back()->with('message', "Status updated to " . str_replace('_', ' ', $to->value));
    }

    public function assign(TicketAssignRequest $request, Ticket $ticket)
    {
        $assignee = User::findOrFail($request->validated('assigned_to'));
        $this->actionService->assign($ticket, $assignee, $request->user());

        return back()->with('message', 'Ticket assigned successfully');
    }

    public function approveCompletion(Request $request, Ticket $ticket)
    {
        $this->authorize('approveCompletion', $ticket);

        if (!in_array($ticket->status, [TicketStatus::Done, TicketStatus::PendingApproval], true)) {
            return back()->withErrors(['status' => 'Ticket is not in a status that can be approved.']);
        }

        $nextStatus = $ticket->status === TicketStatus::PendingApproval
            ? TicketStatus::Approved
            : TicketStatus::Closed;

        $this->actionService->setStatus(
            $ticket,
            $nextStatus,
            $request->user(),
            null,
            [],
            $nextStatus === TicketStatus::Closed ? 'closed' : 'approved'
        );

        $msg = $nextStatus === TicketStatus::Approved
            ? 'Ticket approved and move to the queue.'
            : 'Ticket closed. You can now rate the work.';

        return back()->with('message', $msg);
    }

    public function rejectCompletion(Request $request, Ticket $ticket)
    {
        $this->authorize('rejectCompletion', $ticket);

        if (!in_array($ticket->status, [TicketStatus::Done, TicketStatus::PendingApproval], true)) {
            return back()->withErrors(['status' => 'Ticket is not in a status that can be rejected.']);
        }

        $reason = $request->validate(['reason' => 'required|string|max:500'])['reason'];

        $ticket->rejection_reason = $reason;
        $ticket->save();

        $nextStatus = $ticket->status === TicketStatus::PendingApproval
            ? TicketStatus::Rejected
            : TicketStatus::InProgress;

        $this->actionService->setStatus($ticket, $nextStatus, $request->user(), $reason, [], 'rejected');

        $msg = $nextStatus === TicketStatus::Rejected
            ? 'Ticket request rejected.'
            : 'Rejection submitted; ticket reopened.';

        return back()->with('message', $msg);
    }

    public function rate(TicketRateRequest $request, Ticket $ticket)
    {
        $this->authorize('rate', $ticket);
        if ($ticket->status !== TicketStatus::Closed) {
            return back()->withErrors(['status' => 'Rating allowed only after closure.']);
        }

        $data = $request->validated();

        $ticket->ratings()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $data
        );

        $this->actionService->logActivity($ticket, $request->user(), 'rated', $ticket->status->value, $ticket->status->value, null, ['stars' => $data['stars']]);

        return back()->with('message', 'Rating saved.');
    }

    public function updateAsset(Request $request, Ticket $ticket)
    {
        $this->authorize('updateAsset', $ticket);

        $validated = $request->validate([
            'ticket_asset_id' => [
                'nullable',
                'integer',
                function ($attribute, $value, $fail) use ($ticket) {
                    if ($value === null)
                        return;
                    $valid = TicketAsset::where('id', $value)
                        ->where('department_id', $ticket->department_id)
                        ->where('ticket_sub_category_id', $ticket->ticket_sub_category_id)
                        ->exists();
                    if (!$valid) {
                        $fail('The selected asset is not valid for this ticket.');
                    }
                },
            ],
        ]);

        $oldAssetId = $ticket->ticket_asset_id;
        $ticket->ticket_asset_id = $validated['ticket_asset_id'];
        $ticket->save();

        $this->actionService->logActivity(
            $ticket,
            $request->user(),
            'asset_updated',
            $ticket->status->value,
            $ticket->status->value,
            null,
            ['old_asset_id' => $oldAssetId, 'new_asset_id' => $validated['ticket_asset_id']]
        );

        return back()->with('message', 'Asset updated successfully.');
    }

    private function assertTaxonomyConsistency(int $departmentId, int $mainId, int $subId, ?int $assetId): void
    {
        $main = TicketMainCategory::where('id', $mainId)->where('department_id', $departmentId)->first();
        $sub = TicketSubCategory::where('id', $subId)->where('ticket_main_category_id', $mainId)->first();
        if (!$main || !$sub) {
            abort(422, 'Invalid category selection for department.');
        }

        if ($assetId) {
            $valid = TicketAsset::where('id', $assetId)
                ->where(function ($q) use ($departmentId, $subId) {
                    $q->where('department_id', $departmentId)
                        ->where(function ($inner) use ($subId) {
                            $inner->whereNull('ticket_sub_category_id')->orWhere('ticket_sub_category_id', $subId);
                        });
                })
                ->exists();
            if (!$valid) {
                abort(422, 'Invalid asset selection for department/sub-category.');
            }
        }
    }

    public function updateDeadline(Request $request, Ticket $ticket): \Illuminate\Http\RedirectResponse
    {
        $this->authorize('updateDeadline', $ticket);

        $validated = $request->validate([
            'deadline' => ['nullable', 'date'],
        ]);

        $oldDeadline = $ticket->deadline instanceof \Carbon\Carbon ? $ticket->deadline->toDateString() : ($ticket->deadline ? \Carbon\Carbon::parse($ticket->deadline)->toDateString() : null);
        $ticket->deadline = $validated['deadline'];
        $ticket->save();

        $this->actionService->logActivity(
            $ticket,
            $request->user(),
            'deadline_updated',
            $ticket->status->value,
            $ticket->status->value,
            null,
            ['old_deadline' => $oldDeadline, 'new_deadline' => $ticket->deadline instanceof \Carbon\Carbon ? $ticket->deadline->toDateString() : ($ticket->deadline ? \Carbon\Carbon::parse($ticket->deadline)->toDateString() : null)]
        );

        return back()->with('message', 'Deadline updated successfully.');
    }

    public function updatePriority(Request $request, Ticket $ticket): \Illuminate\Http\RedirectResponse
    {
        $this->authorize('updatePriority', $ticket);

        $validated = $request->validate([
            'priority' => ['required', Rule::enum(TicketPriority::class)],
        ]);

        $oldPriority = $ticket->priority->value;
        $ticket->priority = $validated['priority'];
        $ticket->save();

        $this->actionService->logActivity(
            $ticket,
            $request->user(),
            'priority_updated',
            $ticket->status->value,
            $ticket->status->value,
            null,
            ['old_priority' => $oldPriority, 'new_priority' => $ticket->priority->value]
        );

        return back()->with('message', 'Priority updated successfully.');
    }
}

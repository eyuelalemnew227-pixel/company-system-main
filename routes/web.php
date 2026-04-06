<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\{
    DepartmentController,
    QuestionController,
    EvaluationTypeController,
    EvaluatorGroupController,
    EvaluatesGroupController,
    EvaluationController,
    EvaluationPeriodController,
    FiscalYearController,
    FiscalMonthController,
    QuestionGroupController,
    MyEvaluationController,
    ManagerController,
    OtherEvaluableController,
    PermissionController,
    RoleController,
    UserController,
    EmployeeDirectoryController,
    BranchController,
    PositionController,
    EmployeeController,
    RejectedEvaluationsController,
    EvaluatorCompletionController,
    SyncController,
    SmsBalanceController,
    PreOrderDashboardController,
    HolidayController,
    EvaluationCategoryController,
    ExternalLinkController,
    ExternalLinkSectionController,
    SparePartCategoryController,
    SparePartController,
};

Route::get('/', fn() => Inertia::render('welcome'))->name('home');

// Offline fallback page for PWA
Route::get('/offline', fn() => Inertia::render('offline'))->name('offline');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', fn() => Inertia::render('dashboard'))->name('dashboard');

    // Offline Sync API Endpoints
    Route::post('sync/inventory-counts', [SyncController::class, 'syncInventoryCount'])->name('sync.inventory-counts');
    Route::post('sync/evaluations', [SyncController::class, 'syncEvaluation'])->name('sync.evaluations');
    Route::get('sync/pending-count', [SyncController::class, 'getPendingCount'])->name('sync.pending-count');

    // Permissions
    Route::resource('permissions', PermissionController::class)->except(['show', 'create', 'edit'])
        ->middleware([
            'can:view permissions',
            'can:create permissions',
            'can:update permissions',
            'can:delete permissions'
        ]);

    // Roles
    Route::resource('roles', RoleController::class)->except(['show']);

    // Users Export - Must be before resource route to avoid conflict
    Route::get('users/export', [UserController::class, 'export'])->name('users.export');

    // Users
    Route::resource('users', UserController::class)->except(['show']);

    // Departments
    Route::resource('departments', DepartmentController::class)->except(['show']);

    // Employees Export - Must be before resource route to avoid conflict
    Route::get('employees/export', [EmployeeController::class, 'export'])->name('employees.export');

    // Branches, Positions, Employees
    Route::resources([
        'branches' => BranchController::class,
        'positions' => PositionController::class,
        'departments' => DepartmentController::class,
        'employees' => EmployeeController::class,
        'holidays' => HolidayController::class,
    ]);

    // Employee Directory (read-only)
    Route::get('directory', [EmployeeDirectoryController::class, 'index'])
        ->name('employee-directory.index')
        ->middleware('permission:view employee directory');

    // Managers
    Route::resource('managers', ManagerController::class)->except(['show']);

    // Evaluation Types
    Route::resource('evaluation-types', EvaluationTypeController::class)->except(['show']);

    // Question Groups
    Route::resource('question-groups', QuestionGroupController::class)->except(['show']);

    // Questions
    Route::resource('questions', QuestionController::class)->except(['show']);

    // Evaluator Groups
    Route::resource('evaluator-groups', EvaluatorGroupController::class)->except(['show']);

    // Evaluates Groups
    Route::resource('evaluates-groups', EvaluatesGroupController::class)->except(['show']);

    // Other Evaluables
    Route::resource('other-evaluables', OtherEvaluableController::class)->except(['show']);

    // Evaluations
    Route::resource('evaluations', EvaluationController::class)->except(['show']);


    // Fiscal Years
    Route::resource('fiscal-years', FiscalYearController::class)->except(['show']);

    // Fiscal Months
    Route::resource('fiscal-months', FiscalMonthController::class)->except(['show']);

    // Evaluation Periods
    Route::resource('evaluation-periods', EvaluationPeriodController::class)->except(['show']);

    // Evaluation Categories
    Route::resource('evaluation-categories', EvaluationCategoryController::class)->except(['show']);

    // Child Categories
    Route::middleware('permission:view child categories')->group(function () {
        Route::resource('child-categories', \App\Http\Controllers\ChildCategoryController::class)->except(['show']);
    });

    // Products
    Route::middleware('permission:view products')->group(function () {
        Route::patch('products/{product}/toggle-purchasable', [\App\Http\Controllers\ProductController::class, 'togglePurchasable'])->name('products.toggle-purchasable');
        Route::resource('products', \App\Http\Controllers\ProductController::class)->except(['show']);
    });

    // Inventory Periods
    Route::middleware('permission:view inventory periods')->group(function () {
        Route::resource('inventory-periods', \App\Http\Controllers\InventoryPeriodController::class)->except(['show']);
    });

    // Inventory Counts
    Route::middleware('permission:view inventory counts')->group(function () {
        Route::post('inventory-counts/auto-save', [\App\Http\Controllers\InventoryCountController::class, 'autoSave'])->name('inventory-counts.auto-save');
        Route::get('inventory-counts/previous', [\App\Http\Controllers\InventoryCountController::class, 'getPreviousCounts'])->name('inventory-counts.previous');
        Route::post('inventory-counts/bulk', [\App\Http\Controllers\InventoryCountController::class, 'bulkStore'])->name('inventory-counts.bulk');
        Route::put('inventory-counts/{inventoryCount}/approve', [\App\Http\Controllers\InventoryCountController::class, 'approve'])->name('inventory-counts.approve');
        Route::put('inventory-counts/{inventoryCount}/unapprove', [\App\Http\Controllers\InventoryCountController::class, 'unapprove'])->name('inventory-counts.unapprove');
        Route::post('inventory-counts/bulk-approve', [\App\Http\Controllers\InventoryCountController::class, 'bulkApprove'])->name('inventory-counts.bulk-approve');
        Route::post('inventory-counts/bulk-unapprove', [\App\Http\Controllers\InventoryCountController::class, 'bulkUnapprove'])->name('inventory-counts.bulk-unapprove');
        Route::resource('inventory-counts', \App\Http\Controllers\InventoryCountController::class)->except(['show']);
    });

    // Inventory Completion Tracking
    Route::middleware('permission:view inventory completion tracking')->group(function () {
        Route::get('inventory-completion-tracking', [\App\Http\Controllers\InventoryCompletionTrackingController::class, 'index'])->name('inventory-completion-tracking.index');
        Route::get('inventory-completion-tracking/{branch}/{period}/missing-categories', [\App\Http\Controllers\InventoryCompletionTrackingController::class, 'getMissingChildCategories'])->name('inventory-completion-tracking.missing-categories');
    });




    // My Evaluation
    Route::get('my-evaluation', [MyEvaluationController::class, 'index'])->name('my-evaluation.index');
    // Place static and specific routes BEFORE dynamic {evaluation}
    Route::get('my-evaluation/history', [MyEvaluationController::class, 'history'])->name('my-evaluation.history');
    Route::get('my-evaluation/response/{evaluationResponse}/edit', [MyEvaluationController::class, 'editResponse'])->name('my-evaluation.response.edit');
    Route::put('my-evaluation/response/{evaluationResponse}', [MyEvaluationController::class, 'updateResponse'])->name('my-evaluation.response.update');
    Route::delete('my-evaluation/response/{evaluationResponse}', [MyEvaluationController::class, 'destroyResponse'])->name('my-evaluation.response.destroy');
    // Constrain evaluation to numeric IDs
    Route::get('my-evaluation/{evaluation}', [MyEvaluationController::class, 'show'])->whereNumber('evaluation')->name('my-evaluation.show');
    Route::post('my-evaluation/{evaluation}', [MyEvaluationController::class, 'store'])->whereNumber('evaluation')->name('my-evaluation.store');

    // My Evaluation Results (for employees to view their received evaluations)
    Route::get('my-results', [\App\Http\Controllers\MyEvaluationResultsController::class, 'index'])->name('my-results.index');
    Route::get('my-results/{evaluationResponse}', [\App\Http\Controllers\MyEvaluationResultsController::class, 'show'])->name('my-results.show');
    Route::post('my-results/{evaluationResponse}/accept', [\App\Http\Controllers\MyEvaluationResultsController::class, 'accept'])->name('my-results.accept');
    Route::post('my-results/{evaluationResponse}/reject', [\App\Http\Controllers\MyEvaluationResultsController::class, 'reject'])->name('my-results.reject');

    // Rejected Evaluations (for authorized users to manage rejected evaluations)
    Route::get('rejected-evaluations', [RejectedEvaluationsController::class, 'index'])->name('rejected-evaluations.index');
    Route::post('rejected-evaluations/{evaluationResponse}/approve', [RejectedEvaluationsController::class, 'approve'])->name('rejected-evaluations.approve');
    Route::delete('rejected-evaluations/{evaluationResponse}', [RejectedEvaluationsController::class, 'cancel'])->name('rejected-evaluations.cancel');

    // Evaluator Completion Tracking
    Route::get('evaluator-completion', [EvaluatorCompletionController::class, 'index'])->name('evaluator-completion.index');

    // Evaluation summary report (permission-gated)
    Route::middleware('permission:view evaluation summary')->group(function () {
        Route::get('reports/evaluation-summary', [\App\Http\Controllers\EvaluationReportController::class, 'summary'])->name('reports.evaluation-summary');
        Route::get('reports/evaluation-summary/details', [\App\Http\Controllers\EvaluationReportController::class, 'details'])->name('reports.evaluation-summary.details');
        Route::get('reports/evaluation-summary/export', [\App\Http\Controllers\EvaluationReportController::class, 'export'])->name('reports.evaluation-summary.export');
    });

    // Evaluation Records Management
    Route::middleware('permission:view evaluation records')->group(function () {
        Route::resource('evaluation-records', \App\Http\Controllers\EvaluationResponseController::class)
            ->only(['index', 'edit', 'update', 'destroy'])
            ->names([
                'index' => 'evaluation-records.index',
                'edit' => 'evaluation-records.edit',
                'update' => 'evaluation-records.update',
                'destroy' => 'evaluation-records.destroy',
            ]);
    });

    // External Links Management
    Route::middleware('permission:manage external links')->group(function () {
        Route::get('external-links', [ExternalLinkController::class, 'index'])->name('external-links.index');
        Route::post('external-links', [ExternalLinkController::class, 'store'])->name('external-links.store');
        Route::put('external-links/{external_link}', [ExternalLinkController::class, 'update'])->name('external-links.update');
        Route::delete('external-links/{external_link}', [ExternalLinkController::class, 'destroy'])->name('external-links.destroy');

        Route::post('external-link-sections', [ExternalLinkSectionController::class, 'store'])->name('external-link-sections.store');
        Route::put('external-link-sections/{external_link_section}', [ExternalLinkSectionController::class, 'update'])->name('external-link-sections.update');
        Route::delete('external-link-sections/{external_link_section}', [ExternalLinkSectionController::class, 'destroy'])->name('external-link-sections.destroy');
    });

    // Deleted Evaluations (Audit Trail)
    Route::middleware('permission:view deleted evaluations')->group(function () {
        Route::get('deleted-evaluations', [\App\Http\Controllers\DeletedEvaluationsController::class, 'index'])
            ->name('deleted-evaluations.index');
        Route::post('deleted-evaluations/{deleted_evaluation}/restore', [\App\Http\Controllers\DeletedEvaluationsController::class, 'restore'])
            ->name('deleted-evaluations.restore')
            ->middleware('permission:restore deleted evaluations');
    });

    // Branch Manager Evaluation summary report (permission-gated)
    Route::middleware('permission:view branch manager evaluation summary')->group(function () {
        Route::get('reports/branch-manager-evaluation-summary', [\App\Http\Controllers\BranchManagerEvaluationSummaryController::class, 'summary'])->name('reports.branch-manager-evaluation-summary');
        Route::get('reports/branch-manager-evaluation-summary/details', [\App\Http\Controllers\BranchManagerEvaluationSummaryController::class, 'details'])->name('reports.branch-manager-evaluation-summary.details');
        Route::get('reports/branch-manager-evaluation-summary/export', [\App\Http\Controllers\BranchManagerEvaluationSummaryController::class, 'export'])->name('reports.branch-manager-evaluation-summary.export');
    });

    // Inventory Count summary report (permission-gated)
    Route::middleware('permission:view inventory count summary')->group(function () {
        Route::get('reports/inventory-count-summary', [\App\Http\Controllers\InventoryCountSummaryController::class, 'summary'])->name('reports.inventory-count-summary');
        Route::get('reports/inventory-count-summary/export', [\App\Http\Controllers\InventoryCountSummaryController::class, 'export'])->name('reports.inventory-count-summary.export');
    });

    // Pre-Orders
    Route::middleware('permission:view pre-orders')->group(function () {
        Route::get('pre-orders/dashboard', [PreOrderDashboardController::class, 'index'])->name('pre-orders.dashboard');
        Route::get('pre-orders/export', [\App\Http\Controllers\PreOrderController::class, 'export'])->name('pre-orders.export')->middleware('permission:view all pre-orders');
        Route::post('pre-orders/{preOrder}/update-status', [\App\Http\Controllers\PreOrderController::class, 'updateStatus'])->name('pre-orders.update-status')->middleware('permission:update pre-order status|update all pre-order status|mark pre-order as paid|cancel pre-orders');
        Route::post('pre-orders/send-bulk-sms-reminders', [\App\Http\Controllers\PreOrderController::class, 'sendBulkSmsReminders'])->name('pre-orders.send-bulk-sms-reminders')->middleware('permission:send bulk sms reminders');
        Route::post('pre-orders/bulk-cancel', [\App\Http\Controllers\PreOrderController::class, 'bulkCancel'])->name('pre-orders.bulk-cancel')->middleware('permission:cancel pre-orders');
        Route::resource('pre-orders', \App\Http\Controllers\PreOrderController::class);
    });

    // My Branch Orders
    Route::middleware('permission:view my branch orders')->group(function () {
        Route::get('my-branch-orders', [\App\Http\Controllers\MyBranchOrdersController::class, 'index'])->name('my-branch-orders.index');
        Route::get('my-branch-orders/export', [\App\Http\Controllers\MyBranchOrdersController::class, 'export'])->name('my-branch-orders.export');
        Route::post('my-branch-orders/{order}/collect', [\App\Http\Controllers\MyBranchOrdersController::class, 'collect'])->name('my-branch-orders.collect')->middleware('permission:collect branch orders');
        Route::post('my-branch-orders/{order}/uncollect', [\App\Http\Controllers\MyBranchOrdersController::class, 'uncollect'])->name('my-branch-orders.uncollect')->middleware('permission:collect branch orders');
    });

    // SMS Balance & Management
    Route::middleware('permission:view sms balance')->group(function () {
        Route::get('sms-balance', [SmsBalanceController::class, 'index'])->name('sms-balance.index');
        Route::get('sms-balance/api', [SmsBalanceController::class, 'getBalance'])->name('sms-balance.api');
    });

    // SMS Settings Management (Activate/Deactivate)
    Route::middleware('permission:manage sms settings')->group(function () {
        Route::post('sms-balance/activate', [SmsBalanceController::class, 'activate'])->name('sms-balance.activate');
        Route::post('sms-balance/deactivate', [SmsBalanceController::class, 'deactivate'])->name('sms-balance.deactivate');
    });

    // Tickets
    Route::get('tickets', [\App\Http\Controllers\TicketController::class, 'index'])
        ->name('tickets.index')
        ->middleware('permission:ticket.view.all|ticket.view.department|ticket.view.own');
    Route::get('tickets/create', [\App\Http\Controllers\TicketController::class, 'create'])
        ->name('tickets.create')
        ->middleware('permission:ticket.create');
    Route::post('tickets', [\App\Http\Controllers\TicketController::class, 'store'])
        ->name('tickets.store')
        ->middleware('permission:ticket.create');
    Route::get('tickets/{ticket}', [\App\Http\Controllers\TicketController::class, 'show'])
        ->name('tickets.show')
        ->middleware('permission:ticket.view.all|ticket.view.department|ticket.view.own');
    Route::get('tickets/{ticket}/download-products', [\App\Http\Controllers\TicketController::class, 'downloadProductsPdf'])
        ->name('tickets.download-products')
        ->middleware('permission:ticket.view.all|ticket.view.department|ticket.view.own');
    Route::post('tickets/{ticket}/status', [\App\Http\Controllers\TicketController::class, 'updateStatus'])
        ->name('tickets.status')
        ->middleware('permission:ticket.status.update|ticket.approve|ticket.reject|ticket.done|ticket.pending|ticket.escalate|ticket.close');
    Route::post('tickets/{ticket}/assign', [\App\Http\Controllers\TicketController::class, 'assign'])
        ->name('tickets.assign')
        ->middleware('permission:ticket.assign');
    Route::post('tickets/{ticket}/approve-completion', [\App\Http\Controllers\TicketController::class, 'approveCompletion'])
        ->name('tickets.approve-completion')
        ->middleware('permission:ticket.view.own|ticket.view.department|ticket.view.all');
    Route::post('tickets/{ticket}/reject-completion', [\App\Http\Controllers\TicketController::class, 'rejectCompletion'])
        ->name('tickets.reject-completion')
        ->middleware('permission:ticket.view.own|ticket.view.department|ticket.view.all');
    Route::post('tickets/{ticket}/rate', [\App\Http\Controllers\TicketController::class, 'rate'])
        ->name('tickets.rate')
        ->middleware('permission:ticket.rate');
    Route::post('tickets/{ticket}/asset', [\App\Http\Controllers\TicketController::class, 'updateAsset'])
        ->name('tickets.update-asset')
        ->middleware('permission:ticket.status.update|ticket.assign|ticket.view.all');
    Route::post('tickets/{ticket}/deadline', [\App\Http\Controllers\TicketController::class, 'updateDeadline'])
        ->name('tickets.update-deadline')
        ->middleware('permission:ticket.assign|ticket.view.all');
    Route::post('tickets/{ticket}/priority', [\App\Http\Controllers\TicketController::class, 'updatePriority'])
        ->name('tickets.update-priority')
        ->middleware('permission:ticket.assign|ticket.view.all');
    Route::delete('tickets/{ticket}', [\App\Http\Controllers\TicketController::class, 'destroy'])
        ->name('tickets.destroy')
        ->middleware('permission:ticket.delete');

    // Ticket notifications (for bell UI)
    Route::get('ticket-notifications', [\App\Http\Controllers\TicketNotificationController::class, 'index'])
        ->name('ticket-notifications.index');
    Route::post('ticket-notifications/mark-read/{notification?}', [\App\Http\Controllers\TicketNotificationController::class, 'markRead'])
        ->name('ticket-notifications.mark-read');
    Route::delete('ticket-notifications', [\App\Http\Controllers\TicketNotificationController::class, 'clear'])
        ->name('ticket-notifications.clear');

    // Ticket taxonomy management
    Route::middleware('permission:ticket.manage.taxonomy')->group(function () {
        Route::get('ticket-settings', function () {
            return redirect()->route('ticket-settings.main-categories');
        })->name('ticket-settings.index');

        Route::get('ticket-settings/main-categories', [\App\Http\Controllers\TicketSettingsController::class, 'mainCategories'])->name('ticket-settings.main-categories');
        Route::get('ticket-settings/sub-categories', [\App\Http\Controllers\TicketSettingsController::class, 'subCategories'])->name('ticket-settings.sub-categories');
        Route::get('ticket-settings/assets', [\App\Http\Controllers\TicketSettingsController::class, 'assets'])->name('ticket-settings.assets');

        Route::patch('ticket-sub-categories/{ticketSubCategory}/toggle-status', [\App\Http\Controllers\TicketSubCategoryController::class, 'toggleStatus'])->name('ticket-sub-categories.toggle-status');

        Route::resource('ticket-main-categories', \App\Http\Controllers\TicketMainCategoryController::class)->except(['show']);
        Route::resource('ticket-sub-categories', \App\Http\Controllers\TicketSubCategoryController::class)->except(['show']);
        Route::resource('ticket-assets', \App\Http\Controllers\TicketAssetController::class)->except(['show']);
    });

    // Spare Part Management
    Route::resource('spare-part-categories', SparePartCategoryController::class)->except(['show']);
    Route::resource('spare-parts', SparePartController::class)->except(['show']);
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';

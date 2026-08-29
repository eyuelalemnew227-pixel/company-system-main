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
    PreOrderTargetController,
    WeeklyBudgetController,
    MemoController,
    MemoTemplateController,
    MemoSettingController,
    TelecomDashboardController,
    TelecomPhoneNumberController,
    TelecomBroadbandController,
    TelecomProviderController,
};

Route::get('/', fn() => Inertia::render('welcome'))->name('home');

// Offline fallback page for PWA
Route::get('/offline', fn() => Inertia::render('offline'))->name('offline');

// Public Telegram MiniApp Route
Route::get('/pre-orders/miniapp', fn() => view('miniapp'))->name('pre-orders.miniapp');

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

    // Roles Matrix - Must be placed before resource route to avoid route parameter collision
    Route::get('roles/matrix', [RoleController::class, 'matrix'])->name('roles.matrix');
    Route::post('roles/matrix/toggle', [RoleController::class, 'toggleMatrixPermission'])->name('roles.matrix.toggle');

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

    // Expense Budget Periods
    Route::resource('expense-budget-periods', \App\Http\Controllers\ExpenseBudgetPeriodController::class)->except(['show']);

    // Weekly Budget Periods
    Route::get('weekly-budget-periods', [\App\Http\Controllers\WeeklyBudgetPeriodController::class, 'index'])->name('weekly-budget-periods.index');
    Route::post('weekly-budget-periods', [\App\Http\Controllers\WeeklyBudgetPeriodController::class, 'store'])->name('weekly-budget-periods.store');


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
    Route::get('my-evaluation/response/{evaluationResponse}/view', [MyEvaluationController::class, 'showResponse'])->name('my-evaluation.response.view');
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

    // Internal Memorandum
    Route::post('memos/{memo}/sign-cc', [MemoController::class, 'signCc'])->name('memos.sign-cc');
    Route::post('memos/{memo}/send-telegram', [MemoController::class, 'sendTelegram'])->name('memos.send-telegram');
    Route::resource('memos', MemoController::class);
    Route::resource('memo-templates', MemoTemplateController::class)->only(['index', 'store', 'destroy']);
    Route::get('memo-settings', [MemoSettingController::class, 'index'])->name('memo-settings.index');
    Route::post('memo-settings', [MemoSettingController::class, 'update'])->name('memo-settings.update');
    Route::post('user/signature', [MemoController::class, 'updateUserSignature'])->name('user.signature.update');



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

    // Finance View for Weekly Budgets
    Route::middleware('permission:view finance budgets')->group(function () {
        Route::get('budget/weekly-budget/finance/export', [WeeklyBudgetController::class, 'exportFinance'])->name('weekly-budget.finance.export');
        Route::get('budget/weekly-budget/finance', [WeeklyBudgetController::class, 'financeView'])->name('weekly-budget.finance');
        Route::post('budget/weekly-budget/finance/send-to-ceo', [WeeklyBudgetController::class, 'sendToCeo'])->name('weekly-budget.finance.send-to-ceo');
    });

    Route::middleware('permission:manage finance budgets')->group(function () {
        Route::patch('budget/weekly-budget/{weeklyBudget}/finance-status', [WeeklyBudgetController::class, 'updateFinance'])->name('weekly-budget.update-finance');
        Route::patch('budget/weekly-budget/finance/bulk', [WeeklyBudgetController::class, 'bulkUpdateFinance'])->name('weekly-budget.bulk-update-finance');
        Route::post('budget/weekly-budget/finance/override-paid', [WeeklyBudgetController::class, 'overridePaid'])->name('weekly-budget.override-paid');
    });

    // Department View for Weekly Budgets
    Route::middleware('permission:view department budgets')->group(function () {
        Route::get('budget/weekly-budget/department/export', [WeeklyBudgetController::class, 'exportDepartment'])->name('weekly-budget.department.export');
        Route::get('budget/weekly-budget/department', [WeeklyBudgetController::class, 'departmentView'])->name('weekly-budget.department');
        Route::patch('budget/weekly-budget/{weeklyBudget}/department-status', [WeeklyBudgetController::class, 'updateDepartment'])->name('weekly-budget.update-department');
        Route::delete('budget/weekly-budget/{weeklyBudget}/department-delete', [WeeklyBudgetController::class, 'departmentDelete'])->name('weekly-budget.department-delete');
    });

    Route::middleware('permission:manage department budgets')->group(function () {
        Route::patch('budget/weekly-budget/department/bulk', [WeeklyBudgetController::class, 'bulkUpdateDepartment'])->name('weekly-budget.bulk-update-department');
    });

    // CEO View for Weekly Budgets
    Route::middleware('permission:view ceo budgets')->group(function () {
        Route::get('budget/weekly-budget/ceo/export', [WeeklyBudgetController::class, 'exportCeo'])->name('weekly-budget.ceo.export');
        Route::get('budget/weekly-budget/ceo', [WeeklyBudgetController::class, 'ceoView'])->name('weekly-budget.ceo');
    });

    Route::middleware('permission:manage ceo budgets')->group(function () {
        Route::patch('budget/weekly-budget/{weeklyBudget}/ceo-status', [WeeklyBudgetController::class, 'updateCeo'])->name('weekly-budget.update-ceo');
        Route::patch('budget/weekly-budget/ceo/bulk', [WeeklyBudgetController::class, 'bulkUpdateCeo'])->name('weekly-budget.bulk-update-ceo');
    });
    // Weekly Budget (existing)
    Route::middleware('permission:view weekly budgets')->group(function () {
        Route::get('budget/weekly-budget/export', [WeeklyBudgetController::class, 'exportIndex'])->name('weekly-budget.index.export');
        Route::get('budget/weekly-budget', [WeeklyBudgetController::class, 'index'])->name('weekly-budget.index');
        Route::get('budget/weekly-budget/{weeklyBudget}/activity-logs', [WeeklyBudgetController::class, 'activityLogs'])->name('weekly-budget.activity-logs');
    });

    Route::middleware('permission:view weekly budget summary')->group(function () {
        Route::get('budget/weekly-budget/analytics', [WeeklyBudgetController::class, 'analytics'])->name('weekly-budget.analytics');
    });

    Route::middleware('permission:manage weekly budgets')->group(function () {
        Route::get('budget/weekly-budget/create', [WeeklyBudgetController::class, 'create'])->name('weekly-budget.create');
        Route::post('budget/weekly-budget', [WeeklyBudgetController::class, 'store'])->name('weekly-budget.store');
        Route::put('budget/weekly-budget/{weeklyBudget}', [WeeklyBudgetController::class, 'update'])->name('weekly-budget.update');
        Route::delete('budget/weekly-budget/{weeklyBudget}', [WeeklyBudgetController::class, 'destroy'])->name('weekly-budget.destroy');
    });
    // Weekly Budget Notifications (for bell UI)
    Route::get('weekly-budget-notifications', [\App\Http\Controllers\WeeklyBudgetNotificationController::class, 'index'])
        ->name('weekly-budget-notifications.index');
    Route::post('weekly-budget-notifications/mark-read/{notification?}', [\App\Http\Controllers\WeeklyBudgetNotificationController::class, 'markRead'])
        ->name('weekly-budget-notifications.mark-read');
    Route::delete('weekly-budget-notifications', [\App\Http\Controllers\WeeklyBudgetNotificationController::class, 'clear'])
        ->name('weekly-budget-notifications.clear');

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

    // Consolidated Tabs Intercept Route
    Route::get('reports/employee-evaluations', function () {
        $user = auth()->user();
        if ($user->can('view evaluation summary'))
            return redirect()->route('reports.evaluation-summary');
        if ($user->can('view branch manager evaluation summary'))
            return redirect()->route('reports.branch-manager-evaluation-summary');
        if ($user->can('view champions evaluation summary'))
            return redirect()->route('reports.champions-evaluation-summary');
        if ($user->can('view regional production maintenance evaluation summary'))
            return redirect()->route('reports.regional-production-maintenance-summary');
        abort(403);
    })->name('reports.employee-evaluations.index');

    // Branch Manager Evaluation summary report (permission-gated)
    Route::middleware('permission:view branch manager evaluation summary')->group(function () {
        Route::get('reports/branch-manager-evaluation-summary', [\App\Http\Controllers\BranchManagerEvaluationSummaryController::class, 'summary'])->name('reports.branch-manager-evaluation-summary');
        Route::get('reports/branch-manager-evaluation-summary/details', [\App\Http\Controllers\BranchManagerEvaluationSummaryController::class, 'details'])->name('reports.branch-manager-evaluation-summary.details');
        Route::get('reports/branch-manager-evaluation-summary/export', [\App\Http\Controllers\BranchManagerEvaluationSummaryController::class, 'export'])->name('reports.branch-manager-evaluation-summary.export');
    });

    // Champions Evaluation summary report
    Route::middleware('permission:view champions evaluation summary')->group(function () {
        Route::get('reports/champions-evaluation-summary', [\App\Http\Controllers\ChampionsEvaluationSummaryController::class, 'summary'])->name('reports.champions-evaluation-summary');
        Route::get('reports/champions-evaluation-summary/export', [\App\Http\Controllers\ChampionsEvaluationSummaryController::class, 'export'])->name('reports.champions-evaluation-summary.export');
        Route::get('reports/champions-evaluation-summary/details', [\App\Http\Controllers\ChampionsEvaluationSummaryController::class, 'details'])->name('reports.champions-evaluation-summary.details');
    });

    // Regional, Production & Maintenance Evaluation summary report
    Route::middleware('permission:view regional production maintenance evaluation summary')->group(function () {
        Route::get('reports/regional-production-maintenance-summary', [\App\Http\Controllers\ConsolidatedEvaluationSummaryController::class, 'summary'])->name('reports.regional-production-maintenance-summary');
        Route::get('reports/regional-production-maintenance-summary/export', [\App\Http\Controllers\ConsolidatedEvaluationSummaryController::class, 'export'])->name('reports.regional-production-maintenance-summary.export');
        Route::get('reports/regional-production-maintenance-summary/details', [\App\Http\Controllers\ConsolidatedEvaluationSummaryController::class, 'details'])->name('reports.regional-production-maintenance-summary.details');
    });

    // Inventory Count summary report (permission-gated)
    Route::middleware('permission:view inventory count summary')->group(function () {
        Route::get('reports/inventory-count-summary', [\App\Http\Controllers\InventoryCountSummaryController::class, 'summary'])->name('reports.inventory-count-summary');
        Route::get('reports/inventory-count-summary/export', [\App\Http\Controllers\InventoryCountSummaryController::class, 'export'])->name('reports.inventory-count-summary.export');
    });

    // Pre-Orders
    Route::middleware('permission:view pre-orders')->group(function () {
        // Pre-order Dashboard
        Route::get('/pre-orders/dashboard', [PreOrderDashboardController::class, 'index'])->name('pre-orders.dashboard');

        // Customer Feedback
        Route::get('pre-orders/feedback', [\App\Http\Controllers\PreOrderFeedbackController::class, 'index'])->name('pre-orders.feedback.index');
        Route::get('pre-orders/feedback/export', [\App\Http\Controllers\PreOrderFeedbackController::class, 'export'])->name('pre-orders.feedback.export');
        Route::delete('pre-orders/feedback/{feedback}', [\App\Http\Controllers\PreOrderFeedbackController::class, 'destroy'])->name('pre-orders.feedback.destroy');

        // Pre-Order Customers
        Route::get('pre-orders/customers', [\App\Http\Controllers\PreOrderCustomerController::class, 'index'])->name('pre-orders.customers.index');
        Route::get('pre-orders/customers/export', [\App\Http\Controllers\PreOrderCustomerController::class, 'export'])->name('pre-orders.customers.export');

        // Broadcast Announcements
        Route::get('pre-orders/broadcasts', [\App\Http\Controllers\PreOrderBroadcastController::class, 'index'])->name('pre-orders.broadcasts.index');
        Route::post('pre-orders/broadcasts', [\App\Http\Controllers\PreOrderBroadcastController::class, 'store'])->name('pre-orders.broadcasts.store');

        Route::get('pre-orders/export', [\App\Http\Controllers\PreOrderController::class, 'export'])->name('pre-orders.export')->middleware('permission:view all pre-orders');
        Route::post('pre-orders/{preOrder}/update-status', [\App\Http\Controllers\PreOrderController::class, 'updateStatus'])->name('pre-orders.update-status')->middleware('permission:update pre-order status|update all pre-order status|mark pre-order as paid|cancel pre-orders');
        Route::post('pre-orders/send-bulk-sms-reminders', [\App\Http\Controllers\PreOrderController::class, 'sendBulkSmsReminders'])->name('pre-orders.send-bulk-sms-reminders')->middleware('permission:send bulk sms reminders');
        Route::post('pre-orders/bulk-cancel', [\App\Http\Controllers\PreOrderController::class, 'bulkCancel'])->name('pre-orders.bulk-cancel')->middleware('permission:cancel pre-orders');
        Route::get('pre-orders/sms-templates', [\App\Http\Controllers\SmsTemplateController::class, 'index'])->name('pre-orders.sms-templates.index');
        Route::put('pre-orders/sms-templates/{smsTemplate}', [\App\Http\Controllers\SmsTemplateController::class, 'update'])->name('pre-orders.sms-templates.update');

        Route::middleware('permission:manage pre-order payment settings')->group(function () {
            Route::post('pre-order-payment-settings/admin-chat-id', [\App\Http\Controllers\PreOrderPaymentSettingController::class, 'updateAdminChatId'])->name('pre-order-payment-settings.admin-chat-id');
            Route::resource('pre-order-payment-settings', \App\Http\Controllers\PreOrderPaymentSettingController::class)->only(['index', 'update']);
        });

        // Cost Management
        Route::middleware('permission:manage pre-order costs')->prefix('pre-orders/costs')->group(function () {
            Route::get('categories', [\App\Http\Controllers\PreOrderCostCategoryController::class, 'index'])->name('pre-order-costs.categories.index');
            Route::post('categories', [\App\Http\Controllers\PreOrderCostCategoryController::class, 'store'])->name('pre-order-costs.categories.store');
            Route::put('categories/{preOrderCostCategory}', [\App\Http\Controllers\PreOrderCostCategoryController::class, 'update'])->name('pre-order-costs.categories.update');
            Route::delete('categories/{preOrderCostCategory}/delete', [\App\Http\Controllers\PreOrderCostCategoryController::class, 'destroy'])->name('pre-order-costs.categories.destroy');

            Route::get('/', [\App\Http\Controllers\PreOrderCostController::class, 'index'])->name('pre-order-costs.index');
            Route::post('/', [\App\Http\Controllers\PreOrderCostController::class, 'store'])->name('pre-order-costs.store');
            Route::put('{preOrderCost}', [\App\Http\Controllers\PreOrderCostController::class, 'update'])->name('pre-order-costs.update');
            Route::delete('{preOrderCost}/delete', [\App\Http\Controllers\PreOrderCostController::class, 'destroy'])->name('pre-order-costs.destroy');
            Route::post('bulk-update-products', [\App\Http\Controllers\PreOrderCostController::class, 'bulkUpdateProductCosts'])->name('pre-order-costs.bulk-update-products');
            Route::get('active-products', [\App\Http\Controllers\PreOrderCostController::class, 'getActiveProducts'])->name('pre-order-costs.active-products');
        });

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

    // Tickets Reports
    Route::get('tickets/reports', [\App\Http\Controllers\TicketReportController::class, 'index'])
        ->name('tickets.reports')
        ->middleware('permission:ticket.report.view');

    // Tickets
    Route::get('tickets', [\App\Http\Controllers\TicketController::class, 'index'])
        ->name('tickets.index')
        ->middleware('permission:ticket.view.all|ticket.view.department|ticket.view.own');
    Route::get('tickets/store-balance', [\App\Http\Controllers\TicketController::class, 'getStoreBalance'])
        ->name('tickets.store-balance');
    Route::get('tickets/export', [\App\Http\Controllers\TicketController::class, 'export'])
        ->name('tickets.export')
        ->middleware('permission:ticket.view.all|ticket.view.department|ticket.view.own');
    Route::get('tickets/create', [\App\Http\Controllers\TicketController::class, 'create'])
        ->name('tickets.create');
    Route::post('tickets', [\App\Http\Controllers\TicketController::class, 'store'])
        ->name('tickets.store');
    Route::get('tickets/{ticket}', [\App\Http\Controllers\TicketController::class, 'show'])
        ->name('tickets.show')
        ->middleware('permission:ticket.view.all|ticket.view.department|ticket.view.own');
    Route::post('tickets/{ticket}/quick-update', [\App\Http\Controllers\TicketController::class, 'quickUpdate'])
        ->name('tickets.quick-update')
        ->middleware('permission:ticket.status.update|ticket.assign|ticket.view.all|ticket.view.department');
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

    // Broadcast Announcements
    Route::get('broadcast-announcements', [\App\Http\Controllers\TelegramConfigController::class, 'broadcastPage'])->name('broadcast-announcements.index');
    Route::post('broadcast-announcements', [\App\Http\Controllers\TelegramConfigController::class, 'broadcastAnnouncement'])->name('broadcast-announcements.send');

    // Telegram Configuration Management
    Route::get('telegram-config', [\App\Http\Controllers\TelegramConfigController::class, 'index'])->name('telegram-config.index');
    Route::post('telegram-config/settings', [\App\Http\Controllers\TelegramConfigController::class, 'updateSettings'])->name('telegram-config.update-settings');
    Route::post('telegram-config/set-webhook', [\App\Http\Controllers\TelegramConfigController::class, 'setWebhook'])->name('telegram-config.set-webhook');
    Route::post('telegram-config/remove-webhook', [\App\Http\Controllers\TelegramConfigController::class, 'removeWebhook'])->name('telegram-config.remove-webhook');
    Route::post('telegram-config/test-message', [\App\Http\Controllers\TelegramConfigController::class, 'sendTestMessage'])->name('telegram-config.test-message');
    Route::put('telegram-config/users/{user}', [\App\Http\Controllers\TelegramConfigController::class, 'updateUserChatId'])->name('telegram-config.update-user');
    Route::put('telegram-config/branches/{branch}', [\App\Http\Controllers\TelegramConfigController::class, 'updateBranchChatId'])->name('telegram-config.update-branch');
    Route::post('telegram-config/broadcast', [\App\Http\Controllers\TelegramConfigController::class, 'broadcastAnnouncement'])->name('telegram-config.broadcast');

    // Dynamic Bot Credentials Management
    Route::post('telegram-config/bots', [\App\Http\Controllers\TelegramConfigController::class, 'storeBot'])->name('telegram-config.bots.store');
    Route::put('telegram-config/bots/{bot}', [\App\Http\Controllers\TelegramConfigController::class, 'updateBot'])->name('telegram-config.bots.update');
    Route::delete('telegram-config/bots/{bot}', [\App\Http\Controllers\TelegramConfigController::class, 'destroyBot'])->name('telegram-config.bots.destroy');
    Route::post('telegram-config/bots/{bot}/set-webhook', [\App\Http\Controllers\TelegramConfigController::class, 'setBotWebhook'])->name('telegram-config.bots.set-webhook');
    Route::post('telegram-config/bots/{bot}/remove-webhook', [\App\Http\Controllers\TelegramConfigController::class, 'removeBotWebhook'])->name('telegram-config.bots.remove-webhook');

    // Telecom Management
    Route::middleware(['permission:view telecom management', 'it_department'])->prefix('telecom')->group(function () {
        Route::get('dashboard', [TelecomDashboardController::class, 'index'])->name('telecom.dashboard');

        Route::get('phone-numbers/export', [TelecomPhoneNumberController::class, 'export'])->name('telecom.phone-numbers.export');
        Route::resource('phone-numbers', TelecomPhoneNumberController::class)->names([
            'index' => 'telecom.phone-numbers.index',
            'create' => 'telecom.phone-numbers.create',
            'store' => 'telecom.phone-numbers.store',
            'edit' => 'telecom.phone-numbers.edit',
            'update' => 'telecom.phone-numbers.update',
            'destroy' => 'telecom.phone-numbers.destroy',
        ]);

        Route::get('broadbands/export', [TelecomBroadbandController::class, 'export'])->name('telecom.broadbands.export');
        Route::resource('broadbands', TelecomBroadbandController::class)->names([
            'index' => 'telecom.broadbands.index',
            'create' => 'telecom.broadbands.create',
            'store' => 'telecom.broadbands.store',
            'edit' => 'telecom.broadbands.edit',
            'update' => 'telecom.broadbands.update',
            'destroy' => 'telecom.broadbands.destroy',
        ]);

        Route::resource('providers', TelecomProviderController::class)->only(['index', 'store', 'update', 'destroy'])->names([
            'index' => 'telecom.providers.index',
            'store' => 'telecom.providers.store',
            'update' => 'telecom.providers.update',
            'destroy' => 'telecom.providers.destroy',
        ]);
    });

    // Training Management System
    Route::prefix('training')->name('training.')->middleware(['permission:training.view'])->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\Training\TrainingDashboardController::class, 'index'])->name('dashboard');

        // Courses & Lessons
        Route::get('/courses', [\App\Http\Controllers\Training\CourseController::class, 'index'])->name('courses.index');
        Route::get('/courses/create', [\App\Http\Controllers\Training\CourseController::class, 'create'])->name('courses.create');
        Route::post('/courses', [\App\Http\Controllers\Training\CourseController::class, 'store'])->name('courses.store');
        Route::get('/courses/{course}', [\App\Http\Controllers\Training\CourseController::class, 'show'])->name('courses.show');
        Route::get('/courses/{course}/edit', [\App\Http\Controllers\Training\CourseController::class, 'edit'])->name('courses.edit');
        Route::put('/courses/{course}', [\App\Http\Controllers\Training\CourseController::class, 'update'])->name('courses.update');
        Route::delete('/courses/{course}', [\App\Http\Controllers\Training\CourseController::class, 'destroy'])->name('courses.destroy');
        Route::post('/courses/{course}/enroll', [\App\Http\Controllers\Training\CourseController::class, 'enroll'])->name('courses.enroll');
        Route::post('/courses/{course}/lessons', [\App\Http\Controllers\Training\LessonController::class, 'store'])->name('courses.lessons.store');

        Route::get('/lessons/{lesson}', [\App\Http\Controllers\Training\LessonController::class, 'show'])->name('lessons.show');
        Route::post('/lessons/{lesson}/complete', [\App\Http\Controllers\Training\LessonController::class, 'complete'])->name('lessons.complete');

        // My Learning Hub
        Route::get('/my-learning', [\App\Http\Controllers\Training\MyLearningController::class, 'index'])->name('my-learning.index');

        // Question Bank & Quizzes
        Route::get('/question-banks', [\App\Http\Controllers\Training\QuestionBankController::class, 'index'])->name('question-banks.index');
        Route::post('/question-banks', [\App\Http\Controllers\Training\QuestionBankController::class, 'store'])->name('question-banks.store');
        Route::put('/question-banks/{questionBank}', [\App\Http\Controllers\Training\QuestionBankController::class, 'update'])->name('question-banks.update');
        Route::delete('/question-banks/{questionBank}', [\App\Http\Controllers\Training\QuestionBankController::class, 'destroy'])->name('question-banks.destroy');

        Route::get('/quizzes', [\App\Http\Controllers\Training\QuizController::class, 'index'])->name('quizzes.index');
        Route::post('/quizzes', [\App\Http\Controllers\Training\QuizController::class, 'store'])->name('quizzes.store');
        Route::get('/quizzes/{quiz}/take', [\App\Http\Controllers\Training\QuizController::class, 'take'])->name('quizzes.take');
        Route::post('/quizzes/{quiz}/submit', [\App\Http\Controllers\Training\QuizController::class, 'submit'])->name('quizzes.submit');

        Route::get('/ai-quiz', [\App\Http\Controllers\Training\AiQuizController::class, 'index'])->name('ai-quiz.index');
        Route::post('/ai-quiz/generate', [\App\Http\Controllers\Training\AiQuizController::class, 'generate'])->name('ai-quiz.generate');

        // Certificates & Verification
        Route::get('/certificates', [\App\Http\Controllers\Training\CertificateController::class, 'index'])->name('certificates.index');
        Route::post('/certificates/{certificate}/revoke', [\App\Http\Controllers\Training\CertificateController::class, 'revoke'])->name('certificates.revoke');
        Route::get('/certificates/verify', [\App\Http\Controllers\Training\CertificateController::class, 'verifyPage'])->name('certificates.verify');

        // Leaderboard & Gamification
        Route::get('/leaderboard', [\App\Http\Controllers\Training\GamificationController::class, 'leaderboard'])->name('leaderboard.index');
        Route::get('/badges', [\App\Http\Controllers\Training\GamificationController::class, 'badges'])->name('badges.index');
        Route::post('/badges', [\App\Http\Controllers\Training\GamificationController::class, 'storeBadge'])->name('badges.store');

        // Compliance & SOP Documents
        Route::get('/sop', [\App\Http\Controllers\Training\SopController::class, 'index'])->name('sop.index');
        Route::post('/sop', [\App\Http\Controllers\Training\SopController::class, 'store'])->name('sop.store');
        Route::get('/sop/{sop}', [\App\Http\Controllers\Training\SopController::class, 'show'])->name('sop.show');
        Route::post('/sop/{sop}/acknowledge', [\App\Http\Controllers\Training\SopController::class, 'acknowledge'])->name('sop.acknowledge');
        Route::delete('/sop/{sop}', [\App\Http\Controllers\Training\SopController::class, 'destroy'])->name('sop.destroy');

        // Agendas & Structured Training Proposals (Image 1 Format)
        Route::get('/agendas', [\App\Http\Controllers\Training\TrainingStructuredScheduleController::class, 'agendasIndex'])->name('agendas.index');
        Route::get('/agendas/create', [\App\Http\Controllers\Training\TrainingStructuredScheduleController::class, 'createAgenda'])->name('agendas.create');
        Route::post('/agendas', [\App\Http\Controllers\Training\TrainingStructuredScheduleController::class, 'storeAgenda'])->name('agendas.store');
        Route::get('/agendas/{agenda}', [\App\Http\Controllers\Training\TrainingStructuredScheduleController::class, 'showAgenda'])->name('agendas.show');

        // Master Schedules & Timetable (Image 2 Format)
        Route::get('/schedules', [\App\Http\Controllers\Training\TrainingStructuredScheduleController::class, 'schedulesIndex'])->name('schedules.index');
        Route::get('/schedules/create', [\App\Http\Controllers\Training\TrainingStructuredScheduleController::class, 'createSchedule'])->name('schedules.create');
        Route::post('/schedules', [\App\Http\Controllers\Training\TrainingStructuredScheduleController::class, 'storeSchedule'])->name('schedules.store');
        Route::post('/schedules/{schedule}/publish', [\App\Http\Controllers\Training\TrainingStructuredScheduleController::class, 'publishSchedule'])->name('schedules.publish');
        Route::post('/schedules/items/{item}/approve', [\App\Http\Controllers\Training\TrainingStructuredScheduleController::class, 'approveScheduleItem'])->name('schedules.items.approve');

        // Trainer Department Evaluation
        Route::get('/evaluations', [\App\Http\Controllers\Training\TrainingStructuredScheduleController::class, 'evaluationsIndex'])->name('evaluations.index');
        Route::get('/evaluations/create/{item?}', [\App\Http\Controllers\Training\TrainingStructuredScheduleController::class, 'createEvaluation'])->name('evaluations.create');
        Route::post('/evaluations', [\App\Http\Controllers\Training\TrainingStructuredScheduleController::class, 'storeEvaluation'])->name('evaluations.store');

        // Training Settings & Questionnaire Customization
        Route::get('/settings', [\App\Http\Controllers\Training\TrainingSettingsController::class, 'index'])->name('settings.index');
        Route::post('/settings', [\App\Http\Controllers\Training\TrainingSettingsController::class, 'update'])->name('settings.update');

        Route::post('/agendas/{event}/check-in', [\App\Http\Controllers\Training\AgendaController::class, 'checkIn'])->name('agendas.check-in');

        // Forums & Community
        Route::get('/forums', [\App\Http\Controllers\Training\ForumController::class, 'index'])->name('forums.index');
        Route::post('/forums', [\App\Http\Controllers\Training\ForumController::class, 'storeForum'])->name('forums.store');
        Route::get('/forums/thread/{thread}', [\App\Http\Controllers\Training\ForumController::class, 'showThread'])->name('forums.thread');
        Route::post('/forums/{forum}/threads', [\App\Http\Controllers\Training\ForumController::class, 'storeThread'])->name('forums.threads.store');
        Route::post('/forums/thread/{thread}/reply', [\App\Http\Controllers\Training\ForumController::class, 'reply'])->name('forums.reply');
        Route::post('/forums/thread/{thread}/posts/{post}/solution', [\App\Http\Controllers\Training\ForumController::class, 'markSolution'])->name('forums.mark-solution');

        // Reports
        Route::get('/reports', [\App\Http\Controllers\Training\ReportController::class, 'index'])->name('reports.index');
    });
});

require __DIR__ . '/settings.php';
require __DIR__ . '/budget.php';
require __DIR__ . '/auth.php';

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
    BranchController,
    PositionController,
    EmployeeController,
    RejectedEvaluationsController,
    EvaluatorCompletionController
};

Route::get('/', fn () => Inertia::render('welcome'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', fn () => Inertia::render('dashboard'))->name('dashboard');

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
        'employees' => EmployeeController::class,
    ]);

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

    // Child Categories
    Route::middleware('permission:view child categories')->group(function () {
        Route::resource('child-categories', \App\Http\Controllers\ChildCategoryController::class)->except(['show']);
    });

    // Products
    Route::middleware('permission:view products')->group(function () {
        Route::resource('products', \App\Http\Controllers\ProductController::class)->except(['show']);
    });

    // Inventory Periods
    Route::middleware('permission:view inventory periods')->group(function () {
        Route::resource('inventory-periods', \App\Http\Controllers\InventoryPeriodController::class)->except(['show']);
    });

    // Inventory Counts
    Route::middleware('permission:view inventory counts')->group(function () {
        Route::get('inventory-counts/existing', [\App\Http\Controllers\InventoryCountController::class, 'getExistingCounts'])->name('inventory-counts.existing');
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
        Route::get('reports/evaluation-summary/export', [\App\Http\Controllers\EvaluationReportController::class, 'export'])->name('reports.evaluation-summary.export');
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
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
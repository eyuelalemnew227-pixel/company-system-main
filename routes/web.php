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

    // Users
    Route::resource('users', UserController::class)->except(['show']);

    // Departments
    Route::resource('departments', DepartmentController::class)->except(['show']);

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
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
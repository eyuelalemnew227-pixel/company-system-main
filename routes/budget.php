<?php

use App\Http\Controllers\ExpenseBudgetController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::middleware('permission:'.config('expense_budget.permissions.view', 'view expense budgets'))->group(function () {
        Route::get('budget/expense-budget', [ExpenseBudgetController::class, 'index'])->name('expense-budget.index');
        Route::get('budget/expense-budget/submission-tracker', [ExpenseBudgetController::class, 'submissionTracker'])->name('expense-budget.submission-tracker');
        Route::get('budget/expense-budget/items/{expenseBudgetItem}/activity-logs', [ExpenseBudgetController::class, 'itemActivityLogs'])->name('expense-budget.items.activity-logs');
    });

    Route::middleware('expense_budget.manage_window')->group(function () {
        Route::get('budget/expense-budget/create', [ExpenseBudgetController::class, 'create'])->name('expense-budget.create');
        Route::post('budget/expense-budget', [ExpenseBudgetController::class, 'store'])->name('expense-budget.store');
        Route::patch('budget/expense-budget/items/{expenseBudgetItem}', [ExpenseBudgetController::class, 'updateItem'])->name('expense-budget.items.update');
        Route::delete('budget/expense-budget/items/{expenseBudgetItem}', [ExpenseBudgetController::class, 'destroyItem'])->name('expense-budget.items.destroy');
        Route::get('budget/expense-budget/prev-budget', [ExpenseBudgetController::class, 'getPrevBudget'])->name('expense-budget.prev-budget');
        Route::get('budget/expense-budget/budgeted-items', [ExpenseBudgetController::class, 'getBudgetedExpenseItems'])->name('expense-budget.budgeted-items');
    });
});

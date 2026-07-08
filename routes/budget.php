<?php

use App\Http\Controllers\ExpenseBudgetController;
use App\Http\Controllers\SalesBudgetController;
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

    Route::middleware('permission:manage sales budget')->group(function () {
        Route::get('budget/sales-budget', [SalesBudgetController::class, 'index'])->name('sales-budget.index');
        Route::get('budget/sales-budget/create', [SalesBudgetController::class, 'create'])->name('sales-budget.create');
        Route::post('budget/sales-budget', [SalesBudgetController::class, 'store'])->name('sales-budget.store');
        Route::get('budget/sales-budget/check', [SalesBudgetController::class, 'check'])->name('sales-budget.check');
        Route::get('budget/sales-budget/logs', [SalesBudgetController::class, 'logs'])->name('sales-budget.logs');
        Route::get('budget/sales-budget/prev-expense', [SalesBudgetController::class, 'getPrevExpense'])->name('sales-budget.prev-expense');
        Route::get('budget/sales-budget/{salesBudget}/edit', [SalesBudgetController::class, 'edit'])->name('sales-budget.edit');
        Route::put('budget/sales-budget/{salesBudget}', [SalesBudgetController::class, 'update'])->name('sales-budget.update');
        Route::delete('budget/sales-budget/{salesBudget}', [SalesBudgetController::class, 'destroy'])->name('sales-budget.destroy');
    });
});

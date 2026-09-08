<?php

namespace App\Console\Commands;

use App\Enums\WeeklyBudgetStatusCeo;
use App\Enums\WeeklyBudgetStatusFinance;
use App\Models\WeeklyBudget;
use Illuminate\Console\Command;

class IncrementTransferredWeeklyBudgets extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'budgets:increment-transferred';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Increment the transferred_to week number for weekly budgets with Transferred Finance Status and Pending CEO Status';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $budgets = WeeklyBudget::where('status_finance', WeeklyBudgetStatusFinance::Transferred)
            ->where('status_ceo', WeeklyBudgetStatusCeo::Pending)
            ->whereNotNull('transferred_to')
            ->get();

        $count = 0;
        foreach ($budgets as $budget) {
            $nextWeek = $budget->transferred_to + 1;
            $budget->update([
                'transferred_to' => $nextWeek > 53 ? 1 : $nextWeek,
            ]);
            $count++;
        }

        $this->info("Incremented transferred_to for {$count} weekly budget(s).");
    }
}

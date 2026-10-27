<?php

namespace App\Console\Commands;

use App\Services\Forms\InspectorChecklistChampionAccess;
use Illuminate\Console\Command;

class SyncOperationChampionFormAccess extends Command
{
    protected $signature = 'forms:sync-operation-champions';

    protected $description = 'Assign Operation Champion role to Operation employees with barista/cashier/janitor/display/waiter champion positions';

    public function handle(): int
    {
        $result = InspectorChecklistChampionAccess::syncRoleAssignments();

        $this->info(sprintf(
            'Operation Champion sync complete. Assigned: %d, Removed: %d, Eligible users: %d',
            $result['assigned'],
            $result['removed'],
            count(InspectorChecklistChampionAccess::eligibleUserIds())
        ));

        return self::SUCCESS;
    }
}

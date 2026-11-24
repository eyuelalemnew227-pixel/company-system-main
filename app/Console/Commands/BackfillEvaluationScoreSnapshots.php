<?php

namespace App\Console\Commands;

use App\Http\Controllers\FormSubmissionAdminController;
use App\Models\FormSubmission;
use App\Models\KpiLibrary;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class BackfillEvaluationScoreSnapshots extends Command
{
    protected $signature = 'evaluation-results:backfill-score-snapshots
                            {--chunk=100 : Number of submissions to process per chunk}
                            {--force : Recompute snapshots even when already present}';

    protected $description = 'Backfill evaluation_score_snapshot for Training post-assessment KPI form submissions';

    public function handle(FormSubmissionAdminController $controller): int
    {
        if (! Schema::hasColumn('form_submissions', 'evaluation_score_snapshot')) {
            $this->error('Missing evaluation_score_snapshot column. Run migrations first.');

            return self::FAILURE;
        }

        $kpiName = 'Training post-assessment pass rate';
        $needle = strtolower($kpiName);

        $formIds = KpiLibrary::query()
            ->with('forms:id')
            ->where(function ($query) use ($needle) {
                $query->whereRaw('LOWER(TRIM(name)) = ?', [$needle])
                    ->orWhereHas('kpiItem', function ($itemQuery) use ($needle) {
                        $itemQuery->whereRaw('LOWER(TRIM(name)) = ?', [$needle]);
                    });
            })
            ->get()
            ->flatMap(fn ($kpi) => $kpi->forms->pluck('id'))
            ->unique()
            ->values()
            ->all();

        if ($formIds === []) {
            $this->warn('No forms linked to the Training post-assessment pass rate KPI.');

            return self::SUCCESS;
        }

        $query = FormSubmission::query()
            ->whereHas('formVersion', fn ($q) => $q->whereIn('form_id', $formIds))
            ->orderBy('id');

        if (! $this->option('force')) {
            $query->whereNull('evaluation_score_snapshot');
        }

        $chunkSize = max(1, (int) $this->option('chunk'));
        $processed = 0;
        $failed = 0;

        $query->chunkById($chunkSize, function ($submissions) use ($controller, &$processed, &$failed) {
            foreach ($submissions as $submission) {
                try {
                    $controller->refreshEvaluationScoreSnapshot($submission);
                    $processed++;
                } catch (\Throwable $e) {
                    $failed++;
                    $this->error("Submission #{$submission->id}: {$e->getMessage()}");
                }
            }

            $this->info("Processed {$processed} submission(s)" . ($failed ? ", {$failed} failed" : '') . '...');
        });

        $this->info("Done. Updated {$processed} submission(s)" . ($failed ? ", {$failed} failed" : '') . '.');

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}

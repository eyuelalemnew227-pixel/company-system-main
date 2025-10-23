<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PowerBiRawController extends Controller
{
    /** @var array<string> */
    private array $allowedTables = [
        'branches',
        'departments',
        'employees',
        'positions',
        'evaluations',
        'evaluation_periods',
        'evaluation_responses',
        'evaluation_types',
        'question_groups',
        'question_responses',
        'evaluates_groups',
        'questions',
        'fiscal_months',
        'fiscal_years',
        'evaluator_groups',
        'question_group_question',
        'users',
        // add more if needed
    ];

    public function index()
    {
        return response()->json([
            'tables' => $this->allowedTables,
        ]);
    }

    public function table(Request $request, string $table)
    {
        if (!in_array($table, $this->allowedTables, true)) {
            return response()->json(['message' => 'Table not allowed'], 403);
        }

        if (!Schema::hasTable($table)) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $format = strtolower((string) $request->query('format', 'json'));

        // Return all rows, all columns, no pagination and no extra metadata
        $rows = DB::table($table)->get();

        if ($format === 'csv') {
            $columns = Schema::getColumnListing($table);
            $headers = [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'inline; filename="' . $table . '.csv"',
                'Cache-Control' => 'no-store, no-cache, must-revalidate',
            ];

            return response()->stream(function () use ($rows, $columns) {
                $out = fopen('php://output', 'w');
                if ($out === false) {
                    return;
                }
                // Header row
                fputcsv($out, $columns);
                // Data rows
                foreach ($rows as $row) {
                    $line = [];
                    foreach ($columns as $col) {
                        $value = $row->$col ?? null;
                        if (is_bool($value)) {
                            $value = $value ? '1' : '0';
                        } elseif ($value instanceof \DateTimeInterface) {
                            $value = $value->format(DATE_ATOM);
                        } elseif (is_array($value) || is_object($value)) {
                            $value = json_encode($value);
                        }
                        $line[] = $value;
                    }
                    fputcsv($out, $line);
                }
                fclose($out);
            }, 200, $headers);
        }

        return response()->json($rows);
    }
}



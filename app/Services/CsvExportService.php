<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CsvExportService
{
    /**
     * Export data to a CSV file.
     *
     * @param string $filename The name of the file (without .csv extension)
     * @param array $headers The column headers
     * @param Collection|array|\Traversable $data The data to export
     * @param callable $mapRow A closure to map a single row into an array of values
     * @return StreamedResponse
     */
    public function export(string $filename, array $headers, $data, callable $mapRow): StreamedResponse
    {
        $responseHeaders = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'inline; filename="' . $filename . '.csv"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ];

        return response()->stream(function () use ($headers, $data, $mapRow) {
            $out = fopen('php://output', 'w');
            
            if ($out === false) {
                return;
            }

            // Output BOM for UTF-8 Excel compatibility
            fputs($out, "\xEF\xBB\xBF");
            
            // Header row
            fputcsv($out, $headers);
            
            // Data rows
            foreach ($data as $item) {
                fputcsv($out, $mapRow($item));
            }
            
            fclose($out);
        }, 200, $responseHeaders);
    }
}

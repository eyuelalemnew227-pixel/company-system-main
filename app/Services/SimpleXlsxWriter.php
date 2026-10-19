<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class SimpleXlsxWriter
{
    /**
     * Generate an Excel (.xlsx) file and return a StreamedResponse for direct download.
     *
     * @param string $filename Download filename (e.g. "Inspection_Detail.xlsx")
     * @param array $headers List of column header titles
     * @param iterable $rows List of row arrays
     * @param string $sheetName Worksheet title (max 31 characters)
     * @return StreamedResponse
     */
    public function download(string $filename, array $headers, iterable $rows, string $sheetName = 'Submissions'): StreamedResponse
    {
        $tempPath = $this->createXlsxFile($headers, $rows, $sheetName);

        if (!str_ends_with(strtolower($filename), '.xlsx')) {
            $filename .= '.xlsx';
        }

        $basename = basename($filename);
        $asciiFallback = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $basename) ?: 'export.xlsx';
        $asciiFallback = trim(preg_replace('/_+/', '_', $asciiFallback), '_') ?: 'export.xlsx';
        if (!str_ends_with(strtolower($asciiFallback), '.xlsx')) {
            $asciiFallback .= '.xlsx';
        }
        $encodedFilename = rawurlencode($basename);

        $headers = [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$asciiFallback}\"; filename*=UTF-8''{$encodedFilename}",
            'Content-Length' => filesize($tempPath),
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($tempPath) {
            $stream = fopen($tempPath, 'rb');
            if ($stream) {
                fpassthru($stream);
                fclose($stream);
            }
            if (file_exists($tempPath)) {
                @unlink($tempPath);
            }
        }, 200, $headers);
    }

    /**
     * Create OpenXML .xlsx archive in temp directory and return the path.
     */
    public function createXlsxFile(array $headers, iterable $rows, string $sheetName = 'Submissions'): string
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'xlsx_');
        $zip = new ZipArchive();

        if ($zip->open($tempFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException("Unable to create zip archive for Excel workbook.");
        }

        // 1. [Content_Types].xml
        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>');

        // 2. _rels/.rels
        $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>');

        // 3. xl/_rels/workbook.xml.rels
        $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>');

        // 4. xl/workbook.xml
        $safeSheetName = htmlspecialchars(substr(preg_replace('/[\\\\\/*?:\[\]]/', '', $sheetName) ?: 'Submissions', 0, 31), ENT_XML1, 'UTF-8');
        $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets>
        <sheet name="' . $safeSheetName . '" sheetId="1" r:id="rId1"/>
    </sheets>
</workbook>');

        // 5. xl/styles.xml (Professional theme: Amber-900 header, clean grid borders)
        $zip->addFromString('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <fonts count="2">
        <font><sz val="10"/><name val="Segoe UI"/></font>
        <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>
    </fonts>
    <fills count="3">
        <fill><patternFill patternType="none"/></fill>
        <fill><patternFill patternType="gray125"/></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FF78350F"/></patternFill></fill>
    </fills>
    <borders count="2">
        <border><left/><right/><top/><bottom/></border>
        <border>
            <left style="thin"><color rgb="FFE2E8F0"/></left>
            <right style="thin"><color rgb="FFE2E8F0"/></right>
            <top style="thin"><color rgb="FFE2E8F0"/></top>
            <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
        </border>
    </borders>
    <cellStyleXfs count="1">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
    </cellStyleXfs>
    <cellXfs count="2">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
        <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    </cellXfs>
</styleSheet>');

        // 6. xl/worksheets/sheet1.xml
        $sheetXml = $this->buildSheetXml($headers, $rows);
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheetXml);

        $zip->close();

        return $tempFile;
    }

    /**
     * Construct sheet1.xml with custom column widths, styled header, and inline strings/numbers.
     */
    protected function buildSheetXml(array $headers, iterable $rows): string
    {
        // Pre-compute column widths based on content
        $colWidths = [];
        foreach ($headers as $cIdx => $h) {
            $colWidths[$cIdx] = max(12, min(55, mb_strlen((string)$h) + 4));
        }

        // Buffer row XML
        $rowsXml = '';
        $rowNum = 2;

        foreach ($rows as $row) {
            $rowsXml .= '        <row r="' . $rowNum . '">' . "\n";
            $colIdx = 0;
            foreach ($row as $val) {
                $ref = $this->getColLetter($colIdx) . $rowNum;
                $strVal = (string)$val;

                if (isset($colWidths[$colIdx])) {
                    $len = mb_strlen($strVal);
                    if ($len > 0) {
                        $colWidths[$colIdx] = max($colWidths[$colIdx], min(55, $len + 3));
                    }
                }

                // If strictly numeric without leading zero (except 0 itself) and not overly long
                if (is_numeric($strVal) && !preg_match('/^0[0-9]/', $strVal) && strlen($strVal) <= 12) {
                    $rowsXml .= '            <c r="' . $ref . '" s="0"><v>' . $strVal . '</v></c>' . "\n";
                } else {
                    $escaped = htmlspecialchars($strVal, ENT_XML1 | ENT_SUBSTITUTE, 'UTF-8');
                    $rowsXml .= '            <c r="' . $ref . '" s="0" t="inlineStr"><is><t>' . $escaped . '</t></is></c>' . "\n";
                }
                $colIdx++;
            }
            $rowsXml .= '        </row>' . "\n";
            $rowNum++;
        }

        // Build XML
        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n";
        $xml .= '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' . "\n";

        // Column widths
        $xml .= '    <cols>' . "\n";
        foreach ($colWidths as $cIdx => $w) {
            $xml .= '        <col min="' . ($cIdx + 1) . '" max="' . ($cIdx + 1) . '" width="' . $w . '" customWidth="1"/>' . "\n";
        }
        $xml .= '    </cols>' . "\n";

        $xml .= '    <sheetData>' . "\n";

        // Header row (Row 1, style 1)
        $xml .= '        <row r="1" ht="26" customHeight="1">' . "\n";
        foreach ($headers as $cIdx => $h) {
            $ref = $this->getColLetter($cIdx) . '1';
            $escaped = htmlspecialchars((string)$h, ENT_XML1 | ENT_SUBSTITUTE, 'UTF-8');
            $xml .= '            <c r="' . $ref . '" s="1" t="inlineStr"><is><t>' . $escaped . '</t></is></c>' . "\n";
        }
        $xml .= '        </row>' . "\n";

        $xml .= $rowsXml;

        $xml .= '    </sheetData>' . "\n";
        $xml .= '</worksheet>';

        return $xml;
    }

    /**
     * Convert 0-indexed column integer to Excel column letter (0 => A, 25 => Z, 26 => AA).
     */
    protected function getColLetter(int $colIdx): string
    {
        $letter = '';
        while ($colIdx >= 0) {
            $letter = chr($colIdx % 26 + 65) . $letter;
            $colIdx = intval($colIdx / 26) - 1;
        }
        return $letter;
    }
}

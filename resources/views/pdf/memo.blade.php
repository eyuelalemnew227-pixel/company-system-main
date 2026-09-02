<!DOCTYPE html>
<html>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <meta charset="utf-8">
    <title>Internal Memorandum - {{ $memo->memo_id }}</title>
    <style>
        @php
            $storageFontPath = str_replace('\\', '/', storage_path('fonts/NotoSansEthiopic-Regular.ttf'));
        @endphp

        @font-face {
            font-family: 'Noto Sans Ethiopic';
            font-style: normal;
            font-weight: 400;
            src: url('{{ $storageFontPath }}') format('truetype');
        }
        @font-face {
            font-family: 'Noto Sans Ethiopic';
            font-style: normal;
            font-weight: 700;
            src: url('{{ $storageFontPath }}') format('truetype');
        }
        @font-face {
            font-family: 'Noto Sans Ethiopic';
            font-style: italic;
            font-weight: 400;
            src: url('{{ $storageFontPath }}') format('truetype');
        }
        @font-face {
            font-family: 'Noto Sans Ethiopic';
            font-style: italic;
            font-weight: 700;
            src: url('{{ $storageFontPath }}') format('truetype');
        }
        @font-face {
            font-family: 'Noto Sans Ethiopic';
            font-style: oblique;
            font-weight: 400;
            src: url('{{ $storageFontPath }}') format('truetype');
        }
        @font-face {
            font-family: 'Noto Sans Ethiopic';
            font-style: oblique;
            font-weight: 700;
            src: url('{{ $storageFontPath }}') format('truetype');
        }

        @if (!empty($fontBase64))
        @font-face {
            font-family: 'Noto Sans Ethiopic';
            font-style: normal;
            font-weight: 400;
            src: url(data:font/truetype;charset=utf-8;base64,{{ $fontBase64 }}) format('truetype');
        }
        @font-face {
            font-family: 'Noto Sans Ethiopic';
            font-style: normal;
            font-weight: 700;
            src: url(data:font/truetype;charset=utf-8;base64,{{ $fontBase64 }}) format('truetype');
        }
        @font-face {
            font-family: 'Noto Sans Ethiopic';
            font-style: italic;
            font-weight: 400;
            src: url(data:font/truetype;charset=utf-8;base64,{{ $fontBase64 }}) format('truetype');
        }
        @font-face {
            font-family: 'Noto Sans Ethiopic';
            font-style: italic;
            font-weight: 700;
            src: url(data:font/truetype;charset=utf-8;base64,{{ $fontBase64 }}) format('truetype');
        }
        @endif

        * {
            font-family: 'Noto Sans Ethiopic', 'DejaVu Sans', sans-serif !important;
        }
        @page {
            margin: 40px 45px;
        }
        body {
            font-family: 'Noto Sans Ethiopic', 'DejaVu Sans', sans-serif;
            color: #1e293b;
            line-height: 1.6;
            font-size: 13px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #78350f;
            padding-bottom: 15px;
            margin-bottom: 25px;
        }
        .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #451a03;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
        }
        .doc-title {
            font-size: 16px;
            font-weight: bold;
            color: #334155;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-top: 5px;
            margin-bottom: 0;
        }
        .meta-box {
            background-color: #fef3c7;
            border-left: 4px solid #b45309;
            padding: 12px 16px;
            margin-bottom: 25px;
            border-radius: 4px;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
        }
        .meta-table td {
            padding: 4px 8px;
            vertical-align: top;
            font-size: 12px;
        }
        .meta-label {
            font-weight: bold;
            color: #78350f;
            width: 100px;
        }
        .meta-value {
            color: #0f172a;
            font-weight: 500;
        }
        .meta-ref {
            font-family: 'Courier', monospace;
            font-weight: bold;
            color: #92400e;
        }
        .meta-divider {
            border-top: 1px solid #fde68a;
        }
        .content-body {
            min-height: 300px;
            padding: 10px 0;
            color: #1e293b;
            font-size: 13px;
            line-height: 1.7;
        }
        .content-body p {
            margin-bottom: 10px;
        }
        .signature-container {
            margin-top: 40px;
            float: right;
            width: 250px;
            text-align: center;
        }
        .signature-img {
            max-height: 70px;
            max-width: 200px;
            margin-bottom: 5px;
        }
        .typed-signature {
            font-family: 'Noto Sans Ethiopic', 'DejaVu Sans', serif;
            font-style: italic;
            font-size: 20px;
            color: #78350f;
            padding: 8px 0;
        }
        .signature-line {
            border-bottom: 2px solid #0f172a;
            margin: 5px auto 8px auto;
            width: 180px;
        }
        .sender-name {
            font-weight: bold;
            font-size: 13px;
            color: #0f172a;
        }
        .sender-position {
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
            margin-top: 2px;
        }
        .footer {
            position: fixed;
            bottom: 0px;
            left: 0px;
            right: 0px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
        }
        .header-logo {
            height: 40px;
            width: 40px;
            border-radius: 50%;
            margin-bottom: 4px;
        }
    </style>
</head>
<body>

    <div class="header">
        @if (!empty($companyLogo))
            <img src="{{ $companyLogo }}" class="header-logo" alt="Kaldi's Coffee Logo" />
        @endif
        <h1 class="company-name">{{ $companyName }}</h1>
        <h2 class="doc-title">INTERNAL MEMORANDUM</h2>
    </div>

    <div class="meta-box">
        <table class="meta-table">
            <tr>
                <td class="meta-label">MEMO REF:</td>
                <td class="meta-value meta-ref">{{ $memo->memo_id }}</td>
                <td class="meta-label">DATE:</td>
                <td class="meta-value">{{ $memoDateStr }}</td>
            </tr>
            <tr class="meta-divider">
                <td class="meta-label">TO:</td>
                <td class="meta-value">{{ $memo->recipient_name }}</td>
                <td class="meta-label">FROM:</td>
                <td class="meta-value">{{ $memo->sender_name }}</td>
            </tr>
            <tr class="meta-divider">
                <td class="meta-label">SUBJECT:</td>
                <td class="meta-value" colspan="3" style="font-weight: bold; text-decoration: underline;">{{ $memo->title }}</td>
            </tr>
        </table>
    </div>

    <div class="content-body">
        {!! $contentHtml !!}
    </div>

    <div class="signature-container">
        @if ($memo->signature_type === 'drawn' && !empty($memo->signature_data))
            <img src="{{ $memo->signature_data }}" class="signature-img" alt="Signature" />
        @else
            <div class="typed-signature">{{ $memo->signature_data ?: $memo->sender_name }}</div>
        @endif
        <div class="signature-line"></div>
        <div class="sender-name">{{ $memo->sender_name }}</div>
        @if (!empty($memo->sender_position))
            <div class="sender-position">{{ $memo->sender_position }}</div>
        @endif
    </div>

    <div class="footer">
        Generated by Kaldi's Coffee System on {{ now()->format('d/m/Y \a\t H:i:s') }}
    </div>

</body>
</html>

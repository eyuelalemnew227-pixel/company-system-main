<!DOCTYPE html>
<html>

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <meta charset="utf-8">
    <title>Branch Orders Export</title>
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

        * {
            font-family: 'Noto Sans Ethiopic', 'DejaVu Sans', sans-serif !important;
        }

        body {
            font-family: 'Noto Sans Ethiopic', 'DejaVu Sans', sans-serif;
            font-size: 11px;
            margin: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }

        .header h1 {
            margin: 0;
            font-size: 20px;
            color: #333;
        }

        .header p {
            margin: 5px 0;
            color: #666;
            font-size: 11px;
        }

        .summary {
            display: table;
            width: 100%;
            margin-bottom: 15px;
            border: 1px solid #ddd;
            background-color: #f9f9f9;
        }

        .summary-row {
            display: table-row;
        }

        .summary-cell {
            display: table-cell;
            padding: 8px;
            text-align: center;
            border-right: 1px solid #ddd;
        }

        .summary-cell:last-child {
            border-right: none;
        }

        .summary-label {
            font-weight: bold;
            color: #666;
            font-size: 10px;
            display: block;
        }

        .summary-value {
            font-size: 16px;
            color: #333;
            font-weight: bold;
            display: block;
            margin-top: 3px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        th {
            background-color: #333;
            color: white;
            padding: 10px 6px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
        }

        td {
            padding: 8px 6px;
            border-bottom: 1px solid #ddd;
            font-size: 10px;
        }

        tr:nth-child(even) {
            background-color: #f9f9f9;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 7px;
            font-weight: bold;
        }

        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>{{ $branchName }} - Branch Orders</h1>
        <p>Export Date: {{ $exportDate }}</p>
    </div>

    <div class="summary">
        <div class="summary-row">
            <div class="summary-cell">
                <span class="summary-label">Total Orders</span>
                <span class="summary-value">{{ $totalOrders }}</span>
            </div>
            <div class="summary-cell">
                <span class="summary-label">Total Amount</span>
                <span class="summary-value">{{ number_format((float) $totalAmount, 2) }} ETB</span>
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 10%;">Order #</th>
                <th style="width: 20%;">Name</th>
                <th style="width: 12%;">Phone</th>
                <th style="width: 12%;">Order Type</th>
                <th style="width: 12%;">Collection Day</th>
                <th style="width: 22%;">Products</th>
                <th style="width: 12%;" class="text-right">Amount</th>
                <th style="width: 8%;" class="text-center">Collected?</th>
            </tr>
        </thead>
        <tbody>
            @forelse($orders as $order)
                @php
                    $orderTypeName = $order->orderType->name ?? 'Unknown';
                    $isShegerGebeta = !in_array($orderTypeName, ['Walkin Customer', 'Walk-in Customer']);
                @endphp
                <tr>
                    <td>{{ $order->order_number }}</td>
                    <td>{{ $order->client_name }}</td>
                    <td>{{ $order->phone_number }}</td>
                    <td>
                        @if($isShegerGebeta)
                            Sheger Gebeta
                        @else
                            Walk-in Customer
                        @endif
                    </td>
                    <td>{{ $order->collectionDay->name ?? '-' }}</td>
                    <td>
                        @foreach($order->items as $item)
                            {{ $item->product->product_name ?? 'Unknown' }} ({{ $item->quantity }})@if(!$loop->last), @endif
                        @endforeach
                    </td>
                    <td class="text-right">ETB {{ number_format((float) $order->total_amount, 2) }}</td>
                    <td class="text-center" style="border: 1px solid #333; background-color: white;">
                        <!-- Empty checkbox for manual marking -->
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" class="text-center">No orders found</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        <p>Generated by Branch Orders Management System - {{ now()->format('Y') }}</p>
    </div>
</body>

</html>
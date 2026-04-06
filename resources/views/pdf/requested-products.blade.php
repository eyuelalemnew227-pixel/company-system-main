<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    @php $isSparePart = $ticket->productRequests->first()?->spare_part_id !== null; @endphp
    <title>{{ $isSparePart ? 'Requested Spare Parts' : 'Requested Products' }} - Ticket #{{ $ticket->id }}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #333;
            line-height: 1.5;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }

        .ticket-info {
            margin-bottom: 20px;
        }

        .ticket-info table {
            width: 100%;
        }

        .ticket-info td {
            padding: 5px;
        }

        .label {
            font-weight: bold;
            color: #666;
            width: 150px;
        }

        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .products-table th,
        .products-table td {
            border: 1px solid #eee;
            padding: 12px 15px;
            text-align: left;
        }

        .products-table th {
            background-color: #f9f9f9;
            font-weight: bold;
            color: #444;
            text-transform: uppercase;
            font-size: 12px;
        }

        .products-table td {
            font-size: 13px;
        }

        .category-row {
            background-color: #fcfcfc;
            font-weight: bold;
            color: black;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .quantity {
            text-align: right;
            font-family: 'Courier', monospace;
            font-weight: bold;
        }

        .footer {
            margin-top: 50px;
            font-size: 10px;
            color: #999;
            text-align: center;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>{{ $isSparePart ? 'Requested Spare Parts' : 'Requested Products' }}</h1>
        <p>Ticket #{{ $ticket->id }}</p>
    </div>

    <div class="ticket-info">
        <table>
            <tr>
                <td class="label">Requestor Branch:</td>
                <td>{{ $ticket->requestorBranch?->name ?? 'N/A' }}</td>
                <td class="label">Date:</td>
                <td>{{ $ticket->created_at->format('M d, Y H:i') }}</td>
            </tr>
            <tr>
                <td class="label">Requestor:</td>
                <td>{{ $ticket->requestor_full_name }}</td>
                @if($ticket->ticket_main_category_id != 22)
                    <td class="label">Sub Category:</td>
                    <td>{{ $ticket->subCategory?->name ?? $ticket->sub_category?->name ?? 'N/A' }}</td>
                @endif
            </tr>
        </table>
    </div>

    <table class="products-table">
        <thead>
            <tr>
                <th style="width: 35%">Category</th>
                <th>Product</th>
                <th style="text-align: right; width: 15%">Qty</th>
            </tr>
        </thead>
        <tbody>
            @php
                $isSparePart = $ticket->productRequests->first()?->spare_part_id !== null;
                $grouped = $ticket->productRequests->groupBy(function ($item) use ($isSparePart) {
                    if ($isSparePart) {
                        return $item->sparePart->category->name ?? 'Uncategorized';
                    }
                    return $item->product->childCategory->child_name ?? 'Uncategorized';
                });
            @endphp

            @foreach($grouped as $category => $requests)
                @foreach($requests as $index => $req)
                    <tr>
                        @if($index === 0)
                            <td rowspan="{{ $requests->count() }}" class="category-row">
                                {{ $category }}
                            </td>
                        @endif
                        <td>
                            @if($isSparePart)
                                {{ $req->sparePart->name ?? 'Unknown' }}
                                @if($req->sparePart->article_code)
                                    <br><small style="color: #666">Code: {{ $req->sparePart->article_code }}</small>
                                @endif
                            @else
                                {{ $req->product->product_name ?? 'Unknown' }}
                            @endif
                        </td>
                        <td class="quantity">{{ $req->quantity }} {{ $req->uom }}</td>
                    </tr>
                @endforeach
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        <p>Generated on {{ now()->format('M d, Y H:i') }} | Kaldis Coffee Company System</p>
    </div>
</body>

</html>
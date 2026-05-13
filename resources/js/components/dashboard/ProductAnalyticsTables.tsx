import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ─── Types ───────────────────────────────────────────────────────────────────

export type OrderTypeInfo = { id: number; name: string };

export type ProductByOrderTypeData = {
    orderTypes: OrderTypeInfo[];
    rows: Record<string, any>[];
};

export type ProductByChannelData = {
    channels: Record<string, string>; // e.g. { tr: 'TR Order', telegram: 'Telegram Bot', ... }
    rows: Record<string, any>[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) { return n > 0 ? n.toLocaleString() : '-'; }
function fmtAmt(n: number) { return n > 0 ? `ETB ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'; }

// ─── Product × Order Type Table ──────────────────────────────────────────────

function ProductByOrderTypeTable({ data }: { data: ProductByOrderTypeData }) {
    if (!data?.rows?.length) return null;

    const rows = data.rows;
    const types = data.orderTypes;

    // Column totals
    const colQtyTotals = types.map(t => rows.reduce((s, r) => s + (r[`qty_${t.id}`] || 0), 0));
    const colAmtTotals = types.map(t => rows.reduce((s, r) => s + (r[`amount_${t.id}`] || 0), 0));
    const grandQty = rows.reduce((s, r) => s + (r.total_qty || 0), 0);
    const grandAmt = rows.reduce((s, r) => s + (r.total_amount || 0), 0);

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Product Sales by Order Type</CardTitle>
                <CardDescription>Confirmed (Paid / Collected) sales — quantity and revenue per order type</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            {/* Group header */}
                            <TableRow>
                                <TableHead rowSpan={2} className="font-bold align-bottom sticky left-0 bg-muted z-10 w-auto min-w-[160px]">
                                    Product
                                </TableHead>
                                {types.map(t => (
                                    <TableHead key={t.id} colSpan={2} className="text-center font-bold border-l whitespace-normal break-words">
                                        {t.name}
                                    </TableHead>
                                ))}
                                <TableHead colSpan={2} className="text-center font-bold border-l bg-muted/30">
                                    Total
                                </TableHead>
                            </TableRow>
                            {/* Sub-header */}
                            <TableRow>
                                {types.map(t => (
                                    <>
                                        <TableHead key={`qty-${t.id}`} className="text-center text-xs border-l">Qty</TableHead>
                                        <TableHead key={`amt-${t.id}`} className="text-center text-xs">Amount</TableHead>
                                    </>
                                ))}
                                <TableHead className="text-center text-xs border-l bg-muted/20">Qty</TableHead>
                                <TableHead className="text-center text-xs bg-muted/20">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row, i) => (
                                <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium sticky left-0 bg-background border-r">{row.name}</TableCell>
                                    {types.map(t => (
                                        <>
                                            <TableCell key={`qty-${t.id}`} className="text-center text-sm border-l">
                                                <span className={row[`qty_${t.id}`] > 0 ? 'font-semibold text-primary' : 'text-muted-foreground/40'}>{fmt(row[`qty_${t.id}`])}</span>
                                            </TableCell>
                                            <TableCell key={`amt-${t.id}`} className="text-center text-sm">
                                                <span className={row[`amount_${t.id}`] > 0 ? 'text-emerald-700' : 'text-muted-foreground/40'}>{fmtAmt(row[`amount_${t.id}`])}</span>
                                            </TableCell>
                                        </>
                                    ))}
                                    <TableCell className="text-center font-bold border-l bg-muted/10">{fmt(row.total_qty)}</TableCell>
                                    <TableCell className="text-center font-bold bg-muted/10">{fmtAmt(row.total_amount)}</TableCell>
                                </TableRow>
                            ))}
                            {/* Totals row */}
                            <TableRow className="bg-muted/40 border-t-2 border-primary/20">
                                <TableCell className="font-bold sticky left-0 bg-muted/40 border-r text-sm uppercase tracking-wide">Total</TableCell>
                                {types.map((t, i) => (
                                    <>
                                        <TableCell key={`tqty-${t.id}`} className="text-center font-bold text-primary border-l">{fmt(colQtyTotals[i])}</TableCell>
                                        <TableCell key={`tamt-${t.id}`} className="text-center font-bold text-emerald-700">{fmtAmt(colAmtTotals[i])}</TableCell>
                                    </>
                                ))}
                                <TableCell className="text-center font-bold text-primary border-l bg-primary/10">{fmt(grandQty)}</TableCell>
                                <TableCell className="text-center font-bold text-emerald-700 bg-primary/10">{fmtAmt(grandAmt)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Product × Channel Table ─────────────────────────────────────────────────

function ProductByChannelTable({ data }: { data: ProductByChannelData }) {
    if (!data?.rows?.length) return null;

    const rows = data.rows;
    const channelKeys = Object.keys(data.channels);
    const channelLabels = data.channels;

    const colQtyTotals = channelKeys.map(ch => rows.reduce((s, r) => s + (r[`qty_${ch}`] || 0), 0));
    const colAmtTotals = channelKeys.map(ch => rows.reduce((s, r) => s + (r[`amount_${ch}`] || 0), 0));
    const grandQty = rows.reduce((s, r) => s + (r.total_qty || 0), 0);
    const grandAmt = rows.reduce((s, r) => s + (r.total_amount || 0), 0);

    const channelColors: Record<string, string> = {
        tr: 'text-blue-700',
        telegram: 'text-violet-700',
        walkin: 'text-orange-700',
        other: 'text-gray-500',
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Product Sales by Channel</CardTitle>
                <CardDescription>TR Order · Telegram Bot · Walk-in · Other — quantity and revenue per channel</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead rowSpan={2} className="font-bold align-bottom sticky left-0 bg-muted z-10 w-auto min-w-[160px]">
                                    Product
                                </TableHead>
                                {channelKeys.map(ch => (
                                    <TableHead key={ch} colSpan={2} className={`text-center font-bold border-l whitespace-nowrap ${channelColors[ch] ?? ''}`}>
                                        {channelLabels[ch]}
                                    </TableHead>
                                ))}
                                <TableHead colSpan={2} className="text-center font-bold border-l bg-muted/30">
                                    Total
                                </TableHead>
                            </TableRow>
                            <TableRow>
                                {channelKeys.map(ch => (
                                    <>
                                        <TableHead key={`qty-${ch}`} className="text-center text-xs border-l">Qty</TableHead>
                                        <TableHead key={`amt-${ch}`} className="text-center text-xs">Amount</TableHead>
                                    </>
                                ))}
                                <TableHead className="text-center text-xs border-l bg-muted/20">Qty</TableHead>
                                <TableHead className="text-center text-xs bg-muted/20">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row, i) => (
                                <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium sticky left-0 bg-background border-r">{row.name}</TableCell>
                                    {channelKeys.map(ch => (
                                        <>
                                            <TableCell key={`qty-${ch}`} className="text-center text-sm border-l">
                                                <span className={row[`qty_${ch}`] > 0 ? `font-semibold ${channelColors[ch]}` : 'text-muted-foreground/40'}>{fmt(row[`qty_${ch}`])}</span>
                                            </TableCell>
                                            <TableCell key={`amt-${ch}`} className="text-center text-sm">
                                                <span className={row[`amount_${ch}`] > 0 ? 'text-emerald-700' : 'text-muted-foreground/40'}>{fmtAmt(row[`amount_${ch}`])}</span>
                                            </TableCell>
                                        </>
                                    ))}
                                    <TableCell className="text-center font-bold border-l bg-muted/10">{fmt(row.total_qty)}</TableCell>
                                    <TableCell className="text-center font-bold bg-muted/10">{fmtAmt(row.total_amount)}</TableCell>
                                </TableRow>
                            ))}
                            {/* Totals row */}
                            <TableRow className="bg-muted/40 border-t-2 border-primary/20">
                                <TableCell className="font-bold sticky left-0 bg-muted/40 border-r text-sm uppercase tracking-wide">Total</TableCell>
                                {channelKeys.map((ch, i) => (
                                    <>
                                        <TableCell key={`tqty-${ch}`} className={`text-center font-bold border-l ${channelColors[ch]}`}>{fmt(colQtyTotals[i])}</TableCell>
                                        <TableCell key={`tamt-${ch}`} className="text-center font-bold text-emerald-700">{fmtAmt(colAmtTotals[i])}</TableCell>
                                    </>
                                ))}
                                <TableCell className="text-center font-bold text-primary border-l bg-primary/10">{fmt(grandQty)}</TableCell>
                                <TableCell className="text-center font-bold text-emerald-700 bg-primary/10">{fmtAmt(grandAmt)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Export combined component ────────────────────────────────────────────────

type Props = {
    productByOrderType: ProductByOrderTypeData;
    productByChannel: ProductByChannelData;
};

export default function ProductAnalyticsTables({ productByOrderType, productByChannel }: Props) {
    return (
        <div className="space-y-6">
            <ProductByOrderTypeTable data={productByOrderType} />
            <ProductByChannelTable data={productByChannel} />
        </div>
    );
}

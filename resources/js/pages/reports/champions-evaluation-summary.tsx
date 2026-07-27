import React from 'react'
import EvaluationTabsLayout from './components/evaluation-tabs-layout'
import { Head } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

type PageProps = {
    rows: Array<{
        evaluator_id: number | string
        evaluator_branch: string
        evaluator_name: string
        [key: string]: string | number | null
    }>
    championNames: string[]
    branches: { id: number; name: string }[]
    periods: { id: number; evaluation_period_name: string }[]
    request?: { branch_id?: string; period_id?: string }
}

export default function ChampionsEvaluationSummaryPage({ rows, championNames, branches, periods, request }: PageProps) {
    const [branchId, setBranchId] = React.useState<string>(request?.branch_id ?? '')
    const [periodId, setPeriodId] = React.useState<string>(request?.period_id ?? (periods.length > 0 ? String(periods[0].id) : ''))
    const [championFilter, setChampionFilter] = React.useState<string>('')
    const [modalOpen, setModalOpen] = React.useState(false)
    const [selectedDetails, setSelectedDetails] = React.useState<any>(null)
    const [loadingDetails, setLoadingDetails] = React.useState(false)

    const openDetails = async (evaluatorId: string, evaluatorName: string, championName: string, row: any) => {
        if (row[championName] === null || row[championName] === '-') return

        setLoadingDetails(true)
        setModalOpen(true)
        setSelectedDetails(null)

        try {
            const params = new URLSearchParams({
                evaluator_id: evaluatorId,
                champion_name: championName,
                period_id: periodId
            })
            const res = await fetch(`/reports/champions-evaluation-summary/details?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || `Server returned ${res.status}`)
            }

            setSelectedDetails({
                evaluateeName: championName,
                evaluatorName: evaluatorName,
                responses: data.responses
            })
        } catch (err: any) {
            console.error('Failed to fetch evaluation details:', err)
            setSelectedDetails({
                evaluateeName: championName,
                evaluatorName: evaluatorName,
                error: err.message
            })
        } finally {
            setLoadingDetails(false)
        }
    }

    const buildQuery = () => {
        const params = new URLSearchParams()
        if (branchId && branchId !== 'all') params.set('branch_id', branchId)
        if (periodId) params.set('period_id', periodId)
        const s = params.toString()
        return s ? `?${s}` : ''
    }

    const applyFilters = () => {
        window.location.href = `/reports/champions-evaluation-summary${buildQuery()}`
    }

    const visibleChampionNames = React.useMemo(() => {
        if (!championFilter || championFilter === 'all') {
            return championNames
        }
        return championNames.filter((name: string) => name === championFilter)
    }, [championNames, championFilter])

    const calcColumnAverage = React.useCallback((columnName: string) => {
        const values = rows
            .map((r) => r[columnName])
            .filter((v: any) => v !== null && v !== undefined)
            .map((v: any) => Number(v))
            .filter((n: number) => !Number.isNaN(n))

        if (values.length === 0) return ''
        const sum = values.reduce((acc: number, n: number) => acc + n, 0)
        const avg = sum / values.length
        const percentage = ((avg / 5) * 100).toFixed(2)
        return <span className="font-bold text-blue-600">{percentage}%</span>
    }, [rows])

    return (
        <EvaluationTabsLayout activeTab="champions" title="Champions Evaluation" breadcrumbs={[]}>
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Search & Filter</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 items-end flex-wrap">
                            <div className="w-56">
                                <label className="text-sm font-medium mb-2 block">Evaluator Branch</label>
                                <Select value={branchId || 'all'} onValueChange={setBranchId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-56">
                                <label className="text-sm font-medium mb-2 block">Period</label>
                                <Select value={periodId || 'all'} onValueChange={setPeriodId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {periods.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>{p.evaluation_period_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-56">
                                <label className="text-sm font-medium mb-2 block">Champion Columns</label>
                                <Select value={championFilter || 'all'} onValueChange={(v) => setChampionFilter(v === 'all' ? '' : v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Champions" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Champions</SelectItem>
                                        {championNames.map((name: string) => (
                                            <SelectItem key={name} value={name}>{name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button variant="outline" onClick={applyFilters}>Apply Filters</Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const params = new URLSearchParams()
                                    if (branchId) params.set('branch_id', branchId)
                                    if (periodId) params.set('period_id', periodId)
                                    if (visibleChampionNames.length > 0 && visibleChampionNames.length < championNames.length) {
                                        params.set('columns', visibleChampionNames.join(','))
                                    }
                                    window.location.href = `/reports/champions-evaluation-summary/export${params.toString() ? `?${params.toString()}` : ''}`
                                }}
                            >
                                Export CSV
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-500 dark:bg-slate-700 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="font-bold text-white">Evaluator Branch</TableHead>
                                    <TableHead className="font-bold text-white">Evaluator Name</TableHead>
                                    {visibleChampionNames.map((name: string) => (
                                        <TableHead key={name} className="font-bold text-white text-center" title={`Champion: ${name}`}>
                                            {name}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Top row for Column Averages */}
                                {rows.length > 0 && (
                                    <TableRow className="bg-slate-200 dark:bg-slate-900 sticky top-[48px] z-10 border-b-2">
                                        <TableCell colSpan={2} className="font-bold text-left pl-4">
                                            Final Result (100%)
                                        </TableCell>
                                        {visibleChampionNames.map((name: string) => (
                                            <TableCell key={name} className="text-center">
                                                {calcColumnAverage(name)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                )}
                                {(() => {
                                    const spans: { branch: number[] } = { branch: [] }
                                    const rs = rows
                                    let i = 0
                                    while (i < rs.length) {
                                        const branch = rs[i].evaluator_branch ?? ''
                                        let j = i
                                        while (j < rs.length && (rs[j].evaluator_branch ?? '') === branch) j++
                                        spans.branch[i] = j - i
                                        i = j
                                    }

                                    return rs.map((r, idx) => (
                                        <TableRow key={idx} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                                            {spans.branch[idx] ? (
                                                <TableCell rowSpan={spans.branch[idx]}>{r.evaluator_branch}</TableCell>
                                            ) : null}
                                            <TableCell className="font-medium">
                                                {r.evaluator_name}
                                            </TableCell>
                                            {visibleChampionNames.map((name: string) => (
                                                <TableCell key={name} className="text-center">
                                                    {r[name] !== null && r[name] !== undefined ? (
                                                        <button
                                                            onClick={() => openDetails(String(r.evaluator_id), String(r.evaluator_name), name, r)}
                                                            className="text-blue-600 hover:underline font-medium focus:outline-none"
                                                        >
                                                            {r[name]}
                                                        </button>
                                                    ) : '-'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                })()}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Evaluation Details</DialogTitle>
                    </DialogHeader>
                    {loadingDetails ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                        </div>
                    ) : selectedDetails ? (
                        selectedDetails.error ? (
                            <div className="text-red-500 py-4">Error: {selectedDetails.error}</div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-600 dark:text-slate-400">Evaluatee (Champion):</span>
                                        <Badge variant="outline">{selectedDetails.evaluateeName}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-600 dark:text-slate-400">Evaluator:</span>
                                        <Badge variant="secondary">{selectedDetails.evaluatorName}</Badge>
                                    </div>
                                </div>

                                {selectedDetails.responses && selectedDetails.responses.length > 0 ? (
                                    <div className="space-y-6">
                                        {selectedDetails.responses.map((resp: any, i: number) => (
                                            <div key={i} className="border rounded-lg p-4">
                                                <h4 className="font-bold mb-3 border-b pb-2">Questions & Scores</h4>
                                                <div className="space-y-3">
                                                    {resp.questions.map((q: any, j: number) => (
                                                        <div key={j} className="flex justify-between items-start gap-4">
                                                            <div className="flex-1 text-sm">{q.text}</div>
                                                            <Badge className={
                                                                q.score >= 4 ? 'bg-green-500' :
                                                                    q.score <= 2 ? 'bg-red-500' :
                                                                        'bg-yellow-500'
                                                            }>
                                                                {q.score}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-500 py-8">No detailed responses found.</div>
                                )}
                            </div>
                        )
                    ) : null}
                </DialogContent>
            </Dialog>
        </EvaluationTabsLayout>
    )
}

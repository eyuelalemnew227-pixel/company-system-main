import React from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { BreadcrumbItem } from '@/types'

type PageProps = {
  rows: Array<{
    employee_id: number
    department_id: number
    department: string
    employee_name: string
    [key: string]: string | number | null
  }>
  evaluationNames: string[]
  branches: { id: number; name: string }[]
  departments: { id: number; name: string }[]
  periods: { id: number; evaluation_period_name: string }[]
  request?: { branch_id?: string; department_id?: string; period_id?: string }
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Evaluation Summary', href: '/reports/evaluation-summary' }];

export default function EvaluationSummaryPage({ rows, evaluationNames, branches, departments, periods, request }: PageProps) {
  const [branchId, setBranchId] = React.useState<string>(request?.branch_id ?? '')
  const [departmentId, setDepartmentId] = React.useState<string>(request?.department_id ?? '')
  const [periodId, setPeriodId] = React.useState<string>(request?.period_id ?? (periods.length > 0 ? String(periods[0].id) : ''))
  const [visible, setVisible] = React.useState<Record<string, boolean>>(
    () => evaluationNames.reduce((acc, name) => { acc[name] = true; return acc }, {} as Record<string, boolean>)
  )
  const [modalOpen, setModalOpen] = React.useState(false)
  const [selectedDetails, setSelectedDetails] = React.useState<any>(null)
  const [loadingDetails, setLoadingDetails] = React.useState(false)

  const buildQuery = () => {
    const params = new URLSearchParams()
    if (branchId) params.set('branch_id', branchId)
    if (departmentId) params.set('department_id', departmentId)
    if (periodId) params.set('period_id', periodId)
    const s = params.toString()
    return s ? `?${s}` : ''
  }

  const applyFilters = () => {
    window.location.href = `/reports/evaluation-summary${buildQuery()}`
  }

  const toggleColumn = (name: string) => {
    setVisible((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const visibleEvalNames = React.useMemo(() => evaluationNames.filter(n => visible[n]), [evaluationNames, visible])

  const calcOverall = React.useCallback((r: Record<string, any>) => {
    const values = visibleEvalNames
      .map((name) => r[name])
      .filter((v) => v !== null && v !== undefined)
      .map((v) => Number(v))
      .filter((n) => !Number.isNaN(n))
    if (values.length === 0) return '-'
    const sum = values.reduce((acc, n) => acc + n, 0)
    return (sum / values.length).toFixed(2)
  }, [visibleEvalNames])

  const openDetails = async (evalName: string, row: any) => {
    if (row[evalName] === null || row[evalName] === '-') return

    setLoadingDetails(true)
    setModalOpen(true)
    setSelectedDetails(null)

    try {
      const params = new URLSearchParams({
        evaluation_name: evalName,
        employee_id: String(row.employee_id),
        department_id: String(row.department_id),
        period_id: periodId
      })
      const res = await fetch(`/reports/evaluation-summary/details?${params.toString()}`, {
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
        evaluationName: evalName,
        employeeName: row.employee_name,
        department: row.department,
        responses: data.responses
      })
    } catch (err: any) {
      console.error('Failed to fetch evaluation details:', err)
      setSelectedDetails({
        evaluationName: evalName,
        employeeName: row.employee_name,
        department: row.department,
        error: err.message
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Evaluation Summary" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end flex-wrap">
              <div className="w-56">
                <label className="text-sm font-medium mb-2 block">Branch</label>
                <Select value={branchId || 'all'} onValueChange={(v) => setBranchId(v === 'all' ? '' : v)}>
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
                <label className="text-sm font-medium mb-2 block">Department</label>
                <Select value={departmentId || 'all'} onValueChange={(v) => setDepartmentId(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-56">
                <label className="text-sm font-medium mb-2 block">Period</label>
                <Select value={periodId || 'all'} onValueChange={(v) => setPeriodId(v === 'all' ? '' : v)}>
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
              <Button variant="outline" onClick={applyFilters}>Apply Filters</Button>
              <Button
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams()
                  if (branchId) params.set('branch_id', branchId)
                  if (departmentId) params.set('department_id', departmentId)
                  if (periodId) params.set('period_id', periodId)
                  const selected = evaluationNames.filter(n => visible[n])
                  if (selected.length > 0 && selected.length < evaluationNames.length) {
                    params.set('columns', selected.join(','))
                  }
                  window.location.href = `/reports/evaluation-summary/export${params.toString() ? `?${params.toString()}` : ''}`
                }}
              >
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Columns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              {evaluationNames.map((name) => (
                <label key={name} className="inline-flex items-center gap-2 text-sm">
                  <Checkbox checked={!!visible[name]} onCheckedChange={() => toggleColumn(name)} />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-500 dark:bg-slate-700">
                <TableRow>
                  <TableHead className="font-bold text-white">Department</TableHead>
                  <TableHead className="font-bold text-white">Employee Name</TableHead>
                  {visibleEvalNames.map((name) => (
                    <TableHead key={name} className="font-bold text-white text-center">{name}</TableHead>
                  ))}
                  <TableHead className="font-bold text-white text-center">Overall Avg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // compute rowspans for department only
                  const spans: { department: number[] } = { department: [] }
                  const rs = rows
                  let i = 0
                  while (i < rs.length) {
                    const dept = rs[i].department ?? ''
                    let j = i
                    while (j < rs.length && (rs[j].department ?? '') === dept) j++
                    spans.department[i] = j - i
                    i = j
                  }

                  return rs.map((r, idx) => (
                    <TableRow key={idx} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                      {spans.department[idx] ? (
                        <TableCell rowSpan={spans.department[idx]}>{r.department}</TableCell>
                      ) : null}
                      <TableCell>{r.employee_name}</TableCell>
                      {visibleEvalNames.map((name) => (
                        <TableCell key={name} className="text-center">
                          {r[name] !== null && r[name] !== undefined ? (
                            <button 
                              onClick={() => openDetails(name, r)}
                              className="text-blue-600 hover:underline font-medium focus:outline-none"
                            >
                              {r[name]}
                            </button>
                          ) : '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">{calcOverall(r)}</TableCell>
                    </TableRow>
                  ))
                })()}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Evaluation Details: {selectedDetails?.evaluationName}
              </DialogTitle>
              <div className="text-sm text-muted-foreground">
                Target: {selectedDetails?.employeeName} ({selectedDetails?.department})
              </div>
            </DialogHeader>

            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading evaluation details...</p>
              </div>
            ) : selectedDetails?.error ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-destructive border border-destructive/20 bg-destructive/5 rounded-lg">
                <p className="font-medium">Error loading details</p>
                <p className="text-sm">{selectedDetails.error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedDetails?.responses && selectedDetails.responses.length > 0 ? (
                  selectedDetails.responses.map((resp: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          Evaluator: {resp.evaluator}
                        </span>
                        <Badge variant="secondary">
                          Avg Score: {resp.questions.length > 0 
                            ? (resp.questions.reduce((acc: number, q: any) => acc + q.score, 0) / resp.questions.length).toFixed(2) 
                            : '0.00'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {resp.questions.map((q: any, qIdx: number) => (
                          <div key={qIdx} className="flex justify-between items-start gap-4 text-sm bg-white dark:bg-slate-800 p-2 rounded shadow-sm">
                            <span className="flex-1">{q.text}</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                              Score: {q.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    No individual responses found for this evaluation.
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}



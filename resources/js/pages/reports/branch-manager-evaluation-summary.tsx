import React from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

type PageProps = {
  rows: Array<{
    branch: string
    manager_name: string
    [key: string]: string | number | null
  }>
  departmentNames: string[]
  branches: { id: number; name: string }[]
  periods: { id: number; evaluation_period_name: string }[]
  request?: { branch_id?: string; period_id?: string }
}

export default function BranchManagerEvaluationSummaryPage({ rows, departmentNames, branches, periods, request }: PageProps) {
  const [branchId, setBranchId] = React.useState<string>(request?.branch_id ?? '')
  const [periodId, setPeriodId] = React.useState<string>(request?.period_id ?? (periods.length > 0 ? String(periods[0].id) : ''))
  const [departmentFilter, setDepartmentFilter] = React.useState<string>('')
  const [selectedManager, setSelectedManager] = React.useState<any>(null)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [evaluationDetails, setEvaluationDetails] = React.useState<any>(null)

  const buildQuery = () => {
    const params = new URLSearchParams()
    if (branchId && branchId !== 'all') params.set('branch_id', branchId)
    if (periodId) params.set('period_id', periodId)
    const s = params.toString()
    return s ? `?${s}` : ''
  }

  const applyFilters = () => {
    window.location.href = `/reports/branch-manager-evaluation-summary${buildQuery()}`
  }

  const visibleDeptNames = React.useMemo(() => {
    if (!departmentFilter || departmentFilter === 'all') {
      return departmentNames
    }
    return departmentNames.filter(name => name === departmentFilter)
  }, [departmentNames, departmentFilter])

  const calcOverall = React.useCallback((r: Record<string, any>) => {
    const values = visibleDeptNames
      .map((name) => r[name])
      .filter((v) => v !== null && v !== undefined)
      .map((v) => Number(v))
      .filter((n) => !Number.isNaN(n))

    if (values.length === 0) return ''
    const sum = values.reduce((acc, n) => acc + n, 0)
    const avg = sum / values.length
    const percentage = ((avg / 5) * 100).toFixed(2)
    return <span className="font-bold text-blue-600">{percentage}%</span>
  }, [visibleDeptNames])

  const handleManagerClick = async (manager: any) => {
    setSelectedManager(manager)
    setModalOpen(true)
    setLoading(true)
    setEvaluationDetails(null)

    try {
      const params = new URLSearchParams()
      params.set('employee_id', manager.employee_id)
      if (periodId) params.set('period_id', periodId)

      const response = await fetch(`/reports/branch-manager-evaluation-summary/details?${params.toString()}`)
      const data = await response.json()
      setEvaluationDetails(data)
    } catch (error) {
      console.error('Failed to fetch evaluation details:', error)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedManager(null)
    setEvaluationDetails(null)
  }

  return (
    <AppLayout breadcrumbs={[{ title: 'Branch Managers Evaluation Summary', href: '/reports/branch-manager-evaluation-summary' }]}>
      <Head title="Branch Managers Evaluation Summary" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end flex-wrap">
              <div className="w-56">
                <label className="text-sm font-medium mb-2 block">Branch</label>
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
              <Button variant="outline" onClick={applyFilters}>Apply Filters</Button>
              <Button
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams()
                  if (branchId) params.set('branch_id', branchId)
                  if (periodId) params.set('period_id', periodId)
                  if (visibleDeptNames.length > 0 && visibleDeptNames.length < departmentNames.length) {
                    params.set('columns', visibleDeptNames.join(','))
                  }
                  window.location.href = `/reports/branch-manager-evaluation-summary/export${params.toString() ? `?${params.toString()}` : ''}`
                }}
              >
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filter Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-56">
              <Select value={departmentFilter || 'all'} onValueChange={(v) => setDepartmentFilter(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departmentNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-500 dark:bg-slate-700 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-bold text-white">Branch</TableHead>
                  <TableHead className="font-bold text-white">Manager Name</TableHead>
                  {visibleDeptNames.map((name) => (
                    <TableHead key={name} className="font-bold text-white text-center">{name}</TableHead>
                  ))}
                  <TableHead className="font-bold text-white text-center">Final Result (100%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const spans: { branch: number[] } = { branch: [] }
                  const rs = rows
                  let i = 0
                  while (i < rs.length) {
                    const branch = rs[i].branch ?? ''
                    let j = i
                    while (j < rs.length && (rs[j].branch ?? '') === branch) j++
                    spans.branch[i] = j - i
                    i = j
                  }

                  return rs.map((r, idx) => (
                    <TableRow key={idx} className="odd:bg-slate-100 dark:odd:bg-slate-800">
                      {spans.branch[idx] ? (
                        <TableCell rowSpan={spans.branch[idx]}>{r.branch}</TableCell>
                      ) : null}
                      <TableCell>
                        <button
                          onClick={() => handleManagerClick(r)}
                          className="group inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all duration-200 font-medium relative"
                        >
                          <span className="relative">
                            {r.manager_name}
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 dark:bg-blue-400 group-hover:w-full transition-all duration-300"></span>
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-200"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      </TableCell>
                      {visibleDeptNames.map((name) => (
                        <TableCell key={name} className="text-center">{r[name] ?? '-'}</TableCell>
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
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedManager?.manager_name} - Evaluation Details
              </DialogTitle>
            </DialogHeader>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading evaluation details...</div>
              </div>
            )}

            {!loading && evaluationDetails && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div>
                    <span className="text-sm font-semibold">Branch:</span>
                    <span className="ml-2">{selectedManager?.branch}</span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Overall Average:</span>
                    <span className="ml-2">{evaluationDetails.overall_average}</span>
                  </div>
                </div>

                {evaluationDetails.by_department?.map((dept: any) => (
                  <Card key={dept.department_name}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{dept.department_name}</span>
                        <Badge variant="outline">Score: {dept.average_score}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {dept.evaluations.map((evaluation: any, idx: number) => (
                          <div key={idx} className="border-b pb-4 last:border-b-0">
                            <div className="text-sm font-semibold mb-2">
                              Evaluator: {evaluation.evaluator_name}
                            </div>
                            <div className="space-y-2">
                              {evaluation.questions.map((q: any) => (
                                <div key={q.question_id} className="flex justify-between items-start gap-4 text-sm">
                                  <span className="flex-1">{q.question_text}</span>
                                  <Badge variant="secondary">{q.score}</Badge>
                                </div>
                              ))}
                              {evaluation.comment && (
                                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded text-sm">
                                  <span className="font-semibold">Comment: </span>
                                  {evaluation.comment}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(!evaluationDetails.by_department || evaluationDetails.by_department.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No evaluation details available
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

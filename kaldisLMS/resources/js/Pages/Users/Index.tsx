import * as React from 'react'
import { Head, router, useForm } from '@inertiajs/react'
import {
  Users as UsersIcon, Plus, Search, Download, Pencil, Ban,
  CheckCircle2, XCircle, Shield, UserPlus, Check, X,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState, StatCard } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Avatar, AvatarFallback } from '@/Components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/Components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/Components/ui/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { StringKey } from '@/lib/i18n'

interface UserRow {
  id: string; name: string; email: string; status: string; lastLogin: string | null; createdAt: string
  roleId: string; role: { id: string; name: string; slug: string; isSystem: boolean } | null
  employee: {
    id: string; employeeNumber: string; position: string | null; phone: string | null; hireDate: string | null
    status: string; totalPoints: number; firstName: string; lastName: string
    branch: { id: string; name: string } | null; department: { id: string; name: string } | null
  } | null
}
interface Option { id: string; name: string; branch_id?: string }
interface PendingRegistration {
  id: string; firstName: string; lastName: string; email: string; phone: string | null
  branch: string | null; createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  suspended: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  locked: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?'
}
function fmtDateTime(d: string | null, t: (k: StringKey) => string) {
  if (!d) return t('user.never')
  const diff = Date.now() - new Date(d).getTime()
  if (diff < 60000) return t('user.justNow')
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function UsersIndex({
  users, roles, branches, departments, filters, can, pendingRegistrations,
}: {
  users: UserRow[]
  roles: Option[]
  branches: Option[]
  departments: Option[]
  filters: { search?: string; roleId?: string; branchId?: string; status?: string }
  can: { create: boolean; edit: boolean; delete: boolean; approve: boolean }
  pendingRegistrations: PendingRegistration[]
}) {
  const { t } = useI18n()
  const [search, setSearch] = React.useState(filters.search || '')
  const [roleFilter, setRoleFilter] = React.useState(filters.roleId || 'all')
  const [branchFilter, setBranchFilter] = React.useState(filters.branchId || 'all')
  const [statusFilter, setStatusFilter] = React.useState(filters.status || 'all')
  const [addOpen, setAddOpen] = React.useState(false)
  const [editUser, setEditUser] = React.useState<UserRow | null>(null)
  const [deactivateUser, setDeactivateUser] = React.useState<UserRow | null>(null)

  function applyFilters(overrides: Record<string, string> = {}) {
    const p = { search, roleId: roleFilter, branchId: branchFilter, status: statusFilter, ...overrides }
    const query: Record<string, string> = {}
    if (p.search.trim()) query.search = p.search.trim()
    if (p.roleId !== 'all') query.roleId = p.roleId
    if (p.branchId !== 'all') query.branchId = p.branchId
    if (p.status !== 'all') query.status = p.status
    router.get('/users', query, { preserveState: true, replace: true })
  }

  React.useEffect(() => {
    const id = setTimeout(() => applyFilters(), 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const activeCount = users.filter((r) => r.status === 'active').length
  const suspendedCount = users.filter((r) => r.status === 'suspended').length

  function exportCsv() {
    const header = ['Name', 'Email', 'Employee #', 'Role', 'Branch', 'Department', 'Position', 'Phone', 'Status', 'Last Login']
    const lines = [header.join(',')]
    for (const r of users) {
      const cells = [r.name, r.email, r.employee?.employeeNumber || '', r.role?.name || '', r.employee?.branch?.name || '', r.employee?.department?.name || '', r.employee?.position || '', r.employee?.phone || '', r.status, r.lastLogin || '']
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      lines.push(cells.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kaldi-users-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(t('user.exportedToast').replace('{count}', String(users.length)))
  }

  function handleDeactivate() {
    if (!deactivateUser) return
    router.delete(`/users/${deactivateUser.id}`, {
      onSuccess: () => setDeactivateUser(null),
      onError: () => toast.error(t('user.couldNotDeactivate')),
    })
  }

  function approveRegistration(id: string) {
    router.post(`/users/pending/${id}/approve`, {}, { onError: () => toast.error(t('user.couldNotApprove')) })
  }

  function rejectRegistration(id: string) {
    router.post(`/users/pending/${id}/reject`, {}, { onError: () => toast.error(t('user.couldNotReject')) })
  }

  return (
    <AppLayout>
      <Head title={t('user.title')} />
      <div className="space-y-5">
        <ModuleHeader
          title={t('user.title')}
          description={t('user.subtitle')}
          icon={UsersIcon}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!users.length}><Download className="h-4 w-4 mr-1.5" /> {t('common.export')}</Button>
              {can.create && <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> {t('user.add')}</Button>}
            </>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label={t('user.totalUsers')} value={users.length} icon={UsersIcon} color="primary" />
          <StatCard label={t('user.active')} value={activeCount} icon={CheckCircle2} color="green" />
          <StatCard label={t('user.suspended')} value={suspendedCount} icon={XCircle} color="red" />
          <StatCard label={t('user.roles')} value={roles.length} icon={Shield} color="amber" />
        </div>

        {can.approve && pendingRegistrations.length > 0 && (
          <Card className="border-amber-500/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-amber-600" />
                <h2 className="font-semibold text-sm">{t('user.pendingRegistrations')} ({pendingRegistrations.length})</h2>
              </div>
              <div className="space-y-2">
                {pendingRegistrations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium">{r.firstName} {r.lastName}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.email}{r.phone ? ` · ${r.phone}` : ''}{r.branch ? ` · ${r.branch}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => approveRegistration(r.id)}>
                        <Check className="h-4 w-4" /> {t('user.approveAction')}
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => rejectRegistration(r.id)}>
                        <X className="h-4 w-4" /> {t('user.rejectAction')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('user.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); applyFilters({ roleId: v }) }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder={t('user.role')} /></SelectTrigger>
                  <SelectContent><SelectItem value="all">{t('user.allRoles')}</SelectItem>{roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v); applyFilters({ branchId: v }) }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('user.branch')} /></SelectTrigger>
                  <SelectContent><SelectItem value="all">{t('user.allBranches')}</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); applyFilters({ status: v }) }}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder={t('common.status')} /></SelectTrigger>
                  <SelectContent><SelectItem value="all">{t('user.allStatuses')}</SelectItem><SelectItem value="active">{t('user.active')}</SelectItem><SelectItem value="suspended">{t('user.suspended')}</SelectItem><SelectItem value="locked">{t('user.locked')}</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            {users.length === 0 ? (
              <EmptyState icon={UsersIcon} title={t('user.noneFound')} description={t('user.tryAdjusting')} />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>{t('user.colUser')}</TableHead><TableHead>{t('user.role')}</TableHead><TableHead>{t('user.colBranchDept')}</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('user.colLastLogin')}</TableHead><TableHead className="text-right">{t('common.actions')}</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(u.name)}</AvatarFallback></Avatar>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{u.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{u.role?.name || '—'}</Badge></TableCell>
                        <TableCell className="text-sm">
                          {u.employee ? <>{u.employee.branch?.name || '—'}{u.employee.department && <span className="text-muted-foreground"> · {u.employee.department.name}</span>}</> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell><Badge variant="outline" className={cn('capitalize', STATUS_COLORS[u.status])}>{u.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDateTime(u.lastLogin, t)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {can.edit && <Button size="sm" variant="ghost" onClick={() => setEditUser(u)}><Pencil className="h-4 w-4" /></Button>}
                            {can.delete && u.status !== 'suspended' && <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeactivateUser(u)}><Ban className="h-4 w-4" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {addOpen && <UserFormDialog roles={roles} branches={branches} departments={departments} onClose={() => setAddOpen(false)} />}
        {editUser && <UserFormDialog roles={roles} branches={branches} departments={departments} editing={editUser} onClose={() => setEditUser(null)} />}

        <AlertDialog open={!!deactivateUser} onOpenChange={(o) => !o && setDeactivateUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('user.deactivateTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('user.deactivateDesc').replace('{name}', deactivateUser?.name || '')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-white hover:bg-destructive/90">{t('user.deactivateBtn')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  )
}

function UserFormDialog({
  roles, branches, departments, editing, onClose,
}: {
  roles: Option[]
  branches: Option[]
  departments: Option[]
  editing?: UserRow
  onClose: () => void
}) {
  const { t } = useI18n()
  const isEdit = !!editing
  const { data, setData, post, put, processing } = useForm({
    name: editing?.name || '', email: editing?.email || '', password: '',
    role_id: editing?.roleId || '', status: editing?.status || 'active',
    employee_number: editing?.employee?.employeeNumber || '', branch_id: editing?.employee?.branch?.id || '',
    department_id: editing?.employee?.department?.id || '', position: editing?.employee?.position || '', phone: editing?.employee?.phone || '',
  })

  const filteredDepartments = departments.filter((d) => !data.branch_id || d.branch_id === data.branch_id)

  function handleSubmit() {
    if (!data.name.trim() || !data.email.trim()) { toast.error(t('user.nameEmailRequired')); return }
    if (!isEdit && !data.password.trim()) { toast.error(t('user.passwordRequired')); return }
    if (!data.role_id) { toast.error(t('user.selectRoleRequired')); return }

    const options = { onError: () => toast.error(t('user.couldNotSave')), onSuccess: onClose }
    if (isEdit) put(`/users/${editing!.id}`, options)
    else post('/users', options)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('user.dialogEditTitle') : t('user.dialogAddTitle')}</DialogTitle>
          <DialogDescription>{isEdit ? t('user.dialogEditDesc') : t('user.dialogAddDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="u-name">{t('user.fullName')}</Label><Input id="u-name" value={data.name} onChange={(e) => setData('name', e.target.value)} /></div>
            <div><Label htmlFor="u-email">{t('user.emailLabel')}</Label><Input id="u-email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="u-pass">{isEdit ? t('user.newPasswordOptional') : t('auth.password')}</Label>
              <Input id="u-pass" type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} placeholder={isEdit ? t('user.leaveBlank') : ''} />
            </div>
            <div>
              <Label>{t('user.role')}</Label>
              <Select value={data.role_id} onValueChange={(v) => setData('role_id', v)}>
                <SelectTrigger><SelectValue placeholder={t('user.selectRole')} /></SelectTrigger>
                <SelectContent>{roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {isEdit && (
            <div>
              <Label>{t('common.status')}</Label>
              <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">{t('user.active')}</SelectItem><SelectItem value="suspended">{t('user.suspended')}</SelectItem><SelectItem value="locked">{t('user.locked')}</SelectItem></SelectContent>
              </Select>
            </div>
          )}
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('user.employeeProfileOptional')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="u-empnum">{t('user.employeeNumber')}</Label><Input id="u-empnum" value={data.employee_number} onChange={(e) => setData('employee_number', e.target.value)} placeholder="KC-0001" /></div>
              <div><Label htmlFor="u-position">{t('user.position')}</Label><Input id="u-position" value={data.position} onChange={(e) => setData('position', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label>{t('user.branch')}</Label>
                <Select value={data.branch_id || 'none'} onValueChange={(v) => setData('branch_id', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('user.none')} /></SelectTrigger>
                  <SelectContent><SelectItem value="none">{t('user.none')}</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('user.department')}</Label>
                <Select value={data.department_id || 'none'} onValueChange={(v) => setData('department_id', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('user.none')} /></SelectTrigger>
                  <SelectContent><SelectItem value="none">{t('user.none')}</SelectItem>{filteredDepartments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3"><Label htmlFor="u-phone">{t('user.phone')}</Label><Input id="u-phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
          <Button onClick={handleSubmit} disabled={processing}>{processing ? t('user.saving') : isEdit ? t('settings.save') : t('user.createUser')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import * as React from 'react'
import { Head, useForm } from '@inertiajs/react'
import { Building2, Plus, Pencil, MapPin, Phone, Users as UsersIcon, Layers } from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState, StatCard } from '@/Components/lms/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/Components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface DeptRow { id: string; name: string; code: string; status: string; employeeCount: number }
interface BranchRow {
  id: string; name: string; code: string; address: string | null; city: string | null; region: string | null
  phone: string | null; status: string; employeeCount: number; departmentCount: number; departments: DeptRow[]
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  inactive: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
}

export default function BranchesIndex({ branches }: { branches: BranchRow[] }) {
  const { t } = useI18n()
  const [selectedId, setSelectedId] = React.useState<string | null>(branches[0]?.id ?? null)
  const [addBranchOpen, setAddBranchOpen] = React.useState(false)
  const [editBranch, setEditBranch] = React.useState<BranchRow | null>(null)
  const [addDeptOpen, setAddDeptOpen] = React.useState(false)

  const selected = branches.find((b) => b.id === selectedId) || null
  const totalEmployees = branches.reduce((s, b) => s + b.employeeCount, 0)
  const totalDepartments = branches.reduce((s, b) => s + b.departmentCount, 0)

  return (
    <AppLayout>
      <Head title={t('nav.branches')} />
      <div className="space-y-5">
        <ModuleHeader
          title={t('branch.title')}
          description={t('branch.subtitle')}
          icon={Building2}
          actions={<Button size="sm" onClick={() => setAddBranchOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> {t('branch.add')}</Button>}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label={t('branch.branches')} value={branches.length} icon={Building2} color="primary" />
          <StatCard label={t('branch.departments')} value={totalDepartments} icon={Layers} color="amber" />
          <StatCard label={t('dash.totalEmployees')} value={totalEmployees} icon={UsersIcon} color="green" />
          <StatCard label={t('user.active')} value={branches.filter((b) => b.status === 'active').length} icon={Building2} color="primary" />
        </div>

        {branches.length === 0 ? (
          <EmptyState icon={Building2} title={t('branch.noneYet')} description={t('branch.addFirst')} action={<Button onClick={() => setAddBranchOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> {t('branch.add')}</Button>} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              {branches.map((b) => (
                <button key={b.id} onClick={() => setSelectedId(b.id)} className={cn('w-full text-left p-3 rounded-lg border transition-colors', selectedId === b.id ? 'border-primary bg-primary/5' : 'hover:bg-accent/40')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{b.name}</span>
                    <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[b.status])}>{b.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{b.code}{b.city && ` · ${b.city}`}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3" /> {b.employeeCount}</span>
                    <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {b.departmentCount}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2">
              {!selected ? (
                <Card><CardContent className="py-10"><EmptyState icon={Building2} title={t('branch.noneSelected')} /></CardContent></Card>
              ) : (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">{selected.name} <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[selected.status])}>{selected.status}</Badge></CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">{t('branch.codeField')}: {selected.code}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditBranch(selected)}><Pencil className="h-3.5 w-3.5 mr-1" /> {t('common.edit')}</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-sm">
                      {selected.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {selected.address}{selected.city && `, ${selected.city}`}{selected.region && `, ${selected.region}`}</div>}
                      {selected.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {selected.phone}</div>}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> {t('branch.departments')} ({selected.departments.length})</CardTitle>
                        <Button size="sm" variant="outline" onClick={() => setAddDeptOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> {t('branch.addDepartment')}</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selected.departments.length === 0 ? (
                        <EmptyState icon={Layers} title={t('branch.noDepartments')} description={t('branch.addDeptDesc')} />
                      ) : (
                        <div className="divide-y">
                          {selected.departments.map((d) => (
                            <div key={d.id} className="flex items-center justify-between py-2.5">
                              <div>
                                <div className="text-sm font-medium">{d.name}</div>
                                <div className="text-xs text-muted-foreground">{d.code}</div>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">{d.employeeCount} {t('branch.employeesLabel')}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {addBranchOpen && <BranchFormDialog onClose={() => setAddBranchOpen(false)} />}
        {editBranch && <BranchFormDialog editing={editBranch} onClose={() => setEditBranch(null)} />}
        {addDeptOpen && selected && <DepartmentFormDialog branchId={selected.id} onClose={() => setAddDeptOpen(false)} />}
      </div>
    </AppLayout>
  )
}

function BranchFormDialog({ editing, onClose }: { editing?: BranchRow; onClose: () => void }) {
  const { t } = useI18n()
  const isEdit = !!editing
  const { data, setData, post, put, processing } = useForm({
    name: editing?.name || '', code: editing?.code || '', address: editing?.address || '',
    city: editing?.city || '', region: editing?.region || '', phone: editing?.phone || '',
  })

  function handleSubmit() {
    if (!data.name.trim() || !data.code.trim()) { toast.error(t('branch.nameCodeRequired')); return }
    const options = { onSuccess: onClose, onError: () => toast.error(t('branch.couldNotSave')) }
    if (isEdit) put(`/branches/${editing!.id}`, options)
    else post('/branches', options)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('branch.editBranch') : t('branch.add')}</DialogTitle>
          <DialogDescription>{isEdit ? t('branch.updateDesc') : t('branch.createDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="b-name">{t('role.name')}</Label><Input id="b-name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Bole Headquarters" /></div>
            <div><Label htmlFor="b-code">{t('branch.codeField')}</Label><Input id="b-code" value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="HQ-BOLE" /></div>
          </div>
          <div><Label htmlFor="b-address">{t('branch.address')}</Label><Input id="b-address" value={data.address} onChange={(e) => setData('address', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="b-city">{t('branch.city')}</Label><Input id="b-city" value={data.city} onChange={(e) => setData('city', e.target.value)} /></div>
            <div><Label htmlFor="b-region">{t('branch.region')}</Label><Input id="b-region" value={data.region} onChange={(e) => setData('region', e.target.value)} /></div>
          </div>
          <div><Label htmlFor="b-phone">{t('user.phone')}</Label><Input id="b-phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
          <Button onClick={handleSubmit} disabled={processing}>{processing ? t('user.saving') : isEdit ? t('settings.save') : t('branch.createBranch')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DepartmentFormDialog({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const { t } = useI18n()
  const { data, setData, post, processing } = useForm({ name: '', code: '' })

  function handleSubmit() {
    if (!data.name.trim() || !data.code.trim()) { toast.error(t('branch.nameCodeRequired')); return }
    post(`/branches/${branchId}/departments`, { onSuccess: onClose, onError: () => toast.error(t('branch.couldNotCreateDept')) })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('branch.addDepartment')}</DialogTitle>
          <DialogDescription>{t('branch.addDeptDialogDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="d-name">{t('role.name')}</Label><Input id="d-name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Barista Team" /></div>
          <div><Label htmlFor="d-code">{t('branch.codeField')}</Label><Input id="d-code" value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="BAR" /></div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
          <Button onClick={handleSubmit} disabled={processing}>{processing ? t('role.creating') : t('branch.createDepartment')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

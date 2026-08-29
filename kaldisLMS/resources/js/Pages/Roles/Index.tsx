import * as React from 'react'
import { Head, useForm } from '@inertiajs/react'
import axios from 'axios'
import { Shield, Plus, Users as UsersIcon, Lock, Check } from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Switch } from '@/Components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/Components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface RoleRow {
  id: string; name: string; slug: string; description: string | null; isSystem: boolean
  createdAt: string; userCount: number; permissionCount: number; totalPermissions: number; permissions: string[]
}
interface PermissionItem { slug: string; name: string; description: string | null }

export default function RolesIndex({
  roles, totalPermissions, permissionCatalog, canManage,
}: {
  roles: RoleRow[]
  totalPermissions: number
  permissionCatalog: Record<string, PermissionItem[]>
  canManage: boolean
}) {
  const { t } = useI18n()
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(roles[0]?.id ?? null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [localRoles, setLocalRoles] = React.useState(roles)

  React.useEffect(() => setLocalRoles(roles), [roles])

  const selectedRole = localRoles.find((r) => r.id === selectedRoleId) || null
  const isAdminRole = selectedRole?.slug === 'admin'

  async function togglePermission(slug: string, currentlyGranted: boolean) {
    if (!selectedRole || isAdminRole) return
    try {
      await axios.put(`/roles/${selectedRole.id}/permissions`, { permission_slug: slug, granted: !currentlyGranted })
      setLocalRoles((prev) => prev.map((r) => {
        if (r.id !== selectedRole.id) return r
        const next = currentlyGranted ? r.permissions.filter((p) => p !== slug) : [...r.permissions, slug]
        return { ...r, permissions: next, permissionCount: next.length }
      }))
    } catch {
      toast.error(t('role.couldNotUpdatePermission'))
    }
  }

  return (
    <AppLayout>
      <Head title={t('nav.roles')} />
      <div className="space-y-5">
        <ModuleHeader
          title={t('nav.roles')}
          description={t('role.subtitle')}
          icon={Shield}
          actions={canManage ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> {t('role.newRole')}</Button> : undefined}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            {localRoles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id)}
                className={cn('w-full text-left p-3 rounded-lg border transition-colors', selectedRoleId === r.id ? 'border-primary bg-primary/5' : 'hover:bg-accent/40')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-medium text-sm truncate">{r.name}</span>
                    {r.isSystem && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{r.permissionCount}/{r.totalPermissions}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description || '—'}</p>
                <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground"><UsersIcon className="h-3 w-3" /> {r.userCount} {t('role.usersLabel')}</div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {!selectedRole ? (
              <Card><CardContent className="py-10"><EmptyState icon={Shield} title={t('role.noRoleSelected')} /></CardContent></Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {selectedRole.name}
                    {selectedRole.isSystem && <Badge variant="outline" className="text-[10px]">{t('role.systemRole')}</Badge>}
                  </CardTitle>
                  {isAdminRole && <p className="text-xs text-muted-foreground">{t('role.adminWildcardNote')}</p>}
                </CardHeader>
                <CardContent className="space-y-5 max-h-[65vh] overflow-y-auto">
                  {Object.entries(permissionCatalog).map(([module, perms]) => (
                    <div key={module}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{module}</p>
                      <div className="space-y-1.5">
                        {perms.map((p) => {
                          const granted = isAdminRole || selectedRole.permissions.includes(p.slug)
                          return (
                            <div key={p.slug} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-b-0">
                              <div className="min-w-0">
                                <div className="text-sm">{p.name}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{p.slug}</div>
                              </div>
                              {canManage && !isAdminRole ? (
                                <Switch checked={granted} onCheckedChange={() => togglePermission(p.slug, granted)} />
                              ) : (
                                granted ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <span className="h-4 w-4 shrink-0" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {createOpen && <CreateRoleDialog onClose={() => setCreateOpen(false)} />}
      </div>
    </AppLayout>
  )
}

function CreateRoleDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const { data, setData, post, processing } = useForm({ name: '', slug: '', description: '' })

  function handleSubmit() {
    if (!data.name.trim() || !data.slug.trim()) { toast.error(t('role.nameSlugRequired')); return }
    post('/roles', { onSuccess: onClose, onError: () => toast.error(t('role.couldNotCreate')) })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('role.newRole')}</DialogTitle>
          <DialogDescription>{t('role.createRoleDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="r-name">{t('role.name')}</Label><Input id="r-name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="e.g. Regional Auditor" /></div>
          <div><Label htmlFor="r-slug">{t('role.slug')}</Label><Input id="r-slug" value={data.slug} onChange={(e) => setData('slug', e.target.value)} placeholder="regional_auditor" /></div>
          <div><Label htmlFor="r-desc">{t('role.description')}</Label><Textarea id="r-desc" value={data.description} onChange={(e) => setData('description', e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
          <Button onClick={handleSubmit} disabled={processing}>{processing ? t('role.creating') : t('role.createRole')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

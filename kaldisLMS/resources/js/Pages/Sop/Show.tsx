import * as React from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import {
  ShieldCheck, FileText, Pencil, Trash2, CheckCircle2, ChevronLeft,
  PenLine, Users, Percent, Paperclip,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, StatCard, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/Components/ui/tabs'
import { SopFormDialog, AcknowledgeDialog, type SopListItem } from '@/Components/lms/sop-dialogs'
import type { PageProps } from '@/types'

interface SopDetail extends SopListItem {
  status: string
  createdAt: string
  acknowledgedCount: number
  totalEmployees: number
  complianceRate: number
  myAcknowledgement: { id: string; acknowledgedAt: string } | null
  acknowledgements: Array<{ id: string; employeeName: string; employeeNumber: string; branch: string; department: string; acknowledgedAt: string; ipAddress: string | null; digitalSignature: string | null }>
  pending: Array<{ employeeId: string; name: string; employeeNumber: string; branch: string }>
}

export default function SopShow({ sop, canManage, canAcknowledge }: { sop: SopDetail; canManage: boolean; canAcknowledge: boolean }) {
  const { t } = useI18n()
  const { auth } = usePage<PageProps>().props
  const [tab, setTab] = React.useState('overview')
  const [showEdit, setShowEdit] = React.useState(false)
  const [showAck, setShowAck] = React.useState(false)
  const ackedByMe = !!sop.myAcknowledgement

  function handleDelete() {
    if (!confirm(t('sop.archiveConfirm').replace('{title}', sop.title))) return
    router.delete(`/sop/${sop.id}`, { onSuccess: () => router.visit('/sop') })
  }

  return (
    <AppLayout>
      <Head title={sop.title} />
      <div className="space-y-5">
        <ModuleHeader
          title={t('nav.sop')}
          description={t('sop.subtitleShow')}
          icon={ShieldCheck}
          actions={<Button variant="ghost" size="sm" asChild><Link href="/sop"><ChevronLeft className="h-4 w-4 mr-1" /> {t('sop.backToList')}</Link></Button>}
        />

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><FileText className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <CardTitle className="text-lg">{sop.title}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <Badge variant="outline">v{sop.version}</Badge>
                    <Badge variant="secondary">{sop.category}</Badge>
                    {sop.requiresAcknowledgement ? <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">{t('sop.ackRequired')}</Badge> : <Badge variant="outline">{t('sop.optional')}</Badge>}
                    {sop.status === 'archived' && <Badge variant="destructive">{t('sop.archived')}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{t('sop.effectivePrefix')} {sop.effectiveDate ? new Date(sop.effectiveDate).toLocaleDateString() : '—'} · {t('sop.createdPrefix')} {new Date(sop.createdAt).toLocaleDateString()}</p>
                  {sop.filePath && <a href={sop.filePath} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"><Paperclip className="h-3 w-3" /> {t('sop.downloadAttachment')}</a>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canAcknowledge && sop.requiresAcknowledgement && !ackedByMe && sop.status === 'active' && (
                  <Button onClick={() => setShowAck(true)}><PenLine className="h-4 w-4 mr-1" /> {t('sop.acknowledgeBtn')}</Button>
                )}
                {ackedByMe && <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"><CheckCircle2 className="h-3.5 w-3.5 mr-1" />{t('sop.acknowledgedPrefix')} {new Date(sop.myAcknowledgement!.acknowledgedAt).toLocaleDateString()}</Badge>}
                {canManage && (
                  <>
                    <Button variant="outline" onClick={() => setShowEdit(true)}><Pencil className="h-4 w-4 mr-1" /> {t('common.edit')}</Button>
                    <Button variant="outline" onClick={handleDelete}><Trash2 className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <StatCard label={t('dash.totalEmployees')} value={sop.totalEmployees} icon={Users} color="primary" />
          <StatCard label={t('sop.acknowledgedStat')} value={sop.acknowledgedCount} icon={CheckCircle2} color="green" />
          <StatCard label={t('sop.colCompliance')} value={`${sop.complianceRate}%`} icon={Percent} color="amber" />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">{t('sop.tabDocument')}</TabsTrigger>
            {canManage && <TabsTrigger value="acknowledgements">{t('sop.tabAcknowledgements')}</TabsTrigger>}
            {canManage && <TabsTrigger value="pending">{t('sop.pending')} ({sop.pending.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('sop.documentContent')}</CardTitle></CardHeader>
              <CardContent>
                {sop.content ? <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground bg-transparent p-0">{sop.content}</pre> : <EmptyState icon={FileText} title={t('sop.noContentTitle')} description={t('sop.noContentDesc')} />}
              </CardContent>
            </Card>
          </TabsContent>

          {canManage && (
            <TabsContent value="acknowledgements">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{t('sop.ackLogTitle')} ({sop.acknowledgements.length})</CardTitle></CardHeader>
                <CardContent>
                  {sop.acknowledgements.length === 0 ? <EmptyState icon={CheckCircle2} title={t('sop.noAcksYet')} /> : (
                    <div className="overflow-x-auto rounded-md border max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card">
                          <TableRow><TableHead>{t('cert.colEmployee')}</TableHead><TableHead>{t('sop.colEmployeeNum')}</TableHead><TableHead>{t('sop.colBranch')}</TableHead><TableHead>{t('sop.colAckAt')}</TableHead><TableHead>{t('sop.colSignature')}</TableHead><TableHead>{t('sop.colIP')}</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                          {sop.acknowledgements.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">{a.employeeName}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{a.employeeNumber}</TableCell>
                              <TableCell className="text-sm">{a.branch}</TableCell>
                              <TableCell className="text-sm">{new Date(a.acknowledgedAt).toLocaleString()}</TableCell>
                              <TableCell className="text-sm italic" style={{ fontFamily: 'cursive' }}>{a.digitalSignature || '—'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{a.ipAddress || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canManage && (
            <TabsContent value="pending">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('sop.pendingAcksTitle')} ({sop.pending.length})</CardTitle>
                  <CardDescription>{t('sop.pendingAcksDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {sop.pending.length === 0 ? <EmptyState icon={CheckCircle2} title={t('sop.allAckedTitle')} description={t('sop.allAckedDesc')} /> : (
                    <div className="overflow-x-auto rounded-md border max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead>{t('cert.colEmployee')}</TableHead><TableHead>{t('sop.colEmployeeNum')}</TableHead><TableHead>{t('sop.colBranch')}</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {sop.pending.map((p) => (
                            <TableRow key={p.employeeId}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-sm text-muted-foreground">{p.employeeNumber}</TableCell><TableCell className="text-sm">{p.branch}</TableCell></TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {showEdit && <SopFormDialog sop={sop} onClose={() => setShowEdit(false)} onSaved={() => setShowEdit(false)} />}
        {showAck && <AcknowledgeDialog sop={sop} employeeName={auth.user?.name || ''} onClose={() => setShowAck(false)} />}
      </div>
    </AppLayout>
  )
}

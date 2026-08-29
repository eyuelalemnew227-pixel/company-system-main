import * as React from 'react'
import { Head, Link, usePage } from '@inertiajs/react'
import {
  ShieldCheck, FileText, Plus, CheckCircle2, Clock, ScrollText, PenLine,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, StatCard, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Progress } from '@/Components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { SopFormDialog, AcknowledgeDialog, type SopListItem } from '@/Components/lms/sop-dialogs'
import type { PageProps } from '@/types'

interface SopRow extends SopListItem {
  status: string
  createdAt: string
  acknowledgedCount: number
  totalEmployees: number
  complianceRate: number
  myAcknowledgement: { id: string; acknowledgedAt: string } | null
}

export default function SopIndex({ sops, canManage, canAcknowledge }: { sops: SopRow[]; canManage: boolean; canAcknowledge: boolean }) {
  const { t } = useI18n()
  const { auth } = usePage<PageProps>().props
  const [showForm, setShowForm] = React.useState(false)
  const [ackSop, setAckSop] = React.useState<SopRow | null>(null)

  const totalSops = sops.length
  const pendingAck = sops.filter((s) => s.requiresAcknowledgement && !s.myAcknowledgement).length
  const overallCompliance = sops.length ? Math.round(sops.reduce((s, x) => s + x.complianceRate, 0) / sops.length) : 0

  return (
    <AppLayout>
      <Head title={t('nav.sop')} />
      <div className="space-y-5">
        <ModuleHeader
          title={t('nav.sop')}
          description={t('sop.subtitleIndex')}
          icon={ShieldCheck}
          actions={canManage ? <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> {t('sop.add')}</Button> : undefined}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardDescription>{t('sop.overallComplianceRate')}</CardDescription>
              <div className="flex items-end gap-3 mt-1">
                <div className="text-4xl font-bold">{overallCompliance}%</div>
                <div className="text-sm text-muted-foreground mb-1.5">{t('sop.acrossPrefix')} {totalSops} {t('sop.documentsLabel')}</div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={overallCompliance} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {overallCompliance >= 80 ? t('sop.excellentNote') : overallCompliance >= 50 ? t('sop.moderateNote') : t('sop.needsAttentionNote')}
              </p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <StatCard label={t('sop.totalSops')} value={totalSops} icon={ScrollText} color="primary" />
            <StatCard label={t('sop.pendingForYou')} value={pendingAck} icon={Clock} color={pendingAck > 0 ? 'amber' : 'green'} />
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{t('sop.allDocuments')}</CardTitle></CardHeader>
          <CardContent>
            {sops.length === 0 ? (
              <EmptyState icon={FileText} title={t('sop.noneYet')} description={canManage ? t('sop.clickAddFirst') : undefined} action={canManage ? <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> {t('sop.add')}</Button> : undefined} />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('sop.colTitle')}</TableHead><TableHead className="w-24">{t('sop.colVersion')}</TableHead><TableHead className="w-36">{t('sop.colCategory')}</TableHead>
                      <TableHead className="w-32">{t('sop.colEffective')}</TableHead><TableHead className="w-28">{t('sop.colAckRequired')}</TableHead>
                      <TableHead className="w-32">{t('sop.colCompliance')}</TableHead><TableHead className="w-28">{t('sop.colYourStatus')}</TableHead><TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sops.map((s) => (
                      <TableRow key={s.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">
                          <Link href={`/sop/${s.id}`} className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate max-w-[280px]">{s.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{s.acknowledgedCount}/{s.totalEmployees} {t('sop.acknowledgedSuffix')}</div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell><Badge variant="outline">v{s.version}</Badge></TableCell>
                        <TableCell className="text-sm">{s.category}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.effectiveDate ? new Date(s.effectiveDate).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>{s.requiresAcknowledgement ? <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">{t('sop.required')}</Badge> : <Badge variant="outline">{t('sop.optional')}</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={s.complianceRate} className="h-1.5 w-16" />
                            <span className="text-xs text-muted-foreground w-9 text-right">{s.complianceRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {s.requiresAcknowledgement ? (
                            s.myAcknowledgement ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> {t('sop.acked')}</span> : <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"><Clock className="h-3.5 w-3.5" /> {t('sop.pending')}</span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {canAcknowledge && s.requiresAcknowledgement && !s.myAcknowledgement && (
                            <Button size="sm" variant="outline" onClick={() => setAckSop(s)}><PenLine className="h-3.5 w-3.5 mr-1" /> {t('sop.ackBtn')}</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {showForm && <SopFormDialog sop={null} onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} />}
        {ackSop && <AcknowledgeDialog sop={ackSop} employeeName={auth.user?.name || ''} onClose={() => setAckSop(null)} />}
      </div>
    </AppLayout>
  )
}

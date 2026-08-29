import * as React from 'react'
import { Head, router } from '@inertiajs/react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import axios from 'axios'
import {
  Award, Search, Eye, Download, Ban, Sparkles, AlertTriangle,
  Calendar, Hash, FileText, X, CheckCircle2, Clock, Loader2,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, StatCard, EmptyState } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/Components/ui/dialog'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/Components/ui/table'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CertRow {
  id: string; certificateNumber: string; employeeId: string; employeeName: string; employeeNumber: string
  position: string | null; courseId: string; courseTitle: string; issueDate: string; expiryDate: string | null
  isRevoked: boolean; revokedReason: string | null; status: 'valid' | 'expired' | 'revoked'
}

export default function CertificatesIndex({ certificates, isAdmin }: { certificates: CertRow[]; isAdmin: boolean }) {
  const { t } = useI18n()
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [search, setSearch] = React.useState('')
  const [viewing, setViewing] = React.useState<CertRow | null>(null)
  const [revoking, setRevoking] = React.useState<CertRow | null>(null)
  const [issueLoading, setIssueLoading] = React.useState(false)

  function applyFilters(overrides: Record<string, string> = {}) {
    const params: Record<string, string> = { status: statusFilter, search, ...overrides }
    const query: Record<string, string> = {}
    if (params.status !== 'all') query.status = params.status
    if (params.search.trim()) query.search = params.search.trim()
    router.get('/certificates', query, { preserveState: true, replace: true })
  }

  React.useEffect(() => {
    const id = setTimeout(() => applyFilters(), 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function handleIssuePending() {
    setIssueLoading(true)
    router.post('/certificates/issue-pending', {}, {
      onError: () => toast.error(t('cert.couldNotIssue')),
      onFinish: () => setIssueLoading(false),
    })
  }

  const validCount = certificates.filter((c) => c.status === 'valid').length
  const expiredCount = certificates.filter((c) => c.status === 'expired').length
  const revokedCount = certificates.filter((c) => c.status === 'revoked').length

  return (
    <AppLayout>
      <Head title={t('nav.certificates')} />
      <div className="space-y-6">
        <style>{`
          @media print {
            html, body { background: #ffffff !important; }
            body * { visibility: hidden !important; }
            .printable-cert, .printable-cert * { visibility: visible !important; }
            .printable-cert { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0.5in !important; border: none !important; box-shadow: none !important; transform: none !important; z-index: 9999 !important; }
            .no-print { display: none !important; }
            @page { size: landscape; margin: 0.4in; }
          }
        `}</style>

        <ModuleHeader
          title={t('nav.certificates')}
          description={isAdmin ? t('cert.subtitleAdmin') : t('cert.subtitleEmployee')}
          icon={Award}
          actions={isAdmin ? (
            <Button onClick={handleIssuePending} disabled={issueLoading}>
              {issueLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {t('cert.issuePending')}
            </Button>
          ) : undefined}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label={t('cert.total')} value={certificates.length} icon={Award} color="primary" />
          <StatCard label={t('cert.valid')} value={validCount} icon={CheckCircle2} color="green" />
          <StatCard label={t('cert.expired')} value={expiredCount} icon={Clock} color="amber" />
          <StatCard label={t('cert.revoked')} value={revokedCount} icon={Ban} color="red" />
        </div>

        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('cert.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); applyFilters({ status: v }) }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder={t('cert.filterByStatus')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('user.allStatuses')}</SelectItem>
                <SelectItem value="valid">{t('cert.valid')}</SelectItem>
                <SelectItem value="expired">{t('cert.expired')}</SelectItem>
                <SelectItem value="revoked">{t('cert.revoked')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {certificates.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <EmptyState
                icon={Award}
                title={isAdmin ? t('cert.noneFoundAdmin') : t('cert.noneFoundEmployee')}
                description={isAdmin ? t('cert.noneDescAdmin') : t('cert.noneDescEmployee')}
              />
            </CardContent>
          </Card>
        ) : isAdmin ? (
          <AdminCertTable certs={certificates} onView={setViewing} onRevoke={setRevoking} />
        ) : (
          <EmployeeCertGrid certs={certificates} onView={setViewing} />
        )}

        {viewing && <CertificateModal cert={viewing} onClose={() => setViewing(null)} />}
        {revoking && <RevokeDialog cert={revoking} onClose={() => setRevoking(null)} />}
      </div>
    </AppLayout>
  )
}

function AdminCertTable({ certs, onView, onRevoke }: { certs: CertRow[]; onView: (c: CertRow) => void; onRevoke: (c: CertRow) => void }) {
  const { t } = useI18n()
  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>{t('cert.colEmployee')}</TableHead><TableHead>{t('cert.course')}</TableHead><TableHead>{t('cert.colCertNumber')}</TableHead>
                <TableHead>{t('cert.colIssued')}</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><div className="flex flex-col"><span className="font-medium">{c.employeeName}</span>{c.position && <span className="text-[11px] text-muted-foreground">{c.position}</span>}</div></TableCell>
                  <TableCell className="max-w-[200px] truncate" title={c.courseTitle}>{c.courseTitle}</TableCell>
                  <TableCell><code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{c.certificateNumber}</code></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(c.issueDate)}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onView(c)}><Eye className="h-4 w-4" /></Button>
                      {c.status !== 'revoked' && <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onRevoke(c)}><Ban className="h-4 w-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function EmployeeCertGrid({ certs, onView }: { certs: CertRow[]; onView: (c: CertRow) => void }) {
  const { t } = useI18n()
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {certs.map((c) => (
        <Card key={c.id} className={cn('overflow-hidden hover:shadow-md transition-shadow', c.status === 'revoked' && 'opacity-75')}>
          <div className={cn('h-2', c.status === 'valid' && 'bg-emerald-500', c.status === 'expired' && 'bg-amber-500', c.status === 'revoked' && 'bg-destructive')} />
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"><Award className="h-6 w-6 text-amber-600 dark:text-amber-400" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold leading-tight line-clamp-2">{c.courseTitle}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t('cert.issuedPrefix')} {formatDate(c.issueDate)}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="space-y-1.5 text-xs mb-4 bg-muted/50 rounded-md p-3">
              <div className="flex items-center gap-2"><Hash className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">{t('cert.certNumberLabel')}</span><code className="font-mono ml-auto">{c.certificateNumber}</code></div>
              {c.expiryDate && <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">{t('cert.expiresLabel')}</span><span className="ml-auto">{formatDate(c.expiryDate)}</span></div>}
              {c.status === 'revoked' && c.revokedReason && <div className="flex items-start gap-2 pt-1 border-t border-border"><AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" /><span className="text-destructive">{c.revokedReason}</span></div>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onView(c)}><Eye className="mr-1.5 h-3.5 w-3.5" /> {t('cert.view')}</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onView(c)} disabled={c.status === 'revoked'}><Download className="mr-1.5 h-3.5 w-3.5" /> {t('cert.downloadBtn')}</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CertificateModal({ cert, onClose }: { cert: CertRow; onClose: () => void }) {
  const { t } = useI18n()
  const [qrUrl, setQrUrl] = React.useState('')
  const [origin, setOrigin] = React.useState('')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const o = window.location.origin
    setOrigin(o)
    QRCode.toDataURL(`${o}/certificates/verify?cert=${cert.certificateNumber}`, { margin: 1, width: 200, color: { dark: '#3D2A1F', light: '#FFFFFF' } })
      .then(setQrUrl).catch(() => setQrUrl(''))
  }, [cert.certificateNumber])

  const holderName = cert.employeeName
  const issueDateStr = formatDate(cert.issueDate)
  const verifyUrl = `${origin}/certificates/verify?cert=${cert.certificateNumber}`

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0">
          <DialogHeader className="sr-only no-print">
            <DialogTitle>{t('cert.modalTitlePrefix')} {cert.certificateNumber}</DialogTitle>
            <DialogDescription>{t('cert.modalDescPrefix')} {holderName}.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-card no-print">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">{cert.certificateNumber}</span>
              <StatusBadge status={cert.status} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => window.print()} disabled={cert.status === 'revoked'}><Download className="mr-1.5 h-3.5 w-3.5" /> {t('cert.saveAsPdf')}</Button>
              <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="p-4 sm:p-6 bg-muted/30 max-h-[80vh] overflow-y-auto no-print">
            <CertificateDesign cert={cert} holderName={holderName} issueDateStr={issueDateStr} qrUrl={qrUrl} verifyUrl={verifyUrl} />
          </div>
        </DialogContent>
      </Dialog>

      {mounted && createPortal(
        <div className="printable-cert hidden print:block fixed inset-0 z-[9999] bg-white p-6">
          <CertificateDesign cert={cert} holderName={holderName} issueDateStr={issueDateStr} qrUrl={qrUrl} verifyUrl={verifyUrl} />
        </div>,
        document.body
      )}
    </>
  )
}

function CertificateDesign({ cert, holderName, issueDateStr, qrUrl, verifyUrl }: { cert: CertRow; holderName: string; issueDateStr: string; qrUrl: string; verifyUrl: string }) {
  const { t } = useI18n()
  return (
    <div className={cn('certificate-bg relative mx-auto w-full aspect-[1.414/1] max-w-[900px]', 'border-[6px] border-amber-700/80', 'shadow-[0_8px_30px_rgba(0,0,0,0.12)]', cert.status === 'revoked' && 'opacity-60')}>
      <div className="absolute inset-3 border border-amber-700/40 pointer-events-none" />
      <div className="absolute inset-4 border-[1.5px] border-amber-700/20 pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-[10rem] font-serif text-amber-700/[0.05] select-none">☕</span></div>
      {cert.status === 'revoked' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="rotate-[-18deg] border-4 border-destructive text-destructive px-6 py-2 text-3xl font-black tracking-widest opacity-80">{t('cert.revokedStamp')}</div>
        </div>
      )}
      <div className="relative h-full flex flex-col items-center text-center px-8 py-6 z-10">
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-full ring-4 ring-amber-700/20 overflow-hidden shadow-md">
            <img src="/kaldis-logo.png" alt="Kaldi's Coffee logo" width={64} height={64} className="object-cover" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-amber-700/80 font-medium">{t('app.name')}</span>
            <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.2em] text-amber-700/60">{t('cert.orgTagline')}</span>
          </div>
        </div>
        <h1 className="mt-3 sm:mt-4 font-serif text-2xl sm:text-4xl font-bold text-[#3D2A1F] tracking-wide">{t('cert.certOfCompletion')}</h1>
        <div className="mt-1 flex items-center gap-2"><span className="h-px w-8 bg-amber-700/40" /><Sparkles className="h-3 w-3 text-amber-600" /><span className="h-px w-8 bg-amber-700/40" /></div>
        <p className="mt-3 sm:mt-5 text-xs sm:text-sm text-[#5A4A3F] uppercase tracking-widest">{t('cert.certifyThat')}</p>
        <h2 className="mt-1 sm:mt-2 font-serif text-xl sm:text-3xl font-semibold text-[#3D2A1F] border-b border-amber-700/30 pb-1 px-6">{holderName}</h2>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-[#5A4A3F]">{t('cert.completedCourseOf')}</p>
        <h3 className="mt-1 sm:mt-2 font-serif text-base sm:text-xl font-medium text-[#5C3A21] italic max-w-[80%]">{cert.courseTitle}</h3>
        <div className="flex-1" />
        <div className="w-full mt-3 grid grid-cols-3 items-end gap-2 sm:gap-4">
          <div className="text-left">
            <div className="font-serif text-sm sm:text-lg text-[#3D2A1F] italic">Kaldi&apos;s Coffee</div>
            <div className="mt-1 border-t border-[#3D2A1F]/40 pt-0.5"><div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-[#5A4A3F]">{t('cert.authorizedSignature')}</div></div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-[8px] sm:text-[10px] uppercase tracking-widest text-[#5A4A3F]">{t('cert.scanToVerify')}</div>
            {qrUrl ? <img src={qrUrl} alt="Verify QR code" width={70} height={70} className="mt-1 ring-1 ring-amber-700/20 rounded" /> : <div className="h-[70px] w-[70px] mt-1 bg-muted animate-pulse rounded" />}
            <div className="mt-1 text-[7px] sm:text-[9px] text-[#5A4A3F] truncate max-w-[110px]" title={verifyUrl}>{verifyUrl}</div>
          </div>
          <div className="text-right">
            <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-[#5A4A3F]">{t('cert.dateIssued')}</div>
            <div className="font-serif text-xs sm:text-sm text-[#3D2A1F]">{issueDateStr}</div>
            <div className="mt-1 text-[8px] sm:text-[10px] uppercase tracking-wider text-[#5A4A3F]">{t('cert.certNo')}</div>
            <code className="font-mono text-[10px] sm:text-xs text-[#3D2A1F]">{cert.certificateNumber}</code>
          </div>
        </div>
      </div>
    </div>
  )
}

function RevokeDialog({ cert, onClose }: { cert: CertRow; onClose: () => void }) {
  const { t } = useI18n()
  const [reason, setReason] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  async function submit() {
    if (!reason.trim()) { toast.error(t('cert.reasonRequired')); return }
    setSubmitting(true)
    try {
      await axios.post(`/certificates/${cert.id}/revoke`, { reason: reason.trim() })
      toast.success(t('cert.revokedToast').replace('{number}', cert.certificateNumber))
      onClose()
      router.reload()
    } catch {
      toast.error(t('cert.couldNotRevoke'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-destructive" /> {t('cert.revokeTitle')}</DialogTitle>
          <DialogDescription>{t('cert.revokeDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">{t('cert.certNumberLabel')}</span><code className="font-mono">{cert.certificateNumber}</code></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">{t('cert.holderLabel')}</span><span className="font-medium">{cert.employeeName}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">{t('cert.course')}</span><span className="font-medium truncate max-w-[60%] text-right" title={cert.courseTitle}>{cert.courseTitle}</span></div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="revoke-reason">{t('cert.reasonForRevocation')}</Label>
            <Textarea id="revoke-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('cert.reasonPlaceholder')} rows={3} autoFocus />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>{t('common.cancel')}</Button>
          <Button variant="destructive" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />} {t('cert.revokeCertificate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatusBadge({ status }: { status: CertRow['status'] }) {
  const { t } = useI18n()
  if (status === 'valid') return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15"><CheckCircle2 className="h-3 w-3" /> {t('cert.valid')}</Badge>
  if (status === 'expired') return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/15"><Clock className="h-3 w-3" /> {t('cert.expired')}</Badge>
  return <Badge variant="destructive"><Ban className="h-3 w-3" /> {t('cert.revoked')}</Badge>
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

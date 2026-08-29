import * as React from 'react'
import { Head, Link } from '@inertiajs/react'
import axios from 'axios'
import {
  ShieldCheck, Search, CheckCircle2, AlertTriangle, Ban, Hash,
  Calendar, User, BookOpen, Loader2, XCircle, Award, ExternalLink,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { useI18n } from '@/Components/i18n-provider'
import { ModuleHeader, EmptyState } from '@/Components/lms/shared'
import { KaldiLogo } from '@/Components/kaldi-logo'
import { Card, CardContent } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VerifyResult {
  status: 'valid' | 'expired' | 'revoked'
  certificate: { number: string; holderName: string; courseTitle: string; issueDate: string; expiryDate: string | null; revokedReason: string | null }
}

export default function CertificatesVerify() {
  const { t } = useI18n()
  const [number, setNumber] = React.useState('')
  const [result, setResult] = React.useState<VerifyResult | null>(null)
  const [notFound, setNotFound] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const verify = React.useCallback(async (num: string) => {
    const trimmed = num.trim()
    if (!trimmed) { toast.error(t('cert.numberRequired')); return }
    setLoading(true)
    setResult(null)
    setNotFound(false)
    setError(null)
    try {
      const { data } = await axios.get<VerifyResult>('/certificates/verify/lookup', { params: { number: trimmed } })
      setResult(data)
    } catch (e: any) {
      if (e?.response?.status === 404) setNotFound(true)
      else { setError(e?.response?.data?.error || t('cert.verificationFailed')); toast.error(t('cert.verificationFailed')) }
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const url = new URL(window.location.href)
    const fromUrl = url.searchParams.get('cert')
    if (fromUrl) { setNumber(fromUrl); verify(fromUrl) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function reset() { setNumber(''); setResult(null); setNotFound(false); setError(null) }

  return (
    <AppLayout>
      <Head title={t('cert.verify')} />
      <div className="space-y-6 max-w-3xl mx-auto">
        <ModuleHeader title={t('cert.verify')} description={t('cert.verifySubtitle')} icon={ShieldCheck} />

        <Card className="overflow-hidden">
          <div className="h-1.5 kaldi-gradient" />
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={(e) => { e.preventDefault(); verify(number) }} className="space-y-3">
              <label htmlFor="cert-number" className="block text-sm font-medium">{t('cert.number')}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="cert-number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. KA-2025-1A2B3C" className="pl-9 font-mono" autoFocus disabled={loading} />
                </div>
                <Button type="submit" disabled={loading || !number.trim()}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('cert.verifying')}</> : <><Search className="mr-2 h-4 w-4" /> {t('cert.verifyBtn')}</>}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('cert.printedNote')}</p>
            </form>
          </CardContent>
        </Card>

        {loading && <Card><CardContent className="py-10 flex flex-col items-center gap-3"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="text-sm text-muted-foreground">{t('cert.checkingRegistry')}</p></CardContent></Card>}
        {!loading && notFound && <NotFoundCard number={number} onReset={reset} />}
        {!loading && error && !notFound && <Card><CardContent className="py-10"><EmptyState icon={AlertTriangle} title={t('cert.couldNotVerifyTitle')} description={error} action={<Button variant="outline" onClick={reset}>{t('cert.tryAgain')}</Button>} /></CardContent></Card>}
        {!loading && result && <VerifyResultCard result={result} onAnother={reset} />}
        {!loading && !result && !notFound && !error && (
          <Card className="border-dashed"><CardContent className="py-10"><EmptyState icon={ShieldCheck} title={t('cert.awaitingTitle')} description={t('cert.awaitingDesc')} /></CardContent></Card>
        )}

        <div className="text-center pt-2">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <KaldiLogo size={20} /><span>{t('cert.verifiedByFooter').replace('{year}', String(new Date().getFullYear()))}</span>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function VerifyResultCard({ result, onAnother }: { result: VerifyResult; onAnother: () => void }) {
  const { t } = useI18n()
  const { certificate, status } = result
  return (
    <div className="space-y-4">
      <Card className={cn('overflow-hidden border-2', status === 'valid' && 'border-emerald-500/40', status === 'expired' && 'border-amber-500/40', status === 'revoked' && 'border-destructive/40')}>
        <div className={cn('h-2', status === 'valid' && 'bg-emerald-500', status === 'expired' && 'bg-amber-500', status === 'revoked' && 'bg-destructive')} />
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-3"><StatusHero status={status} /></div>
          <h2 className={cn('text-2xl sm:text-3xl font-bold tracking-tight', status === 'valid' && 'text-emerald-700 dark:text-emerald-400', status === 'expired' && 'text-amber-700 dark:text-amber-400', status === 'revoked' && 'text-destructive')}>
            {status === 'valid' && `✓ ${t('cert.validHeading')}`}
            {status === 'expired' && `⚠ ${t('cert.expired')}`}
            {status === 'revoked' && `✗ ${t('cert.revoked')}`}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {status === 'valid' && t('cert.validDesc')}
            {status === 'expired' && t('cert.expiredDesc')}
            {status === 'revoked' && t('cert.revokedDesc')}
          </p>
          {status === 'revoked' && certificate.revokedReason && (
            <div className="mt-4 inline-flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-2.5 text-left max-w-lg">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div><p className="text-xs font-semibold uppercase tracking-wider text-destructive">{t('cert.revocationReason')}</p><p className="text-sm text-destructive mt-0.5">{certificate.revokedReason}</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="px-5 sm:px-6 py-4 border-b bg-muted/30 flex items-center gap-2"><Award className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">{t('cert.detailsTitle')}</h3></div>
          <div className="divide-y">
            <DetailRow icon={Hash} label={t('cert.certNumberLabel')} value={<code className="font-mono text-sm">{certificate.number}</code>} />
            <DetailRow icon={User} label={t('cert.holderLabel')} value={<span className="font-medium">{certificate.holderName}</span>} />
            <DetailRow icon={BookOpen} label={t('cert.course')} value={certificate.courseTitle} />
            <DetailRow icon={Calendar} label={t('cert.issueDate')} value={formatDate(certificate.issueDate)} />
            <DetailRow icon={Calendar} label={t('cert.expiryDate')} value={certificate.expiryDate ? formatDate(certificate.expiryDate) : t('cert.noExpiry')} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button variant="outline" onClick={onAnother}><Search className="mr-2 h-4 w-4" /> {t('cert.verifyAnother')}</Button>
        <Button variant="ghost" asChild><Link href="/certificates"><ExternalLink className="mr-2 h-4 w-4" /> {t('cert.manageCerts')}</Link></Button>
      </div>
    </div>
  )
}

function StatusHero({ status }: { status: VerifyResult['status'] }) {
  if (status === 'valid') return <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center ring-4 ring-emerald-500/10"><CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" /></div>
  if (status === 'expired') return <div className="h-16 w-16 rounded-full bg-amber-500/15 flex items-center justify-center ring-4 ring-amber-500/10"><AlertTriangle className="h-9 w-9 text-amber-600 dark:text-amber-400" /></div>
  return <div className="h-16 w-16 rounded-full bg-destructive/15 flex items-center justify-center ring-4 ring-destructive/10"><Ban className="h-9 w-9 text-destructive" /></div>
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 sm:px-6 py-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{label}</span><span className="text-sm text-right break-words max-w-[60%]">{value}</span></div>
    </div>
  )
}

function NotFoundCard({ number, onReset }: { number: string; onReset: () => void }) {
  const { t } = useI18n()
  return (
    <Card className="border-destructive/40 border-2">
      <CardContent className="p-6 sm:p-10 text-center">
        <div className="flex justify-center mb-3"><div className="h-16 w-16 rounded-full bg-destructive/15 flex items-center justify-center ring-4 ring-destructive/10"><XCircle className="h-9 w-9 text-destructive" /></div></div>
        <h2 className="text-2xl font-bold text-destructive">{t('cert.notFoundTitle')}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{t('cert.notFoundDescPrefix')} <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{number || '—'}</code> {t('cert.notFoundDescSuffix')}</p>
        <div className="mt-5"><Button variant="outline" onClick={onReset}>{t('cert.tryAnotherNumber')}</Button></div>
      </CardContent>
    </Card>
  )
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

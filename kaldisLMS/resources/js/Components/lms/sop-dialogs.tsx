import * as React from 'react'
import { useForm } from '@inertiajs/react'
import { ShieldCheck, AlertCircle, CheckCircle2, PenLine, Paperclip } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Switch } from '@/Components/ui/switch'
import { Checkbox } from '@/Components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { toast } from 'sonner'
import { useI18n } from '@/Components/i18n-provider'

export interface SopListItem {
  id: string
  title: string
  version: string
  category: string
  content: string | null
  filePath: string | null
  effectiveDate: string | null
  requiresAcknowledgement: boolean
}

const COMMON_CATEGORIES = ['Operations', 'Quality', 'Safety', 'Hygiene', 'Customer Service', 'Cash Handling', 'HR', 'IT Security', 'Compliance']

export function AcknowledgeDialog({ sop, employeeName, onClose }: { sop: SopListItem; employeeName: string; onClose: () => void }) {
  const { t } = useI18n()
  const [agreed, setAgreed] = React.useState(false)
  const { data, setData, post, processing } = useForm({ digital_signature: '' })

  const signatureMatches = data.digital_signature.trim().length >= 2 && data.digital_signature.trim().toLowerCase() === employeeName.trim().toLowerCase()
  const signatureValid = data.digital_signature.trim().length >= 2
  const canSubmit = agreed && signatureValid && !processing

  function handleSubmit() {
    if (!canSubmit) return
    post(`/sop/${sop.id}/acknowledge`, {
      onSuccess: () => { toast.success(t('sop.ackSuccessToast')); onClose() },
      onError: () => toast.error(t('sop.couldNotSubmitAck')),
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> {t('sop.ackDialogTitle')}</DialogTitle>
          <DialogDescription>{sop.title} · {t('sop.colVersion')} {sop.version}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-4 max-h-64 overflow-y-auto">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('sop.sopContentLabel')}</div>
            {sop.content ? <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{sop.content}</pre> : <p className="text-sm text-muted-foreground italic">{t('sop.noEmbeddedContent')}</p>}
            {sop.filePath && <a href={sop.filePath} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"><Paperclip className="h-3 w-3" /> {t('sop.viewAttachedFile')}</a>}
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1.5">
                <p className="font-medium">{t('sop.ackStatementTitle')}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {t('sop.ackStatementPrefix')} <strong>{sop.title}</strong> ({t('sop.versionWord')} {sop.version}). {t('sop.ackStatementSuffix')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="ack-agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-1" />
            <Label htmlFor="ack-agree" className="text-sm font-normal cursor-pointer">{t('sop.agreeCheckbox')}</Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ack-sig">{t('sop.digitalSignatureLabel')}</Label>
            <Input id="ack-sig" value={data.digital_signature} onChange={(e) => setData('digital_signature', e.target.value)} placeholder={employeeName || 'Your full name'} style={{ fontFamily: 'cursive', fontSize: '1.05rem' }} autoComplete="off" />
            {data.digital_signature.length > 0 && signatureMatches && <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {t('sop.signatureMatches')}</p>}
            {data.digital_signature.length > 0 && !signatureValid && <p className="text-xs text-red-600 dark:text-red-400">{t('sop.signatureTooShort')}</p>}
            <p className="text-xs text-muted-foreground">{t('sop.signatureLegalNote')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}><PenLine className="h-3.5 w-3.5 mr-1.5" /> {processing ? t('sop.submitting') : t('sop.submitAck')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SopFormDialog({ sop, onClose, onSaved }: { sop: SopListItem | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const isEdit = !!sop
  const { data, setData, post, put, processing } = useForm<{
    title: string; version: string; category: string; content: string
    effective_date: string; requires_acknowledgement: boolean; file: File | null
  }>({
    title: sop?.title || '',
    version: sop?.version || '1.0',
    category: sop?.category || 'Operations',
    content: sop?.content || '',
    effective_date: sop?.effectiveDate ? sop.effectiveDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    requires_acknowledgement: sop?.requiresAcknowledgement ?? true,
    file: null,
  })

  function handleSubmit() {
    if (!data.title.trim() || !data.version.trim() || !data.category.trim()) {
      toast.error(t('sop.titleVersionCategoryRequired'))
      return
    }
    const options = {
      forceFormData: true,
      onSuccess: () => { toast.success(isEdit ? t('sop.sopUpdatedToast') : t('sop.sopCreatedToast')); onSaved() },
      onError: () => toast.error(t('sop.couldNotSaveSop')),
    }
    if (isEdit) put(`/sop/${sop!.id}`, options)
    else post('/sop', options)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('sop.editSopTitle') : t('sop.createSopTitle')}</DialogTitle>
          <DialogDescription>{isEdit ? t('sop.editSopDesc') : t('sop.createSopDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sop-title">{t('sop.titleField')}</Label>
            <Input id="sop-title" value={data.title} onChange={(e) => setData('title', e.target.value)} placeholder="e.g. Opening Procedures — Bole Branch" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sop-version">{t('sop.versionField')}</Label>
              <Input id="sop-version" value={data.version} onChange={(e) => setData('version', e.target.value)} placeholder="1.0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sop-category">{t('sop.categoryField')}</Label>
              <Select value={data.category} onValueChange={(v) => setData('category', v)}>
                <SelectTrigger id="sop-category"><SelectValue placeholder={t('sop.pickCategory')} /></SelectTrigger>
                <SelectContent>{COMMON_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sop-effective">{t('sop.effectiveDateField')}</Label>
            <Input id="sop-effective" type="date" value={data.effective_date} onChange={(e) => setData('effective_date', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sop-content">{t('sop.contentField')}</Label>
            <Textarea id="sop-content" value={data.content} onChange={(e) => setData('content', e.target.value)} placeholder={t('sop.contentPlaceholder')} className="min-h-[180px] font-mono text-sm" />
            <p className="text-xs text-muted-foreground">{data.content.length} {t('sop.charCountSuffix')}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sop-file">{t('sop.attachFileLabel')}</Label>
            <Input id="sop-file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e) => setData('file', e.target.files?.[0] ?? null)} />
            {sop?.filePath && !data.file && (
              <a href={sop.filePath} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Paperclip className="h-3 w-3" /> {t('sop.currentAttachment')}</a>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="sop-ack" className="cursor-pointer">{t('sop.requiresAckLabel')}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t('sop.requiresAckDesc')}</p>
            </div>
            <Switch id="sop-ack" checked={data.requires_acknowledgement} onCheckedChange={(v) => setData('requires_acknowledgement', v)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={processing || !data.title.trim() || !data.version.trim() || !data.category.trim()}>
            {processing ? t('sop.saving') : isEdit ? t('settings.save') : t('sop.createSopBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

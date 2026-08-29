import * as React from 'react'
import { Head, Link, router } from '@inertiajs/react'
import {
  Settings as SettingsIcon, Building2, Palette, MessageCircle, Trophy, Shield,
  Eye, EyeOff, ChevronRight, Save,
} from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { ModuleHeader } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Switch } from '@/Components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/Components/ui/tabs'
import { useI18n } from '@/Components/i18n-provider'
import type { StringKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface SettingRow { key: string; value: string; type: string }
type GroupedSettings = Record<string, SettingRow[]>

const GAMIFICATION_FIELDS: { key: string; labelKey: StringKey }[] = [
  { key: 'points_lesson_complete', labelKey: 'settings.pointsLessonComplete' },
  { key: 'points_quiz_pass', labelKey: 'settings.pointsQuizPass' },
  { key: 'points_perfect_score', labelKey: 'settings.pointsPerfectScore' },
  { key: 'points_course_complete', labelKey: 'settings.pointsCourseComplete' },
  { key: 'points_streak_7day', labelKey: 'settings.pointsStreak7day' },
]

const SECURITY_FIELDS: { key: string; labelKey: StringKey; suffix: string }[] = [
  { key: 'lockout_threshold', labelKey: 'settings.lockoutThreshold', suffix: 'attempts' },
  { key: 'lockout_duration_minutes', labelKey: 'settings.lockoutDuration', suffix: 'minutes' },
  { key: 'session_idle_timeout', labelKey: 'settings.sessionTimeout', suffix: 'minutes' },
]

export default function SettingsIndex({ settings }: { settings: GroupedSettings }) {
  const { t } = useI18n()

  const initial = React.useMemo(() => {
    const flat: Record<string, string> = {}
    Object.values(settings).flat().forEach((s) => { flat[s.key] = s.value ?? '' })
    return flat
  }, [settings])

  const [values, setValues] = React.useState<Record<string, string>>(initial)
  const [dirty, setDirty] = React.useState<Set<string>>(new Set())
  const [saving, setSaving] = React.useState(false)

  function update(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
    setDirty((d) => new Set(d).add(key))
  }

  function save() {
    if (dirty.size === 0) return
    setSaving(true)
    router.put('/settings', {
      settings: Array.from(dirty).map((k) => ({ key: k, value: values[k] ?? '' })),
    }, {
      preserveScroll: true,
      onSuccess: () => setDirty(new Set()),
      onFinish: () => setSaving(false),
    })
  }

  return (
    <AppLayout>
      <Head title={t('nav.settings')} />
      <ModuleHeader
        title={t('nav.settings')}
        icon={SettingsIcon}
        actions={
          <Button onClick={save} disabled={dirty.size === 0 || saving}>
            <Save className="h-4 w-4" /> {t('settings.save')}
            {dirty.size > 0 && <span className="ml-1 text-xs opacity-80">({dirty.size})</span>}
          </Button>
        }
      />

      <div className="space-y-5">
        <Tabs defaultValue="general">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="general"><Building2 className="h-3.5 w-3.5" /> {t('settings.general')}</TabsTrigger>
            <TabsTrigger value="branding"><Palette className="h-3.5 w-3.5" /> {t('settings.branding')}</TabsTrigger>
            <TabsTrigger value="telegram"><MessageCircle className="h-3.5 w-3.5" /> {t('settings.telegram')}</TabsTrigger>
            <TabsTrigger value="gamification"><Trophy className="h-3.5 w-3.5" /> {t('settings.gamification')}</TabsTrigger>
            <TabsTrigger value="security"><Shield className="h-3.5 w-3.5" /> {t('settings.security')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card><CardContent className="p-5 space-y-4 max-w-lg">
              <FieldShell label={t('settings.companyName')} dirty={dirty.has('company_name')}>
                <Input value={values.company_name ?? ''} onChange={(e) => update('company_name', e.target.value)} />
              </FieldShell>
              <FieldShell label={t('settings.companyNameAm')} dirty={dirty.has('company_name_am')}>
                <Input dir="rtl" value={values.company_name_am ?? ''} onChange={(e) => update('company_name_am', e.target.value)} />
              </FieldShell>
              <FieldShell label={t('settings.supportEmail')} dirty={dirty.has('support_email')}>
                <Input type="email" value={values.support_email ?? ''} onChange={(e) => update('support_email', e.target.value)} />
              </FieldShell>
              <FieldShell label={t('settings.defaultLanguage')} dirty={dirty.has('default_language')}>
                <div className="flex gap-2">
                  {(['en', 'am'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => update('default_language', l)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm border',
                        (values.default_language ?? 'en') === l ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-accent'
                      )}
                    >
                      {l === 'en' ? 'English' : 'አማርኛ'}
                    </button>
                  ))}
                </div>
              </FieldShell>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="branding">
            <Card><CardContent className="p-5 space-y-4 max-w-lg">
              <FieldShell label={t('settings.logoUrl')} dirty={dirty.has('logo_url')}>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-amber-500/30 shrink-0 bg-muted">
                    {values.logo_url && <img src={values.logo_url} alt="Logo preview" className="object-cover w-full h-full" />}
                  </div>
                  <Input value={values.logo_url ?? ''} onChange={(e) => update('logo_url', e.target.value)} />
                </div>
              </FieldShell>
              <FieldShell label={t('settings.primaryColor')} dirty={dirty.has('primary_color')}>
                <ColorPicker value={values.primary_color ?? '#6F4E37'} onChange={(v) => update('primary_color', v)} />
              </FieldShell>
              <FieldShell label={t('settings.accentColor')} dirty={dirty.has('accent_color')}>
                <ColorPicker value={values.accent_color ?? '#C8973F'} onChange={(v) => update('accent_color', v)} />
              </FieldShell>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="telegram">
            <Card><CardContent className="p-5 space-y-4 max-w-lg">
              <FieldShell label={t('settings.telegramEnabled')} dirty={dirty.has('enabled')} inline>
                <Switch
                  checked={(values.enabled ?? 'true') === 'true'}
                  onCheckedChange={(checked) => update('enabled', checked ? 'true' : 'false')}
                />
              </FieldShell>
              <FieldShell label={t('settings.botToken')} dirty={dirty.has('bot_token')}>
                <PasswordInput value={values.bot_token ?? ''} onChange={(v) => update('bot_token', v)} />
              </FieldShell>
              <FieldShell label={t('settings.botUsername')} dirty={dirty.has('bot_username')}>
                <Input className="font-mono" value={values.bot_username ?? ''} onChange={(e) => update('bot_username', e.target.value)} />
              </FieldShell>
              <p className="text-xs text-muted-foreground bg-muted rounded-md p-3">{t('settings.telegramNote')}</p>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="gamification">
            <Card><CardContent className="p-5 space-y-4 max-w-lg">
              {GAMIFICATION_FIELDS.map((f) => (
                <FieldShell key={f.key} label={t(f.labelKey)} dirty={dirty.has(f.key)}>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} value={values[f.key] ?? '0'} onChange={(e) => update(f.key, e.target.value)} />
                    <span className="text-xs text-muted-foreground shrink-0">pts</span>
                  </div>
                </FieldShell>
              ))}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="security">
            <Card><CardContent className="p-5 space-y-4 max-w-lg">
              {SECURITY_FIELDS.map((f) => (
                <FieldShell key={f.key} label={t(f.labelKey)} dirty={dirty.has(f.key)}>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} value={values[f.key] ?? '0'} onChange={(e) => update(f.key, e.target.value)} />
                    <span className="text-xs text-muted-foreground shrink-0">{f.suffix}</span>
                  </div>
                </FieldShell>
              ))}
              <FieldShell label={t('settings.twofaEnabled')} dirty={dirty.has('twofa_enabled')} inline>
                <Switch
                  checked={(values.twofa_enabled ?? 'false') === 'true'}
                  onCheckedChange={(checked) => update('twofa_enabled', checked ? 'true' : 'false')}
                />
              </FieldShell>
              <p className="text-xs text-muted-foreground bg-muted rounded-md p-3">{t('settings.twofaNote')}</p>
            </CardContent></Card>
          </TabsContent>
        </Tabs>

        <Link href="/roles" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium text-sm">{t('settings.roles')}</div>
                  <div className="text-xs text-muted-foreground">{t('settings.rolesLinkDesc')}</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </AppLayout>
  )
}

function FieldShell({ label, dirty, inline, children }: { label: string; dirty: boolean; inline?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(inline && 'flex items-center justify-between')}>
      <Label className="mb-1.5 flex items-center gap-1.5">
        {label}
        {dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
      </Label>
      {children}
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 rounded-md border border-input cursor-pointer bg-transparent p-0.5"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono w-32" />
      <div className="h-9 w-9 rounded-md border shrink-0" style={{ backgroundColor: value }} />
    </div>
  )
}

function PasswordInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = React.useState(false)
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} className="pr-9" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

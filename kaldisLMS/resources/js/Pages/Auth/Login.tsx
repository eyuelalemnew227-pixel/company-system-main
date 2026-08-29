import * as React from 'react'
import { Head, router, useForm } from '@inertiajs/react'
import { Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles, ShieldCheck, Trophy, Globe } from 'lucide-react'
import { KaldiLogo } from '@/Components/kaldi-logo'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'
import { useI18n } from '@/Components/i18n-provider'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const DEMO_ACCOUNTS = [
  { email: 'admin@kaldis.et', role: 'Admin', desc: 'Full system access' },
  { email: 'training-manager@kaldis.et', role: 'Training Manager', desc: 'Approve curricula & manuals' },
  { email: 'coordinator@kaldis.et', role: 'Coordinator', desc: 'Review & schedule training' },
  { email: 'trainer@kaldis.et', role: 'Trainer', desc: 'Deliver department training' },
  { email: 'employee@kaldis.et', role: 'Employee', desc: 'Learn & complete' },
]

export default function Login({ status }: { status?: string }) {
  const { t, lang, setLang } = useI18n()
  const { data, setData, post, processing, errors } = useForm({
    email: 'admin@kaldis.et',
    password: 'password123',
  })
  const [showPw, setShowPw] = React.useState(false)

  React.useEffect(() => {
    if (errors.email) toast.error(errors.email)
  }, [errors.email])

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    post('/login')
  }

  function quickLogin(email: string) {
    setData({ email, password: 'password123' })
    router.post('/login', { email, password: 'password123' })
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Head title={t('auth.login')} />

      {/* Left — brand panel */}
      <div className="kaldi-gradient text-white lg:w-1/2 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-9xl">☕</div>
          <div className="absolute bottom-20 right-10 text-8xl">🫘</div>
          <div className="absolute top-1/2 left-1/3 text-7xl">🎓</div>
        </div>
        <div className="relative z-10">
          <KaldiLogo size={56} />
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
            {t('auth.brewPotential')}
          </h1>
          <p className="text-white/80 text-lg mb-8">
            {t('auth.heroDesc')}
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Sparkles, labelKey: 'auth.aiPowered' as const },
              { icon: ShieldCheck, labelKey: 'auth.secureCompliant' as const },
              { icon: Trophy, labelKey: 'auth.gamified' as const },
            ].map((f) => (
              <div key={f.labelKey} className="flex flex-col items-center gap-2 text-center">
                <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center">
                  <f.icon className="h-5 w-5" />
                </div>
                <span className="text-xs text-white/70">{t(f.labelKey)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-white/50">
          © {new Date().getFullYear()} {t('app.company')} · {t('auth.footerTagline')}
        </div>
      </div>

      {/* Right — login form */}
      <div className="lg:w-1/2 p-8 lg:p-12 flex items-center justify-center bg-background relative">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="absolute top-4 right-4 gap-1.5">
              <Globe className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">{lang}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setLang('en')} className={cn(lang === 'en' && 'bg-accent')}>🇬🇧 English</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang('am')} className={cn(lang === 'am' && 'bg-accent')}>🇪🇹 አማርኛ</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-1">{t('auth.welcome')}</h2>
            <p className="text-muted-foreground text-sm">{t('auth.signinSubtitle')}</p>
            {status && <p className="text-emerald-600 text-sm mt-2">{status}</p>}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  className="pl-9"
                  placeholder="you@kaldis.et"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  className="pl-9 pr-9"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={processing}>
              {processing ? t('auth.signingIn') : t('auth.login')}
              {!processing && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t('auth.demoAccountsLabel')}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => quickLogin(a.email)}
                  className="text-left p-2.5 rounded-md border hover:border-primary hover:bg-accent/50 transition-colors"
                >
                  <div className="text-xs font-semibold">{a.role}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{a.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

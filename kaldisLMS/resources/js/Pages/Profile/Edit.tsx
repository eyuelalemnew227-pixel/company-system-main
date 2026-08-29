import * as React from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { UserCog, Send, CheckCircle2 } from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'
import { ModuleHeader } from '@/Components/lms/shared'
import { Card, CardContent } from '@/Components/ui/card'
import { Input } from '@/Components/ui/input'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { useI18n } from '@/Components/i18n-provider'
import type { PageProps } from '@/types'
import DeleteUserForm from './Partials/DeleteUserForm'
import UpdatePasswordForm from './Partials/UpdatePasswordForm'
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm'

export default function Edit({ telegramLinked }: PageProps<{ mustVerifyEmail: boolean; status?: string; telegramLinked: boolean }>) {
  const { t } = useI18n()
  const { auth } = usePage<PageProps>().props
  const [code, setCode] = React.useState('')
  const [linking, setLinking] = React.useState(false)

  function submitLinkCode(e: React.FormEvent) {
    e.preventDefault()
    setLinking(true)
    router.post('/profile/telegram-link', { code }, {
      preserveScroll: true,
      onSuccess: () => setCode(''),
      onFinish: () => setLinking(false),
    })
  }

  return (
    <AppLayout>
      <Head title={t('profile.title')} />
      <ModuleHeader title={t('profile.title')} description={auth.user?.email} icon={UserCog} />

      <div className="space-y-5 max-w-2xl">
        <Card><CardContent className="p-6"><UpdateProfileInformationForm /></CardContent></Card>
        <Card><CardContent className="p-6"><UpdatePasswordForm /></CardContent></Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-medium mb-1">{t('profile.telegram')}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t('profile.telegramDesc')}</p>

            {telegramLinked ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" /> {t('profile.telegramLinked')}
              </div>
            ) : (
              <form onSubmit={submitLinkCode} className="flex items-end gap-2 max-w-sm">
                <div className="flex-1">
                  <Label htmlFor="telegram-code" className="mb-1.5">{t('profile.telegramCode')}</Label>
                  <Input id="telegram-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
                </div>
                <Button type="submit" disabled={linking || !code}>
                  <Send className="h-4 w-4" /> {t('profile.telegramLink')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card><CardContent className="p-6"><DeleteUserForm /></CardContent></Card>
      </div>
    </AppLayout>
  )
}

import * as React from 'react'
import { usePage } from '@inertiajs/react'
import { toast } from 'sonner'
import { Sidebar } from '@/Components/lms/sidebar'
import { Header } from '@/Components/lms/header'
import type { PageProps } from '@/types'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { props } = usePage<PageProps>()
  const { auth, flash } = props

  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState(false)

  React.useEffect(() => {
    const stored = localStorage.getItem('kaldi_sidebar_collapsed')
    if (stored === '1') setCollapsed(true)
  }, [])

  React.useEffect(() => {
    if (flash?.success) toast.success(flash.success)
    if (flash?.error) toast.error(flash.error)
  }, [flash?.success, flash?.error])

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('kaldi_sidebar_collapsed', next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar
        user={auth.user}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={auth.user} onToggleMobileSidebar={() => setMobileOpen((o) => !o)} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

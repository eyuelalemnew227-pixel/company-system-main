import * as React from 'react'
import axios from 'axios'
import { Link, router, usePage } from '@inertiajs/react'
import {
  Menu, Search, Sun, Moon, Bell, Globe, ChevronDown, LogOut, User as UserIcon,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useTheme } from '@/Components/theme-provider'
import { useI18n } from '@/Components/i18n-provider'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/Components/ui/avatar'
import { Badge } from '@/Components/ui/badge'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { PageProps, SessionUser } from '@/types'

interface NotificationItem {
  id: string
  title: string
  body: string
  actionUrl: string | null
  readAt: string | null
}

interface SearchResultGroup {
  id: string
  label: string
  url: string
}

export function Header({ user, onToggleMobileSidebar }: { user: SessionUser | null; onToggleMobileSidebar: () => void }) {
  const { theme, setTheme } = useTheme()
  const { lang, setLang, t } = useI18n()
  const { unreadNotificationCount } = usePage<PageProps>().props

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [notifLoading, setNotifLoading] = React.useState(false)

  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<Record<string, SearchResultGroup[]>>({})
  const [searchOpen, setSearchOpen] = React.useState(false)

  function handleLogout() {
    router.post('/logout')
  }

  function loadNotifications() {
    setNotifLoading(true)
    axios.get('/notifications')
      .then((res) => setNotifications(res.data.notifications))
      .finally(() => setNotifLoading(false))
  }

  function openNotification(n: NotificationItem) {
    if (!n.readAt) {
      axios.post(`/notifications/${n.id}/read`).then(() => {
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)))
        router.reload({ only: ['unreadNotificationCount'] })
      })
    }
    if (n.actionUrl) router.visit(n.actionUrl)
  }

  React.useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults({})
      return
    }
    const id = setTimeout(() => {
      axios.get('/search', { params: { q } }).then((res) => setSearchResults(res.data.results))
    }, 250)
    return () => clearTimeout(id)
  }, [searchQuery])

  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-background/80 backdrop-blur-md flex items-center gap-3 px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onToggleMobileSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative hidden md:block flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          placeholder={t('common.search')}
          className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:bg-background"
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
        />
        {searchOpen && searchQuery.trim().length >= 2 && (
          <div className="absolute top-full mt-1 left-0 right-0 rounded-md border bg-popover text-popover-foreground shadow-md max-h-80 overflow-y-auto z-50">
            {Object.keys(searchResults).length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">{t('common.noData')}</div>
            ) : (
              Object.entries(searchResults).map(([group, items]) => (
                <div key={group} className="py-1.5">
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onMouseDown={() => router.visit(item.url)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors truncate"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <div className="flex-1 md:hidden" />

      {/* Right side */}
      <div className="flex items-center gap-1.5">
        {/* Language */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 h-9">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium uppercase">{lang}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setLang('en')} className={cn(lang === 'en' && 'bg-accent')}>
              🇬🇧 English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang('am')} className={cn(lang === 'am' && 'bg-accent')}>
              🇪🇹 አማርኛ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu onOpenChange={(open) => open && loadNotifications()}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              {unreadNotificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 justify-center text-[10px] bg-destructive text-white border-none">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>{t('notification.title')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifLoading ? (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">{t('common.loading')}</div>
            ) : notifications.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                {t('notification.empty')}
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <DropdownMenuItem key={n.id} onClick={() => openNotification(n)} className={cn('flex flex-col items-start gap-0.5 py-2', !n.readAt && 'bg-accent/60')}>
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-9 px-1.5 rounded-md hover:bg-accent transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col items-start leading-tight">
                <span className="text-xs font-medium">{user?.name}</span>
                <span className="text-[10px] text-muted-foreground">{user?.role_name}</span>
              </div>
              <ChevronDown className="hidden lg:block h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                <Badge variant="secondary" className="mt-1 w-fit text-[10px]">{user?.role_name}</Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <UserIcon className="mr-2 h-4 w-4" /> My Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserIcon className="mr-2 h-4 w-4" /> {t('profile.title')}
              </Link>
            </DropdownMenuItem>
            {hasPermission(user, 'settings.manage') && (
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <SettingsIcon className="mr-2 h-4 w-4" /> {t('nav.settings')}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

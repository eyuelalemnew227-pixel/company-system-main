import * as React from 'react'
import { Link, usePage } from '@inertiajs/react'
import {
  LayoutDashboard, BookOpen, GraduationCap, FileQuestion, Sparkles,
  Award, ShieldCheck, BarChart3, Users, Shield, Building2, Settings,
  MessageCircle, CalendarDays, MessagesSquare, Trophy, BadgeCheck,
  CheckCircle2, FileCheck, Library, ChevronsLeft, ChevronsRight, Search,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { KaldiLogo } from '@/Components/kaldi-logo'
import { hasPermission } from '@/lib/permissions'
import { useI18n } from '@/Components/i18n-provider'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/types'

interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  href?: string
  permission?: string
  employeeOnly?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

export function Sidebar({
  user, mobileOpen, onCloseMobile, collapsed, onToggleCollapsed,
}: {
  user: SessionUser | null
  mobileOpen: boolean
  onCloseMobile: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const { t } = useI18n()
  const { url } = usePage()
  const [search, setSearch] = React.useState('')

  const isEmployee = user?.role_slug === 'employee'

  const sections: NavSection[] = [
    {
      title: t('sidebar.sectionMain'),
      items: [
        { key: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, href: '/dashboard', permission: 'dashboard.view' },
      ],
    },
    {
      title: t('sidebar.sectionLearning'),
      items: [
        { key: 'my-learning', label: t('nav.myLearning'), icon: GraduationCap, href: '/my-learning', employeeOnly: true },
        { key: 'courses', label: t('nav.courseCatalog'), icon: BookOpen, href: '/courses', permission: 'course.view' },
        { key: 'quizzes', label: t('nav.quizzes'), icon: FileQuestion, href: '/quizzes', permission: 'quiz.view' },
        { key: 'ai-quiz', label: t('nav.aiQuizGenerator'), icon: Sparkles, href: '/ai-quiz', permission: 'quiz.ai_generate' },
        { key: 'question-bank', label: t('nav.questionBank'), icon: Library, href: '/question-bank', permission: 'quiz.view' },
      ],
    },
    {
      title: t('sidebar.sectionAchievement'),
      items: [
        { key: 'certificates', label: t('nav.certificates'), icon: Award, href: '/certificates', permission: 'certificate.view' },
        { key: 'verify', label: t('nav.verify'), icon: CheckCircle2, href: '/certificates/verify' },
        { key: 'leaderboard', label: t('nav.leaderboard'), icon: Trophy, href: '/leaderboard', permission: 'gamification.view' },
        { key: 'badges', label: t('nav.badges'), icon: BadgeCheck, href: '/badges', permission: 'gamification.view' },
      ],
    },
    {
      title: t('sidebar.sectionCompliance'),
      items: [
        { key: 'sop', label: t('nav.sop'), icon: ShieldCheck, href: '/sop', permission: 'sop.view' },
        { key: 'calendar', label: t('nav.calendar'), icon: CalendarDays, href: '/calendar' },
        { key: 'forums', label: t('nav.forums'), icon: MessagesSquare, href: '/forums', permission: 'forum.view' },
      ],
    },
    {
      title: t('sidebar.sectionAdmin'),
      items: [
        { key: 'users', label: t('nav.users'), icon: Users, href: '/users', permission: 'user.view' },
        { key: 'roles', label: t('nav.roles'), icon: Shield, href: '/roles', permission: 'role.view' },
        { key: 'branches', label: t('nav.branches'), icon: Building2, href: '/branches', permission: 'branch.manage' },
        { key: 'reports', label: t('nav.reports'), icon: BarChart3, href: '/reports', permission: 'report.view' },
        { key: 'telegram', label: t('nav.telegram'), icon: MessageCircle, href: '/profile' },
        { key: 'settings', label: t('nav.settings'), icon: Settings, href: '/settings', permission: 'settings.manage' },
      ],
    },
  ]

  const q = search.trim().toLowerCase()
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.employeeOnly && !isEmployee) return false
        if (item.permission && !hasPermission(user, item.permission)) return false
        if (q && !item.label.toLowerCase().includes(q)) return false
        return true
      }),
    }))
    .filter((section) => section.items.length > 0)

  const noResults = q.length > 0 && visibleSections.length === 0

  function handleItemClick(item: NavItem, e: React.MouseEvent) {
    if (!item.href) {
      e.preventDefault()
      toast.info(`${item.label} is coming in a future update.`)
    }
    onCloseMobile()
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 z-50 lg:z-auto h-screen shrink-0',
          'bg-sidebar text-sidebar-foreground flex flex-col',
          'transition-[transform,width] duration-300 lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-72',
          'w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border shrink-0 gap-2">
          {/* `collapsed` only applies at the lg breakpoint (mobile drawer is always full-width) — the brand link
              is hidden and replaced by the toggle button in the lg-collapsed rail, since both don't fit in 64px. */}
          <Link href="/dashboard" className={cn('flex items-center gap-2.5 overflow-hidden flex-1 min-w-0', collapsed && 'lg:hidden')}>
            <KaldiLogo size={40} />
            {!collapsed && (
              <div className="flex flex-col leading-tight text-left min-w-0">
                <span className="font-bold text-[15px] text-sidebar-foreground tracking-tight whitespace-nowrap">Kaldi Academy</span>
                <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider whitespace-nowrap">Learning Management</span>
              </div>
            )}
          </Link>
          <button
            onClick={onToggleCollapsed}
            title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            className={cn(
              'hidden lg:flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors',
              collapsed && 'lg:mx-auto'
            )}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="px-3 pt-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('sidebar.search')}
                className="w-full h-8 pl-8 pr-2 rounded-md bg-sidebar-accent/60 text-sidebar-foreground text-xs placeholder:text-sidebar-foreground/40 border border-sidebar-border focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
              />
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {noResults && (
            <p className="px-3 text-xs text-sidebar-foreground/40">{t('sidebar.noResults')}</p>
          )}
          {visibleSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = item.href ? url.startsWith(item.href) : false
                  return (
                    <Link
                      key={item.key}
                      href={item.href || '#'}
                      onClick={(e) => handleItemClick(item, e)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        'hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground',
                        active && 'bg-sidebar-primary text-sidebar-primary-foreground font-medium hover:bg-sidebar-primary hover:text-sidebar-primary-foreground',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-2 py-2 border-t border-sidebar-border shrink-0">
          <button
            onClick={onToggleCollapsed}
            title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            className="hidden lg:flex w-full items-center justify-center gap-2 h-8 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors text-xs"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> {t('sidebar.collapse')}</>}
          </button>
        </div>

        {!collapsed && (
          <div className="px-4 py-3 border-t border-sidebar-border shrink-0">
            <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/50">
              <FileCheck className="h-3.5 w-3.5" />
              <span>v1.0 · {new Date().getFullYear()} Kaldi&apos;s Coffee</span>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

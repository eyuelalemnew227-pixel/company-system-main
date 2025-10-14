// AppSidebar.tsx

import { NavFooter } from '@/components/nav-footer';
import { NavMain, type NavSection } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
  Award,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileQuestion,
  FolderKey,
  Globe2,
  History,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  UserCog,
  UserCircle,
  FileText,
  ClipboardCheck,
} from 'lucide-react';
import AppLogo from './app-logo';

const sections: NavSection[] = [
  {
    label: 'Dashboard',
    items: [
      { title: 'Overview', href: '/dashboard', icon: LayoutDashboard, permission: 'view dashboard' },
    ],
  },
  {
    label: 'System Administration',
    items: [
      { title: 'Permissions', href: '/permissions', icon: LockKeyhole, permission: 'view permissions' },
      { title: 'Roles', href: '/roles', icon: Shield, permission: 'view roles' },
      { title: 'Users', href: '/users', icon: UserCog, permission: 'view users' },
      { title: 'Departments', href: '/departments', icon: Building2, permission: 'view departments' },
      { title: 'Branches', href: '/branches', icon: Globe2, permission: 'view branches' },
      { title: 'Positions', href: '/positions', icon: ClipboardList, permission: 'view positions' },
      { title: 'Employees', href: '/employees', icon: Users, permission: 'view employees' },
      { title: 'Managers', href: '/managers', icon: ShieldCheck, permission: 'view managers' },
      { title: 'Other Evaluables', href: '/other-evaluables', icon: FileText, permission: 'view other evaluables' },
    ],
  },
  {
    label: 'Fiscal Period Management',
    items: [
      { title: 'Fiscal Years', href: '/fiscal-years', icon: Calendar, permission: 'view fiscal years' },
      { title: 'Fiscal Months', href: '/fiscal-months', icon: CalendarDays, permission: 'view fiscal months' },
      { title: 'Evaluation Periods', href: '/evaluation-periods', icon: CalendarCheck, permission: 'view evaluation periods' },
    ],
  },
  {
    label: 'Performance Evaluation',
    items: [
      { title: 'Evaluation Types', href: '/evaluation-types', icon: Sparkles, permission: 'view evaluation types' },
      { title: 'Question Groups', href: '/question-groups', icon: FolderKey, permission: 'view question groups' },
      { title: 'Questions', href: '/questions', icon: FileQuestion, permission: 'view questions' },
      { title: 'Evaluator Groups', href: '/evaluator-groups', icon: UserCircle, permission: 'view evaluator groups' },
      { title: 'Evaluatee Groups', href: '/evaluates-groups', icon: Target, permission: 'view evaluates groups' },
      { title: 'All Evaluations', href: '/evaluations', icon: ClipboardCheck, permission: 'view evaluations' },
      { title: 'Fill Evaluation', href: '/my-evaluation', icon: ListChecks, permission: 'view evaluations' },
      { title: 'Evaluation History', href: '/my-evaluation/history', icon: History, permission: 'view evaluations' },
      { title: 'My Results', href: '/my-results', icon: Award, permission: 'view evaluations' },
    ],
  },
];
const footerNavItems: NavItem[] = [];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" prefetch>
                <AppLogo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain sections={sections} />
      </SidebarContent>

      <SidebarFooter>
        <NavFooter items={footerNavItems} className="mt-auto" />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
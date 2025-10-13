// AppSidebar.tsx

import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
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
  BadgeCheck,
  Building2,
  ClipboardList,
  FolderKey,
  Globe2,
  HelpCircle,
  LayoutDashboard,
  LockKeyhole,
  ShieldPlus,
  Users2,
  UserCheck,
  ClipboardCheck,
  Package,
  CheckSquare,
  Calendar,
} from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'view dashboard',
  },
  {
    title: 'Permissions',
    href: '/permissions',
    icon: LockKeyhole,
    permission: 'view permissions',
  },
  {
    title: 'Roles',
    href: '/roles',
    icon: FolderKey,
    permission: 'view roles',
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users2,
    permission: 'view users',
  },
  {
    title: 'Departments',
    href: '/departments',
    icon: Building2,
    permission: 'view departments',
  },
  {
    title: 'Branches',
    href: '/branches',
    icon: Globe2,
    permission: 'view branches',
  },
  {
    title: 'Positions',
    href: '/positions',
    icon: ClipboardList,
    permission: 'view positions',
  },
  {
    title: 'Employees',
    href: '/employees',
    icon: Users2,
    permission: 'view employees',
  },
  {
    title: 'Manager',
    href: '/managers',
    icon: ShieldPlus,
    permission: 'view managers',
  },
  {
    title: 'Evaluation Types',
    href: '/evaluation-types',
    icon: BadgeCheck,
    permission: 'view evaluation types',
  },
  {
    title: 'Question Groups',
    href: '/question-groups',
    icon: FolderKey,
    permission: 'view question groups',
  },
  {
    title: 'Questions',
    href: '/questions',
    icon: HelpCircle,
    permission: 'view questions',
  },
  {
    title: 'Evaluator Groups',
    href: '/evaluator-groups',
    icon: UserCheck,
    permission: 'view evaluator groups',
  },
  {
    title: 'Evaluates Groups',
    href: '/evaluates-groups',
    icon: ClipboardCheck,
    permission: 'view evaluates groups',
  },
  {
    title: 'Other Evaluables',
    href: '/other-evaluables',
    icon: Package,
    permission: 'view other evaluables',
  },
  {
    title: 'Evaluations',
    href: '/evaluations',
    icon: CheckSquare,
    permission: 'view evaluations',
  },
  {
    title: 'My Evaluation',
    href: '/my-evaluation',
    icon: CheckSquare,
    permission: 'view evaluations',
  },
  {
    title: 'My Evaluation History',
    href: '/my-evaluation/history',
    icon: CheckSquare,
    permission: 'view evaluations',
  },
  {
    title: 'My Evaluation Results',
    href: '/my-results',
    icon: CheckSquare,
    permission: 'view evaluations',
  },
  {
    title: 'Fiscal Years',
    href: '/fiscal-years',
    icon: Calendar,
    permission: 'view fiscal years',
  },
  {
    title: 'Fiscal Months',
    href: '/fiscal-months',
    icon: Calendar,
    permission: 'view fiscal months',
  },
  {
    title: 'Evaluation Periods',
    href: '/evaluation-periods',
    icon: Calendar,
    permission: 'view evaluation periods',
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
        <NavMain items={mainNavItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavFooter items={footerNavItems} className="mt-auto" />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
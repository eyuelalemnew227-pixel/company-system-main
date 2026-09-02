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
import { type ExternalLinkSection, type NavItem, type PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
  Award,
  BarChart3,
  Building,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Calendar as CalendarIcon,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FileCheck,
  FileQuestion,
  FileText,
  FolderKey,
  Globe2,
  History,
  LayoutDashboard,
  List,
  ListChecks,
  LockKeyhole,
  MessageSquare,
  Package,
  PiggyBank,
  Landmark,
  Network,
  Phone,
  Plus,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  Ticket,
  TrendingUp,
  UserCircle,
  UserCog,
  Users,
  Wallet,
  Warehouse,
  Wifi,
  XCircle,
  GraduationCap,
  BookOpen,
  Trophy,
  HelpCircle,
} from 'lucide-react';
import AppLogo from './app-logo';

const iconMap = {
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  Warehouse,
  TrendingUp,
  Globe2,
  Settings,
  LockKeyhole,
  Shield,
  UserCog,
  Building2,
  ClipboardList,
  Users,
  Phone,
  ShieldCheck,
  FileText,
  FolderKey,
  MessageSquare,
  PiggyBank,
  Landmark,
  Network,
  Calendar,
  CalendarDays,
  CalendarCheck,
  Award,
  ListChecks,
  FileQuestion,
  UserCircle,
  Target,
  History,
  XCircle,
  Ticket,
  Package,
  Sparkles,
  ExternalLink,
  Wallet,
  Plus,
  List,
  ClipboardCheck,
} as const;

const baseSections: NavSection[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { title: 'Overview', href: '/dashboard', icon: LayoutDashboard, permission: 'view dashboard' },
      { title: 'Pre-Orders Analysis', href: '/pre-orders/dashboard', icon: ShoppingCart, permission: 'view pre-orders' },
      { title: 'Employee Evaluations', href: '/reports/employee-evaluations', icon: BarChart3, permission: 'view evaluation summary|view branch manager evaluation summary|view champions evaluation summary|view regional production maintenance evaluation summary' },
      { title: 'Inventory Count Summary', href: '/reports/inventory-count-summary', icon: Warehouse, permission: 'view inventory count summary' },
    ],
  },
  {
    label: 'System Administration',
    icon: Settings,
    items: [
      { title: 'Permissions', href: '/permissions', icon: LockKeyhole, permission: 'view permissions' },
      { title: 'Roles', href: '/roles', icon: Shield, permission: 'view roles' },
      { title: 'Users', href: '/users', icon: UserCog, permission: 'view users' },
      { title: 'Departments', href: '/departments', icon: Building2, permission: 'view departments' },
      { title: 'Branches', href: '/branches', icon: Globe2, permission: 'view branches' },
      { title: 'Positions', href: '/positions', icon: ClipboardList, permission: 'view positions' },
      { title: 'Employees', href: '/employees', icon: Users, permission: 'view employees' },
      { title: 'Employee Directory', href: '/directory', icon: Phone, permission: 'view employee directory' },
      { title: 'Managers', href: '/managers', icon: ShieldCheck, permission: 'view managers' },
      { title: 'Other Evaluables', href: '/other-evaluables', icon: FileText, permission: 'view other evaluables' },
      { title: 'Child Categories', href: '/child-categories', icon: FolderKey, permission: 'view child categories' },
      { title: 'Products', href: '/products', icon: ClipboardList, permission: 'view products' },
      { title: 'SMS Management', href: '/sms-balance', icon: MessageSquare, permission: 'view sms balance' },
      { title: 'Telegram Config', href: '/telegram-config', icon: Send, permission: 'role:Super Admin|role:Admin|view telegram config' },
      { title: 'Kaldis Communication', href: '/kaldis-communication', icon: Send, permission: 'role:Super Admin|role:Admin|view telegram config|manage telegram config' },
      { title: 'External Links', href: '/external-links', icon: ExternalLink, permission: 'manage external links' },
    ],
  },
  {
    label: 'Period Management',
    icon: CalendarIcon,
    items: [
      { title: 'Fiscal Years', href: '/fiscal-years', icon: Calendar, permission: 'view fiscal years' },
      { title: 'Fiscal Months', href: '/fiscal-months', icon: CalendarDays, permission: 'view fiscal months' },
      { title: 'Evaluation Periods', href: '/evaluation-periods', icon: CalendarCheck, permission: 'view evaluation periods' },
      { title: 'Inventory Periods', href: '/inventory-periods', icon: CalendarCheck, permission: 'view inventory periods' },
      { title: 'Expense Budget Periods', href: '/expense-budget-periods', icon: CalendarCheck, permission: 'manage expense budget anytime|manage expense budget within time window' },
      { title: 'Weekly Budget Periods', href: '/weekly-budget-periods', icon: CalendarCheck, permission: 'manage weekly budget periods' },
      { title: 'Holidays', href: '/holidays', icon: Calendar, permission: 'view holidays' },
    ],
  },
  {
    label: 'Performance Evaluation',
    icon: TrendingUp,
    items: [
      { title: 'Evaluation Types', href: '/evaluation-types', icon: Sparkles, permission: 'view evaluation types' },
      { title: 'Evaluation Categories', href: '/evaluation-categories', icon: ListChecks, permission: 'view evaluation categories' },
      { title: 'Question Groups', href: '/question-groups', icon: FolderKey, permission: 'view question groups' },
      { title: 'Questions', href: '/questions', icon: FileQuestion, permission: 'view questions' },
      { title: 'Evaluator Groups', href: '/evaluator-groups', icon: UserCircle, permission: 'view evaluator groups' },
      { title: 'Evaluatee Groups', href: '/evaluates-groups', icon: Target, permission: 'view evaluates groups' },
      { title: 'All Evaluations', href: '/evaluations', icon: ClipboardCheck, permission: 'view evaluations' },
      { title: 'Evaluation Records', href: '/evaluation-records', icon: ListChecks, permission: 'view evaluation records' },
      { title: 'Evaluator Completion', href: '/evaluator-completion', icon: BarChart3, permission: 'view evaluator completion' },
      { title: 'Fill Evaluation', href: '/my-evaluation', icon: ListChecks, permission: 'Fill Evaluation' },
      { title: 'Evaluation History', href: '/my-evaluation/history', icon: History, permission: 'Evaluation History' },
      { title: 'My Results', href: '/my-results', icon: Award, permission: 'My Results' },
      { title: 'Rejected Evaluations', href: '/rejected-evaluations', icon: XCircle, permission: 'view rejected evaluations' },
    ],
  },
  {
    label: 'Inventory Management',
    icon: Warehouse,
    items: [
      { title: 'Inventory Counts', href: '/inventory-counts', icon: Package, permission: 'view inventory counts' },
      { title: 'Inventory Completion Tracking', href: '/inventory-completion-tracking', icon: ClipboardCheck, permission: 'view inventory completion tracking' },
    ],
  },
  {
    label: 'Internal Memorandum',
    icon: FileText,
    items: [
      { title: 'All Memos', href: '/memos', icon: FileText, permission: 'memo.view|memo.view.all' },
      { title: 'New Memorandum', href: '/memos/create', icon: Plus, permission: 'memo.create' },
      { title: 'Memo Templates', href: '/memo-templates', icon: FileQuestion, permission: 'memo.templates.manage|memo.create' },
      { title: 'Memo Settings', href: '/memo-settings', icon: Settings, permission: 'role:Super Admin|memo.settings' },
    ],
  },

  {
    label: 'Ticketing',
    icon: Ticket,
    items: [
      { title: 'Tickets', href: '/tickets', icon: Ticket, permission: 'ticket.view.own|ticket.view.department|ticket.view.all' },
      { title: 'Ticketing Report', href: '/tickets/reports', icon: BarChart3, permission: 'ticket.report.view' },
      { title: 'Broadcast Announcement', href: '/broadcast-announcements', icon: Send, permission: 'view telegram config|send telegram broadcast|ticket.view.department|ticket.view.all' },
      { title: 'Ticket Settings', href: '/ticket-settings', icon: Settings, permission: 'ticket.manage.taxonomy|ticket.view.all' },
    ],
  },
  {
    label: 'Pre-Orders',
    icon: ShoppingCart,
    items: [
      { title: 'New Pre-Order', href: '/pre-orders/create', icon: ClipboardList, permission: 'create pre-orders' },
      { title: 'All Pre-Orders', href: '/pre-orders', icon: ShoppingCart, permission: 'view pre-orders' },
      { title: 'My Branch Orders', href: '/my-branch-orders', icon: Package, permission: 'view my branch orders' },
      { title: 'Customer Feedback', href: '/pre-orders/feedback', icon: MessageSquare, permission: 'view pre-orders' },
      { title: 'Pre-Order Customers', href: '/pre-orders/customers', icon: Users, permission: 'view pre-orders' },
      { title: 'Telegram Broadcasts', href: '/pre-orders/broadcasts', icon: Send, permission: 'view telegram config' },
      { title: 'Pre-Order Products', href: '/settings/pre-order-products', icon: Package, permission: 'view pre-order products' },
      { title: 'Order Types', href: '/settings/order-types', icon: ListChecks, permission: 'view order types' },
      { title: 'Collection Days', href: '/settings/collection-days', icon: CalendarDays, permission: 'view collection days' },
      { title: 'SMS Templates', href: '/pre-orders/sms-templates', icon: MessageSquare, permission: 'send bulk sms reminders' },
      { title: 'Cost Categories', href: '/pre-orders/costs/categories', icon: FolderKey, permission: 'manage pre-order costs' },
      { title: 'Cost Records', href: '/pre-orders/costs', icon: BarChart3, permission: 'manage pre-order costs' },
      { title: 'Payment Settings', href: '/pre-order-payment-settings', icon: Settings, permission: 'manage pre-order payment settings' },
      { title: 'Targets', href: '/pre-order-targets', icon: Target, permission: 'manage pre-order targets' },
    ],
  },
  {
    label: 'Spare Parts',
    icon: Warehouse,
    items: [
      { title: 'Categories', href: '/spare-part-categories', icon: FolderKey, permission: 'view spare part categories' },
      { title: 'Spare Parts', href: '/spare-parts', icon: Package, permission: 'view spare parts' },
    ],
  },
  {
    label: 'Telecom Management',
    icon: Phone,
    items: [
      { title: 'Overview', href: '/telecom/dashboard', icon: BarChart3, permission: 'view telecom management' },
      { title: 'Phone Numbers', href: '/telecom/phone-numbers', icon: Phone, permission: 'telecom.phone_numbers.manage|view telecom management' },
      { title: 'Broadband & WTTx', href: '/telecom/broadbands', icon: Wifi, permission: 'telecom.broadbands.manage|view telecom management' },
      { title: 'Service Providers', href: '/telecom/providers', icon: Building2, permission: 'telecom.providers.manage|view telecom management' },
    ],
  },
  {
    label: 'Learning Management',
    icon: GraduationCap,
    items: [],
    groups: [
      {
        label: 'Branch Manager Training',
        icon: CalendarCheck,
        items: [
          { title: 'Department Agendas', href: '/training/agendas', icon: FileText, permission: 'training.agendas.view|training.agendas.create' },
          { title: 'Submit New Agenda', href: '/training/agendas/create', icon: Plus, permission: 'training.agendas.create' },
          { title: 'Master Schedule Timetables', href: '/training/schedules', icon: CalendarDays, permission: 'training.master_schedule.view|training.master_schedule.create' },
          { title: 'Build Master Schedule', href: '/training/schedules/create', icon: Calendar, permission: 'training.master_schedule.create' },
          { title: 'Training Attendance', href: '/training/attendance', icon: Users, permission: 'training.attendance.view|training.attendance.create|training.attendance.manage' },
          { title: 'Participant Feedbacks', href: '/training/feedback', icon: MessageSquare, permission: 'training.feedback.view|training.feedback.view_own|training.feedback.create|training.feedback.manage' },
          { title: 'Consolidated Report', href: '/training/reports', icon: BarChart3, permission: 'training.reports.view|training.reports.export' },
          { title: 'Training Settings', href: '/training/settings', icon: Settings, permission: 'training.settings.manage' },
        ],
      },
      {
        label: 'Online Training',
        icon: BookOpen,
        items: [
          { title: 'LMS Dashboard', href: '/training/dashboard', icon: LayoutDashboard, permission: 'training.online.view' },
          { title: 'Course Catalog', href: '/training/courses', icon: BookOpen, permission: 'training.online.courses.manage|training.online.view' },
          { title: 'My Learning Hub', href: '/training/my-learning', icon: Award, permission: 'training.online.courses.enroll|training.online.view' },
          { title: 'Quizzes & Tests', href: '/training/quizzes', icon: FileQuestion, permission: 'training.online.quizzes.take|training.online.quizzes.manage|training.online.view' },
          { title: 'Question Bank', href: '/training/question-banks', icon: HelpCircle, permission: 'training.online.question_banks.manage' },
          { title: 'AI Quiz Generator', href: '/training/ai-quiz', icon: Sparkles, permission: 'training.online.ai_quiz.generate' },
          { title: 'SOP Compliance', href: '/training/sop', icon: FileCheck, permission: 'training.online.sop.view|training.online.sop.manage|training.online.view' },
          { title: 'Certificates', href: '/training/certificates', icon: Award, permission: 'training.online.certificates.manage|training.online.view' },
          { title: 'Leaderboard & Badges', href: '/training/leaderboard', icon: Trophy, permission: 'training.online.leaderboard.view|training.online.view' },
          { title: 'Forums & Q&A', href: '/training/forums', icon: MessageSquare, permission: 'training.online.forums.manage|training.online.view' },
          { title: 'LMS Reports', href: '/training/reports', icon: BarChart3, permission: 'training.online.reports.view' },
        ],
      },
    ],
  },
  {
    label: 'Budget',
    icon: Wallet,
    items: [],
    groups: [
      {
        label: 'Bank Balance',
        icon: Landmark,
        items: [
          { title: 'Manage Bank Balance', href: '/budget/bank-balances', icon: PiggyBank, permission: 'manage bank balance' },
          { title: 'Manage Banks', href: '/budget/banks', icon: Landmark, permission: 'manage banks|view bank balance' },
          { title: 'Manage Bank Branches', href: '/budget/bank-branches', icon: Network, permission: 'manage bank branches|view bank balance' },
        ],
      },
      {
        label: 'Expense Budget',
        icon: FileText,
        items: [
          { title: 'Add Expense Budget', href: '/budget/expense-budget/create', icon: Plus, permission: 'view only own department expense budgets|view only own branch expense budgets|view all branches except HO expense budgets' },
          { title: 'View Expense Budget', href: '/budget/expense-budget', icon: List, permission: 'view only own department expense budgets|view only own branch expense budgets|view all branches except HO expense budgets' },
          { title: 'Expense Submission Tracker', href: '/budget/expense-budget/submission-tracker', icon: ClipboardCheck, permission: 'view only own department expense budgets|view only own branch expense budgets|view all branches except HO expense budgets' },
        ],
      },
      {
        label: 'Sales Budget',
        icon: TrendingUp,
        items: [
          { title: 'Add New Budget', href: '/budget/sales-budget/create', icon: ClipboardList, permission: 'manage sales budget' },
          { title: 'View Budgets', href: '/budget/sales-budget', icon: BarChart3, permission: 'manage sales budget|view sales budget' },
          { title: 'Action Logs', href: '/budget/sales-budget/logs', icon: History, permission: 'manage sales budget' },
        ],
      },
      {
        label: 'Weekly Budget',
        icon: CalendarDays,
        items: [
          { title: 'Weekly Budgets', href: '/budget/weekly-budget', icon: List, permission: 'view weekly budgets' },
          { title: 'Analytics', href: '/budget/weekly-budget/analytics', icon: BarChart3, permission: 'view weekly budget summary' },
          { title: 'Finance View', href: '/budget/weekly-budget/finance', icon: Wallet, permission: 'view finance budgets' },
          { title: 'CEO View', href: '/budget/weekly-budget/ceo', icon: Wallet, permission: 'view ceo budgets' },
          {
            title: 'Department View',
            href: '/budget/weekly-budget/department',
            icon: Building,
            permission: 'view department budgets',
          },
        ],
      },
    ],
  },
];
const footerNavItems: NavItem[] = [];

export function AppSidebar() {
  const { props } = usePage<PageProps>();
  const externalGroups = buildExternalGroups(props.externalLinks as ExternalLinkSection[] | undefined);
  const rawSections =
    externalGroups.length > 0 ? [...baseSections, { label: 'Links', icon: ExternalLink, items: [], groups: externalGroups }] : baseSections;

  const sections = rawSections.map((section) => ({
    ...section,
    groups: section.groups?.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.title === 'Add Expense Budget') {
          return props.auth?.hasActiveExpenseBudgetPeriod ?? false;
        }
        return true;
      }),
    })),
  }));

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

function resolveIcon(name?: string | null) {
  if (!name) return undefined;
  return iconMap[name as keyof typeof iconMap] ?? ExternalLink;
}

function buildExternalGroups(sections: ExternalLinkSection[] | undefined) {
  if (!sections?.length) return [];

  return sections.map((section) => ({
    label: section.label,
    icon: resolveIcon(section.icon) ?? ExternalLink,
    items: (section.items ?? section.links ?? []).map((item) => ({
      title: item.title,
      href: item.href,
      permission: item.permission,
      icon: resolveIcon(item.icon ?? item.iconName) ?? resolveIcon(section.icon) ?? ExternalLink,
      target: item.target ?? '_blank',
      rel: item.rel ?? 'noreferrer noopener',
      external: item.external ?? item.is_external ?? true,
    })),
  }));
}

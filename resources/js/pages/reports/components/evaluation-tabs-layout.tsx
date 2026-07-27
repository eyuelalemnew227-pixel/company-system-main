import React from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head, Link, usePage } from '@inertiajs/react'
import { PageProps } from '@/types'

interface BreadcrumbItem {
    title: string
    href: string
}

interface EvaluationTabsLayoutProps {
    title: string
    activeTab: string
    breadcrumbs: BreadcrumbItem[]
    children: React.ReactNode
}

export default function EvaluationTabsLayout({ title, activeTab, breadcrumbs, children }: EvaluationTabsLayoutProps) {
    const { props } = usePage<PageProps>()
    const permissions = props.auth.permissions || []

    const tabs = [
        { id: 'summary', name: 'Head Office Evaluation', href: '/reports/evaluation-summary', permission: 'view evaluation summary' },
        { id: 'branch-manager', name: 'Branch Managers Evaluation', href: '/reports/branch-manager-evaluation-summary', permission: 'view branch manager evaluation summary' },
        { id: 'champions', name: 'Champions Evaluation', href: '/reports/champions-evaluation-summary', permission: 'view champions evaluation summary' },
        { id: 'consolidated', name: 'Regional , Production & Maintanance Managers Evaluation', href: '/reports/regional-production-maintenance-summary', permission: 'view regional production maintenance evaluation summary' }
    ].filter(t => permissions.includes(t.permission))

    // Automatically substitute the single master routing URL for the breadcrumbs base regardless of active tab
    const unifiedBreadcrumbs = [
        { title: 'Employee Evaluations', href: '/reports/employee-evaluations' },
        ...breadcrumbs
    ]

    return (
        <AppLayout breadcrumbs={unifiedBreadcrumbs}>
            <Head title={title} />

            {tabs.length > 1 && (
                <div className="border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-950 sticky top-0 z-20">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto min-w-max" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const isActive = tab.id === activeTab
                            return (
                                <Link
                                    key={tab.id}
                                    href={tab.href}
                                    className={`
                                        whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                                        ${isActive
                                            ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}
                                    `}
                                >
                                    {tab.name}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            )}

            {/* Render nested table specific component UI */}
            {children}
        </AppLayout>
    )
}

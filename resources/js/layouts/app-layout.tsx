import { Toaster } from '@/components/ui/sonner';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { OfflineIndicator } from '@/components/offline-indicator';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';

interface AppLayoutProps {
	children: ReactNode;
	breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => (
	<AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
		{children}
		<Toaster richColors />
		<PWAInstallPrompt />
		<OfflineIndicator />
	</AppLayoutTemplate>
);

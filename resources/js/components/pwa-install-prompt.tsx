import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
	const [showPrompt, setShowPrompt] = useState(false);
	const [isInstalled, setIsInstalled] = useState(false);

	useEffect(() => {
		// Check if app is already installed
		if (window.matchMedia('(display-mode: standalone)').matches) {
			setIsInstalled(true);
			return;
		}

		// Check if user has dismissed the prompt before
		const dismissed = localStorage.getItem('pwa-install-dismissed');
		if (dismissed) {
			const dismissedDate = new Date(dismissed);
			const now = new Date();
			const daysSinceDismissed = Math.floor((now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24));
			
			// Show again after 7 days
			if (daysSinceDismissed < 7) {
				return;
			}
		}

		// Listen for beforeinstallprompt event
		const handler = (e: Event) => {
			e.preventDefault();
			const promptEvent = e as BeforeInstallPromptEvent;
			setDeferredPrompt(promptEvent);
			
			// Show prompt after 30 seconds of using the app
			setTimeout(() => {
				setShowPrompt(true);
			}, 30000);
		};

		window.addEventListener('beforeinstallprompt', handler);

		// Listen for successful installation
		window.addEventListener('appinstalled', () => {
			console.log('PWA was installed');
			setIsInstalled(true);
			setShowPrompt(false);
		});

		return () => {
			window.removeEventListener('beforeinstallprompt', handler);
		};
	}, []);

	const handleInstall = async () => {
		if (!deferredPrompt) return;

		try {
			await deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;
			
			console.log(`User response to the install prompt: ${outcome}`);
			
			if (outcome === 'accepted') {
				console.log('User accepted the install prompt');
			} else {
				console.log('User dismissed the install prompt');
				localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
			}
			
			setDeferredPrompt(null);
			setShowPrompt(false);
		} catch (error) {
			console.error('Error showing install prompt:', error);
		}
	};

	const handleDismiss = () => {
		setShowPrompt(false);
		localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
	};

	if (isInstalled || !showPrompt || !deferredPrompt) {
		return null;
	}

	return (
		<div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-md">
			<Card className="border-2 border-primary/20 bg-white p-4 shadow-lg dark:bg-gray-900">
				<div className="flex items-start gap-3">
					<div className="flex-shrink-0">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
							📱
						</div>
					</div>
					<div className="flex-1">
						<h3 className="font-semibold text-gray-900 dark:text-gray-100">
							Install Inventory App
						</h3>
						<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
							Install this app on your home screen for quick and easy access when you're counting items.
						</p>
						<div className="mt-3 flex gap-2">
							<Button size="sm" onClick={handleInstall}>
								Install
							</Button>
							<Button size="sm" variant="outline" onClick={handleDismiss}>
								Not Now
							</Button>
						</div>
					</div>
					<button
						onClick={handleDismiss}
						className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
			</Card>
		</div>
	);
}

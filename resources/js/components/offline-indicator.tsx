import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
	const [isOnline, setIsOnline] = useState(navigator.onLine);
	const [showReconnected, setShowReconnected] = useState(false);

	useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
			setShowReconnected(true);
			setTimeout(() => setShowReconnected(false), 3000);
		};

		const handleOffline = () => {
			setIsOnline(false);
			setShowReconnected(false);
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, []);

	// Don't show anything if online and not recently reconnected
	if (isOnline && !showReconnected) {
		return null;
	}

	return (
		<div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 transform">
			{!isOnline ? (
				<div className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
					<WifiOff className="h-4 w-4" />
					<span>You're offline - Changes will sync when connected</span>
				</div>
			) : (
				<div className="flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top">
					<Wifi className="h-4 w-4" />
					<span>Back online!</span>
				</div>
			)}
		</div>
	);
}

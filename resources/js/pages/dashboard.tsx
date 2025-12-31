import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, ShoppingBag, TrendingUp, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Dashboard',
		href: '/dashboard',
	},
];

export default function Dashboard() {
	const { auth } = usePage().props as any;
	const userName = auth?.user?.name || 'User';

	const currentHour = new Date().getHours();
	let greeting = 'Good Evening';
	if (currentHour < 12) greeting = 'Good Morning';
	else if (currentHour < 18) greeting = 'Good Afternoon';

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Dashboard" />
			<div className="space-y-8">
				{/* Welcome Section with Coffee Cup */}
				<div className="relative w-full overflow-hidden">
					<div className="relative z-10 p-12 md:p-16">
						<div className="flex flex-col items-center space-y-8 text-center">
							{/* Greeting */}
							<div className="space-y-4">
								<h1 className="text-4xl font-bold text-amber-900 md:text-5xl lg:text-6xl dark:text-amber-100">
									{greeting}, {userName}!
								</h1>
								<p className="text-xl text-amber-800 md:text-2xl dark:text-amber-200">Welcome to Kaldi's Coffee</p>
								<p className="text-lg text-amber-700 dark:text-amber-300">Sip a Coffee, Make a Memory.</p>
							</div>

							{/* Kaldi's Coffee Cup Image with Realistic Steam Animation */}
							<div className="relative mt-8">
								{/* Realistic Animated Steam Effects - Multiple Layers */}
								<div className="pointer-events-none absolute -top-6 left-1/2 h-40 w-full -translate-x-1/2">
									<svg viewBox="0 0 400 200" className="h-full w-full" style={{ filter: 'blur(1px)' }}>
										<defs>
											{/* Gradient for realistic steam fade */}
											<linearGradient id="steamGradient1" x1="0%" y1="100%" x2="0%" y2="0%">
												<stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
												<stop offset="20%" stopColor="currentColor" stopOpacity="0.1" />
												<stop offset="50%" stopColor="currentColor" stopOpacity="0.05" />
											</linearGradient>
											<linearGradient id="steamGradient2" x1="0%" y1="100%" x2="0%" y2="0%">
												<stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
												<stop offset="50%" stopColor="currentColor" stopOpacity="0.1" />
												<stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
											</linearGradient>
										</defs>

										{/* Layer 1 - Background steam (thin, slow) */}
										<g className="text-gray-400 dark:text-gray-300">
											<path
												d="M120 160 Q115 130 120 100 Q125 70 120 40 Q115 10 120 -10"
												fill="none"
												stroke="url(#steamGradient2)"
												strokeWidth="2"
												strokeLinecap="round"
											>
												<animate
													attributeName="d"
													values="M120 160 Q115 130 120 100 Q125 70 120 40 Q115 10 120 -10;
                                                            M120 160 Q125 130 120 100 Q115 70 120 40 Q125 10 120 -10;
                                                            M120 160 Q115 130 120 100 Q125 70 120 40 Q115 10 120 -10"
													dur="4s"
													repeatCount="indefinite"
												/>
											</path>
											<path
												d="M280 160 Q285 130 280 100 Q275 70 280 40 Q285 10 280 -10"
												fill="none"
												stroke="url(#steamGradient2)"
												strokeWidth="2"
												strokeLinecap="round"
											>
												<animate
													attributeName="d"
													values="M280 160 Q285 130 280 100 Q275 70 280 40 Q285 10 280 -10;
                                                            M280 160 Q275 130 280 100 Q285 70 280 40 Q275 10 280 -10;
                                                            M280 160 Q285 130 280 100 Q275 70 280 40 Q285 10 280 -10"
													dur="4.5s"
													repeatCount="indefinite"
												/>
											</path>
										</g>

										{/* Layer 2 - Main steam (medium thickness) */}
										<g className="text-gray-300 dark:text-gray-200">
											<path
												d="M150 160 Q145 125 152 90 Q158 55 150 20 Q145 -5 152 -20"
												fill="none"
												stroke="url(#steamGradient1)"
												strokeWidth="3.5"
												strokeLinecap="round"
											>
												<animate
													attributeName="d"
													values="M150 160 Q145 125 152 90 Q158 55 150 20 Q145 -5 152 -20;
                                                            M150 160 Q155 125 148 90 Q142 55 150 20 Q155 -5 148 -20;
                                                            M150 160 Q145 125 152 90 Q158 55 150 20 Q145 -5 152 -20"
													dur="3.2s"
													repeatCount="indefinite"
												/>
											</path>
											<path
												d="M250 160 Q255 125 248 90 Q242 55 250 20 Q255 -5 248 -20"
												fill="none"
												stroke="url(#steamGradient1)"
												strokeWidth="3.5"
												strokeLinecap="round"
											>
												<animate
													attributeName="d"
													values="M250 160 Q255 125 248 90 Q242 55 250 20 Q255 -5 248 -20;
                                                            M250 160 Q245 125 252 90 Q258 55 250 20 Q245 -5 252 -20;
                                                            M250 160 Q255 125 248 90 Q242 55 250 20 Q255 -5 248 -20"
													dur="3.7s"
													repeatCount="indefinite"
												/>
											</path>
										</g>

										{/* Layer 3 - Center steam (thickest, most visible) */}
										<g className="text-gray-200 dark:text-gray-100">
											<path
												d="M200 160 Q195 120 202 85 Q208 50 200 18 Q195 -10 202 -25"
												fill="none"
												stroke="url(#steamGradient1)"
												strokeWidth="5"
												strokeLinecap="round"
											>
												<animate
													attributeName="d"
													values="M200 160 Q195 120 202 85 Q208 50 200 18 Q195 -10 202 -25;
                                                            M200 160 Q205 120 198 85 Q192 50 200 18 Q205 -10 198 -25;
                                                            M200 160 Q195 120 202 85 Q208 50 200 18 Q195 -10 202 -25"
													dur="2.8s"
													repeatCount="indefinite"
												/>
											</path>
										</g>

										{/* Layer 4 - Wispy side steam (thin, fast) */}
										<g className="text-gray-300 dark:text-gray-200">
											<path
												d="M180 160 Q175 135 182 105 Q188 75 180 45 Q175 20 182 0"
												fill="none"
												stroke="url(#steamGradient2)"
												strokeWidth="2.5"
												strokeLinecap="round"
											>
												<animate
													attributeName="d"
													values="M180 160 Q175 135 182 105 Q188 75 180 45 Q175 20 182 0;
                                                            M180 160 Q185 135 178 105 Q172 75 180 45 Q185 20 178 0;
                                                            M180 160 Q175 135 182 105 Q188 75 180 45 Q175 20 182 0"
													dur="2.3s"
													repeatCount="indefinite"
												/>
											</path>
											<path
												d="M220 160 Q225 135 218 105 Q212 75 220 45 Q225 20 218 0"
												fill="none"
												stroke="url(#steamGradient2)"
												strokeWidth="2.5"
												strokeLinecap="round"
											>
												<animate
													attributeName="d"
													values="M220 160 Q225 135 218 105 Q212 75 220 45 Q225 20 218 0;
                                                            M220 160 Q215 135 222 105 Q228 75 220 45 Q215 20 222 0;
                                                            M220 160 Q225 135 218 105 Q212 75 220 45 Q225 20 218 0"
													dur="2.6s"
													repeatCount="indefinite"
												/>
											</path>
										</g>
									</svg>
								</div>

								{/* Kaldi's Cup Image */}
								<div className="relative z-10">
									<img
										src="/images/kaldis cup.png"
										alt="Kaldi's Coffee Cup"
										className="h-64 w-64 object-contain drop-shadow-2xl md:h-80 md:w-80"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Decorative coffee beans pattern */}
					<div className="absolute top-8 left-8 opacity-10 dark:opacity-5">
						<div className="h-16 w-16 rotate-12 transform rounded-full bg-amber-800"></div>
					</div>
					<div className="absolute right-8 bottom-8 opacity-10 dark:opacity-5">
						<div className="h-20 w-20 -rotate-12 transform rounded-full bg-amber-800"></div>
					</div>
					<div className="absolute top-1/2 right-12 opacity-5 dark:opacity-3">
						<div className="h-24 w-24 rounded-full bg-amber-900"></div>
					</div>
				</div>
			</div>
		</AppLayout>
	);
}

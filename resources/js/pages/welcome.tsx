import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
                <style>{`
                    @keyframes logoFloat {
                        0%, 100% { transform: translateY(0px) rotate(0deg); }
                        50% { transform: translateY(-10px) rotate(2deg); }
                    }
                    
                    @keyframes steamRise {
                        0% { transform: translateY(20px) scale(0.8); opacity: 0; }
                        50% { transform: translateY(-10px) scale(1); opacity: 1; }
                        100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
                    }
                    
                    
                    @keyframes pulseGlow {
                        0%, 100% { box-shadow: 0 0 20px rgba(139, 69, 19, 0.3); }
                        50% { box-shadow: 0 0 40px rgba(139, 69, 19, 0.6), 0 0 60px rgba(139, 69, 19, 0.3); }
                    }
                    
                    @keyframes circleExpand {
                        0%, 100% { transform: scale(1); opacity: 0.3; }
                        50% { transform: scale(1.1); opacity: 0.6; }
                    }
                    
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(30px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    
                    .logo-float {
                        animation: logoFloat 3s ease-in-out infinite;
                    }
                    
                    .steam-animation {
                        animation: steamRise 2s ease-out infinite;
                    }
                    
                    
                    .pulse-glow {
                        animation: pulseGlow 2s ease-in-out infinite;
                    }
                    
                    .circle-expand {
                        animation: circleExpand 3s ease-in-out infinite;
                    }
                    
                    .fade-in-up {
                        animation: fadeInUp 0.8s ease-out forwards;
                    }
                    
                `}</style>
            </Head>
            <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]">
                <header className="mb-6 w-full max-w-[335px] text-sm not-has-[nav]:hidden lg:max-w-4xl">
                    <nav className="flex items-center justify-end gap-4 pr-2">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                                >
                                    Log in
                                </Link>
                            </>
                        )}
                    </nav>
                </header>
                <div className="flex w-full items-center justify-center opacity-100 transition-opacity duration-750 flex-1 lg:grow starting:opacity-0">
                    <main className="flex w-full max-w-[335px] flex-col items-center justify-center lg:max-w-4xl">
                        <div className="flex flex-col items-center justify-center w-full fade-in-up">
                            
                            <div className="relative flex h-48 w-48 items-center justify-center mx-auto lg:h-64 lg:w-64">
                                {/* Main Logo Container */}
                                <div className="relative  rounded-full p-2 bg-white dark:bg-gray-800 shadow-2xl">
                                    <AppLogoIcon />
                                    
                                    {/* Steam Animation */}
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 flex space-x-1">
                                        <div className="w-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-full steam-animation opacity-60"></div>
                                        <div className="w-1 h-4 bg-gray-300 dark:bg-gray-400 rounded-full steam-animation opacity-60" style={{animationDelay: '0.5s'}}></div>
                                        <div className="w-1 h-8 bg-gray-300 dark:bg-gray-400 rounded-full steam-animation opacity-60" style={{animationDelay: '1s'}}></div>
                                    </div>
                                </div>

                                {/* Decorative Circles */}
                                <div className="absolute inset-0 border-2 border-amber-200 dark:border-amber-700 rounded-full circle-expand" style={{width: '120%', height: '120%', top: '-10%', left: '-10%'}}></div>
                                <div className="absolute inset-0 border border-amber-300 dark:border-amber-600 rounded-full circle-expand" style={{width: '140%', height: '140%', top: '-20%', left: '-20%', animationDelay: '1s'}}></div>
                                <div className="absolute inset-0 border border-orange-200 dark:border-orange-700 rounded-full circle-expand" style={{width: '160%', height: '160%', top: '-30%', left: '-30%', animationDelay: '2s'}}></div>
                            </div>
                        </div>
                    </main>
                </div>
                <div className="hidden h-14.5 lg:block"></div>
            </div>
        </>
    );
}
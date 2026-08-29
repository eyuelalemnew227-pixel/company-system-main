import ApplicationLogo from '@/Components/ApplicationLogo';
import { Button } from '@/Components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu';
import { useI18n } from '@/Components/i18n-provider';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Globe } from 'lucide-react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    const { lang, setLang } = useI18n();

    return (
        <div className="relative flex min-h-screen flex-col items-center bg-gray-100 pt-6 sm:justify-center sm:pt-0">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="absolute top-4 right-4 gap-1.5">
                        <Globe className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase">{lang}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => setLang('en')} className={cn(lang === 'en' && 'bg-accent')}>🇬🇧 English</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLang('am')} className={cn(lang === 'am' && 'bg-accent')}>🇪🇹 አማርኛ</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <div>
                <Link href="/">
                    <ApplicationLogo className="h-20 w-20 fill-current text-gray-500" />
                </Link>
            </div>

            <div className="mt-6 w-full overflow-hidden bg-white px-6 py-4 shadow-md sm:max-w-md sm:rounded-lg">
                {children}
            </div>
        </div>
    );
}

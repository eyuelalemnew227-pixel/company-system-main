import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

export default function InputError({ message, className = '', alert = false, ...props }: HTMLAttributes<HTMLParagraphElement> & { message?: string, alert?: boolean }) {
    return message ? (
        <p {...props} className={cn('text-sm text-red-600 dark:text-red-400', alert && 'animate-pulse text-base font-semibold mt-1 flex items-center gap-1.5', className)}>
            {alert && <AlertCircle className="w-4 h-4" />}
            {message}
        </p>
    ) : null;
}

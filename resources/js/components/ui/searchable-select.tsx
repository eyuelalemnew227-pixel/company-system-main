import * as React from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

export interface SelectOption {
    id: string | number;
    name: string;
}

interface SearchableSelectProps {
    options: SelectOption[];
    value?: string | number;
    onValueChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    allowAll?: boolean;
    allLabel?: string;
    allValue?: string;
    className?: string;
    disabled?: boolean;
}

export function SearchableSelect({
    options = [],
    value,
    onValueChange,
    placeholder = 'Select option...',
    searchPlaceholder = 'Search...',
    emptyText = 'No option found.',
    allowAll = false,
    allLabel = 'All Options',
    allValue = 'all',
    className = 'w-full',
    disabled = false,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');

    const stringValue = value !== undefined && value !== null ? String(value) : '';

    const selectedOption = React.useMemo(() => {
        return options.find(
            (opt) => String(opt.id) === stringValue || opt.name === stringValue
        );
    }, [options, stringValue]);

    let displayLabel = placeholder;
    if (allowAll && (stringValue === allValue || stringValue === '')) {
        displayLabel = allLabel;
    } else if (selectedOption) {
        displayLabel = selectedOption.name;
    }

    const filteredOptions = React.useMemo(() => {
        if (!search.trim()) return options;
        const q = search.toLowerCase().trim();
        return options.filter(
            (opt) => opt.name.toLowerCase().includes(q) || String(opt.id).toLowerCase().includes(q)
        );
    }, [options, search]);

    const handleSelect = (selectedVal: string) => {
        onValueChange(selectedVal);
        setOpen(false);
        setSearch('');
    };

    return (
        <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'justify-between font-normal text-left bg-white dark:bg-zinc-950 border-input text-foreground h-10 px-3 py-2',
                        className
                    )}
                >
                    <span className="truncate">{displayLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-2 z-[9999] bg-popover shadow-md border rounded-md"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 pr-8 h-9 text-sm"
                        autoFocus
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <div className="max-h-[220px] overflow-y-auto space-y-0.5">
                    {allowAll && (
                        <div
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(allValue);
                            }}
                            className={cn(
                                'flex items-center justify-between px-2.5 py-1.5 rounded-sm text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground',
                                (stringValue === allValue || stringValue === '') && 'bg-accent/50 font-medium'
                            )}
                        >
                            <span>{allLabel}</span>
                            {(stringValue === allValue || stringValue === '') && <Check className="h-4 w-4 text-primary" />}
                        </div>
                    )}

                    {filteredOptions.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">{emptyText}</div>
                    ) : (
                        filteredOptions.map((opt) => {
                            const optIdStr = String(opt.id);
                            const isSelected = stringValue === optIdStr || stringValue === opt.name;
                            return (
                                <div
                                    key={opt.id}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelect(optIdStr);
                                    }}
                                    className={cn(
                                        'flex items-center justify-between px-2.5 py-2 rounded-sm text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground select-none transition-colors',
                                        isSelected && 'bg-purple-100 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 font-semibold'
                                    )}
                                >
                                    <span className="truncate">{opt.name}</span>
                                    {isSelected && <Check className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />}
                                </div>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

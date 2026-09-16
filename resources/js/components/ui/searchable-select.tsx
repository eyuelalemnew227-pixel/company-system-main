import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

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
    options,
    value,
    onValueChange,
    placeholder = 'Select option...',
    searchPlaceholder = 'Search...',
    emptyText = 'No option found.',
    allowAll = false,
    allLabel = 'All Departments',
    allValue = 'all',
    className = 'w-full',
    disabled = false,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');

    const stringValue = value !== undefined && value !== null ? String(value) : '';

    const selectedOption = options.find(
        (opt) => String(opt.id) === stringValue || opt.name === stringValue
    );

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
        <Popover
            open={open}
            onOpenChange={(newOpen) => {
                setOpen(newOpen);
                if (!newOpen) setSearch('');
            }}
            modal={true}
        >
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'justify-between font-normal text-left bg-white dark:bg-zinc-900 border-input text-foreground',
                        className
                    )}
                >
                    <span className="truncate">{displayLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-0 z-[100]"
                align="start"
            >
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        {filteredOptions.length === 0 && !allowAll && (
                            <CommandEmpty>{emptyText}</CommandEmpty>
                        )}
                        <CommandGroup>
                            {allowAll && (
                                <CommandItem
                                    value={allLabel}
                                    onSelect={() => handleSelect(allValue)}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            stringValue === allValue || stringValue === '' ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    {allLabel}
                                </CommandItem>
                            )}
                            {filteredOptions.map((opt) => {
                                const optIdStr = String(opt.id);
                                const isSelected = stringValue === optIdStr || stringValue === opt.name;
                                return (
                                    <CommandItem
                                        key={opt.id}
                                        value={opt.name}
                                        onSelect={() => handleSelect(optIdStr)}
                                    >
                                        <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                                        {opt.name}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

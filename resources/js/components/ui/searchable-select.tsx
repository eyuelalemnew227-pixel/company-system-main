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

    const stringValue = value !== undefined && value !== null ? String(value) : '';

    const selectedOption = options.find((opt) => String(opt.id) === stringValue);

    let displayLabel = placeholder;
    if (allowAll && (stringValue === allValue || stringValue === '')) {
        displayLabel = allLabel;
    } else if (selectedOption) {
        displayLabel = selectedOption.name;
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn('justify-between font-normal text-left bg-white dark:bg-zinc-900 border-input text-foreground', className)}
                >
                    <span className="truncate">{displayLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {allowAll && (
                                <CommandItem
                                    value={`__all__ ${allLabel}`}
                                    onSelect={() => {
                                        onValueChange(allValue);
                                        setOpen(false);
                                    }}
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
                            {options.map((opt) => {
                                const optIdStr = String(opt.id);
                                const isSelected = stringValue === optIdStr;
                                return (
                                    <CommandItem
                                        key={opt.id}
                                        value={`${optIdStr} ${opt.name}`}
                                        onSelect={() => {
                                            onValueChange(optIdStr);
                                            setOpen(false);
                                        }}
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

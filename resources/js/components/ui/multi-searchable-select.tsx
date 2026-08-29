import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

export interface MultiSelectOption {
    id: string | number;
    name: string;
}

interface MultiSearchableSelectProps {
    options: MultiSelectOption[];
    value: string[];
    onValueChange: (value: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    className?: string;
    disabled?: boolean;
}

export function MultiSearchableSelect({
    options,
    value = [],
    onValueChange,
    placeholder = 'Select departments...',
    searchPlaceholder = 'Search departments...',
    emptyText = 'No department found.',
    className = 'w-full',
    disabled = false,
}: MultiSearchableSelectProps) {
    const [open, setOpen] = React.useState(false);

    const toggleOption = (optionName: string) => {
        if (value.includes(optionName)) {
            onValueChange(value.filter((val) => val !== optionName));
        } else {
            onValueChange([...value, optionName]);
        }
    };

    const removeOption = (optionName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onValueChange(value.filter((val) => val !== optionName));
    };

    return (
        <div className={cn('space-y-2', className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className="w-full justify-between font-normal text-left bg-white dark:bg-zinc-900 border-input text-foreground min-h-[40px] h-auto py-2"
                    >
                        <span className="truncate text-muted-foreground">
                            {value.length === 0 ? placeholder : `${value.length} department(s) selected`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder={searchPlaceholder} />
                        <CommandList>
                            <CommandEmpty>{emptyText}</CommandEmpty>
                            <CommandGroup>
                                {options.map((opt) => {
                                    const isSelected = value.includes(opt.name);
                                    return (
                                        <CommandItem
                                            key={opt.id}
                                            value={`${opt.id} ${opt.name}`}
                                            onSelect={() => toggleOption(opt.name)}
                                        >
                                            <Check
                                                className={cn(
                                                    'mr-2 h-4 w-4 text-amber-700 dark:text-amber-500',
                                                    isSelected ? 'opacity-100' : 'opacity-0'
                                                )}
                                            />
                                            {opt.name}
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Selected Tags Badges */}
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {value.map((item) => (
                        <Badge
                            key={item}
                            variant="secondary"
                            className="bg-amber-100/80 text-amber-900 dark:bg-amber-950 dark:text-amber-200 py-1 pl-2.5 pr-1.5 gap-1 font-medium text-xs"
                        >
                            {item}
                            <button
                                type="button"
                                onClick={(e) => removeOption(item, e)}
                                className="rounded-full hover:bg-amber-200/80 dark:hover:bg-amber-900 p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}

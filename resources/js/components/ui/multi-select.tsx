import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  showSelectedLabels?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select items...',
  className,
  showSelectedLabels = true,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange([]);
  };

  const selectedLabels = selected
    .map((value) => options.find((opt) => opt.value === value)?.label)
    .filter(Boolean);

  const isAllSelected = selected.length === options.length && options.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between min-h-10 h-auto py-2', className)}
        >
          <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : !showSelectedLabels ? (
              <span className="text-sm font-medium">
                {selected.length === options.length ? 'All Selected' : `${selected.length} Selected`}
              </span>
            ) : (
              <>
                {selectedLabels.slice(0, 2).map((label, index) => (
                  <Badge
                    key={selected[index]}
                    variant="secondary"
                    className="mr-1"
                    onClick={(e) => handleRemove(selected[index], e)}
                  >
                    {label}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
                {selected.length > 2 && (
                  <Badge variant="secondary">+{selected.length - 2} more</Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {selected.length > 0 && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={handleClearAll}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto p-2">
          {options.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No options available
            </div>
          ) : (
            <div className="space-y-1">
              <div
                className="flex items-center space-x-2 p-2 rounded-sm hover:bg-accent cursor-pointer border-b mb-1 pb-2"
                onClick={handleSelectAll}
              >
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                />
                <label className="flex-1 cursor-pointer text-sm font-medium">
                  Select All
                </label>
              </div>
              {options.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 p-2 rounded-sm hover:bg-accent cursor-pointer"
                  onClick={() => handleSelect(option.value)}
                >
                  <Checkbox
                    checked={selected.includes(option.value)}
                    onCheckedChange={() => handleSelect(option.value)}
                  />
                  <label className="flex-1 cursor-pointer text-sm">
                    {option.label}
                  </label>
                  {selected.includes(option.value) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

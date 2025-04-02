"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import debounce from "lodash/debounce"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
}

interface AsyncComboboxProps {
  value: ComboboxOption | null
  onChange: (value: ComboboxOption | null) => void
  fetchOptions: (search: string) => Promise<ComboboxOption[]>
  placeholder?: string
  searchPlaceholder?: string
  noResultsMessage?: string
  loadingPlaceholder?: string
  icon?: React.ReactNode
  className?: string
  clearable?: boolean
}

export function AsyncCombobox({
  value,
  onChange,
  fetchOptions,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  noResultsMessage = "No results found.",
  loadingPlaceholder = "Loading...",
  icon,
  className,
  clearable = false,
}: AsyncComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [options, setOptions] = React.useState<ComboboxOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  // Create a memoized version of the debounced function to prevent it from changing on every render
  const debouncedFetch = React.useMemo(() => 
    debounce(async (searchTerm: string) => {
      if (!open) return; // Skip fetching if popover is closed
      
      setIsLoading(true);
      try {
        const fetchedOptions = await fetchOptions(searchTerm);
        // Only update options if the popover is still open
        if (open) {
          setOptions(fetchedOptions);
        }
      } catch (error) {
        console.error("Error fetching combobox options:", error);
        if (open) {
          setOptions([]); // Clear options on error
        }
      } finally {
        if (open) {
          setIsLoading(false);
        }
      }
    }, 300),
    [fetchOptions, open]
  );

  // Trigger search when search term changes or popover opens
  React.useEffect(() => {
    if (open) {
      debouncedFetch(search);
    }
    
    return () => {
      debouncedFetch.cancel();
    };
  }, [search, open, debouncedFetch]);

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const handleSelect = React.useCallback((currentValue: string) => {
    const selectedOption = options.find(
      (option) => option.value === currentValue
    );
    
    onChange(selectedOption || null);
    setOpen(false);
  }, [options, onChange]);

  // Handle clear button click
  const handleClear = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(null);
    
    // Prevent the dropdown from opening
    setTimeout(() => {
      // Ensure any focus is removed to prevent dropdown from opening
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }, 0);
  }, [onChange]);
  
  // Create a stable callback for input changes
  const handleInputChange = React.useCallback((newSearch: string) => {
    setSearch(newSearch);
  }, []);

  // Determine display label for the button
  const displayLabel = React.useMemo(() => {
    return value ? value.label : placeholder;
  }, [value, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {icon && <span className="mr-2 shrink-0">{icon}</span>}
          <span className="truncate">
            {displayLabel}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {clearable && value && (
              <span
                role="button"
                onClick={handleClear}
                className="size-4 opacity-70 hover:opacity-100 rounded-sm flex items-center justify-center cursor-pointer"
                onMouseDown={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseUp={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={(e: React.TouchEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                tabIndex={-1}
                aria-label="Clear selection"
              >
                <X className="size-3.5" />
                <span className="sr-only">Clear</span>
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-1000">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={handleInputChange}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>{loadingPlaceholder}</span>
              </div>
            )}
            {!isLoading && options.length === 0 && (
              <CommandEmpty>{search ? noResultsMessage : "Type to search..."}</CommandEmpty>
            )}
            {!isLoading && options.length > 0 && (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 
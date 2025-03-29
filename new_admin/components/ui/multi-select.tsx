"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "./badge";
import { Command, CommandGroup, CommandItem } from "./command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "../../lib/utils";

export interface Option {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  key?: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  badgeClassName?: string;
  clearable?: boolean;
}

export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      options,
      selected,
      onChange,
      placeholder = "Select options",
      className,
      badgeClassName,
      clearable = false,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    const handleUnselect = (item: string) => {
      onChange(selected.filter((i) => i !== item));
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 0);
    };

    const handleClearAll = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onChange([]);
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = e.target as HTMLInputElement;
      if (input.value === "" && e.key === "Backspace") {
        onChange(selected.slice(0, -1));
      }
      
      // Prevent key events from propagating to the command menu
      if (e.key === "Escape") {
        setOpen(false);
        e.preventDefault();
      }
    };

    // Filter options based on input value and selected values
    const filteredOptions = options.filter((option) => {
      const matchesInput = option.label.toLowerCase().includes(inputValue.toLowerCase());
      return matchesInput;
    });

    return (
      <Command
        onKeyDown={handleKeyDown}
        className={cn(
          "overflow-visible bg-transparent",
          className
        )}
        {...props}
      >
        <div
          className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          cmdk-input-wrapper=""
          ref={ref}
        >
          <div className="flex flex-wrap gap-1">
            {selected.map((item) => {
              const selectedOption = options.find(option => option.value === item);
              return (
                <Badge
                  key={item}
                  variant="secondary"
                  className={cn(
                    "rounded hover:bg-secondary mr-1 py-1 pr-1 pl-2",
                    badgeClassName
                  )}
                >
                  {selectedOption?.label || item}
                  <span
                    className="ml-1 rounded-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(item);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnselect(item);
                    }}
                    tabIndex={0}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </span>
                </Badge>
              );
            })}
            <CommandPrimitive.Input
              placeholder={selected.length === 0 ? placeholder : undefined}
              value={inputValue}
              onValueChange={setInputValue}
              onBlur={() => setOpen(false)}
              onFocus={() => setOpen(true)}
              className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
            />
            {clearable && selected.length > 0 && (
              <span
                role="button"
                className="flex-shrink-0 ml-auto rounded-sm opacity-70 hover:opacity-100 flex items-center justify-center cursor-pointer"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={handleClearAll}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                tabIndex={-1}
                aria-label="Clear all selected items"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear all</span>
              </span>
            )}
          </div>
        </div>
        <div className="relative mt-2">
          {open && filteredOptions.length > 0 && (
            <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandGroup className="max-h-[200px] overflow-auto">
                {filteredOptions.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <CommandItem
                      key={option.key || option.value}
                      onSelect={() => {
                        if (isSelected) {
                          onChange(selected.filter((i) => i !== option.value));
                        } else {
                          onChange([...selected, option.value]);
                        }
                        setInputValue("");
                      }}
                      className={cn(
                        "flex items-center gap-2 px-2",
                        isSelected ? "bg-accent" : ""
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <svg
                          className={cn("h-3 w-3")}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      {option.icon && (
                        <option.icon className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          )}
        </div>
      </Command>
    );
  }
);

MultiSelect.displayName = "MultiSelect"; 
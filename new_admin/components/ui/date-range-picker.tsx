"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { TimePickerInput } from "./time-picker-input";
import { Separator } from "./separator";

interface DateRangePickerProps {
  className?: string;
  value?: DateRange;
  onChange?: (value: DateRange | undefined) => void;
  timePicker?: boolean;
}

export function DateRangePicker({
  className,
  value,
  onChange,
  timePicker = false,
}: DateRangePickerProps) {
  const [fromTime, setFromTime] = React.useState<{
    hours: number;
    minutes: number;
  }>({ hours: value?.from ? value.from.getHours() : 0, minutes: value?.from ? value.from.getMinutes() : 0 });

  const [toTime, setToTime] = React.useState<{
    hours: number;
    minutes: number;
  }>({ hours: value?.to ? value.to.getHours() : 0, minutes: value?.to ? value.to.getMinutes() : 0 });

  // Update time when date range changes
  React.useEffect(() => {
    if (value?.from) {
      setFromTime({ hours: value.from.getHours(), minutes: value.from.getMinutes() });
    }
    if (value?.to) {
      setToTime({ hours: value.to.getHours(), minutes: value.to.getMinutes() });
    }
  }, [value?.from, value?.to]);

  // Handle time change for from date
  const handleFromTimeChange = React.useCallback(
    (hours: number, minutes: number) => {
      if (!value?.from) return;
      
      setFromTime({ hours, minutes });
      const newFrom = new Date(value.from);
      newFrom.setHours(hours);
      newFrom.setMinutes(minutes);
      
      onChange?.({ from: newFrom, to: value.to });
    },
    [value, onChange]
  );

  // Handle time change for to date
  const handleToTimeChange = React.useCallback(
    (hours: number, minutes: number) => {
      if (!value?.to) return;
      
      setToTime({ hours, minutes });
      const newTo = new Date(value.to);
      newTo.setHours(hours);
      newTo.setMinutes(minutes);
      
      onChange?.({ from: value.from, to: newTo });
    },
    [value, onChange]
  );

  // Format display string
  const formatDateDisplay = React.useCallback(() => {
    if (!value?.from) return <span>Pick a date range</span>;
    
    if (timePicker) {
      if (value.to) {
        return (
          <>
            {format(value.from, "LLL dd, y")} {format(value.from, "HH:mm")} -{" "}
            {format(value.to, "LLL dd, y")} {format(value.to, "HH:mm")}
          </>
        );
      }
      return <>{format(value.from, "LLL dd, y")} {format(value.from, "HH:mm")}</>;
    } else {
      if (value.to) {
        return (
          <>
            {format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}
          </>
        );
      }
      return format(value.from, "LLL dd, y");
    }
  }, [value, timePicker]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateDisplay()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
          />
          
          {timePicker && value?.from && (
            <>
              <Separator className="my-0" />
              <div className="p-4 pt-0">
                <h3 className="py-3 text-center font-medium flex items-center justify-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Time Selection</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {value.from && (
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-sm font-medium text-muted-foreground mb-1">From Time</div>
                      <TimePickerInput
                        value={{ hours: fromTime.hours, minutes: fromTime.minutes }}
                        onChange={(hours: number, minutes: number) => handleFromTimeChange(hours, minutes)}
                      />
                    </div>
                  )}
                  
                  {value.to && (
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-sm font-medium text-muted-foreground mb-1">To Time</div>
                      <TimePickerInput
                        value={{ hours: toTime.hours, minutes: toTime.minutes }}
                        onChange={(hours: number, minutes: number) => handleToTimeChange(hours, minutes)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
} 
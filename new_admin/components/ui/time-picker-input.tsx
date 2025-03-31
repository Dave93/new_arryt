"use client"

import * as React from "react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { ChevronUp, ChevronDown } from "lucide-react"

interface TimePickerInputProps {
  value: {
    hours: number
    minutes: number
  }
  onChange: (hours: number, minutes: number) => void
  className?: string
}

export function TimePickerInput({
  value,
  onChange,
  className,
}: TimePickerInputProps) {
  // Format with leading zeros
  const displayHours = value.hours.toString().padStart(2, "0")
  const displayMinutes = value.minutes.toString().padStart(2, "0")

  // Increment/decrement handlers
  const incrementHours = () => {
    const newHours = (value.hours + 1) % 24
    onChange(newHours, value.minutes)
  }

  const decrementHours = () => {
    const newHours = (value.hours - 1 + 24) % 24
    onChange(newHours, value.minutes)
  }

  const incrementMinutes = () => {
    const newMinutes = (value.minutes + 1) % 60
    onChange(value.hours, newMinutes)
  }

  const decrementMinutes = () => {
    const newMinutes = (value.minutes - 1 + 60) % 60
    onChange(value.hours, newMinutes)
  }

  // Direct input handlers
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hours = parseInt(e.target.value, 10)
    if (!isNaN(hours)) {
      const clampedHours = Math.max(0, Math.min(23, hours))
      onChange(clampedHours, value.minutes)
    }
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value, 10)
    if (!isNaN(minutes)) {
      const clampedMinutes = Math.max(0, Math.min(59, minutes))
      onChange(value.hours, clampedMinutes)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={incrementHours}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={displayHours}
          onChange={handleHoursChange}
          className="w-10 border-0 bg-transparent text-center text-base tabular-nums focus:outline-none focus:ring-0"
          maxLength={2}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={decrementHours}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
      <div className="text-xl font-medium text-muted-foreground">:</div>
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={incrementMinutes}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={displayMinutes}
          onChange={handleMinutesChange}
          className="w-10 border-0 bg-transparent text-center text-base tabular-nums focus:outline-none focus:ring-0"
          maxLength={2}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={decrementMinutes}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
} 
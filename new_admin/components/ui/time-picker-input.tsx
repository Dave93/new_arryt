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
  const [hoursInput, setHoursInput] = React.useState(value.hours.toString().padStart(2, "0"))
  const [minutesInput, setMinutesInput] = React.useState(value.minutes.toString().padStart(2, "0"))
  const [editingHours, setEditingHours] = React.useState(false)
  const [editingMinutes, setEditingMinutes] = React.useState(false)

  // Sync display from props when not editing
  React.useEffect(() => {
    if (!editingHours) {
      setHoursInput(value.hours.toString().padStart(2, "0"))
    }
  }, [value.hours, editingHours])

  React.useEffect(() => {
    if (!editingMinutes) {
      setMinutesInput(value.minutes.toString().padStart(2, "0"))
    }
  }, [value.minutes, editingMinutes])

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

  const commitHours = () => {
    setEditingHours(false)
    const parsed = parseInt(hoursInput, 10)
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(23, parsed))
      onChange(clamped, value.minutes)
    } else {
      setHoursInput(value.hours.toString().padStart(2, "0"))
    }
  }

  const commitMinutes = () => {
    setEditingMinutes(false)
    const parsed = parseInt(minutesInput, 10)
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(59, parsed))
      onChange(value.hours, clamped)
    } else {
      setMinutesInput(value.minutes.toString().padStart(2, "0"))
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
          value={hoursInput}
          onFocus={(e) => {
            setEditingHours(true)
            e.target.select()
          }}
          onChange={(e) => setHoursInput(e.target.value)}
          onBlur={commitHours}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur()
            }
          }}
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
          value={minutesInput}
          onFocus={(e) => {
            setEditingMinutes(true)
            e.target.select()
          }}
          onChange={(e) => setMinutesInput(e.target.value)}
          onBlur={commitMinutes}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur()
            }
          }}
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

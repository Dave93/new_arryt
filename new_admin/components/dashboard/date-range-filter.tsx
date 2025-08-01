"use client"

import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import MultipleSelector, { Option } from "@/components/ui/multiselect"

export function DashboardDateRangeFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const from = searchParams.get("start_date")
    const to = searchParams.get("end_date")
    
    if (from || to) {
      return {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      }
    }
    
    // По умолчанию - сегодня
    const today = new Date()
    return {
      from: today,
      to: today,
    }
  })
  
  const [selectedRegionId, setSelectedRegionId] = useState<string>(() => {
    return searchParams.get("region") || "capital"
  })
  
  // Memoize regionOptions to prevent it from changing on every render
  const regionOptionsData = useMemo(() => [
    { label: "Столица", value: "capital" },
    { label: "Регион", value: "region" }
  ], [])
  
  // Format regions for MultipleSelector options
  const regionSelectorOptions = useMemo((): Option[] => {
    const options = regionOptionsData.map(region => ({ value: region.value, label: region.label }))
    return [{ value: "all", label: "Все регионы" }, ...options]
  }, [regionOptionsData])
  
  // Get selected region Option object for the value prop
  const selectedRegionOption = useMemo((): Option[] => {
    if (selectedRegionId === "all") return []
    const region = regionOptionsData.find(r => r.value === selectedRegionId)
    return region ? [{ value: region.value, label: region.label }] : []
  }, [selectedRegionId, regionOptionsData])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (date?.from) {
      params.set("start_date", format(date.from, "yyyy-MM-dd"))
    } else {
      params.delete("start_date")
    }
    
    if (date?.to) {
      params.set("end_date", format(date.to, "yyyy-MM-dd"))
    } else {
      params.delete("end_date")
    }
    
    if (selectedRegionId && selectedRegionId !== "all") {
      params.set("region", selectedRegionId)
    } else {
      params.delete("region")
    }
    
    const queryString = params.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname
    
    router.push(url)
  }, [date, selectedRegionId, pathname, router, searchParams])

  const handlePresetClick = (preset: "today" | "yesterday" | "week" | "month") => {
    const today = new Date()
    let newDate: DateRange | undefined
    
    switch (preset) {
      case "today":
        newDate = { from: today, to: today }
        break
      case "yesterday":
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        newDate = { from: yesterday, to: yesterday }
        break
      case "week":
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        newDate = { from: weekAgo, to: today }
        break
      case "month":
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        newDate = { from: monthAgo, to: today }
        break
    }
    
    setDate(newDate)
  }

  return (
    <div className="flex items-center gap-2 px-4 lg:px-6 flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "d MMM yyyy", { locale: ru })} -{" "}
                  {format(date.to, "d MMM yyyy", { locale: ru })}
                </>
              ) : (
                format(date.from, "d MMM yyyy", { locale: ru })
              )
            ) : (
              <span>Выберите период</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            locale={ru}
          />
        </PopoverContent>
      </Popover>
      
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePresetClick("today")}
        >
          Сегодня
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePresetClick("yesterday")}
        >
          Вчера
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePresetClick("week")}
        >
          Неделя
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePresetClick("month")}
        >
          Месяц
        </Button>
      </div>
      
      <MultipleSelector
        value={selectedRegionOption}
        onChange={(options) => setSelectedRegionId(options[0]?.value ?? "all")}
        defaultOptions={regionSelectorOptions}
        placeholder="Выберите регион"
        maxSelected={1}
        hidePlaceholderWhenSelected
        className="w-[200px]"
        commandProps={{
          label: "Выберите регион",
        }}
        selectFirstItem={false}
      />
    </div>
  )
}
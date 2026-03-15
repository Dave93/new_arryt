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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/eden-client"

interface Organization {
  id: string
  name: string
}

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

    const today = new Date()
    return { from: today, to: today }
  })

  const [selectedRegionId, setSelectedRegionId] = useState<string>(() => {
    return searchParams.get("region") || "capital"
  })

  const [selectedOrgId, setSelectedOrgId] = useState<string>(() => {
    return searchParams.get("organization_id") || "all"
  })

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["organizations-cached"],
    queryFn: async () => {
      const response = await apiClient.api.organizations.cached.get()
      return (response.data as Organization[]) || []
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    const params = new URLSearchParams()

    if (date?.from) {
      params.set("start_date", format(date.from, "yyyy-MM-dd"))
    }

    if (date?.to) {
      params.set("end_date", format(date.to, "yyyy-MM-dd"))
    }

    if (selectedRegionId && selectedRegionId !== "all") {
      params.set("region", selectedRegionId)
    }

    if (selectedOrgId && selectedOrgId !== "all") {
      params.set("organization_id", selectedOrgId)
    }

    const queryString = params.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname

    router.push(url)
  }, [date, selectedRegionId, selectedOrgId, pathname, router])

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
    <div className="flex items-center gap-2 px-4 lg:px-6">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            size="sm"
            className={cn(
              "justify-start text-left font-normal shrink-0",
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

      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => handlePresetClick("today")}>
          Сегодня
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handlePresetClick("yesterday")}>
          Вчера
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handlePresetClick("week")}>
          Неделя
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handlePresetClick("month")}>
          Месяц
        </Button>
      </div>

      <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
        <SelectTrigger className="w-[150px] shrink-0 h-8">
          <SelectValue placeholder="Регион" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все регионы</SelectItem>
          <SelectItem value="capital">Столица</SelectItem>
          <SelectItem value="region">Регион</SelectItem>
        </SelectContent>
      </Select>

      <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
        <SelectTrigger className="w-[200px] shrink-0 h-8">
          <SelectValue placeholder="Организация" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все организации</SelectItem>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

"use client";

import { useQueryStates } from "nuqs";
import { startOfDay, endOfDay, subDays, startOfMonth, startOfWeek, isSameDay, setHours } from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { ordersFiltersParsers } from "./parsers";

const parsers = {
  dateFrom: ordersFiltersParsers.dateFrom,
  dateTo: ordersFiltersParsers.dateTo,
};

type Preset = "today" | "yesterday" | "week" | "month";

const presets: { key: Preset; label: string }[] = [
  { key: "today", label: "Сегодня" },
  { key: "yesterday", label: "Вчера" },
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
];

function getPresetRange(preset: Preset): { from: Date; to: Date } {
  const today = new Date();
  switch (preset) {
    case "today":
      return { from: setHours(startOfDay(today), 10), to: endOfDay(today) };
    case "yesterday": {
      const d = subDays(today, 1);
      return { from: setHours(startOfDay(d), 10), to: endOfDay(d) };
    }
    case "week":
      return { from: setHours(startOfWeek(today, { weekStartsOn: 1 }), 10), to: endOfDay(today) };
    case "month":
      return { from: setHours(startOfMonth(today), 10), to: endOfDay(today) };
  }
}

function detectPreset(from: Date, to: Date): Preset | null {
  for (const { key } of presets) {
    const range = getPresetRange(key);
    if (isSameDay(from, range.from) && isSameDay(to, range.to)) return key;
  }
  return null;
}

export function DateRangeFilter() {
  const [{ dateFrom, dateTo }, setDates] = useQueryStates(parsers);

  const dateRange: DateRange | undefined = {
    from: dateFrom,
    to: dateTo,
  };

  const activePreset = useMemo(
    () => (dateFrom && dateTo ? detectPreset(dateFrom, dateTo) : null),
    [dateFrom, dateTo],
  );

  const handlePreset = (preset: Preset) => {
    const range = getPresetRange(preset);
    setDates({ dateFrom: range.from, dateTo: range.to });
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {presets.map(({ key, label }) => (
        <Button
          key={key}
          variant={activePreset === key ? "default" : "ghost"}
          size="sm"
          className="shrink-0 h-8 px-2 text-xs"
          onClick={() => handlePreset(key)}
        >
          {label}
        </Button>
      ))}
      <DateRangePicker
        value={dateRange}
        onChange={(value: DateRange | undefined) => {
          if (!value) {
            setDates({ dateFrom: null, dateTo: null });
            return;
          }
          // If the date part changed, apply default times; otherwise keep manual time
          const fromDateChanged = value.from && dateFrom && !isSameDay(value.from, dateFrom);
          const toDateChanged = value.to && dateTo && !isSameDay(value.to, dateTo);
          const newFrom = value.from
            ? (fromDateChanged || !dateFrom ? setHours(startOfDay(value.from), 10) : value.from)
            : null;
          const newTo = value.to
            ? (toDateChanged || !dateTo ? endOfDay(value.to) : value.to)
            : null;
          setDates({ dateFrom: newFrom, dateTo: newTo });
        }}
        timePicker={true}
      />
    </div>
  );
}

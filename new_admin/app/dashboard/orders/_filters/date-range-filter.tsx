"use client";

import { useQueryStates } from "nuqs";
import { parseAsIsoDateTime } from "nuqs";
import { startOfWeek, endOfWeek } from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

const now = new Date();
const parsers = {
  dateFrom: parseAsIsoDateTime.withDefault(
    startOfWeek(now, { weekStartsOn: 1 }),
  ),
  dateTo: parseAsIsoDateTime.withDefault(endOfWeek(now, { weekStartsOn: 1 })),
};

export function DateRangeFilter() {
  const [{ dateFrom, dateTo }, setDates] = useQueryStates(parsers);

  const dateRange: DateRange | undefined = {
    from: dateFrom,
    to: dateTo,
  };

  return (
    <DateRangePicker
      value={dateRange}
      onChange={(value: DateRange | undefined) =>
        setDates({
          dateFrom: value?.from ?? null,
          dateTo: value?.to ?? null,
        })
      }
      timePicker={true}
    />
  );
}

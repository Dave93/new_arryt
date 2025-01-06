import { rangePresets } from "@admin/src/components/dates/RangePresets";
import { DatePicker } from "antd";
import { useDateFilterStore } from "./store";

const { RangePicker } = DatePicker;

export default function DashboardDatePicker() {
  const { dateRange, setDateRange } = useDateFilterStore();

  return (
    <RangePicker
      format={"DD.MM.YYYY HH:mm"}
      showTime
      presets={rangePresets}
      value={dateRange}
      onChange={(dates, dateStrings) => setDateRange(dates, dateStrings)}
    />
  );
}

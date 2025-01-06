import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Dayjs } from 'dayjs';
import { RangeValueType } from 'rc-picker/lib/PickerInput/RangePicker';
import dayjs from 'dayjs';

interface DateFilterState {
  dateRange: RangeValueType<Dayjs>;
  setDateRange: (range: RangeValueType<Dayjs> | null, dateStrings: [string, string]) => void;
  clearDateRange: () => void;
}

const currentMonth = dayjs();
const defaultDateRange: RangeValueType<Dayjs> = [
  currentMonth.startOf('month'),
  currentMonth.endOf('month')
];

export const useDateFilterStore = create<DateFilterState>()(
  persist(
    (set) => ({
      dateRange: defaultDateRange,
      setDateRange: (range) => set({ dateRange: range ?? defaultDateRange }),
      clearDateRange: () => set({ dateRange: defaultDateRange }),
    }),
    {
      name: 'dashboard-date-filter',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        dateRange: state.dateRange 
          ? [state.dateRange[0]?.toISOString(), state.dateRange[1]?.toISOString()]
          : null
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.dateRange) {
          state.dateRange = [
            dayjs(state.dateRange[0]),
            dayjs(state.dateRange[1])
          ];
        }
      }
    }
  )
);

"use client";

import { UseFormReturn } from "react-hook-form";
import * as z from "zod";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

/** Время смены — с шагом 30 минут, по Ташкенту. */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  return `${h}:${i % 2 ? "30" : "00"}`;
});

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Длина смены в часах, через полночь тоже — так же считает сервер. */
export function shiftHours(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const diff = (toMinutes(end) - toMinutes(start) + 24 * 60) % (24 * 60);
  return (diff || 24 * 60) / 60;
}

export const shiftSchema = {
  start_time: z.string().regex(/^\d{2}:\d{2}$/, { message: "Выберите начало смены" }),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, { message: "Выберите конец смены" }),
};

/** Смена короче часа — ошибка ввода: час гаранта стал бы больше всего гаранта. */
export const refineShift = <T extends { start_time: string; end_time: string }>(schema: z.ZodType<T>) =>
  schema.refine((v) => (shiftHours(v.start_time, v.end_time) ?? 1) >= 1, {
    message: "Смена должна быть не короче 1 ч",
    path: ["end_time"],
  });

type ShiftForm = { name: string; amount: number; start_time: string; end_time: string };

export function ShiftFields({ form }: { form: UseFormReturn<ShiftForm> }) {
  const [start, end, amount] = form.watch(["start_time", "end_time", "amount"]);
  const hours = shiftHours(start, end);
  const hourCost = hours ? Math.round(Number(amount || 0) / hours) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {(["start_time", "end_time"] as const).map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{name === "start_time" ? "Начало смены" : "Конец смены"}</FormLabel>
                {/* Неуправляемый Select + key: иначе form.reset в редактировании стирает значение */}
                <Select key={`${name}-${field.value}`} defaultValue={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите время" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-72">
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {hours ? (
          <>
            Смена <span className="font-medium text-foreground">{hours} ч</span>
            {hourCost ? (
              <>
                {" "}· час гаранта{" "}
                <span className="font-medium text-foreground">
                  {new Intl.NumberFormat("ru-RU").format(hourCost)}
                </span>
              </>
            ) : null}
            . Опоздание больше 30 минут к началу смены — минус час гаранта за каждый начатый час.
          </>
        ) : (
          "Опоздание считается от начала смены: больше 30 минут — минус час гаранта за каждый начатый час."
        )}
      </p>
    </div>
  );
}

/**
 * Время рабочих графиков хранится на 6 ч раньше местного (Ташкент):
 * «10:00-22:00» лежит в базе как 04:00–16:00. Так его читают расчёт
 * опозданий, перекличка и мобильное приложение, поэтому хранение не
 * меняем, а в админке показываем и принимаем местное время.
 */
const OFFSET_MINUTES = 6 * 60;
const DAY = 24 * 60;

const shift = (time: string, delta: number) => {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const total = (((h * 60 + m + delta) % DAY) + DAY) % DAY;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/** Из базы в местное: "04:00:00" → "10:00". */
export const scheduleTimeToLocal = (stored?: string | null) => (stored ? shift(stored, OFFSET_MINUTES) : "");

/** Из местного в базу: "10:00" → "04:00". */
export const scheduleTimeToStored = (local: string) => (local ? shift(local, -OFFSET_MINUTES) : local);

/** Три времени графика — в базу. */
export const scheduleTimesToStored = <T extends { start_time: string; end_time: string; max_start_time: string }>(v: T): T => ({
  ...v,
  start_time: scheduleTimeToStored(v.start_time),
  end_time: scheduleTimeToStored(v.end_time),
  max_start_time: scheduleTimeToStored(v.max_start_time),
});

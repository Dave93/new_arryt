import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { getMinutes } from "../../lib/dates";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Все даты гаранта — по Ташкенту, явно. Не полагаемся на часовой пояс
 * процесса: сервер сейчас в Asia/Tashkent, но тесты и любая другая машина
 * могут работать в UTC, а ошибка в 5 часов здесь — это деньги.
 */
export const BUSINESS_TIMEZONE = "Asia/Tashkent";

/**
 * Чистая часть дневного гаранта: никакого ввода-вывода, только расчёты.
 * Всё, что касается денег, проверяется тестами в calculate.test.ts.
 */

/** Расписание хранится на 6 ч раньше местного времени ("10:00 - 22:00" лежит как 04:00-16:00). */
export const SCHEDULE_OFFSET_MINUTES = 6 * 60;

/** Минут опоздания, за которые снимается один штраф. */
export const LATE_PENALTY_STEP_MINUTES = 30;

/**
 * Предел ручной корректировки, сумы. Больше гаранта (сейчас максимум
 * 270 000) корректировка не бывает по смыслу; запас — на доп. часы.
 */
export const MAX_GARANT_ADJUSTMENT = 1_000_000;

/** Корректировка должна быть конечным числом в пределах ±MAX_GARANT_ADJUSTMENT. */
export function isValidAdjustment(adjustment: unknown): adjustment is number {
  return typeof adjustment === "number" && Number.isFinite(adjustment) && Math.abs(adjustment) <= MAX_GARANT_ADJUSTMENT;
}

/** Терминалы двух брендов ближе этого расстояния считаются одной точкой. */
export const SAME_POINT_RADIUS_METERS = 100;

/**
 * Рабочий день, к которому относится момент времени. Сутки считаются
 * от конца рабочего дня (настройка work_end_time, сейчас 04:00):
 * всё с 04:00 одного числа до 04:00 следующего — один рабочий день.
 */
export function businessDayOf(moment: Date | string, workEndHour: number): string {
  return dayjs(moment).tz(BUSINESS_TIMEZONE).subtract(workEndHour, "hour").format("YYYY-MM-DD");
}

/** Границы рабочего дня: [day workEndHour:00, day+1 workEndHour:00). */
export function businessDayWindow(day: string, workEndHour: number): { start: Date; end: Date } {
  const start = dayjs.tz(day, BUSINESS_TIMEZONE).startOf("day").add(workEndHour, "hour");
  return { start: start.toDate(), end: start.add(1, "day").toDate() };
}

/** Опоздание к началу смены, в минутах; 0 — если пришёл вовремя. */
export function lateMinutes(shiftStart: Date | string, maxStartTime: string, day: string): number {
  const deadline = dayjs
    .tz(day, BUSINESS_TIMEZONE)
    .startOf("day")
    .add(getMinutes(maxStartTime) + SCHEDULE_OFFSET_MINUTES, "minute");
  const diff = dayjs(shiftStart).diff(deadline, "minute");
  return diff > 0 ? diff : 0;
}

export type PayoutInput = {
  /** Сумма гаранта за день. */
  garantAmount: number;
  /** Штраф за каждые полные 30 минут опоздания. */
  lateMinusSum: number;
  /** Сколько курьер заработал за рабочий день. */
  earned: number;
  lateMinutes: number;
  /**
   * Ручная корректировка администратора, сумы: плюс — доплата за часы вне
   * гаранта, минус — удержание. Применяется к доплате, а не к гаранту.
   */
  adjustment?: number;
};

export type PayoutResult = {
  penalty: number;
  /** Гарант после штрафа — столько курьер должен получить за день в сумме. */
  guaranteed: number;
  /** Доплата до гаранта по расчёту, без корректировки; 0 — если заработал не меньше. */
  payout: number;
  /** Корректировка, как её задал администратор (0, если не задана). */
  adjustment: number;
  /** Итог к начислению: доплата + корректировка, не меньше нуля. */
  total: number;
};

/**
 * Доплата = (гарант − штраф) − заработок, но не меньше нуля.
 * Штраф берётся только за полные 30-минутные отрезки опоздания.
 * Итог = доплата + ручная корректировка, тоже не меньше нуля: удержание
 * не может увести начисление в минус, а доплата за доп. часы начисляется,
 * даже если курьер заработал больше гаранта.
 */
export function calculatePayout({ garantAmount, lateMinusSum, earned, lateMinutes, adjustment = 0 }: PayoutInput): PayoutResult {
  const penalty = Math.floor(Math.max(0, lateMinutes) / LATE_PENALTY_STEP_MINUTES) * lateMinusSum;
  const guaranteed = Math.max(0, garantAmount - penalty);
  const payout = Math.max(0, Math.round(guaranteed - earned));
  const roundedAdjustment = Math.round(adjustment);
  const total = Math.max(0, payout + roundedAdjustment);
  return { penalty, guaranteed, payout, adjustment: roundedAdjustment, total };
}

export type TerminalPoint = {
  id: string;
  organization_id: string;
  latitude: number;
  longitude: number;
  /** Явная связка терминалов одной точки, задаётся в админке. */
  linked_terminal_id?: string | null;
};

/** Расстояние между двумя точками по поверхности Земли, в метрах. */
export function distanceMeters(a: Pick<TerminalPoint, "latitude" | "longitude">, b: Pick<TerminalPoint, "latitude" | "longitude">): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Какой терминал платит гарант. Правило бизнеса: гарант всегда платит
 * Les Ailes. На точке, где есть оба бренда (C5, Golden Life…), это терминал
 * Les Ailes той же точки; если на точке только Chopar — платит он сам.
 *
 * Пару ищем сначала по явной связке linked_terminal_id: её ведут в админке,
 * по ней же работает общая очередь курьеров. Но связка заполнена не везде и
 * местами неверна (терминал ссылается сам на себя), поэтому запасной путь —
 * терминал Les Ailes в пределах 100 м.
 */
export function pickPayingTerminal<T extends TerminalPoint>(worked: T, candidates: T[], payingOrganizationId: string): T {
  if (worked.organization_id === payingOrganizationId) {
    return worked;
  }
  if (worked.linked_terminal_id) {
    const linked = candidates.find((c) => c.id === worked.linked_terminal_id);
    if (linked && linked.organization_id === payingOrganizationId) {
      return linked;
    }
  }
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    if (candidate.organization_id !== payingOrganizationId) continue;
    const d = distanceMeters(worked, candidate);
    if (d <= SAME_POINT_RADIUS_METERS && d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best ?? worked;
}

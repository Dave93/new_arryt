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

/** Опоздание до 30 минут включительно не штрафуется. */
export const LATE_GRACE_MINUTES = 30;

/** Часов в смене по тарифу: допустимый диапазон. */
export const MIN_WORK_HOURS = 1;
export const MAX_WORK_HOURS = 24;

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

/**
 * Опоздание к началу смены по графику (start_time, хранится со сдвигом
 * SCHEDULE_OFFSET_MINUTES), в минутах; 0 — если пришёл вовремя.
 */
export function lateMinutes(shiftStart: Date | string, scheduleStartTime: string, day: string): number {
  const deadline = dayjs
    .tz(day, BUSINESS_TIMEZONE)
    .startOf("day")
    .add(getMinutes(scheduleStartTime) + SCHEDULE_OFFSET_MINUTES, "minute");
  const diff = dayjs(shiftStart).diff(deadline, "minute");
  return diff > 0 ? diff : 0;
}

/** Время "HH:mm" или "HH:mm:ss" как есть. */
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

/**
 * Длина смены в часах по началу и концу; через полночь — тоже
 * ("15:00"–"03:00" = 12). Одинаковые начало и конец — сутки.
 */
export function shiftHours(startTime: string, endTime: string): number {
  const diff = (getMinutes(endTime) - getMinutes(startTime) + 24 * 60) % (24 * 60);
  return (diff || 24 * 60) / 60;
}

/**
 * Опоздание к началу смены тарифа (местное время, без сдвига), в минутах.
 * Начало раньше конца рабочего дня (например 02:00 при work_end_time 04:00)
 * относится уже к следующим календарным суткам рабочего дня.
 */
export function lateMinutesFromTariff(shiftStart: Date | string, tariffStartTime: string, day: string, workEndHour: number): number {
  const startMinutes = getMinutes(tariffStartTime);
  let deadline = dayjs.tz(day, BUSINESS_TIMEZONE).startOf("day").add(startMinutes, "minute");
  if (startMinutes < workEndHour * 60) deadline = deadline.add(1, "day");
  const diff = dayjs(shiftStart).diff(deadline, "minute");
  return diff > 0 ? diff : 0;
}

/**
 * Сколько часов гаранта снять за опоздание. До 30 минут — ничего; больше —
 * за каждый начатый час опоздания: 31–60 мин → 1 ч, 61–120 → 2 ч.
 */
export function latePenaltyHours(lateMinutes: number): number {
  return lateMinutes > LATE_GRACE_MINUTES ? Math.ceil(lateMinutes / 60) : 0;
}

export type PayoutInput = {
  /** Сумма гаранта за день. */
  garantAmount: number;
  /** Фиксированных часов в смене по тарифу (12, 11…): час гаранта = сумма ÷ часы. */
  workHours: number;
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
  /** Стоимость часа гаранта. */
  hourCost: number;
  /** Сколько часов снято за опоздание. */
  penaltyHours: number;
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
 * Штраф — часы гаранта за опоздание (latePenaltyHours) × стоимость часа,
 * а час = гарант ÷ фиксированные часы смены по тарифу.
 * Итог = доплата + ручная корректировка, тоже не меньше нуля: удержание
 * не может увести начисление в минус, а доплата за доп. часы начисляется,
 * даже если курьер заработал больше гаранта.
 */
export function calculatePayout({ garantAmount, workHours, earned, lateMinutes, adjustment = 0 }: PayoutInput): PayoutResult {
  const hours = Math.min(MAX_WORK_HOURS, Math.max(MIN_WORK_HOURS, workHours || MIN_WORK_HOURS));
  const hourCost = Math.round(garantAmount / hours);
  const penaltyHours = latePenaltyHours(lateMinutes);
  const penalty = penaltyHours * hourCost;
  const guaranteed = Math.max(0, garantAmount - penalty);
  const payout = Math.max(0, Math.round(guaranteed - earned));
  const roundedAdjustment = Math.round(adjustment);
  const total = Math.max(0, payout + roundedAdjustment);
  return { hourCost, penaltyHours, penalty, guaranteed, payout, adjustment: roundedAdjustment, total };
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

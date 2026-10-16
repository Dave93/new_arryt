import {
  courier_terminal_balance,
  daily_garant,
  order_transactions,
  orders,
  organization,
  terminals,
  users,
  users_terminals,
  work_schedule_entries,
  work_schedules,
} from "../../../drizzle/schema";
import { DB } from "../../lib/db";
import { getSetting } from "../../utils/settings";
import { CacheControlService } from "../../modules/cache/service";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, like, lt, notInArray, or, sql } from "drizzle-orm";
import dayjs from "dayjs";
import Redis from "ioredis";
import {
  BUSINESS_TIMEZONE,
  businessDayOf,
  businessDayWindow,
  calculatePayout,
  isValidAdjustment,
  distanceMeters,
  lateMinutes,
  lateMinutesFromTariff,
  pickPayingTerminal,
  TerminalPoint,
} from "./calculate";

/** Почему гарант за день не начислен. */
export type SettleReason =
  | "no_garant"
  | "no_shift"
  | "earned_enough"
  | "adjustment_comment_required"
  | "invalid_adjustment"
  | "no_terminal"
  | "already_paid";

export type SettleResult = {
  status: "paid" | "skipped" | "dry_run";
  reason?: SettleReason;
  courierId: string;
  /** Рабочий день, YYYY-MM-DD по Ташкенту. */
  day: string;
  garantName?: string;
  garantAmount?: number;
  earned?: number;
  lateMinutes?: number;
  /** Часов в смене по тарифу и стоимость часа гаранта. */
  workHours?: number;
  hourCost?: number;
  /** Сколько часов гаранта снято за опоздание. */
  penaltyHours?: number;
  penalty?: number;
  /** Доплата до гаранта по расчёту, без корректировки. */
  payout?: number;
  /** Ручная корректировка администратора. */
  adjustment?: number;
  /** Итог к начислению: payout + adjustment, не меньше нуля. */
  total?: number;
  /** Незавершённых заказов за день — не входят в заработок. */
  unfinishedOrders?: number;
  terminalId?: string;
  /** Филиал, на баланс курьера в котором уходит начисление. */
  terminalName?: string;
  transactionId?: string;
};

export type SettleParams = {
  courierId: string;
  /** День, за который начислить: YYYY-MM-DD или ISO-момент. По умолчанию — текущий рабочий день. */
  day?: string;
  /** Посчитать, но ничего не записывать. */
  dryRun?: boolean;
  /** Кто начислил (оператор при ручном запуске). */
  createdBy?: string;
  /** Ручная корректировка, сумы: плюс — доп. часы вне гаранта, минус — удержание. */
  adjustment?: number;
  /** Причина корректировки; обязательна, если корректировка не нулевая. */
  adjustmentComment?: string;
};

export type SettleDeps = {
  db: DB;
  redis: Redis;
  cacheControl: CacheControlService;
};

/**
 * Метка дня в комментарии транзакции — по ней проверяем, что гарант за этот
 * день уже начислен. created_at для этого не годится: гарант за прошлый
 * день можно начислить вручную сегодня.
 */
const commentPrefix = (day: string) => `Дневной гарант за ${day}`;

/** Начисление гаранта за этот день, если оно уже есть. */
async function findExistingPayment(
  executor: Pick<DB, "select">,
  courierId: string,
  day: string,
  startIso: string,
  endIso: string
): Promise<{ id: string } | undefined> {
  const [existing] = await executor
    .select({ id: order_transactions.id })
    .from(order_transactions)
    .where(
      and(
        eq(order_transactions.courier_id, courierId),
        eq(order_transactions.transaction_type, "daily_garant"),
        or(
          like(order_transactions.comment, `${commentPrefix(day)}%`),
          // начисления старым кодом шли без комментария
          and(isNull(order_transactions.comment), gte(order_transactions.created_at, startIso), lt(order_transactions.created_at, endIso))
        )
      )
    )
    .limit(1);
  return existing;
}

/** Час из настройки времени: "04:00" или ISO-момент, как хранится work_end_time. */
export function settingHour(value: unknown, fallback: number): number {
  if (typeof value !== "string" || !value) return fallback;
  if (/^\d{1,2}:\d{2}/.test(value)) return parseInt(value, 10);
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.tz(BUSINESS_TIMEZONE).hour() : fallback;
}

/** День из параметра: "2026-10-16" как есть; ISO-момент — переводим в ташкентскую дату. */
function normalizeDay(day: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  return dayjs(day).tz(BUSINESS_TIMEZONE).format("YYYY-MM-DD");
}

/**
 * Начисляет дневной гарант курьеру за рабочий день — одна функция и для
 * автоматического запуска при закрытии смены, и для кнопки в «Перекличке».
 *
 * Условия: курьеру назначен гарант и за день есть смена. Открытая смена и
 * незавершённые заказы не мешают — заработок берётся на момент начисления. Доплата = (гарант − штраф за опоздание) − заработок.
 * Платит Les Ailes той же точки, см. pickPayingTerminal.
 *
 * Повторный вызов за тот же день безопасен: начисление и проверка «уже
 * начислено» идут под блокировкой курьер+день в одной транзакции.
 */
export async function settleDailyGarant(
  { db, redis, cacheControl }: SettleDeps,
  { courierId, day: dayParam, dryRun = false, createdBy, adjustment = 0, adjustmentComment }: SettleParams
): Promise<SettleResult> {
  const workEndHour = settingHour(await getSetting(redis, "work_end_time"), 4);
  const day = dayParam ? normalizeDay(dayParam) : businessDayOf(new Date(), workEndHour);
  const { start, end } = businessDayWindow(day, workEndHour);
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const base = { courierId, day };
  // Схема эндпоинта уже ограничивает корректировку; сервис зовут и другие
  // места, поэтому проверяем здесь ещё раз — это деньги.
  if (!isValidAdjustment(adjustment)) {
    return { ...base, status: "skipped", reason: "invalid_adjustment" };
  }

  // Гарант курьера — из базы, а не из кэша: кэш мог устареть после правки в админке.
  const [courier] = await db
    .select({ daily_garant_id: users.daily_garant_id })
    .from(users)
    .where(eq(users.id, courierId))
    .limit(1);
  if (!courier?.daily_garant_id) {
    return { ...base, status: "skipped", reason: "no_garant" };
  }
  const [garant] = await db
    .select()
    .from(daily_garant)
    .where(eq(daily_garant.id, courier.daily_garant_id))
    .limit(1);
  if (!garant || garant.deleted_at) {
    return { ...base, status: "skipped", reason: "no_garant" };
  }
  const garantInfo = { garantName: garant.name.trim(), garantAmount: garant.amount };

  // Смены за рабочий день. Опоздание считаем по первой из них.
  const shifts = await db
    .select({
      date_start: work_schedule_entries.date_start,
      current_status: work_schedule_entries.current_status,
      lat_open: work_schedule_entries.lat_open,
      lon_open: work_schedule_entries.lon_open,
      start_time: work_schedules.start_time,
    })
    .from(work_schedule_entries)
    .leftJoin(work_schedules, eq(work_schedules.id, work_schedule_entries.work_schedule_id))
    .where(
      and(
        eq(work_schedule_entries.user_id, courierId),
        gte(work_schedule_entries.date_start, startIso),
        lt(work_schedule_entries.date_start, endIso)
      )
    )
    .orderBy(asc(work_schedule_entries.date_start));
  if (shifts.length === 0) {
    return { ...base, ...garantInfo, status: "skipped", reason: "no_shift" };
  }
  // Открытая смена не мешает: администратор может начислить гарант, не
  // дожидаясь закрытия. Заработок берётся на момент начисления — если курьер
  // потом ещё заработает, автозапуск увидит «уже начислено» и не пересчитает.
  const firstShift = shifts[0];

  const statuses = await cacheControl.getOrderStatuses();
  const finishedIds = statuses.filter((s) => s.finish).map((s) => s.id);
  const unfinishedIds = statuses.filter((s) => !s.finish && !s.cancel).map((s) => s.id);
  const courierOrdersInDay = and(
    eq(orders.courier_id, courierId),
    gte(orders.created_at, startIso),
    lt(orders.created_at, endIso)
  );

  // Незавершённые заказы не мешают начислению — их только считаем, чтобы
  // предупредить: в заработок они не входят, поэтому доплата выйдет больше,
  // чем станет, когда их закроют.
  let unfinishedOrders = 0;
  if (unfinishedIds.length) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(courierOrdersInDay, inArray(orders.order_status_id, unfinishedIds)));
    unfinishedOrders = count;
  }

  // Заработок: доставки по завершённым заказам + бонусы и ручные доплаты.
  // Транзакция "order" — это та же оплата доставки, её не считаем дважды;
  // сам гарант в заработок не входит.
  const [{ deliveries }] = finishedIds.length
    ? await db
        .select({ deliveries: sql<number>`coalesce(sum(${orders.delivery_price}), 0)::float` })
        .from(orders)
        .where(and(courierOrdersInDay, inArray(orders.order_status_id, finishedIds)))
    : [{ deliveries: 0 }];
  const [{ extras }] = await db
    .select({ extras: sql<number>`coalesce(sum(${order_transactions.amount}), 0)::float` })
    .from(order_transactions)
    .where(
      and(
        eq(order_transactions.courier_id, courierId),
        gte(order_transactions.created_at, startIso),
        lt(order_transactions.created_at, endIso),
        notInArray(order_transactions.transaction_type, ["order", "daily_garant"])
      )
    );
  const earned = Number(deliveries) + Number(extras);

  // Опоздание — от начала смены тарифа; у тарифа без графика — от начала
  // смены по графику курьера (не от max_start_time).
  const late = garant.start_time
    ? lateMinutesFromTariff(firstShift.date_start, garant.start_time, day, workEndHour)
    : firstShift.start_time
      ? lateMinutes(firstShift.date_start, firstShift.start_time, day)
      : 0;
  const { hourCost, penaltyHours, penalty, payout, adjustment: adj, total } = calculatePayout({
    garantAmount: garant.amount,
    workHours: garant.work_hours,
    earned,
    lateMinutes: late,
    adjustment,
  });
  const calc = {
    ...base,
    ...garantInfo,
    earned,
    lateMinutes: late,
    workHours: garant.work_hours,
    hourCost,
    penaltyHours,
    penalty,
    payout,
    adjustment: adj,
    total,
    unfinishedOrders,
  };
  // Пробный расчёт показывается и при нулевом итоге: в модалке администратор
  // как раз решает, добавить ли доп. часы.
  if (adj !== 0 && !adjustmentComment?.trim() && !dryRun) {
    return { ...calc, status: "skipped", reason: "adjustment_comment_required" };
  }
  if (total <= 0 && !dryRun) {
    return { ...calc, status: "skipped", reason: "earned_enough" };
  }

  const terminal = await resolvePayingTerminal(db, courierId, courierOrdersInDay, finishedIds, firstShift);
  if (!terminal) {
    return { ...calc, status: "skipped", reason: "no_terminal" };
  }
  if (dryRun) {
    if (total <= 0) {
      const existingZero = await findExistingPayment(db, courierId, day, startIso, endIso);
      return existingZero
        ? { ...calc, status: "skipped", reason: "already_paid", terminalId: terminal.id, terminalName: terminal.name, transactionId: existingZero.id }
        : { ...calc, status: "skipped", reason: "earned_enough", terminalId: terminal.id, terminalName: terminal.name };
    }
    const existing = await findExistingPayment(db, courierId, day, startIso, endIso);
    if (existing) {
      return { ...calc, status: "skipped", reason: "already_paid", terminalId: terminal.id, terminalName: terminal.name, transactionId: existing.id };
    }
    return { ...calc, status: "dry_run", terminalId: terminal.id, terminalName: terminal.name };
  }

  return db.transaction(async (tx) => {
    // Ручной и автоматический запуск за один день не должны начислить дважды.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`daily_garant:${courierId}:${day}`}))`);

    const existing = await findExistingPayment(tx, courierId, day, startIso, endIso);
    if (existing) {
      return { ...calc, status: "skipped", reason: "already_paid", terminalId: terminal.id, terminalName: terminal.name, transactionId: existing.id } as SettleResult;
    }

    // Баланс увеличиваем в самом UPDATE: order_complete пишет его без транзакции,
    // и «прочитать → прибавить → записать» здесь могло бы затереть его начисление.
    const [updated] = await tx
      .update(courier_terminal_balance)
      .set({ balance: sql`${courier_terminal_balance.balance} + ${total}` })
      .where(and(eq(courier_terminal_balance.courier_id, courierId), eq(courier_terminal_balance.terminal_id, terminal.id)))
      .returning({ balance: courier_terminal_balance.balance });
    let balanceAfter: number;
    if (updated) {
      balanceAfter = updated.balance;
    } else {
      await tx.insert(courier_terminal_balance).values({
        courier_id: courierId,
        terminal_id: terminal.id,
        organization_id: terminal.organization_id,
        balance: total,
        created_by: createdBy,
      });
      balanceAfter = total;
    }

    const [transaction] = await tx
      .insert(order_transactions)
      .values({
        transaction_type: "daily_garant",
        transaction_payment_type: "cash",
        amount: total,
        not_paid_amount: total,
        courier_id: courierId,
        terminal_id: terminal.id,
        organization_id: terminal.organization_id,
        balance_before: balanceAfter - total,
        balance_after: balanceAfter,
        created_by: createdBy,
        comment:
          `${commentPrefix(day)}: гарант ${garant.amount}, заработано ${Math.round(earned)}, штраф ${penalty} (опоздание ${late} мин = ${penaltyHours} ч × ${hourCost}), доплата ${payout}` +
          (adj !== 0 ? `, корректировка ${adj > 0 ? "+" : ""}${adj}: ${adjustmentComment!.trim()}` : "") +
          (unfinishedOrders > 0 ? `, незавершённых заказов: ${unfinishedOrders}` : ""),
      })
      .returning({ id: order_transactions.id });

    return { ...calc, status: "paid", terminalId: terminal.id, terminalName: terminal.name, transactionId: transaction.id } as SettleResult;
  });
}

/**
 * Терминал, где курьер работал: последнего завершённого заказа за день,
 * а без заказов — ближайший из закреплённых за ним к месту открытия смены.
 * Затем правило «платит Les Ailes той же точки».
 */
async function resolvePayingTerminal(
  db: DB,
  courierId: string,
  courierOrdersInDay: ReturnType<typeof and>,
  finishedIds: string[],
  firstShift: { lat_open: number; lon_open: number }
): Promise<(TerminalPoint & { name: string }) | null> {
  const all = await db
    .select({
      id: terminals.id,
      name: terminals.name,
      organization_id: terminals.organization_id,
      latitude: terminals.latitude,
      longitude: terminals.longitude,
      linked_terminal_id: terminals.linked_terminal_id,
    })
    .from(terminals)
    .where(eq(terminals.active, true));

  let worked: (typeof all)[number] | undefined;
  if (finishedIds.length) {
    const [lastOrder] = await db
      .select({ terminal_id: orders.terminal_id })
      .from(orders)
      .where(and(courierOrdersInDay, inArray(orders.order_status_id, finishedIds)))
      .orderBy(desc(orders.created_at))
      .limit(1);
    worked = lastOrder ? all.find((t) => t.id === lastOrder.terminal_id) : undefined;
  }
  if (!worked) {
    const assigned = await db
      .select({ terminal_id: users_terminals.terminal_id })
      .from(users_terminals)
      .where(eq(users_terminals.user_id, courierId));
    const shiftPoint = { latitude: firstShift.lat_open, longitude: firstShift.lon_open };
    worked = all
      .filter((t) => assigned.some((a) => a.terminal_id === t.id))
      .sort((a, b) => distanceMeters(shiftPoint, a) - distanceMeters(shiftPoint, b))[0];
  }
  if (!worked) {
    return null;
  }

  const [payingOrg] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(ilike(organization.name, "les ailes"))
    .limit(1);
  return pickPayingTerminal(worked, all, payingOrg?.id ?? worked.organization_id);
}

import { describe, expect, test } from "bun:test";
import {
  businessDayOf,
  businessDayWindow,
  calculatePayout,
  isValidAdjustment,
  MAX_GARANT_ADJUSTMENT,
  distanceMeters,
  isValidTime,
  lateMinutes,
  lateMinutesFromTariff,
  pickPayingTerminal,
  shiftHours,
  tariffWindow,
  workedMinutes,
} from "./calculate";

// Расчёт явно работает по Ташкенту, поэтому тесты проходят в любом поясе
// процесса — bun test по умолчанию гоняет их в UTC.
const WORK_END_HOUR = 4;

describe("calculatePayout", () => {
  // 290 000 за 12 часов → час гаранта 24 167
  const garant = { garantAmount: 290_000, workHours: 12 };

  test("полная смена — весь гарант минус заработок", () => {
    expect(calculatePayout({ ...garant, workedMinutes: 12 * 60, earned: 180_000 }))
      .toEqual({ hourCost: 24_167, workedMinutes: 720, guaranteed: 290_000, payout: 110_000, adjustment: 0, total: 110_000 });
  });

  test("гарант за отработанное время, по минутам", () => {
    // 7 ч 40 мин = 460 мин → 290 000 × 460 / 720 = 185 278 → 185 000
    expect(calculatePayout({ ...garant, workedMinutes: 460, earned: 0 }).guaranteed).toBe(185_000);
  });

  test("сумма округляется до тысячи по обычному правилу", () => {
    // 8 ч → 193 333 → 193 000; 8 ч 1 мин → 193 736 → 194 000
    expect(calculatePayout({ ...garant, workedMinutes: 480, earned: 0 }).guaranteed).toBe(193_000);
    expect(calculatePayout({ ...garant, workedMinutes: 481, earned: 0 }).guaranteed).toBe(194_000);
  });

  test("больше смены не платится — максимум полный гарант", () => {
    expect(calculatePayout({ ...garant, workedMinutes: 15 * 60, earned: 0 }))
      .toMatchObject({ workedMinutes: 720, guaranteed: 290_000 });
  });

  test("опоздание отдельно не штрафуется: пришёл на 2 ч позже — платится 10 ч", () => {
    expect(calculatePayout({ ...garant, workedMinutes: 10 * 60, earned: 0 }).guaranteed).toBe(242_000);
  });

  test("ничего не отработал — ничего не доплачивается", () => {
    expect(calculatePayout({ ...garant, workedMinutes: 0, earned: 0 }).total).toBe(0);
  });

  test("заработал больше гаранта за время — доплаты нет", () => {
    expect(calculatePayout({ ...garant, workedMinutes: 6 * 60, earned: 200_000 }).payout).toBe(0);
  });

  test("час гаранта зависит от часов смены по тарифу", () => {
    // 220 000 за 11 часов → 20 000 в час
    expect(calculatePayout({ garantAmount: 220_000, workHours: 11, workedMinutes: 120, earned: 0 }))
      .toMatchObject({ hourCost: 20_000, guaranteed: 40_000 });
  });

  test("часы смены вне диапазона не ломают расчёт", () => {
    expect(calculatePayout({ garantAmount: 120_000, workHours: 0, workedMinutes: 30, earned: 0 }).guaranteed).toBe(60_000);
  });
});

describe("ручная корректировка", () => {
  const base = { garantAmount: 290_000, workHours: 12, workedMinutes: 12 * 60 };

  test("плюс доплачивает сверх гаранта за доп. часы", () => {
    const r = calculatePayout({ ...base, earned: 200_000, adjustment: 40_000 });
    expect(r.payout).toBe(90_000);
    expect(r.total).toBe(130_000);
  });

  test("минус удерживает из доплаты", () => {
    expect(calculatePayout({ ...base, earned: 200_000, adjustment: -30_000 }).total).toBe(60_000);
  });

  test("удержание больше доплаты не уводит итог в минус", () => {
    expect(calculatePayout({ ...base, earned: 200_000, adjustment: -500_000 }).total).toBe(0);
  });

  test("доп. часы начисляются, даже если гарант уже заработан", () => {
    const r = calculatePayout({ ...base, earned: 300_000, adjustment: 25_000 });
    expect(r.payout).toBe(0);
    expect(r.total).toBe(25_000);
  });
});

describe("отработанное время в смене тарифа", () => {
  const at = (iso: string) => new Date(iso);

  test("окно смены: 15:00–03:00 — до 03:00 следующих суток", () => {
    const w = tariffWindow("2026-10-16", "15:00:00", "03:00:00", WORK_END_HOUR);
    expect(w.start.toISOString()).toBe(at("2026-10-16T15:00:00+05:00").toISOString());
    expect(w.end.toISOString()).toBe(at("2026-10-17T03:00:00+05:00").toISOString());
  });

  test("пришёл раньше и ушёл позже — считается только смена тарифа", () => {
    const w = tariffWindow("2026-10-16", "10:00:00", "22:00:00", WORK_END_HOUR);
    expect(workedMinutes([{ start: at("2026-10-16T09:00:00+05:00"), end: at("2026-10-16T23:30:00+05:00") }], w)).toBe(720);
  });

  test("опоздал — оплачивается с момента открытия смены", () => {
    const w = tariffWindow("2026-10-16", "10:00:00", "22:00:00", WORK_END_HOUR);
    expect(workedMinutes([{ start: at("2026-10-16T12:20:00+05:00"), end: at("2026-10-16T22:00:00+05:00") }], w)).toBe(580);
  });

  test("две смены за день складываются, пересечения не удваиваются", () => {
    const w = tariffWindow("2026-10-16", "10:00:00", "22:00:00", WORK_END_HOUR);
    expect(workedMinutes([
      { start: at("2026-10-16T10:00:00+05:00"), end: at("2026-10-16T14:00:00+05:00") },
      { start: at("2026-10-16T13:00:00+05:00"), end: at("2026-10-16T15:00:00+05:00") },
      { start: at("2026-10-16T18:00:00+05:00"), end: at("2026-10-16T19:30:00+05:00") },
    ], w)).toBe(390);
  });

  test("смена целиком вне окна — ноль", () => {
    const w = tariffWindow("2026-10-16", "15:00:00", "03:00:00", WORK_END_HOUR);
    expect(workedMinutes([{ start: at("2026-10-16T08:00:00+05:00"), end: at("2026-10-16T12:00:00+05:00") }], w)).toBe(0);
  });

  test("без окна — всё время смены", () => {
    expect(workedMinutes([{ start: at("2026-10-16T08:00:00+05:00"), end: at("2026-10-16T12:30:00+05:00") }], null)).toBe(270);
  });
});

describe("isValidAdjustment", () => {
  test("обычные суммы проходят", () => {
    expect(isValidAdjustment(0)).toBe(true);
    expect(isValidAdjustment(40_000)).toBe(true);
    expect(isValidAdjustment(-30_000)).toBe(true);
    expect(isValidAdjustment(MAX_GARANT_ADJUSTMENT)).toBe(true);
  });

  test("за пределом, бесконечность и не-числа отклоняются", () => {
    expect(isValidAdjustment(MAX_GARANT_ADJUSTMENT + 1)).toBe(false);
    expect(isValidAdjustment(-MAX_GARANT_ADJUSTMENT - 1)).toBe(false);
    expect(isValidAdjustment(Infinity)).toBe(false);
    expect(isValidAdjustment(NaN)).toBe(false);
    expect(isValidAdjustment("40000")).toBe(false);
  });
});

describe("рабочий день", () => {
  test("смена днём относится к своему числу", () => {
    expect(businessDayOf("2026-10-16T10:26:00+05:00", WORK_END_HOUR)).toBe("2026-10-16");
  });

  test("смена после полуночи до 04:00 относится к предыдущему числу", () => {
    expect(businessDayOf("2026-10-17T02:30:00+05:00", WORK_END_HOUR)).toBe("2026-10-16");
  });

  test("в 04:00 начинается новый рабочий день", () => {
    expect(businessDayOf("2026-10-17T04:00:00+05:00", WORK_END_HOUR)).toBe("2026-10-17");
  });

  test("окно — с 04:00 до 04:00 следующего дня", () => {
    const { start, end } = businessDayWindow("2026-10-16", WORK_END_HOUR);
    expect(start.toISOString()).toBe(new Date("2026-10-16T04:00:00+05:00").toISOString());
    expect(end.toISOString()).toBe(new Date("2026-10-17T04:00:00+05:00").toISOString());
  });
});

describe("lateMinutes", () => {
  // Смена "10:00 - 22:00": начало в базе 04:00 → 10:00 по Ташкенту
  test("пришёл к началу смены — не опоздал", () => {
    expect(lateMinutes("2026-10-16T09:58:00+05:00", "04:00:00", "2026-10-16")).toBe(0);
  });

  test("пришёл позже — минуты от начала смены", () => {
    expect(lateMinutes("2026-10-16T10:47:00+05:00", "04:00:00", "2026-10-16")).toBe(47);
  });

  test("ночная смена считается от своего рабочего дня", () => {
    // "15:00-03:00": начало 09:00 в базе → 15:00; открыл в 00:20 следующих суток
    expect(lateMinutes("2026-10-17T00:20:00+05:00", "09:00:00", "2026-10-16")).toBe(560);
  });
});

describe("pickPayingTerminal", () => {
  const LES_AILES = "7718e8e5-a23e-4d98-b9a6-5b85115c4fa5";
  const CHOPAR = "59d38207-2b57-4682-ba8e-9292401ecea5";

  const goldenLifeChopar = { id: "gl-chopar", organization_id: CHOPAR, latitude: 41.2234, longitude: 69.2071 };
  const goldenLifeLes = { id: "gl-les", organization_id: LES_AILES, latitude: 41.2234, longitude: 69.2071 };
  const parusChopar = { id: "parus-chopar", organization_id: CHOPAR, latitude: 41.29190, longitude: 69.21110 };
  const parusLes = { id: "parus-les", organization_id: LES_AILES, latitude: 41.29192, longitude: 69.21113 };
  const qoyliqChopar = { id: "qoyliq-chopar", organization_id: CHOPAR, latitude: 41.2500, longitude: 69.3020 };
  const compassLes = { id: "compass-les", organization_id: LES_AILES, latitude: 41.2478, longitude: 69.3318 };
  const all = [goldenLifeChopar, goldenLifeLes, parusChopar, parusLes, qoyliqChopar, compassLes];

  test("работал в Les Ailes — платит он же", () => {
    expect(pickPayingTerminal(goldenLifeLes, all, LES_AILES).id).toBe("gl-les");
  });

  test("работал в Chopar на точке с Les Ailes — платит Les Ailes той же точки", () => {
    expect(pickPayingTerminal(goldenLifeChopar, all, LES_AILES).id).toBe("gl-les");
  });

  test("координаты точки введены вручную с расхождением в метры — всё равно одна точка", () => {
    expect(distanceMeters(parusChopar, parusLes)).toBeLessThan(10);
    expect(pickPayingTerminal(parusChopar, all, LES_AILES).id).toBe("parus-les");
  });

  test("на точке только Chopar — платит сам Chopar, а не Les Ailes в 2,5 км", () => {
    expect(distanceMeters(qoyliqChopar, compassLes)).toBeGreaterThan(2000);
    expect(pickPayingTerminal(qoyliqChopar, all, LES_AILES).id).toBe("qoyliq-chopar");
  });

  test("явная связка важнее координат", () => {
    // O'zbegim Chopar связан с Andijan Les Ailes, названия у них разные
    const ozbegim = { id: "ozbegim", organization_id: CHOPAR, latitude: 40.7800, longitude: 72.3400, linked_terminal_id: "andijan-les" };
    const andijan = { id: "andijan-les", organization_id: LES_AILES, latitude: 40.7803, longitude: 72.3405 };
    const decoy = { id: "decoy-les", organization_id: LES_AILES, latitude: 40.7800, longitude: 72.3400 };
    expect(pickPayingTerminal(ozbegim, [ozbegim, andijan, decoy], LES_AILES).id).toBe("andijan-les");
  });

  test("связка сам на себя (как у Eko Park Chopar) — ищем пару по координатам", () => {
    const ekoChopar = { id: "eko-chopar", organization_id: CHOPAR, latitude: 41.3100, longitude: 69.2900, linked_terminal_id: "eko-chopar" };
    const ekoLes = { id: "eko-les", organization_id: LES_AILES, latitude: 41.3101, longitude: 69.2901 };
    expect(pickPayingTerminal(ekoChopar, [ekoChopar, ekoLes], LES_AILES).id).toBe("eko-les");
  });

  test("связка ведёт не в Les Ailes — не доверяем ей", () => {
    const a = { id: "a", organization_id: CHOPAR, latitude: 41.0, longitude: 69.0, linked_terminal_id: "b" };
    const b = { id: "b", organization_id: CHOPAR, latitude: 41.0, longitude: 69.0 };
    expect(pickPayingTerminal(a, [a, b], LES_AILES).id).toBe("a");
  });
});

describe("график тарифа", () => {
  test("часы смены считаются из начала и конца", () => {
    expect(shiftHours("10:00", "22:00")).toBe(12);
    expect(shiftHours("11:00:00", "22:00:00")).toBe(11);
    expect(shiftHours("15:00", "03:00")).toBe(12);
    expect(shiftHours("10:00", "21:30")).toBe(11.5);
    expect(shiftHours("10:00", "10:00")).toBe(24);
  });

  test("опоздание к началу смены тарифа — по местному времени", () => {
    expect(lateMinutesFromTariff("2026-10-16T10:47:00+05:00", "10:00:00", "2026-10-16", WORK_END_HOUR)).toBe(47);
    expect(lateMinutesFromTariff("2026-10-16T09:55:00+05:00", "10:00:00", "2026-10-16", WORK_END_HOUR)).toBe(0);
  });

  test("смена после полуночи относится к следующим суткам рабочего дня", () => {
    expect(lateMinutesFromTariff("2026-10-17T02:40:00+05:00", "02:00:00", "2026-10-16", WORK_END_HOUR)).toBe(40);
  });

  test("время проверяется", () => {
    expect(isValidTime("10:00")).toBe(true);
    expect(isValidTime("23:30:00")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("10")).toBe(false);
  });
});

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
} from "./calculate";

// Расчёт явно работает по Ташкенту, поэтому тесты проходят в любом поясе
// процесса — bun test по умолчанию гоняет их в UTC.
const WORK_END_HOUR = 4;

describe("calculatePayout", () => {
  // 270 000 за 12 часов → час гаранта 22 500
  const garant = { garantAmount: 270_000, workHours: 12 };

  test("доплачивает разницу до гаранта", () => {
    expect(calculatePayout({ ...garant, earned: 180_000, lateMinutes: 0 }))
      .toEqual({ hourCost: 22_500, penaltyHours: 0, penalty: 0, guaranteed: 270_000, payout: 90_000, adjustment: 0, total: 90_000 });
  });

  test("ничего не доплачивает, если заработал больше гаранта", () => {
    expect(calculatePayout({ ...garant, earned: 300_000, lateMinutes: 0 }).payout).toBe(0);
  });

  test("ничего не доплачивает, если заработал ровно гарант", () => {
    expect(calculatePayout({ ...garant, earned: 270_000, lateMinutes: 0 }).payout).toBe(0);
  });

  test("опоздание до 30 минут включительно не штрафуется", () => {
    expect(calculatePayout({ ...garant, earned: 0, lateMinutes: 30 }).penalty).toBe(0);
  });

  test("больше 30 минут — минус час гаранта", () => {
    expect(calculatePayout({ ...garant, earned: 0, lateMinutes: 31 }).penalty).toBe(22_500);
    expect(calculatePayout({ ...garant, earned: 0, lateMinutes: 60 }).penalty).toBe(22_500);
  });

  test("каждый начатый час опоздания — ещё час", () => {
    expect(calculatePayout({ ...garant, earned: 0, lateMinutes: 61 }).penaltyHours).toBe(2);
    expect(calculatePayout({ ...garant, earned: 0, lateMinutes: 120 }).penaltyHours).toBe(2);
    expect(calculatePayout({ ...garant, earned: 0, lateMinutes: 121 }).penalty).toBe(67_500);
  });

  test("час гаранта зависит от часов смены по тарифу", () => {
    // 220 000 за 11 часов → 20 000 в час
    expect(calculatePayout({ garantAmount: 220_000, workHours: 11, earned: 0, lateMinutes: 45 }))
      .toMatchObject({ hourCost: 20_000, penalty: 20_000, guaranteed: 200_000 });
  });

  test("штраф уменьшает гарант, а не добавляется к заработку", () => {
    // 270 000 − 22 500 = 247 500; заработал 200 000 → доплата 47 500
    expect(calculatePayout({ ...garant, earned: 200_000, lateMinutes: 40 }).payout).toBe(47_500);
  });

  test("штраф больше гаранта не уводит доплату в минус", () => {
    expect(calculatePayout({ ...garant, earned: 0, lateMinutes: 20 * 60 }))
      .toMatchObject({ guaranteed: 0, payout: 0, total: 0 });
  });

  test("ни одного заказа за день — доплачивается весь гарант", () => {
    expect(calculatePayout({ ...garant, earned: 0, lateMinutes: 0 }).payout).toBe(270_000);
  });

  test("доплата округляется до целых сумов", () => {
    expect(calculatePayout({ garantAmount: 100_000, workHours: 12, earned: 33_333.6, lateMinutes: 0 }).payout)
      .toBe(66_666);
  });

  test("часы смены вне диапазона не ломают расчёт", () => {
    expect(calculatePayout({ garantAmount: 120_000, workHours: 0, earned: 0, lateMinutes: 45 }).hourCost).toBe(120_000);
  });
});

describe("ручная корректировка", () => {
  const base = { garantAmount: 270_000, workHours: 12, lateMinutes: 0 };

  test("плюс доплачивает сверх гаранта за доп. часы", () => {
    const r = calculatePayout({ ...base, earned: 180_000, adjustment: 40_000 });
    expect(r.payout).toBe(90_000);
    expect(r.total).toBe(130_000);
  });

  test("минус удерживает из доплаты", () => {
    expect(calculatePayout({ ...base, earned: 180_000, adjustment: -30_000 }).total).toBe(60_000);
  });

  test("удержание больше доплаты не уводит итог в минус", () => {
    expect(calculatePayout({ ...base, earned: 180_000, adjustment: -500_000 }).total).toBe(0);
  });

  test("доп. часы начисляются, даже если гарант уже заработан", () => {
    const r = calculatePayout({ ...base, earned: 300_000, adjustment: 25_000 });
    expect(r.payout).toBe(0);
    expect(r.total).toBe(25_000);
  });

  test("корректировка не трогает гарант и штраф", () => {
    const r = calculatePayout({ ...base, earned: 0, lateMinutes: 45, adjustment: 10_000 });
    expect(r.penalty).toBe(22_500);
    expect(r.guaranteed).toBe(247_500);
    expect(r.total).toBe(257_500);
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

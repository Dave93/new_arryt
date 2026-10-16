import { describe, expect, test } from "bun:test";
import {
  businessDayOf,
  businessDayWindow,
  calculatePayout,
  distanceMeters,
  lateMinutes,
  pickPayingTerminal,
} from "./calculate";

// Расчёт явно работает по Ташкенту, поэтому тесты проходят в любом поясе
// процесса — bun test по умолчанию гоняет их в UTC.
const WORK_END_HOUR = 4;

describe("calculatePayout", () => {
  test("доплачивает разницу до гаранта", () => {
    expect(calculatePayout({ garantAmount: 270_000, lateMinusSum: 11_250, earned: 180_000, lateMinutes: 0 }))
      .toEqual({ penalty: 0, guaranteed: 270_000, payout: 90_000 });
  });

  test("ничего не доплачивает, если заработал больше гаранта", () => {
    expect(calculatePayout({ garantAmount: 270_000, lateMinusSum: 11_250, earned: 300_000, lateMinutes: 0 }).payout)
      .toBe(0);
  });

  test("ничего не доплачивает, если заработал ровно гарант", () => {
    expect(calculatePayout({ garantAmount: 250_000, lateMinusSum: 10_000, earned: 250_000, lateMinutes: 0 }).payout)
      .toBe(0);
  });

  test("штраф только за полные 30 минут", () => {
    const base = { garantAmount: 250_000, lateMinusSum: 10_000, earned: 0 };
    expect(calculatePayout({ ...base, lateMinutes: 29 }).penalty).toBe(0);
    expect(calculatePayout({ ...base, lateMinutes: 30 }).penalty).toBe(10_000);
    expect(calculatePayout({ ...base, lateMinutes: 59 }).penalty).toBe(10_000);
    expect(calculatePayout({ ...base, lateMinutes: 60 }).penalty).toBe(20_000);
  });

  test("штраф уменьшает гарант, а не добавляется к заработку", () => {
    // 250 000 − 2×10 000 = 230 000; заработал 200 000 → доплата 30 000
    expect(calculatePayout({ garantAmount: 250_000, lateMinusSum: 10_000, earned: 200_000, lateMinutes: 65 }))
      .toEqual({ penalty: 20_000, guaranteed: 230_000, payout: 30_000 });
  });

  test("штраф больше гаранта не уводит доплату в минус", () => {
    expect(calculatePayout({ garantAmount: 100_000, lateMinusSum: 10_000, earned: 0, lateMinutes: 600 }))
      .toEqual({ penalty: 200_000, guaranteed: 0, payout: 0 });
  });

  test("ни одного заказа за день — доплачивается весь гарант", () => {
    expect(calculatePayout({ garantAmount: 270_000, lateMinusSum: 11_250, earned: 0, lateMinutes: 0 }).payout)
      .toBe(270_000);
  });

  test("доплата округляется до целых сумов", () => {
    expect(calculatePayout({ garantAmount: 100_000, lateMinusSum: 0, earned: 33_333.6, lateMinutes: 0 }).payout)
      .toBe(66_666);
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
  // Смена "10:00 - 22:00": крайний срок отметки в базе 04:30 → 10:30 по Ташкенту
  test("пришёл до крайнего срока — не опоздал", () => {
    expect(lateMinutes("2026-10-16T10:26:00+05:00", "04:30:00", "2026-10-16")).toBe(0);
  });

  test("пришёл после крайнего срока — минуты опоздания", () => {
    expect(lateMinutes("2026-10-16T10:47:00+05:00", "04:30:00", "2026-10-16")).toBe(17);
  });

  test("ночная смена считается от своего рабочего дня", () => {
    // "15:00-03:00": срок 09:30 в базе → 15:30; открыл в 00:20 следующих суток
    expect(lateMinutes("2026-10-17T00:20:00+05:00", "09:30:00", "2026-10-16")).toBe(530);
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

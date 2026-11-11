import { describe, expect, test } from "bun:test";
import { yandexCancelAction } from "./yandex-callback";

describe("yandexCancelAction", () => {
    test("leaves the order alone on `cancelled` (a cancel made outside Arryt, e.g. in the Yandex cabinet)", () => {
        expect(yandexCancelAction("cancelled")).toBe("leave");
    });
    test("returns the order to missed when Yandex itself gave up", () => {
        expect(yandexCancelAction("cancelled_by_taxi")).toBe("return_to_missed");
        expect(yandexCancelAction("estimating_failed")).toBe("return_to_missed");
    });
    test("does nothing special where the courier may hold the food or the claim is still alive", () => {
        for (const s of ["cancelled_with_items_on_hands", "failed", "returned_finish", "cancelled_with_payment",
            "performer_lookup", "performer_found", "pickuped", "delivered_finish"]) {
            expect(yandexCancelAction(s)).toBeNull();
        }
    });
    test("handles a missing status", () => {
        expect(yandexCancelAction(undefined)).toBeNull();
        expect(yandexCancelAction(null)).toBeNull();
        expect(yandexCancelAction("")).toBeNull();
    });
});

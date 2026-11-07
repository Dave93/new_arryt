import { describe, expect, test } from "bun:test";
import { extractNoorCallback, isNoorWebhookAuthorized, shouldReturnToMissed } from "./noor-webhook";

describe("isNoorWebhookAuthorized", () => {
    const headers = (h: Record<string, string>) => new Headers(h);

    test("accepts the raw token in `authorization` (what Noor really sends)", () => {
        expect(isNoorWebhookAuthorized(headers({ authorization: "secret" }), "secret")).toBe(true);
    });
    test("accepts `Bearer <token>` in `authorization`", () => {
        expect(isNoorWebhookAuthorized(headers({ authorization: "Bearer secret" }), "secret")).toBe(true);
    });
    test("still accepts `x-auth`", () => {
        expect(isNoorWebhookAuthorized(headers({ "x-auth": "secret" }), "secret")).toBe(true);
    });
    test("rejects a wrong or missing token", () => {
        expect(isNoorWebhookAuthorized(headers({ authorization: "nope" }), "secret")).toBe(false);
        expect(isNoorWebhookAuthorized(headers({}), "secret")).toBe(false);
    });
    test("rejects everything when the expected token is not configured", () => {
        expect(isNoorWebhookAuthorized(headers({ authorization: "" }), undefined)).toBe(false);
        expect(isNoorWebhookAuthorized(headers({ authorization: "x" }), "")).toBe(false);
    });
});

describe("extractNoorCallback", () => {
    test("takes the id from order.id and the numeric stage", () => {
        expect(extractNoorCallback({ vendor_order_id: "1", stage: 22, order: { id: 987 } }))
            .toEqual({ noorId: "987", stage: "22" });
    });
    test("falls back to top-level id", () => {
        expect(extractNoorCallback({ id: "55", stage: 7 })).toEqual({ noorId: "55", stage: "7" });
    });
    test("no id → null", () => {
        expect(extractNoorCallback({ stage: 7 })).toEqual({ noorId: null, stage: "7" });
        expect(extractNoorCallback(null)).toEqual({ noorId: null, stage: null });
    });
});

describe("shouldReturnToMissed", () => {
    test("carrier cancelled / failed / no performer / out of zone → back to missed", () => {
        for (const s of ["21", "22", "23", "25", "26", "27", "28", "29"]) expect(shouldReturnToMissed(s)).toBe(true);
    });
    test("live, finished, returning and items-on-hand stages are left alone", () => {
        for (const s of ["1", "7", "8", "10", "11", "14", "15", "16", "17", "18", "19", "20", "24"]) {
            expect(shouldReturnToMissed(s)).toBe(false);
        }
        expect(shouldReturnToMissed(null)).toBe(false);
    });
});

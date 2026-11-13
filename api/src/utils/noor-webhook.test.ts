import { describe, expect, test } from "bun:test";
import { extractNoorCallback, isNoorWebhookAuthorized, noorCallbackSummary, noorWebhookLogLine, shouldReturnToMissed } from "./noor-webhook";

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

describe("the log lines of a Noor callback", () => {
    const TOKEN = "noor-test-token-0000";
    // The shape Noor sends (Noor-Api-Docs-09-02-2026): the customer's name, phone and address ride in the body.
    const body = {
        vendor_order_id: "953496",
        stage: 27,
        order: {
            id: 524912,
            vendor_order_id: "953496",
            stage: 27,
            origin: [{ address: "Chilonzor 9", client: { phone: "+998901234567", name: "Aziz" } }],
            destination: [{ address: "Yunusobod 4, kv 12", apartment: "12", entrance: "2" }],
        },
    };

    test("names the order ids and the stage", () => {
        expect(noorCallbackSummary(body)).toBe("noor_id=524912 vendor_order_id=953496 stage=27");
    });

    test("names which auth headers came, never their values", () => {
        const line = noorWebhookLogLine(new Headers({ authorization: TOKEN, "x-auth": TOKEN, "user-agent": "noor" }), body);
        expect(line).toBe("noor_id=524912 vendor_order_id=953496 stage=27 auth_headers=authorization,x-auth");
        expect(line).not.toContain(TOKEN);
        expect(noorWebhookLogLine(new Headers({}), body)).toContain("auth_headers=none");
    });

    test("never carries the customer's data", () => {
        for (const line of [noorCallbackSummary(body), noorWebhookLogLine(new Headers({ authorization: TOKEN }), body)]) {
            for (const secret of [TOKEN, "+998901234567", "Aziz", "Chilonzor", "Yunusobod"]) expect(line).not.toContain(secret);
        }
    });

    test("stays one line of short tokens whatever the body holds", () => {
        expect(noorCallbackSummary(undefined)).toBe("noor_id=- vendor_order_id=- stage=-");
        expect(noorCallbackSummary({ vendor_order_id: "1 2\nforged=line", order: { id: "x".repeat(100) }, stage: "" }))
            .toBe(`noor_id=${"x".repeat(40)} vendor_order_id=12forgedline stage=-`);
    });
});


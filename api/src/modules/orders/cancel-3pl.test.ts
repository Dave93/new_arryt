import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cancelNoorDelivery } from "./cancel-3pl";

// Noor cancel (PATCH /orders/:id/cancel) answers 200 "OK" or 400 {"error":"order.is.closed"}, and «closed» is
// delivered OR cancelled, so on that 400 the order is read (GET /orders/:id, `stage`) to tell them apart.
// Noor-Api-Docs-09-02-2026: 14 Delivered, 15 DeliveredFinish, 19 Returned, 20 ReturnedFinish are finished,
// 21..29 are the cancelled / failed stages, everything else is on its way.
const CANCELLED_STAGES = [21, 22, 23, 24, 25, 26, 27, 28, 29];
const FINISHED_STAGES = [14, 15, 19, 20];
const LIVE_STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18];

type Reply = { status: number; body?: unknown } | "network";
type Call = { method: string; url: string; headers: Record<string, string> };

const realFetch = globalThis.fetch;
const realWarn = console.warn;
const realLog = console.log;
let calls: Call[] = [];
let events: string[] = [];
let flags: string[] = [];

beforeEach(() => {
    process.env.NOOR_DELIVERY_TOKEN = "noor-token";
    console.warn = () => {};
    console.log = () => {};
});

afterEach(() => {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
    console.log = realLog;
});

/** One cancel against a scripted Noor: `patch` answers the cancel, `get` answers the order read. */
async function cancel(patch: Reply, get?: Reply, external = true) {
    calls = [];
    events = [];
    flags = [];
    globalThis.fetch = (async (url: any, init: any = {}) => {
        const method = init.method ?? "GET";
        calls.push({ method, url: String(url), headers: init.headers ?? {} });
        events.push(method);
        const reply = method === "PATCH" ? patch : get;
        if (!reply) {
            throw new Error(`unscripted ${method} ${url}`);
        }
        if (reply === "network") {
            throw new TypeError("fetch failed");
        }
        const text = reply.body === undefined ? "" : typeof reply.body === "string" ? reply.body : JSON.stringify(reply.body);

        return new Response(text, { status: reply.status });
    }) as typeof fetch;
    const redis: any = {
        set: async (key: string) => {
            events.push("flag");
            flags.push(key);
        },
    };

    return cancelNoorDelivery(redis, "noor-1", "t", { external });
}

const closed: Reply = { status: 400, body: { error: "order.is.closed" } };
const order = (stage: unknown): Reply => ({ status: 200, body: { id: 1, vendor_order_id: "2", reason: null, stage } });

describe("noor cancel: 200", () => {
    test("is ok, one request, the flag goes up after the cancel", async () => {
        const res = await cancel({ status: 200, body: "OK" });
        expect(res).toEqual({ ok: true });
        expect(events).toEqual(["PATCH", "flag"]);
        expect(flags).toEqual(["noor_operator_cancel:noor-1"]);
    });
});

describe("noor cancel: 400 order.is.closed, then the order is read", () => {
    test("reads GET /orders/:id with the X-Auth token, once", async () => {
        await cancel(closed, order(22));
        expect(calls.map((c) => c.method)).toEqual(["PATCH", "GET"]);
        expect(calls[1].url).toBe("https://back.noor.uz/api/v1/orders/noor-1");
        expect(calls[1].headers["X-Auth"]).toBe("noor-token");
    });

    for (const stage of CANCELLED_STAGES) {
        test(`stage ${stage} (cancelled / failed) -> ok, nothing to alert, no flag`, async () => {
            const res = await cancel(closed, order(stage));
            expect(res).toEqual({ ok: true });
            expect(flags).toEqual([]);
            expect(calls.filter((c) => c.method === "PATCH").length).toBe(1);
        });
    }

    for (const stage of FINISHED_STAGES) {
        test(`stage ${stage} (delivered / returned) -> finished`, async () => {
            const res = await cancel(closed, order(stage));
            expect(res).toMatchObject({ ok: false, kind: "finished" });
            expect(flags).toEqual([]);
        });
    }

    for (const stage of LIVE_STAGES) {
        test(`stage ${stage} (on its way) -> unavailable`, async () => {
            const res = await cancel(closed, order(stage));
            expect(res).toMatchObject({ ok: false, kind: "unavailable" });
            expect(flags).toEqual([]);
        });
    }

    test("a stage that comes as a numeric string is read the same way", async () => {
        expect(await cancel(closed, order("22"))).toEqual({ ok: true });
        expect(await cancel(closed, order("15"))).toMatchObject({ ok: false, kind: "finished" });
    });
});

describe("noor cancel: the order read itself fails -> transient (502, orderly retries)", () => {
    const failures: Array<[string, Reply]> = [
        ["network error", "network"],
        ["HTTP 500", { status: 500, body: "boom" }],
        ["HTTP 502", { status: 502 }],
        ["HTTP 429", { status: 429 }],
        ["HTTP 404", { status: 404, body: { error: "order.not.found" } }],
        ["HTTP 401", { status: 401 }],
        ["2xx without a stage", { status: 200, body: { id: 1 } }],
        ["2xx with a null stage", order(null)],
        ["2xx with a garbage stage", order("closed")],
        ["2xx that is not JSON", { status: 200, body: "OK" }],
    ];
    for (const [name, get] of failures) {
        test(name, async () => {
            const res = await cancel(closed, get);
            expect(res).toMatchObject({ ok: false, kind: "transient" });
            expect(flags).toEqual([]);
        });
    }
});

describe("noor cancel: every other answer of the cancel is as before", () => {
    test("HTTP 5xx and a network error are transient, the order is not read", async () => {
        for (const patch of [{ status: 500 }, { status: 503 }, "network"] as Reply[]) {
            const res = await cancel(patch);
            expect(res).toMatchObject({ ok: false, kind: "transient" });
            expect(calls.map((c) => c.method)).toEqual(["PATCH"]);
        }
    });

    test("HTTP 408 / 425 / 429 are transient", async () => {
        for (const status of [408, 425, 429]) {
            expect(await cancel({ status })).toMatchObject({ ok: false, kind: "transient" });
        }
    });

    test("any other 4xx, and a 400 that is not order.is.closed, is unavailable and the order is not read", async () => {
        const refusals: Reply[] = [
            { status: 400, body: { error: "something.else" } },
            { status: 400, body: "bad request" },
            { status: 400 },
            { status: 401 },
            { status: 403 },
            { status: 404, body: { error: "order.not.found" } },
            { status: 422 },
        ];
        for (const patch of refusals) {
            const res = await cancel(patch, order(22));
            expect(res).toMatchObject({ ok: false, kind: "unavailable" });
            expect(calls.map((c) => c.method)).toEqual(["PATCH"]);
            expect(flags).toEqual([]);
        }
    });

    test("the operator route (not external) does not read the order: a closed order stays unavailable", async () => {
        const res = await cancel(closed, order(22), false);
        expect(res).toMatchObject({ ok: false, kind: "unavailable" });
        expect(calls.map((c) => c.method)).toEqual(["PATCH"]);
    });
});

import { timingSafeEqual } from "node:crypto";

/**
 * Noor webhook helpers (Noor-Api-Docs-09-02-2026: the webhook body is the same as the create-order response and is
 * sent on every stage change).
 */

function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Noor sends the static token in `Authorization` (raw, no scheme); `X-Auth` is what we use when calling Noor, so it
 * is accepted too. `Bearer <token>` is tolerated. Nothing is accepted while the token is not configured.
 */
export function isNoorWebhookAuthorized(headers: Headers, expected: string | undefined): boolean {
    if (!expected) return false;
    const candidates = [headers.get("x-auth"), headers.get("authorization")?.replace(/^Bearer\s+/i, "")];
    return candidates.some((c) => !!c && safeEqual(c, expected));
}

/** Noor order id is `body.order.id` (top-level `id` kept as a fallback); `stage` is Noor's numeric stage. */
export function extractNoorCallback(body: any): { noorId: string | null; stage: string | null } {
    const id = body?.order?.id ?? body?.id;
    const stage = body?.stage ?? body?.order?.stage;
    return {
        noorId: id === undefined || id === null || id === "" ? null : String(id),
        stage: stage === undefined || stage === null || stage === "" ? null : String(stage),
    };
}

/**
 * A value as one short token for a log line: only a string, number or boolean, cut to `[A-Za-z0-9_.:-]` and 40
 * characters, `-` for anything else. A JSON object never reaches `String()`, which throws for `{"toString":1}`: the
 * webhook logs before it checks the token, so a throw here would turn an unauthenticated 403 into a 500.
 */
function logValue(v: unknown): string {
    if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") return "-";
    return String(v).replace(/[^\w.:-]/g, "").slice(0, 40) || "-";
}

const asObject = (v: unknown): Record<string, unknown> => (v !== null && typeof v === "object" ? (v as Record<string, unknown>) : {});

/**
 * What a log line may say about a Noor callback: its order ids and the stage, read as `extractNoorCallback` reads them.
 * Never the body itself, which carries the customer's name, phone and address (`order.origin[].client`,
 * `order.destination[]`). Never throws, whatever the body is.
 */
export function noorCallbackSummary(body: unknown): string {
    const b = asObject(body);
    const order = asObject(b.order);
    return `noor_id=${logValue(order.id ?? b.id)} vendor_order_id=${logValue(b.vendor_order_id ?? order.vendor_order_id)} stage=${logValue(b.stage ?? order.stage)}`;
}

/**
 * The one log line of an incoming Noor webhook: `noorCallbackSummary` and the names of the auth headers that came, never
 * their values. Noor sends its static token raw in `Authorization`, so a dump of the headers is a dump of the secret.
 */
export function noorWebhookLogLine(headers: Headers, body: unknown): string {
    const auth = ["authorization", "x-auth"].filter((name) => headers.has(name));
    return `${noorCallbackSummary(body)} auth_headers=${auth.length > 0 ? auth.join(",") : "none"}`;
}

// 21 CancelledByTaxi, 22 Cancelled, 23 CancelledWithPayment, 25 Failed, 26 EstimatingFailed, 27 PerformerNotFound,
// 28 CancelledOutOfZone, 29 CancelledOutOfRange: nothing was handed to the customer, the order goes back to missed so
// the operator (or the next carrier) can take it. Not here: 16-20 (return flow: the courier already has the food) and
// 24 CancelledWithItemsOnHand, the same as Yandex `cancelled_with_items_on_hands` / `returned_finish`.
const RETURN_TO_MISSED_STAGES = new Set(["21", "22", "23", "25", "26", "27", "28", "29"]);

export function shouldReturnToMissed(stage: string | null): boolean {
    return stage !== null && RETURN_TO_MISSED_STAGES.has(stage);
}

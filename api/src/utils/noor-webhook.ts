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

// 21 CancelledByTaxi, 22 Cancelled, 23 CancelledWithPayment, 25 Failed, 26 EstimatingFailed, 27 PerformerNotFound,
// 28 CancelledOutOfZone, 29 CancelledOutOfRange: nothing was handed to the customer, the order goes back to missed so
// the operator (or the next carrier) can take it. Not here: 16-20 (return flow: the courier already has the food) and
// 24 CancelledWithItemsOnHand, the same as Yandex `cancelled_with_items_on_hands` / `returned_finish`.
const RETURN_TO_MISSED_STAGES = new Set(["21", "22", "23", "25", "26", "27", "28", "29"]);

export function shouldReturnToMissed(stage: string | null): boolean {
    return stage !== null && RETURN_TO_MISSED_STAGES.has(stage);
}

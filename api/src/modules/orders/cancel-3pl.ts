import type Redis from "ioredis";
import { noorFetch } from "../../utils/noor";
import { UZUM_BASE_URL, uzumHeaders } from "../../utils/uzum";

/**
 * Cancels the delivery claim of an order at a third-party carrier. Shared by the operator routes
 * (`/api/orders/:id/cancel_*`) and the external `cancel-order`, so both do the same thing at the carrier.
 *
 * Only the carrier side lives here: the claim-cancel request and the `*_operator_cancel` flag. The caller updates
 * the order (and decides what a failure means: an operator route goes on, `cancel-order` answers with the status
 * below and changes nothing). The flag is set AFTER a 2xx cancel, so a carrier callback that arrives between the
 * request and the caller's update sees it. It is never set before the request: a callback that finds the flag drops
 * the courier and the claim id of the row without looking at the claim's status, so a flag left standing while the
 * carrier refuses the cancel would strip a live claim (courier at the pickup) from the order. A Redis that fails
 * while the flag goes up is logged and ignored: the carrier has cancelled, the caller goes on to its update.
 *
 * A refusal of the carrier is not a failure of the carrier: a claim that is already cancelled (the first try
 * cancelled it and the caller's update failed), or delivered, or in a state that cannot be cancelled for free, answers
 * 4xx every time, so retrying it is pointless. The result says which of these it is:
 *  - ok          the claim is released at the carrier (cancelled now, or it was already)
 *  - transient   network, timeout, carrier 5xx, or the claim could not be read: nothing is known, retry later
 *  - finished    the carrier delivered it
 *  - unavailable the carrier refuses the cancel in the claim's state (the courier is on the way)
 */
export type Cancel3plResult =
    | { ok: true }
    | { ok: false; kind: "transient" | "finished" | "unavailable"; error: string };

/** `external`: cancel-order for orderly. It never pays for a cancel and does not wait for a slow carrier. */
export type Cancel3plOptions = { external?: boolean };

const OPERATOR_CANCEL_TTL_SECONDS = 7200;

// A carrier request is cut off after this long. It bounds one request, not the whole cancel: Yandex and Uzum take up to
// 3 x 7 = 21 s (read, cancel, read again), Noor 2 x 7 = 14 s (cancel, then the order read behind order.is.closed). A row
// with two carriers takes up to 35 s (Yandex or Uzum plus Noor) or 42 s (Yandex plus Uzum), with three 56 s. That is more
// than orderly's 10 s client timeout, and past Elysia's 30 s idle timeout, so orderly can time out first and retry
// while this call is still running. Overlapping calls converge: the later one finds the claim cancelled (the cancel is
// refused, the re-read says released; for Noor the closed order reads as stage 21-29) and every update is idempotent.
const CARRIER_TIMEOUT_MS = 7000;

// Claim statuses (Yandex Cargo API, Uzum implements the same one). The cancelled ones are the list the callbacks
// treat as a cancel (queue/processors/yandex_callback.ts); `performer_not_found` has no courier, there is nothing
// left to cancel.
const RELEASED_CLAIM_STATUSES = new Set([
    "cancelled",
    "cancelled_by_taxi",
    "cancelled_with_payment",
    "cancelled_with_items_on_hands",
    "failed",
    "estimating_failed",
    "performer_not_found",
    "returned_finish",
]);
const DELIVERED_CLAIM_STATUSES = new Set(["delivered", "delivered_finish"]);

// A carrier that says «slow down» or «try again» has not decided anything.
const RETRYABLE_STATUSES = new Set([408, 425, 429]);

const transient = (error: string): Cancel3plResult => ({ ok: false, kind: "transient", error });

type CarrierCall =
    | { kind: "ok"; json: any }
    // `answered`: false when no HTTP answer arrived at all (network, timeout), true for a 5xx/408/425/429
    | { kind: "transient"; error: string; answered: boolean }
    | { kind: "refused"; status: number; body: string };

/** One request to a carrier: 2xx is ok, network / 5xx / 408 / 425 / 429 is transient, any other 4xx is a refusal. */
async function carrierCall(label: string, what: string, url: string, init: RequestInit): Promise<CarrierCall> {
    try {
        const res = await fetch(url, { ...init, signal: AbortSignal.timeout(CARRIER_TIMEOUT_MS) });
        const text = await res.text();
        if (res.ok) {
            let json: any = {};
            try {
                json = JSON.parse(text) ?? {};
            } catch {
                // an empty or non-JSON 2xx body is still a success
            }

            return { kind: "ok", json };
        }

        console.log(`[${label}] ${what} answered HTTP ${res.status}: ${text}`);
        if (res.status >= 500 || RETRYABLE_STATUSES.has(res.status)) {
            return { kind: "transient", error: `${what} answered HTTP ${res.status}`, answered: true };
        }

        return { kind: "refused", status: res.status, body: text };
    } catch (e) {
        console.log(`[${label}] ERROR: ${what} request failed`, e);

        return { kind: "transient", error: `${what} request failed`, answered: false };
    }
}

// Yandex and Uzum speak the same Cargo API, only the host and the auth differ.
type ClaimCarrier = {
    name: string;
    url: (path: string, claimId: string) => string;
    headers: () => Record<string, string>;
};

const yandex: ClaimCarrier = {
    name: "Yandex",
    url: (path, claimId) => `https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/claims/${path}?claim_id=${claimId}`,
    headers: () => ({
        "Accept-Language": "ru",
        Authorization: `Bearer ${process.env.YANDEX_DELIVERY_TOKEN}`,
    }),
};

const uzum: ClaimCarrier = {
    name: "Uzum",
    url: (path, claimId) => `${UZUM_BASE_URL}/b2b/cargo/integration/v2/claims/${path}?claim_id=${claimId}`,
    headers: uzumHeaders,
};

type ClaimRead = { ok: true; status: string; version?: number } | { ok: false; error: string };

/** claims/info, the same call and auth as the callbacks (queue/processors/yandex_callback.ts, uzum_callback.ts). */
async function readClaim(carrier: ClaimCarrier, claimId: string, label: string): Promise<ClaimRead> {
    const what = `${carrier.name} claims/info`;
    const call = await carrierCall(label, what, carrier.url("info", claimId), {
        method: "POST",
        headers: carrier.headers(),
    });
    if (call.kind === "transient") {
        return { ok: false, error: call.error };
    }
    if (call.kind === "refused") {
        return { ok: false, error: `${what} answered HTTP ${call.status}` };
    }
    if (typeof call.json.status !== "string") {
        return { ok: false, error: `${what} returned no status` };
    }

    return {
        ok: true,
        status: call.json.status,
        version: typeof call.json.version === "number" ? call.json.version : undefined,
    };
}

/**
 * The carrier refused the cancel with a 4xx. Read the claim again to see why: it is released already (a retry of a
 * cancel that went through), delivered, or still on its way. If the claim cannot be read either, nothing is known
 * and the answer is transient. A cancel with payment is never sent from here.
 */
async function resolveRefusal(
    carrier: ClaimCarrier,
    claimId: string,
    label: string,
    refused: { status: number; body: string },
    sentVersion?: number,
): Promise<Cancel3plResult> {
    const claim = await readClaim(carrier, claimId, label);
    if (!claim.ok) {
        return transient(`${carrier.name} refused the cancel (HTTP ${refused.status}), ${claim.error}`);
    }

    if (RELEASED_CLAIM_STATUSES.has(claim.status)) {
        console.log(`[${label}] ${carrier.name} claim ${claimId} is already "${claim.status}", cancel counts as done`);

        return { ok: true };
    }

    if (DELIVERED_CLAIM_STATUSES.has(claim.status)) {
        console.log(`[${label}] ${carrier.name} claim ${claimId} is "${claim.status}", it is delivered`);

        return { ok: false, kind: "finished", error: `${carrier.name} claim is delivered` };
    }

    // The claim changed after our read (a performer was assigned, the courier arrived): the cancel went out with a
    // stale version and may have been refused for that alone, which a retry with the fresh one settles. If it is
    // refused again the version no longer moves and the answer below follows.
    if (sentVersion !== undefined && claim.version !== undefined && claim.version !== sentVersion) {
        console.log(`[${label}] ${carrier.name} claim ${claimId} moved from version ${sentVersion} to ${claim.version} (status "${claim.status}"), retry`);

        return transient(`${carrier.name} claim changed during the cancel (status "${claim.status}")`);
    }

    console.log(
        `[${label}] ${carrier.name} refuses the cancel of claim ${claimId}: status "${claim.status}", ` +
            `HTTP ${refused.status}: ${refused.body}`,
    );

    return {
        ok: false,
        kind: "unavailable",
        error: `${carrier.name} does not cancel a claim in status "${claim.status}"`,
    };
}

/**
 * Puts the operator-cancel flag up after a 2xx cancel. The flag only covers the moments before the caller's update,
 * so a failing Redis is logged and does not undo what already happened: the carrier cancelled, and the caller must go
 * on to the update (a retry would find the claim cancelled and still answer ok, but only after one more round trip).
 */
async function raiseFlag(redis: Redis, flagKey: string, label: string): Promise<void> {
    try {
        await redis.set(flagKey, "true", "EX", OPERATOR_CANCEL_TTL_SECONDS);
    } catch (e) {
        console.log(`[${label}] ERROR: could not set ${flagKey} after the carrier cancelled`, e);
    }
}

/** The claim-cancel request. The flag goes up after a 2xx, nothing is set for a refused or failed one. */
async function sendCancel(
    redis: Redis,
    flagKey: string,
    carrier: ClaimCarrier,
    claimId: string,
    label: string,
    cancelBody: Record<string, unknown>,
    sentVersion?: number,
): Promise<Cancel3plResult> {
    const call = await carrierCall(label, `${carrier.name} cancel`, carrier.url("cancel", claimId), {
        method: "POST",
        headers: { ...carrier.headers(), "Content-Type": "application/json" },
        body: JSON.stringify(cancelBody),
    });
    if (call.kind === "ok") {
        await raiseFlag(redis, flagKey, label);

        return { ok: true };
    }

    if (call.kind === "transient") {
        return transient(call.error);
    }

    return resolveRefusal(carrier, claimId, label, call, sentVersion);
}

export async function cancelYandexClaim(
    redis: Redis,
    claimId: string,
    label = "cancel_yandex",
    opts: Cancel3plOptions = {},
): Promise<Cancel3plResult> {
    // The cancel request carries the claim's `version`, which only claims/info has.
    //
    // BEFORE DEPLOY: one live Yandex cancel must be made by hand (the request with `version` was never sent live
    // from here). If every call still answers 400 (state_mismatch), the next suspect is the missing `cancel_state`
    // from cancel-info (Uzum takes it from there); the status and body of every non-2xx answer are in the log.
    const claim = await readClaim(yandex, claimId, label);
    if (!claim.ok && opts.external) {
        return transient(claim.error);
    }
    // An operator route ignores the result and drops the claim from the order either way, so it still sends the
    // cancel it always sent (without a version) when the read fails: skipping it would leave the claim alive.
    const version = claim.ok ? claim.version : undefined;

    // `free` only: a claim whose courier is already at the pickup needs a cancel with payment, which nothing here
    // sends on its own. Yandex refuses the free one, and that comes back as `unavailable`.
    return sendCancel(
        redis,
        `yandex_operator_cancel:${claimId}`,
        yandex,
        claimId,
        label,
        { ...(version !== undefined ? { version } : {}), cancel_state: "free" },
        version,
    );
}

export async function cancelUzumDelivery(
    redis: Redis,
    claimId: string,
    label = "cancel_uzum",
    opts: Cancel3plOptions = {},
): Promise<Cancel3plResult> {
    // Uzum wants the cancel state from cancel-info. The operator route keeps what it always did: when cancel-info
    // answers with an error it sends `free`, when it does not answer at all (network, timeout) nothing is sent.
    const info = await carrierCall(label, "Uzum cancel-info", uzum.url("cancel-info", claimId), {
        method: "POST",
        headers: uzum.headers(),
    });
    let cancelState = "free";
    if (info.kind === "ok") {
        cancelState = typeof info.json.cancel_state === "string" ? info.json.cancel_state : "free";
    } else if (opts.external) {
        if (info.kind === "transient") {
            return transient(info.error);
        }

        return resolveRefusal(uzum, claimId, label, info);
    } else if (info.kind === "transient" && !info.answered) {
        return transient(info.error);
    }

    // `paid` would be a cancel with payment: the external cancel does not do that on its own, whatever the
    // operator decides on the operator route.
    if (opts.external && cancelState !== "free") {
        return resolveRefusal(uzum, claimId, label, { status: 200, body: `cancel_state "${cancelState}"` });
    }

    return sendCancel(redis, `uzum_operator_cancel:${claimId}`, uzum, claimId, label, { cancel_state: cancelState });
}

// Noor order stages (`stage` of GET /api/v1/orders/:id, Noor-Api-Docs-09-02-2026): 14 Delivered, 15 DeliveredFinish,
// 19 Returned, 20 ReturnedFinish are finished; 21 CancelledByTaxi, 22 Cancelled, 23 CancelledWithPayment,
// 24 CancelledWithItemsOnHand, 25 Failed, 26 EstimatingFailed, 27 PerformerNotFound, 28 CancelledOutOfZone,
// 29 CancelledOutOfRange are over without a delivery. Every other stage is an order on its way.
const NOOR_FINISHED_STAGES = new Set([14, 15, 19, 20]);
const NOOR_CANCELLED_STAGES = new Set([21, 22, 23, 24, 25, 26, 27, 28, 29]);

const noorHeaders = (): Record<string, string> => ({
    "Accept-Language": "ru",
    "X-Auth": process.env.NOOR_DELIVERY_TOKEN!,
});

/** Noor answers a cancel of a closed order with 400 {"error":"order.is.closed"}, its only documented error. */
function isOrderClosed(body: string): boolean {
    try {
        return JSON.parse(body)?.error === "order.is.closed";
    } catch {
        return false;
    }
}

/**
 * «Closed» is delivered OR cancelled, so the cancel answer cannot tell them apart: read the order and look at its
 * stage. Cancelled / failed is the cancel we wanted (a retry of one that went through, or Noor's own cancel), delivered
 * is `finished`, anything else is an order on its way. When the order cannot be read nothing is known: transient. A
 * late cancel is charged by Noor (stages 23, 24); that is accepted and nothing here avoids it.
 */
async function resolveNoorClosed(noorId: string, label: string): Promise<Cancel3plResult> {
    const read = await noorFetch(
        `https://back.noor.uz/api/v1/orders/${noorId}`,
        { method: "GET", headers: noorHeaders() },
        { label, maxAttempts: 1, timeoutMs: CARRIER_TIMEOUT_MS },
    );
    if (!read.ok) {
        console.log(`[${label}] ERROR: Noor order ${noorId} read failed: ${read.error}`);

        return transient("Noor order read failed");
    }
    if (read.status < 200 || read.status >= 300) {
        console.log(`[${label}] Noor order ${noorId} read answered HTTP ${read.status}: ${read.text}`);

        return transient(`Noor order read answered HTTP ${read.status}`);
    }

    let stage = NaN;
    try {
        const raw = JSON.parse(read.text)?.stage;
        if (typeof raw === "number" || (typeof raw === "string" && raw.trim() !== "")) {
            stage = Number(raw);
        }
    } catch {
        // not JSON: no stage
    }
    if (!Number.isInteger(stage)) {
        console.log(`[${label}] Noor order ${noorId} read returned no stage: ${read.text}`);

        return transient("Noor order read returned no stage");
    }

    if (NOOR_CANCELLED_STAGES.has(stage)) {
        console.log(`[${label}] Noor order ${noorId} is in stage ${stage}, cancel counts as done`);

        return { ok: true };
    }

    if (NOOR_FINISHED_STAGES.has(stage)) {
        console.log(`[${label}] Noor order ${noorId} is in stage ${stage}, it is delivered`);

        return { ok: false, kind: "finished", error: "Noor order is delivered" };
    }

    console.log(`[${label}] Noor refuses the cancel of order ${noorId}: stage ${stage}`);

    return { ok: false, kind: "unavailable", error: `Noor does not cancel an order in stage ${stage}` };
}

export async function cancelNoorDelivery(
    redis: Redis,
    noorId: string,
    label = "cancel_noor",
    opts: Cancel3plOptions = {},
): Promise<Cancel3plResult> {
    const cancelRes = await noorFetch(
        `https://back.noor.uz/api/v1/orders/${noorId}/cancel`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...noorHeaders() },
        },
        // noorFetch retries and waits 15 s per attempt, up to 31 s for the default two: more than orderly or Elysia
        // wait. The external cancel makes one attempt and the answer says «transient», orderly is the one to retry.
        opts.external ? { label, maxAttempts: 1, timeoutMs: CARRIER_TIMEOUT_MS } : { label, maxAttempts: 2 },
    );

    // `ok` only says that a response arrived (a 4xx/5xx is `ok` too), so a cancel counts when the status is 2xx.
    if (cancelRes.ok && cancelRes.status >= 200 && cancelRes.status < 300) {
        await raiseFlag(redis, `noor_operator_cancel:${noorId}`, label);

        return { ok: true };
    }

    if (!cancelRes.ok) {
        console.log(`[${label}] ERROR: Noor cancel request failed: ${cancelRes.error}`);

        return transient("Noor cancel request failed");
    }

    console.log(`[${label}] Noor cancel of order ${noorId} answered HTTP ${cancelRes.status}: ${cancelRes.text}`);
    if (cancelRes.status >= 500 || RETRYABLE_STATUSES.has(cancelRes.status)) {
        return transient(`Noor cancel answered HTTP ${cancelRes.status}`);
    }

    // The external cancel looks at the order behind «order.is.closed». The operator route ignores the result, so
    // it does not spend a second request on it.
    if (opts.external && cancelRes.status === 400 && isOrderClosed(cancelRes.text)) {
        return resolveNoorClosed(noorId, label);
    }

    // Any other 4xx is a refusal that a retry does not change. The body is in the log above.
    return {
        ok: false,
        kind: "unavailable",
        error: `Noor refuses the cancel (HTTP ${cancelRes.status})`,
    };
}

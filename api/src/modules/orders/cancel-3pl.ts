import type Redis from "ioredis";
import { noorFetch } from "../../utils/noor";
import { UZUM_BASE_URL, uzumHeaders } from "../../utils/uzum";

/**
 * Cancels the delivery claim of an order at a third-party carrier. Shared by the operator routes
 * (`/api/orders/:id/cancel_*`) and the external `cancel-order`, so both do the same thing at the carrier.
 *
 * Only the carrier side lives here: the `*_operator_cancel` flag and the claim-cancel request. The caller updates
 * the order (and decides what a failure means: an operator route goes on, `cancel-order` answers with the status
 * below and changes nothing). The flag is set BEFORE the request, so a carrier callback that arrives between the
 * request and the caller's update already sees it, and it is removed again when the request did not cancel.
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
    | { kind: "transient"; error: string }
    | { kind: "refused"; status: number; body: string };

/** One request to a carrier: 2xx is ok, network / 5xx / 408 / 425 / 429 is transient, any other 4xx is a refusal. */
async function carrierCall(label: string, what: string, url: string, init: RequestInit): Promise<CarrierCall> {
    try {
        const res = await fetch(url, init);
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
            return { kind: "transient", error: `${what} answered HTTP ${res.status}` };
        }

        return { kind: "refused", status: res.status, body: text };
    } catch (e) {
        console.log(`[${label}] ERROR: ${what} request failed`, e);

        return { kind: "transient", error: `${what} request failed` };
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

/** The claim-cancel request with the flag already set: ok keeps the flag, anything else removes it. */
async function sendCancel(
    redis: Redis,
    flagKey: string,
    carrier: ClaimCarrier,
    claimId: string,
    label: string,
    cancelBody: Record<string, unknown>,
): Promise<Cancel3plResult> {
    const call = await carrierCall(label, `${carrier.name} cancel`, carrier.url("cancel", claimId), {
        method: "POST",
        headers: { ...carrier.headers(), "Content-Type": "application/json" },
        body: JSON.stringify(cancelBody),
    });
    if (call.kind === "ok") {
        return { ok: true };
    }

    await redis.del(flagKey);
    if (call.kind === "transient") {
        return transient(call.error);
    }

    return resolveRefusal(carrier, claimId, label, call);
}

export async function cancelYandexClaim(
    redis: Redis,
    claimId: string,
    label = "cancel_yandex",
): Promise<Cancel3plResult> {
    const flagKey = `yandex_operator_cancel:${claimId}`;
    await redis.set(flagKey, "true", "EX", OPERATOR_CANCEL_TTL_SECONDS);

    // `free` only: a claim whose courier is already at the pickup needs a cancel with payment, which nothing here
    // sends on its own. Yandex refuses the free one, and that comes back as `unavailable`.
    return sendCancel(redis, flagKey, yandex, claimId, label, { cancel_state: "free" });
}

export async function cancelUzumDelivery(
    redis: Redis,
    claimId: string,
    label = "cancel_uzum",
    opts: Cancel3plOptions = {},
): Promise<Cancel3plResult> {
    // Uzum wants the cancel state from cancel-info. Without it the operator route sends `free`, as it always did.
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
    }

    // `paid` would be a cancel with payment: the external cancel does not do that on its own, whatever the
    // operator decides on the operator route.
    if (opts.external && cancelState !== "free") {
        return resolveRefusal(uzum, claimId, label, { status: 200, body: `cancel_state "${cancelState}"` });
    }

    const flagKey = `uzum_operator_cancel:${claimId}`;
    await redis.set(flagKey, "true", "EX", OPERATOR_CANCEL_TTL_SECONDS);

    return sendCancel(redis, flagKey, uzum, claimId, label, { cancel_state: cancelState });
}

export async function cancelNoorDelivery(
    redis: Redis,
    noorId: string,
    label = "cancel_noor",
): Promise<Cancel3plResult> {
    const flagKey = `noor_operator_cancel:${noorId}`;
    await redis.set(flagKey, "true", "EX", OPERATOR_CANCEL_TTL_SECONDS);

    const cancelRes = await noorFetch(
        `https://back.noor.uz/api/v1/orders/${noorId}/cancel`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Accept-Language": "ru",
                "X-Auth": process.env.NOOR_DELIVERY_TOKEN!,
            },
        },
        { label, maxAttempts: 2 },
    );

    // `ok` only says that a response arrived (a 4xx/5xx is `ok` too), so a cancel counts when the status is 2xx.
    if (cancelRes.ok && cancelRes.status >= 200 && cancelRes.status < 300) {
        return { ok: true };
    }

    await redis.del(flagKey);

    if (!cancelRes.ok) {
        console.log(`[${label}] ERROR: Noor cancel request failed: ${cancelRes.error}`);

        return transient("Noor cancel request failed");
    }

    console.log(`[${label}] Noor cancel of order ${noorId} answered HTTP ${cancelRes.status}: ${cancelRes.text}`);
    if (cancelRes.status >= 500 || RETRYABLE_STATUSES.has(cancelRes.status)) {
        return transient(`Noor cancel answered HTTP ${cancelRes.status}`);
    }

    // The code never reads a Noor order, so there is nothing to tell «already cancelled» from «on its way»: a 4xx
    // is a refusal that a retry does not change. The body is in the log above.
    return {
        ok: false,
        kind: "unavailable",
        error: `Noor refuses the cancel (HTTP ${cancelRes.status})`,
    };
}

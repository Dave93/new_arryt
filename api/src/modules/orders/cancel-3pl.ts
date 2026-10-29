import type Redis from "ioredis";
import { noorFetch } from "../../utils/noor";
import { cancelUzumClaim } from "../../utils/uzum";

/**
 * Cancels the delivery claim of an order at a third-party carrier. Shared by the operator routes
 * (`/api/orders/:id/cancel_*`) and the external `cancel-order`, so both do the same thing at the carrier.
 *
 * Only the carrier side lives here: the `*_operator_cancel` flag and the claim-cancel request. The caller updates
 * the order (and decides what a failure means: an operator route goes on, `cancel-order` answers 502 and changes
 * nothing). The flag is set BEFORE the request, so a carrier callback that arrives between the request and the
 * caller's update already sees it, and it is removed again when the request failed.
 */
export type Cancel3plResult = { ok: true } | { ok: false; error: string };

const OPERATOR_CANCEL_TTL_SECONDS = 7200;

export async function cancelYandexClaim(
    redis: Redis,
    claimId: string,
    label = "cancel_yandex",
): Promise<Cancel3plResult> {
    const flagKey = `yandex_operator_cancel:${claimId}`;
    await redis.set(flagKey, "true", "EX", OPERATOR_CANCEL_TTL_SECONDS);

    try {
        const res = await fetch(
            `https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/claims/cancel?claim_id=${claimId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept-Language": "ru",
                    Authorization: `Bearer ${process.env.YANDEX_DELIVERY_TOKEN}`,
                },
                body: JSON.stringify({ cancel_state: "free" }),
            },
        );
        if (!res.ok) {
            await redis.del(flagKey);

            return { ok: false, error: `Yandex cancel answered HTTP ${res.status}` };
        }
    } catch (e) {
        console.log(`[${label}] ERROR: Yandex cancel request failed`, e);
        await redis.del(flagKey);

        return { ok: false, error: "Yandex cancel request failed" };
    }

    return { ok: true };
}

export async function cancelUzumDelivery(redis: Redis, claimId: string): Promise<Cancel3plResult> {
    const flagKey = `uzum_operator_cancel:${claimId}`;
    await redis.set(flagKey, "true", "EX", OPERATOR_CANCEL_TTL_SECONDS);

    // cancelUzumClaim logs its own failures
    if (!(await cancelUzumClaim(claimId))) {
        await redis.del(flagKey);

        return { ok: false, error: "Uzum cancel request failed" };
    }

    return { ok: true };
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
    if (!cancelRes.ok) {
        console.log(`[${label}] ERROR: Noor cancel request failed: ${cancelRes.error}`);
    }

    // `ok` only says that a response arrived (a 4xx/5xx is `ok` too), so a cancel counts when the status is 2xx.
    if (!cancelRes.ok || cancelRes.status < 200 || cancelRes.status >= 300) {
        await redis.del(flagKey);

        return {
            ok: false,
            error: cancelRes.ok ? `Noor cancel answered HTTP ${cancelRes.status}` : "Noor cancel request failed",
        };
    }

    return { ok: true };
}

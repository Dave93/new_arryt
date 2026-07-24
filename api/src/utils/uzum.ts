import { CacheControlService } from "../modules/cache/service";

export const UZUM_BASE_URL =
  process.env.UZUM_DELIVERY_BASE_URL || "https://cargo.stable.ufood.uz";

export function uzumHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Accept-Language": "ru",
    Authorization: `Bearer ${process.env.UZUM_DELIVERY_TOKEN}`,
  };
}

// system_configs value shapes vary: either the raw uuid string, or an object
// whose .value is a JSON string like {"value":"<uuid>"} (same as yandex_courier_id).
export async function getUzumCourierId(
  cacheControl: CacheControlService
): Promise<string | null> {
  const setting = await cacheControl.getSetting("uzum_courier_id");
  if (!setting) return null;
  const raw = typeof setting === "string" ? setting : setting.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.value ?? null;
  } catch {
    return raw;
  }
}

// Uzum requires cancel-info -> cancel with the currently available cancel_state.
export async function cancelUzumClaim(claimId: string): Promise<boolean> {
  try {
    const infoRes = await fetch(
      `${UZUM_BASE_URL}/b2b/cargo/integration/v2/claims/cancel-info?claim_id=${claimId}`,
      { method: "POST", headers: uzumHeaders() }
    );
    const info: any = await infoRes.json().catch(() => ({}));
    const cancelState = info?.cancel_state ?? "free";
    const cancelRes = await fetch(
      `${UZUM_BASE_URL}/b2b/cargo/integration/v2/claims/cancel?claim_id=${claimId}`,
      {
        method: "POST",
        headers: uzumHeaders(),
        body: JSON.stringify({ cancel_state: cancelState }),
      }
    );
    if (!cancelRes.ok) {
      console.log(
        `[UZUM] cancel failed: claim_id=${claimId}, status=${cancelRes.status}, body=${await cancelRes.text()}`
      );
    }
    return cancelRes.ok;
  } catch (e) {
    console.log(`[UZUM] cancel request error: claim_id=${claimId}`, e);
    return false;
  }
}

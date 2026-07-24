/**
 * Resilient fetch wrapper for the Noor delivery API (https://back.noor.uz).
 *
 * Noor is reachable from prod only via a specific network path that flaps:
 * sometimes through the office OpenVPN tunnel, sometimes direct. When the
 * active path is down, a plain `fetch` hangs indefinitely, freezing the queue
 * worker. This wrapper adds a hard timeout plus bounded retries with backoff so
 * a transient blip fails fast and self-recovers instead of hanging.
 *
 * Retry policy:
 *  - network error / timeout  -> retryable (transient or path flip)
 *  - HTTP 5xx                  -> retryable (Noor server hiccup)
 *  - HTTP 4xx                  -> NOT retryable (request validation, e.g. bad
 *                                 phone/address); returned to the caller as-is
 *  - HTTP 2xx                  -> success
 */

export interface NoorFetchResult {
  /** true if an HTTP response was received (any status); false on network failure/timeout */
  ok: boolean;
  /** HTTP status code, or 0 when no response was received */
  status: number;
  /** response body as text ("" when no response) */
  text: string;
  /** error description when ok === false */
  error?: string;
  /** number of attempts actually made */
  attempts: number;
}

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  // attempt 1 -> 1s, 2 -> 3s, 3 -> 7s ... capped at 10s
  return Math.min(1000 * (2 ** attempt - 1), 10000);
}

export async function noorFetch(
  url: string,
  init: RequestInit,
  opts: { timeoutMs?: number; maxAttempts?: number; label?: string } = {},
): Promise<NoorFetchResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const label = opts.label ?? "Noor";

  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();

      // 5xx is transient — retry if attempts remain.
      if (res.status >= 500 && attempt < maxAttempts) {
        lastError = `HTTP ${res.status}`;
        console.warn(
          `[${label}] attempt ${attempt}/${maxAttempts} got HTTP ${res.status}, retrying in ${backoffMs(attempt)}ms`,
        );
        await sleep(backoffMs(attempt));
        continue;
      }

      // 2xx success, or 4xx permanent failure — return either way (no retry on 4xx).
      return { ok: true, status: res.status, text, attempts: attempt };
    } catch (e: any) {
      lastError =
        e?.name === "TimeoutError" || e?.name === "AbortError"
          ? `timeout after ${timeoutMs}ms`
          : (e?.message ?? String(e));
      console.warn(
        `[${label}] attempt ${attempt}/${maxAttempts} network error: ${lastError}`,
      );
      if (attempt < maxAttempts) {
        await sleep(backoffMs(attempt));
      }
    }
  }

  return { ok: false, status: 0, text: "", error: lastError, attempts: maxAttempts };
}

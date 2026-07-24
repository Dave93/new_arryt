# Uzum Tezkor Delivery Integration — Design Spec

**Date:** 2026-07-24
**Status:** Approved for planning

## Overview

Add Uzum Tezkor as a second external delivery provider alongside Yandex Delivery. Uzum exposes a Yandex-compatible cargo claims API (`/b2b/cargo/integration/v2/claims/*`), so the integration is a direct copy of the existing Yandex integration, following the precedent already set by the Noor integration (`send_noor`, `noor_id`, `cancel_noor`, dedicated callback endpoint).

Dispatch is **manual only**: operators choose "Send to Yandex" or "Send to Uzum" from the missed orders page. The automatic flow (`try_assign_courier` → `time_to_yandex`) is not touched and remains Yandex-only.

## Uzum Tezkor API Facts

- Test host: `https://cargo.stable.ufood.uz` (prod host + token issued later; switch via env)
- Auth: `Authorization: Bearer <token>`
- Methods mirror Yandex cargo API: `offers/calculate`, `claims/info`, `claims/create`, `claims/accept`, `claims/cancel`, `claims/cancel-info`, `claims/edit`, `claims/performer-position`, `claims/v2/driver-voiceforwarding`
- Webhooks: pass `callback_properties.callback_url` in `claims/create`; Uzum POSTs `claim_id`, `status`, `updated_ts`, `route_points`, `performer_info` on every status change
- Tariff: `client_requirements.taxi_class` — `courier` (any nearest) or `express` (car only); item prices via `items[].cost_value`
- Buyout requires a **pair** of fields or it silently fails: `buyout: {payment_method: "cash"}` on the source point **and** `payment_on_delivery` (cash, with payer contact) on the destination point. The existing Yandex processor already builds exactly this pair when `0 < orderPrice <= 500000`, so the logic copies unchanged.
- Cancellation must be two-step: `claims/cancel-info?claim_id=...` to get the currently available `cancel_state`, then `claims/cancel?claim_id=...` with that state. (Yandex code hardcodes `cancel_state: "free"` — the Uzum copy must not.)
- Voice forwarding path differs from Yandex: `/b2b/cargo/integration/v2/claims/v2/driver-voiceforwarding` (Yandex: `/b2b/cargo/integration/v2/driver-voiceforwarding`).
- Test environment has no real couriers; courier assignment is triggered manually by the Uzum team on request.

## Decisions

| Question | Decision |
|---|---|
| Routing between providers | Manual only — two buttons on missed orders page |
| Service courier account | Separate `uzum_courier_id` key in `system_configs` (new courier user created via admin) |
| Webhook status mapping | Reuse existing `order_status.yandex_delivery_statuses` (statuses are identical); add a dedicated column later only if Uzum diverges |
| Org-level gating | None — button visible everywhere, no `allow_uzum_delivery` flag |
| Auto-dispatch flags (`time_to_uzum`, `allow_uzum` on terminals) | Not needed — out of scope |
| Code sharing with Yandex | None — straight copy (Noor precedent). Shared cargo-client refactor is a possible future improvement, not now |

## Components

### 1. Database schema (`api/drizzle/schema.ts`)

- `orders.uzum_id` — `text`, nullable. Stores the Uzum claim ID. Mirror of `orders.yandex_id`.
- One Drizzle migration.

No other schema changes.

### 2. Configuration

Environment (`api/.env`, queue env):

- `UZUM_DELIVERY_TOKEN` — Bearer token (test token now, prod later)
- `UZUM_DELIVERY_BASE_URL` — `https://cargo.stable.ufood.uz` for the test bench; prod switch is an env change only

`system_configs` (Redis-backed, via `getSetting`):

- `uzum_courier_id` — JSON `{value: "<UUID>"}` of the service courier user. **Unlike the Yandex processor (which looks the courier up by hardcoded phone `+998908251218`), the Uzum processor resolves the courier strictly from this setting.** If the setting is missing, the processor logs and aborts without mutating the order.

### 3. Queues

Two new BullMQ queues (registered in `api/src/context/index.ts` and the queue worker index):

- `{prefix}_check_and_send_uzum`
- `{prefix}_uzum_callback`

### 4. Queue processors (`queue/processors/`)

**`check_and_send_uzum.ts`** — copy of `check_and_send_yandex.ts` with these deltas:

- Base URL from `UZUM_DELIVERY_BASE_URL`, token from `UZUM_DELIVERY_TOKEN`
- `callback_properties.callback_url` → `https://${API_DOMAIN}/api/external/uzum-callback`
- Writes claim ID to `orders.uzum_id`
- Courier resolved from `uzum_courier_id` system config (not phone lookup)
- Reuses `yandex_sender_name` / `yandex_sender_phone` settings for pickup contact overrides (same restaurants, same contacts)
- Checks the `claims/create` response **before** mutating the order (see §7) — a deliberate deviation from the Yandex processor, which assigns the courier before validating the response
- Everything else — claim payload, buyout pair, items, fiscalization, comments, `claims/create?request_id=` idempotency, `claims/accept` follow-up — copies unchanged

**`uzum_callback.ts`** — copy of `yandex_callback.ts` with these deltas:

- Order lookup by `orders.uzum_id`
- Courier guard against `uzum_courier_id` setting
- `claims/info` and voice forwarding hit the Uzum base URL; voice forwarding uses `/claims/v2/driver-voiceforwarding`
- Operator-cancel guard key: `uzum_operator_cancel:{claimId}`
- Courier-info dedup key stays `courier_info_sent:{orderId}_{phone}` (order-scoped, no collision)
- Status mapping via `order_status.yandex_delivery_statuses` (shared mapping, per decision)
- Org webhook notification (`SET_YANDEX_COURIER` action) copies as-is with action renamed to `SET_UZUM_COURIER`

### 5. API endpoints

- `POST /send_uzum` (missed_orders controller) — enqueues `check_and_send_uzum`. Mirror of `/send_yandex`. Permission: `orders.list`.
- `POST /api/orders/:id/cancel_uzum` (orders controller) — two-step cancel: `cancel-info` → `cancel` with the returned `cancel_state`; sets `uzum_operator_cancel` Redis flag; clears `courier_id` + `uzum_id`; writes `order_actions` entry. Permission: `orders.edit`.
- `POST /api/orders/:id/recreate_uzum` (orders controller) — same two-step cancel if `uzum_id` present, resets order to initial status, re-enqueues `check_and_send_uzum` with `taxi_class`. Permission: `orders.edit`.
- `POST /api/external/uzum-callback` (external controller) — accepts webhook body, enqueues `uzum_callback` when `claim_id` present. Unauthenticated, same as the Yandex callback endpoint.

### 6. Admin dashboard (`new_admin`)

- `components/orders/send-to-uzum.tsx` — copy of `send-to-yandex.tsx`, calls `/send_uzum`. Placed next to the Yandex button on `app/dashboard/missed_orders/page.tsx`. No org gating.
- `components/orders/cancel-uzum-order.tsx` — copy of `cancel-yandex-order.tsx`, shown on the order page when `uzum_id` is set.
- `components/orders/recreate-uzum-order.tsx` — copy of `recreate-yandex-order.tsx` (taxi_class selector), shown when `uzum_id` is set.
- `app/dashboard/orders/[id]/page.client.tsx` — wire in the two new components.
- `components/dashboard/delivery-sources.tsx` — add an Uzum row, counted by the `uzum_courier_id` courier (mirrors the Yandex count).

Orders list/detail API responses must include `uzum_id` wherever `yandex_id` is currently selected, so the admin can branch on it.

### 7. Error handling

- Missing `uzum_courier_id` setting → processor logs `[UZUM]`-prefixed error and returns without touching the order.
- `claims/create` non-OK or missing `id` in response → do **not** assign courier / advance status; log and leave the order in missed orders. (The Yandex processor assigns courier before checking the response — the copy fixes this ordering for Uzum only; Yandex behavior is untouched.)
- `cancel-info`/`cancel` failures → logged, order still detached locally (mirrors Yandex operator-cancel semantics: Redis flag prevents callback races).
- Webhook for unknown `claim_id` or stale order (>2 days) → skipped, same as Yandex.

### 8. Testing

- Manual end-to-end against the Uzum test bench (`cargo.stable.ufood.uz`, test token): send a missed order → verify claim created and `uzum_id` stored → ask Uzum team to assign a courier → verify webhook drives status transitions via the shared mapping → verify cancel and recreate flows.
- Verify the Yandex flow still works untouched (no shared code was modified).
- Note: test bench has no real couriers; status progression is driven manually by the Uzum team on a call/chat.

## Out of Scope

- Automatic dispatch to Uzum (`try_assign_courier`, terminal flags, `time_to_uzum`)
- Org-level `allow_uzum_delivery` gating
- Separate `uzum_delivery_statuses` mapping column
- Refactoring Yandex/Noor integrations into a shared provider abstraction
- `offers/calculate` price estimation
- Elasticsearch indexing of Uzum orders (Yandex indexing calls are commented out in the current code; the copy keeps them out)

# Uzum Tezkor Delivery Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Uzum Tezkor as a second manual-dispatch external delivery provider, copied from the Yandex Delivery integration (Noor precedent).

**Architecture:** Straight copy of the Yandex integration with a `uzum_` prefix: one new `orders.uzum_id` column, two BullMQ queues + processors, four API endpoints, three admin components, and a shared `api/src/utils/uzum.ts` helper module (base URL, headers, courier-id resolution, two-step cancel). No Yandex/Noor code is modified except additive wiring (queue registries, page wiring, delivery-sources counts).

**Tech Stack:** Bun, Elysia, Drizzle ORM (PostgreSQL), BullMQ, Next.js 15 + React Query + shadcn/ui, Eden end-to-end types.

**Spec:** `docs/superpowers/specs/2026-07-24-uzum-tezkor-delivery-design.md`

## Global Constraints

- Uzum base URL: `https://cargo.stable.ufood.uz` (test bench), configurable via `UZUM_DELIVERY_BASE_URL`; token via `UZUM_DELIVERY_TOKEN`. Never hardcode the token in source or commits.
- Cancellation is two-step: `claims/cancel-info?claim_id=` → `claims/cancel?claim_id=` with the returned `cancel_state`. Never hardcode `cancel_state: "free"` for Uzum.
- Voice forwarding path: `/b2b/cargo/integration/v2/claims/v2/driver-voiceforwarding` (differs from Yandex).
- Service courier resolved ONLY from `uzum_courier_id` system config (never by phone lookup). Missing config → log + abort, order untouched.
- `claims/create` response must be validated (`response.ok` && `json.id`) BEFORE mutating the order.
- Status mapping reuses `order_status.yandex_delivery_statuses` — no new mapping column.
- Do not modify Yandex/Noor behavior anywhere.
- No test infra exists in this repo. Verification = per-service typecheck with before/after error-count comparison (`bun x tsc --noEmit`), `bun run lint` in new_admin, and the manual E2E checklist (Task 10).
- Admin code style: double quotes, trailing commas, named exports, `"use client"`.
- Commit after every task. Do not commit `.env` files.

---

### Task 1: DB column `orders.uzum_id` + migration

**Files:**
- Modify: `api/drizzle/schema.ts:770-771`
- Create: `api/drizzle/<generated>.sql` (via drizzle-kit)

**Interfaces:**
- Produces: `orders.uzum_id` — `text`, nullable. All later tasks read/write it as `orders.uzum_id`.

- [ ] **Step 1: Capture typecheck baseline**

Run: `cd api && bun x tsc --noEmit 2>&1 | tail -1`
Record the error count (pre-existing errors are not ours to fix).

- [ ] **Step 2: Add column to schema**

In `api/drizzle/schema.ts`, the orders table currently ends its external-provider ids with:

```ts
	yandex_id: text("yandex_id"),
	noor_id: text("noor_id")
```

Change to:

```ts
	yandex_id: text("yandex_id"),
	noor_id: text("noor_id"),
	uzum_id: text("uzum_id")
```

- [ ] **Step 3: Generate migration**

Run: `cd api && bun run drizzle-kit generate`
Expected: new SQL file under `api/drizzle/` containing `ALTER TABLE "orders" ADD COLUMN "uzum_id" text;`

- [ ] **Step 4: Apply migration to local DB**

Run: `cd api && bun run drizzle-kit push`
Expected: no errors. (Prod applies the same migration at deploy.)

- [ ] **Step 5: Verify typecheck unchanged**

Run: `cd api && bun x tsc --noEmit 2>&1 | tail -1`
Expected: error count ≤ baseline from Step 1.

- [ ] **Step 6: Commit**

```bash
git add api/drizzle/schema.ts api/drizzle/
git commit -m "feat(api): add orders.uzum_id column for Uzum Tezkor delivery"
```

---

### Task 2: Uzum helper module + env vars

**Files:**
- Create: `api/src/utils/uzum.ts`
- Modify: `api/.env` (NOT committed)

**Interfaces:**
- Consumes: `CacheControlService.getSetting(key)` from `api/src/modules/cache/service.ts:400` (returns raw stored value; for `yandex_courier_id`-style settings the stored object has `.value` holding a JSON string `{"value":"<uuid>"}` — see `api/src/modules/external/controler.ts:787-792`).
- Produces (used by Tasks 4, 5, 7, 9):
  - `UZUM_BASE_URL: string`
  - `uzumHeaders(): Record<string, string>`
  - `getUzumCourierId(cacheControl: CacheControlService): Promise<string | null>`
  - `cancelUzumClaim(claimId: string): Promise<boolean>`

- [ ] **Step 1: Create `api/src/utils/uzum.ts`**

```ts
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
```

- [ ] **Step 2: Add env vars to `api/.env`** (do NOT commit)

Append:

```
UZUM_DELIVERY_BASE_URL=https://cargo.stable.ufood.uz
UZUM_DELIVERY_TOKEN=<test token from the Uzum Telegram chat>
```

Note: on prod the queue service loads its own env (`queue/.env` on the server, Bun auto-load) — the same two vars must be added there at deploy time.

- [ ] **Step 3: Verify typecheck**

Run: `cd api && bun x tsc --noEmit 2>&1 | tail -1`
Expected: error count ≤ Task 1 baseline.

- [ ] **Step 4: Commit**

```bash
git add api/src/utils/uzum.ts
git commit -m "feat(api): add Uzum Tezkor API helper module"
```

---

### Task 3: BullMQ queues in API context

**Files:**
- Modify: `api/src/context/index.ts` (after `processNoorCallbackQueue`, ~line 115, and the `queues` object ~line 153)

**Interfaces:**
- Produces: `processCheckAndSendUzum`, `processUzumCallbackQueue` — BullMQ `Queue` instances available via Elysia context `queues` decoration. Queue names: `${TASKS_PREFIX}_check_and_send_uzum`, `${TASKS_PREFIX}_uzum_callback`. Job payloads: `{ id: string, taxi_class?: string }` for send; raw webhook body for callback.

- [ ] **Step 1: Add queue definitions**

In `api/src/context/index.ts`, after the `processNoorCallbackQueue` definition (ends ~line 115), add:

```ts
export const processCheckAndSendUzum = new Queue(
  `${process.env.TASKS_PREFIX}_check_and_send_uzum`,
  {
      connection: client,
  }
);

export const processUzumCallbackQueue = new Queue(
  `${process.env.TASKS_PREFIX}_uzum_callback`,
  {
      connection: client,
  }
);
```

- [ ] **Step 2: Register in the `queues` object**

In the same file, the `queues` object (~line 153) contains `processCheckAndSendNoor, processNoorCallbackQueue,`. Add after them:

```ts
  processCheckAndSendUzum,
  processUzumCallbackQueue,
```

- [ ] **Step 3: Verify typecheck**

Run: `cd api && bun x tsc --noEmit 2>&1 | tail -1`
Expected: error count ≤ baseline.

- [ ] **Step 4: Commit**

```bash
git add api/src/context/index.ts
git commit -m "feat(api): register Uzum Tezkor BullMQ queues"
```

---

### Task 4: `check_and_send_uzum` processor + worker registration

**Files:**
- Create: `queue/processors/check_and_send_uzum.ts`
- Modify: `queue/index.ts` (imports ~line 17, worker after `noorCallbackWorker` ~line 203)

**Interfaces:**
- Consumes: `getUzumCourierId`, `UZUM_BASE_URL`, `uzumHeaders` from `@api/src/utils/uzum` (Task 2); `orders.uzum_id` (Task 1); queue `${TASKS_PREFIX}_check_and_send_uzum` (Task 3).
- Produces: `processCheckAndSendUzum(db: DB, redis: Redis, cacheControl: CacheControlService, orderId: string, taxiClass?: string): Promise<void>` — default export, called by the worker with `job.data.id` and `job.data.taxi_class`.

- [ ] **Step 1: Create `queue/processors/check_and_send_uzum.ts`**

Copy of `queue/processors/check_and_send_yandex.ts` with the spec deltas (env-based URL/token, uzum callback URL, `uzum_id`, courier from config, response validated before mutation, unused `sleep`/`pinCode` dropped):

```ts
import { customers, order_items, orders, terminals } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import { getSetting } from "@api/src/utils/settings";
import { getUzumCourierId, UZUM_BASE_URL, uzumHeaders } from "@api/src/utils/uzum";
import { sleepSync } from "bun";
import { eq, getTableColumns } from "drizzle-orm";
import Redis from "ioredis/built/Redis";

export default async function processCheckAndSendUzum(db: DB, redis: Redis, cacheControl: CacheControlService, orderId: string, taxiClass?: string) {
    const orderStatuses = await cacheControl.getOrderStatuses();

    const newOrders = await db.select({
        ...getTableColumns(orders),
        orders_terminals: getTableColumns(terminals),
        orders_customers: getTableColumns(customers),
    })
        .from(orders)
        .leftJoin(terminals, eq(terminals.id, orders.terminal_id))
        .leftJoin(customers, eq(customers.id, orders.customer_id))
        .where(eq(
            orders.id, orderId
        ));

    const order = newOrders[0];

    const newStatus = orderStatuses.find(status => status.sort == 1 && status.organization_id == order.organization_id);
    const nextStatus = orderStatuses.find(status => status.sort == 2 && status.organization_id == order.organization_id);
    if (!order.courier_id && order.order_status_id == newStatus!.id) {
        const uzumCourierId = await getUzumCourierId(cacheControl);
        if (!uzumCourierId) {
            console.log('[UZUM] ABORT: uzum_courier_id system config is missing, order untouched. order_id=', order.id);
            return;
        }

        const senderName = await getSetting(redis, 'yandex_sender_name');
        const senderPhone = await getSetting(redis, 'yandex_sender_phone');

        let orderPrice = 0;
        if (order.payment_type == 'Наличными') {
            orderPrice += +order.order_price;
        }
        orderPrice += +order.customer_delivery_price;

        const organization = await cacheControl.getOrganization(order.organization_id);

        let comment = 'Savollar: +998 71 2050642 ';

        comment += `${organization.name} // sotib olish uchun naqd pul olib yuring / иметь с собой наличные для выкупа `;

        if (orderPrice > 0) {
            comment += `// цена ${new Intl.NumberFormat('ru').format(orderPrice)} сум `;
        }

        comment += `//ID: ${order.order_number}`;

        let clientComment = '';

        if (order.additional_phone) {
            comment += `// Mijozning qo'shimcha raqami: ${order.additional_phone}\n`;
            clientComment += ` ${order.additional_phone} Mijoz asosiy raqami bo'yicha javob berolmagan bo'lsa Qo'shimcha raqam. +998 71 2050642 Muammolar chiqgan bo'lsa yoki savollar paydo bo'lgan bo'lsa\n`;
        } else {
            clientComment += `  +998 99 444-90-06 Mijoz asosiy raqami bo'yicha javob berolmagan bo'lsa Qo'shimcha raqam. +998 71 2050642 Muammolar chiqgan bo'lsa yoki savollar paydo bo'lgan bo'lsa\n`;
        }

        comment += 'Savollar: +998 71 2050642';

        const expressTerminals = ['419b466b-a575-4e2f-b771-7206342bc242'];

        let cargo_options = ['thermobag'];
        const uzumData = {
            auto_accept: true,
            callback_properties: {
                callback_url: `https://${process.env.API_DOMAIN}/api/external/uzum-callback`,
            },
            client_requirements: {
                cargo_options,
                door_to_door: true,
                taxi_class: taxiClass || (expressTerminals.includes(order!.orders_terminals!.id) ? 'express' : 'courier'),
            },
            emergency_contact: {
                name: senderName ? senderName : order!.orders_terminals!.manager_name,
                phone: senderPhone ? senderPhone : order!.orders_terminals!.phone,
            },
            items: [],
            route_points: [
                {
                    address: {
                        coordinates: [order!.orders_terminals!.longitude, order!.orders_terminals!.latitude],
                        fullname: order!.orders_terminals!.address,
                        comment: comment,
                    },
                    contact: {
                        name: (senderName ? senderName : order!.orders_terminals!.manager_name),
                        phone: (senderPhone ? senderPhone : order!.orders_terminals!.phone),
                    },
                    type: 'source',
                    ...(orderPrice > 0 && orderPrice <= 500000 ? {buyout: {
                        payment_method: 'cash'
                    }} : {}),
                    skip_confirmation: true,
                    visit_order: 1,
                    point_id: 1,
                },
                {
                    address: {
                        coordinates: [order.to_lon, order.to_lat],
                        fullname: order.delivery_address,
                        building: order.house,
                        porch: order.entrance,
                        flat: order.flat ? +order.flat : null,
                        comment: clientComment,
                    },
                    contact: {
                        name: order!.orders_customers!.name,
                        phone: order!.orders_customers!.phone,
                    },
                    ...(orderPrice > 0 && orderPrice <= 500000 ? {payment_on_delivery: {
                        customer: {
                            phone: order!.orders_customers!.phone,
                        },
                        payment_method: 'cash',
                    }} : {}),
                    external_order_id: order.order_number,
                    point_id: 2,
                    skip_confirmation: true,
                    type: 'destination',
                    visit_order: 2,
                },
                {
                    address: {
                        coordinates: [order!.orders_terminals!.longitude, order!.orders_terminals!.latitude],
                        fullname: order!.orders_terminals!.address,
                        comment: comment,
                    },
                    contact: {
                        name: senderName ? senderName : order!.orders_terminals!.manager_name,
                        phone: senderPhone ? senderPhone : order!.orders_terminals!.phone,
                    },
                    type: 'return',
                    skip_confirmation: true,
                    visit_order: 3,
                    point_id: 3,
                },
            ],
            skip_client_notify: false,
            skip_door_to_door: false,
        };
        const items = await db.select().from(order_items).where(eq(order_items.order_id, order.id));
        items.forEach((item) => {
            // @ts-ignore
            uzumData.items.push({
                pickup_point: 1,
                dropoff_point: 2,
                cost_currency: 'UZS',
                cost_value: item.price.toString(),
                title: item.name,
                quantity: item.quantity,
                weight: item.weight ?? 0,
                fiscalization:
                    orderPrice > 0 && orderPrice <= 500000
                        ? {
                            article: 'артикул',
                            supplier_inn: '1111111111',
                            vat_code_str: 'vat12',
                        }
                        : undefined,
            });
        });

        if (+order.customer_delivery_price > 0) {
            // @ts-ignore
            uzumData.items.push({
                pickup_point: 1,
                dropoff_point: 2,
                cost_currency: 'UZS',
                cost_value: order.customer_delivery_price.toString(),
                title: 'Доставка / Yetkazib berish',
                quantity: 1,
                weight: 0,
                fiscalization:
                    orderPrice > 0 && orderPrice <= 500000
                        ? {
                            article: 'доставка',
                            supplier_inn: '1111111111',
                            vat_code_str: 'vat12',
                        }
                        : undefined,
            });
        }

        const createUrl = `${UZUM_BASE_URL}/b2b/cargo/integration/v2/claims/create?request_id=${order.id}`;

        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: uzumHeaders(),
            body: JSON.stringify(uzumData),
        });
        const createJson: any = await createResponse.json().catch(() => ({}));

        if (!createResponse.ok || !createJson?.id) {
            console.log(`[UZUM] ABORT: claims/create failed, order untouched. order_id=${order.id}, http_status=${createResponse.status}, body=${JSON.stringify(createJson)}`);
            return;
        }

        await db.update(orders).set({
            courier_id: uzumCourierId,
            order_status_id: nextStatus!.id,
            uzum_id: createJson.id,
        }).where(eq(orders.id, order.id));

        sleepSync(500);

        const approveUrl = `${UZUM_BASE_URL}/b2b/cargo/integration/v2/claims/accept?claim_id=${createJson.id}`;
        try {
            const approveResponse = await fetch(approveUrl, {
                method: 'POST',
                body: JSON.stringify({
                    version: createJson.version,
                }),
                headers: uzumHeaders(),
            });

            await approveResponse.json();
        } catch (e) {
            console.log('[UZUM] claims/accept failed', e);
        }
    }
}
```

- [ ] **Step 2: Capture queue typecheck baseline, then register worker**

Run: `cd queue && bun x tsc --noEmit 2>&1 | tail -1` — record baseline count.

In `queue/index.ts`, after the import `import processNoorCallback from "./processors/noor_callback";` (line 17), add:

```ts
import processCheckAndSendUzum from "./processors/check_and_send_uzum";
```

After the `noorCallbackWorker` block (ends ~line 203), add:

```ts
const checkAndSendUzumWorker = new Worker(
    `${process.env.TASKS_PREFIX}_check_and_send_uzum`,
    async (job) => {
        await processCheckAndSendUzum(db, redisClient, cacheControl, job.data.id, job.data.taxi_class);
        return 'check_and_send_uzum';
    },
    {
        connection: redisClient,
    }
);
```

- [ ] **Step 3: Verify typecheck**

Run: `cd queue && bun x tsc --noEmit 2>&1 | tail -1`
Expected: error count ≤ baseline from Step 2.

- [ ] **Step 4: Commit**

```bash
git add queue/processors/check_and_send_uzum.ts queue/index.ts
git commit -m "feat(queue): add check_and_send_uzum processor"
```

---

### Task 5: `uzum_callback` processor + worker registration

**Files:**
- Create: `queue/processors/uzum_callback.ts`
- Modify: `queue/index.ts` (import next to Task 4's, worker after `checkAndSendUzumWorker`)

**Interfaces:**
- Consumes: `orders.uzum_id` (Task 1); `getUzumCourierId`, `UZUM_BASE_URL`, `uzumHeaders` (Task 2); Redis flag `uzum_operator_cancel:{claimId}` (set by Task 7); status mapping `order_status.yandex_delivery_statuses` (existing).
- Produces: `processUzumCallback(redis: Redis, db: DB, cacheControl: CacheControlService, data: any): Promise<string | {success: boolean}>` — default export; worker passes the raw webhook body (`{claim_id, status, ...}`).

- [ ] **Step 1: Create `queue/processors/uzum_callback.ts`**

Copy of `queue/processors/yandex_callback.ts` with spec deltas (lookup by `uzum_id`, courier guard via config, Uzum base URL + voiceforwarding path, `uzum_operator_cancel` key, `SET_UZUM_COURIER` action, `[UC]` log prefix; dead code — unused wait-time read and commented blocks — dropped):

```ts
import { api_tokens, order_actions, orders } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import { getUzumCourierId, UZUM_BASE_URL, uzumHeaders } from "@api/src/utils/uzum";
import dayjs from "dayjs";
import { and, desc, eq, gte } from "drizzle-orm";
import Redis from "ioredis";

export default async function processUzumCallback(redis: Redis, db: DB, cacheControl: CacheControlService, data: any) {

    console.log('[UC] === START processUzumCallback ===');
    console.log('[UC] callback data:', JSON.stringify(data));
    console.log('[UC] time:', dayjs().format('DD.MM.YYYY HH:mm:ss'));
    const claimId = data.claim_id;
    const order = await db.query.orders.findFirst({
        where: and(
            eq(orders.uzum_id, claimId),
            gte(orders.created_at, dayjs().subtract(2, 'day').toISOString()),
        ),
    });

    if (!order) {
        console.log(`[UC] SKIP: order not found for claim_id=${claimId}`);
        return 'processUzumCallback';
    }

    console.log(`[UC] order found: id=${order.id}, order_number=${order.order_number}, courier_id=${order.courier_id}, current_status_id=${order.order_status_id}, org_id=${order.organization_id}`);

    const uzumCourierId = await getUzumCourierId(cacheControl);
    if (!uzumCourierId) {
        console.log('[UC] SKIP: uzum_courier_id system config is missing');
        return 'processUzumCallback';
    }
    if (order.courier_id != uzumCourierId) {
        console.log(`[UC] SKIP: courier mismatch. order.courier_id=${order.courier_id}, uzumCourierId=${uzumCourierId}`);
        return {
            success: true,
        };
    }

    const orderStatuses = await cacheControl.getOrderStatuses();
    const organizations = await cacheControl.getOrganizations();

    const orderStatusByOrganization: {
        [key: string]: {
            [key: string]: string;
        };
    } = orderStatuses.reduce((acc: {
        [key: string]: {
            [key: string]: string;
        };
    }, status) => {

        if (!acc[status.organization_id]) {
            acc[status.organization_id] = {};
        }
        if (status.yandex_delivery_statuses) {
            status.yandex_delivery_statuses.split(',').forEach((stat) => {
                acc[status.organization_id][stat] = status.id;
            });
        }
        return acc;
    }, {});

    const org = organizations.find((o) => o.id == order.organization_id)!;

    let uzumResponse: any = {};
    try {
        const uzumFetch = await fetch(`${UZUM_BASE_URL}/b2b/cargo/integration/v2/claims/info?claim_id=${claimId}`, {
            method: 'POST',
            headers: uzumHeaders(),
        });
        uzumResponse = await uzumFetch.json();
        console.log(`[UC] claims/info response: status=${uzumResponse.status}, performer_info=${JSON.stringify(uzumResponse.performer_info)}`);
    } catch (error) {
        console.log('[UC] ERROR: claims/info request failed', error);
        return {
            success: false,
        };
    }
    const orgStatuses = orderStatusByOrganization[order.organization_id];
    const orderStatusId = orgStatuses?.[uzumResponse.status];
    console.log(`[UC] status mapping: uzum_status="${uzumResponse.status}", mapped_orderStatusId=${orderStatusId}, available_mappings=${JSON.stringify(orgStatuses)}`);

    const operatorCancelFlag = await redis.get(`uzum_operator_cancel:${claimId}`);
    if (operatorCancelFlag) {
        console.log(`[UC] SKIP: operator-initiated cancel for claim_id=${claimId}, order_id=${order.id}`);
        await redis.del(`uzum_operator_cancel:${claimId}`);

        await db.update(orders).set({
            courier_id: null,
            uzum_id: null,
        }).where(and(eq(orders.id, order.id), gte(orders.created_at, dayjs().subtract(2, 'day').toISOString())));

        return 'processUzumCallback';
    }

    if (!orderStatusId) {
        console.log(`[UC] SKIP: no orderStatusId mapping for uzum status "${uzumResponse.status}" in org ${order.organization_id}`);
    }
    if (orderStatusId) {
        if (order.order_status_id == orderStatusId) {
            console.log(`[UC] SKIP voice forwarding: status unchanged. order.order_status_id=${order.order_status_id} == orderStatusId=${orderStatusId}`);
        }
        if (order.order_status_id != orderStatusId) {
            console.log(`[UC] status changed: ${order.order_status_id} -> ${orderStatusId}, proceeding with voice forwarding`);
            const lastOrderActions = await db.select({
                id: order_actions.id,
                created_at: order_actions.created_at,
            })
                .from(order_actions)
                .where(
                    and(
                        eq(order_actions.order_id, order.id),
                        eq(order_actions.action, 'STATUS_CHANGE'),
                    )
                )
                .orderBy(desc(order_actions.created_at))
                .limit(1);

            try {
                const voiceForwardUrl = `${UZUM_BASE_URL}/b2b/cargo/integration/v2/claims/v2/driver-voiceforwarding`;
                const voiceForwardFetch = await fetch(voiceForwardUrl, {
                    method: 'POST',
                    headers: uzumHeaders(),
                    body: JSON.stringify({
                        claim_id: claimId,
                    }),
                });
                const voiceForwardResponse: any = await voiceForwardFetch.json();
                console.log(`[UC] voiceForward response:`, JSON.stringify(voiceForwardResponse));
                if (!voiceForwardResponse.phone) {
                    console.log(`[UC] SKIP webhook: no phone in voiceForward response`);
                }
                if (voiceForwardResponse.phone) {
                    const webhookUrl = org.webhook;
                    console.log(`[UC] webhookUrl=${webhookUrl}, phone=${voiceForwardResponse.phone}`);
                    if (!webhookUrl) {
                        console.log(`[UC] SKIP webhook: org has no webhook URL`);
                    }
                    if (webhookUrl) {
                        const orderIsSent = await redis.get(`courier_info_sent:${order.id}_${voiceForwardResponse.phone}`) == 'true';
                        console.log(`[UC] orderIsSent=${orderIsSent} (key: courier_info_sent:${order.id}_${voiceForwardResponse.phone})`);
                        if (!orderIsSent) {
                            const apiToken = await db.query.api_tokens.findFirst({
                                where: eq(api_tokens.organization_id, org.id),
                                columns: {
                                    token: true,
                                },
                            });
                            const webhookData: any = {
                                log: {
                                    action: 'SET_UZUM_COURIER',
                                    courier_name: uzumResponse?.performer_info?.courier_name ?? '',
                                    phone: voiceForwardResponse.phone,
                                },
                                order: {
                                    id: order.order_number,
                                },
                            };
                            const webhookFetch = await fetch(webhookUrl, {
                                method: 'POST',
                                headers: {
                                    'Accept-Language': 'ru',
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${apiToken!.token}`,
                                },
                                body: JSON.stringify(webhookData),
                            });
                            const webhookResponse = await webhookFetch.text();
                            console.log('[UC] webhookResponse', webhookResponse);
                            await redis.set(`courier_info_sent:${order.id}_${voiceForwardResponse.phone}`, 'true', 'EX', 60 * 60 * 60);
                        }

                    }
                }
            } catch (e) {
                console.log('[UC] ERROR: voiceForward/webhook failed', e);
            }

            const lastOrderActionCreatedAt = lastOrderActions[0]?.created_at;
            const lastOrderActionCreatedAtDifference = lastOrderActionCreatedAt
                ? Math.floor((new Date().getTime() - new Date(lastOrderActionCreatedAt).getTime()) / 1000)
                : 0;

            const orderResStatus = orderStatuses.find((s) => s.id === orderStatusId);

            await db.insert(order_actions).values({
                terminal_id: order.terminal_id,
                order_id: order.id,
                order_created_at: order.created_at,
                action: 'STATUS_CHANGE',
                action_text: `Статус заказа изменен на "${orderResStatus!.name}"`,
                duration: lastOrderActionCreatedAtDifference,
            });
        }
        let finishedDate = null;

        const finishedOrderStatusIds = orderStatuses.filter((item) => item.finish).map((item) => item.id);
        if (finishedOrderStatusIds.includes(orderStatusId)) {
            finishedDate = new Date();
        }

        await db.update(orders).set({
            order_status_id: orderStatusId,
            finished_date: finishedDate?.toISOString() || undefined,
        }).where(and(eq(orders.id, order.id), gte(orders.created_at, dayjs().subtract(2, 'day').toISOString())));

    }
    return 'processUzumCallback';
}
```

- [ ] **Step 2: Register worker in `queue/index.ts`**

Next to Task 4's import, add:

```ts
import processUzumCallback from "./processors/uzum_callback";
```

After the `checkAndSendUzumWorker` block, add:

```ts
const uzumCallbackWorker = new Worker(
    `${process.env.TASKS_PREFIX}_uzum_callback`,
    async (job) => {
        await processUzumCallback(redisClient, db, cacheControl, job.data);
        return 'uzum_callback';
    },
    {
        connection: redisClient,
    }
);
```

- [ ] **Step 3: Verify typecheck**

Run: `cd queue && bun x tsc --noEmit 2>&1 | tail -1`
Expected: error count ≤ Task 4 baseline.

- [ ] **Step 4: Commit**

```bash
git add queue/processors/uzum_callback.ts queue/index.ts
git commit -m "feat(queue): add uzum_callback processor"
```

---

### Task 6: `/send_uzum` + `/api/external/uzum-callback` endpoints

**Files:**
- Modify: `api/src/modules/missed_orders/controller.ts` (after `/send_noor`, ~line 146)
- Modify: `api/src/modules/external/controler.ts` (after the yandex-callback handler, ~line 1033)

**Interfaces:**
- Consumes: `processCheckAndSendUzum`, `processUzumCallbackQueue` from context `queues` (Task 3).
- Produces: `POST /send_uzum` body `{id: string}` → `{status: 'ok'}` (used by admin Task 8); `POST /api/external/uzum-callback` body `{claim_id?: string, ...}` → `{success: true}` (used as `callback_properties.callback_url` by Task 4).

- [ ] **Step 1: Add `/send_uzum` to missed_orders controller**

In `api/src/modules/missed_orders/controller.ts`, after the `/send_noor` handler (ends ~line 146), add:

```ts
    .post('/send_uzum', async ({ queues: {
        processCheckAndSendUzum
    }, body: {
        id
    } }) => {
        await processCheckAndSendUzum.add('checkAndSendUzum', {
            id
        }, { removeOnComplete: true });
        return { status: 'ok' };
    }, {
        permission: 'orders.list',
        body: t.Object({
            id: t.String(),
        }),
    })
```

- [ ] **Step 2: Add `/api/external/uzum-callback` to external controller**

In `api/src/modules/external/controler.ts`, after the yandex-callback handler (ends ~line 1033, before the noor-callback), add:

```ts
    .post('/api/external/uzum-callback', async ({ body, queues: {
        processUzumCallbackQueue
    } }) => {
        console.log('[UZUM-WEBHOOK] body:', JSON.stringify(body));
        if (body?.claim_id) {
            await processUzumCallbackQueue.add(`${body.claim_id}_${(new Date()).getTime()}`, body, {
                attempts: 3, removeOnComplete: true,
            });

        }

        return {
            success: true,
        };
    }, {
        body: t.Object({
            claim_id: t.Optional(t.String()),
        }),
    })
```

Note: Elysia's `t.Object` is non-strict by default — extra webhook fields (`status`, `updated_ts`, `route_points`, `performer_info`) pass through into the queue payload, same as the Yandex endpoint.

- [ ] **Step 3: Verify typecheck**

Run: `cd api && bun x tsc --noEmit 2>&1 | tail -1`
Expected: error count ≤ baseline.

- [ ] **Step 4: Smoke-test the callback endpoint locally**

Run: `cd api && bun run dev` (background), then:

```bash
curl -s -X POST http://localhost:3000/api/external/uzum-callback \
  -H "Content-Type: application/json" \
  -d '{"claim_id":"test-claim-123","status":"performer_lookup"}'
```

Expected: `{"success":true}`. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/missed_orders/controller.ts api/src/modules/external/controler.ts
git commit -m "feat(api): add send_uzum and uzum-callback endpoints"
```

---

### Task 7: `cancel_uzum` + `recreate_uzum` order endpoints

**Files:**
- Modify: `api/src/modules/orders/controller.ts` (after `recreate_yandex` handler ends ~line 3080; import `cancelUzumClaim` at top imports)

**Interfaces:**
- Consumes: `cancelUzumClaim` (Task 2); `orders.uzum_id` (Task 1); `processCheckAndSendUzum` queue (Task 3); Redis flag consumed by Task 5.
- Produces: `POST /api/orders/:id/cancel_uzum` → `{success: boolean, message?: string}`; `POST /api/orders/:id/recreate_uzum` body `{taxi_class: string}` → `{success: boolean, message?: string}`. Both `permission: "orders.edit"`. Used by admin Task 8.

- [ ] **Step 1: Add import**

In `api/src/modules/orders/controller.ts` top imports, add:

```ts
import { cancelUzumClaim } from "@api/src/utils/uzum";
```

(Match the file's existing import alias style — if the file imports utils via relative paths, use `../../utils/uzum` instead.)

- [ ] **Step 2: Add `cancel_uzum` endpoint**

After the `recreate_yandex` handler (ends ~line 3080), add:

```ts
  .post(
    "/api/orders/:id/cancel_uzum",
    async ({
      params: { id },
      drizzle,
      redis,
    }) => {
      const order = await drizzle
        .select({
          id: orders.id,
          uzum_id: orders.uzum_id,
          terminal_id: orders.terminal_id,
          created_at: orders.created_at,
        })
        .from(orders)
        .where(eq(orders.id, id))
        .execute();

      if (!order[0]?.uzum_id) {
        return { success: false, message: "Order has no active Uzum delivery" };
      }

      const claimId = order[0].uzum_id;

      await cancelUzumClaim(claimId);

      await redis.set(`uzum_operator_cancel:${claimId}`, "true", "EX", 7200);

      await drizzle
        .update(orders)
        .set({
          courier_id: null,
          uzum_id: null,
        })
        .where(eq(orders.id, id));

      await drizzle.insert(order_actions).values({
        terminal_id: order[0].terminal_id,
        order_id: order[0].id,
        order_created_at: order[0].created_at,
        action: "STATUS_CHANGE",
        action_text: "Оператор отменил Uzum Tezkor доставку",
        duration: 0,
      });

      return { success: true };
    },
    {
      permission: "orders.edit",
      params: t.Object({
        id: t.String(),
      }),
    },
  )
```

- [ ] **Step 3: Add `recreate_uzum` endpoint**

Immediately after `cancel_uzum`, add:

```ts
  .post(
    "/api/orders/:id/recreate_uzum",
    async ({
      params: { id },
      body: { taxi_class },
      drizzle,
      redis,
      cacheControl,
      queues: { processCheckAndSendUzum },
    }) => {
      const order = await drizzle
        .select({
          id: orders.id,
          uzum_id: orders.uzum_id,
          terminal_id: orders.terminal_id,
          created_at: orders.created_at,
          organization_id: orders.organization_id,
        })
        .from(orders)
        .where(eq(orders.id, id))
        .execute();

      if (!order[0]) {
        return { success: false, message: "Order not found" };
      }

      if (order[0].uzum_id) {
        const claimId = order[0].uzum_id;
        await cancelUzumClaim(claimId);
        await redis.set(`uzum_operator_cancel:${claimId}`, "true", "EX", 7200);
      }

      const orderStatuses = await cacheControl.getOrderStatuses();
      const initialStatus = orderStatuses.find(
        (s) => s.sort == 1 && s.organization_id == order[0].organization_id,
      );

      await drizzle
        .update(orders)
        .set({
          courier_id: null,
          uzum_id: null,
          order_status_id: initialStatus?.id ?? order[0].id,
        })
        .where(eq(orders.id, id));

      await drizzle.insert(order_actions).values({
        terminal_id: order[0].terminal_id,
        order_id: order[0].id,
        order_created_at: order[0].created_at,
        action: "STATUS_CHANGE",
        action_text: `Пересоздан заказ Uzum Tezkor доставки (taxi_class: ${taxi_class})`,
        duration: 0,
      });

      await processCheckAndSendUzum.add(
        "checkAndSendUzum",
        { id, taxi_class },
        { removeOnComplete: true },
      );

      return { success: true };
    },
    {
      permission: "orders.edit",
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        taxi_class: t.String(),
      }),
    },
  )
```

- [ ] **Step 4: Verify typecheck**

Run: `cd api && bun x tsc --noEmit 2>&1 | tail -1`
Expected: error count ≤ baseline.

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/orders/controller.ts
git commit -m "feat(api): add cancel_uzum and recreate_uzum order endpoints"
```

---

### Task 8: Admin components + page wiring

**Files:**
- Create: `new_admin/components/orders/send-to-uzum.tsx`
- Create: `new_admin/components/orders/cancel-uzum-order.tsx`
- Create: `new_admin/components/orders/recreate-uzum-order.tsx`
- Modify: `new_admin/app/dashboard/missed_orders/page.tsx` (import ~line 28, column ~line 159)
- Modify: `new_admin/app/dashboard/orders/[id]/page.client.tsx` (imports ~line 27, `Order` interface ~line 107, fields list ~line 222, provider section after Noor block ~line 680)

**Interfaces:**
- Consumes: `POST /send_uzum` (Task 6), `cancel_uzum`/`recreate_uzum` (Task 7) via Eden `apiClient`; order detail field `uzum_id`.
- Produces: `SendOrderToUzum({order})`, `CancelUzumOrder({orderId})`, `RecreateUzumOrder({orderId, hasUzumId})` — named exports.

- [ ] **Step 1: Capture admin baseline**

Run: `cd new_admin && bun x tsc --noEmit 2>&1 | tail -1` — record count.

- [ ] **Step 2: Create `new_admin/components/orders/send-to-uzum.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/eden-client";
import { IconSend } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";

interface Order {
  id: string;
  [key: string]: any;
}

interface SendOrderToUzumProps {
  order: Order;
}

export function SendOrderToUzum({ order }: SendOrderToUzumProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSendToUzum = async () => {
    setIsLoading(true);
    try {
      await apiClient.api.missed_orders.send_uzum.post({
        id: order.id,
      });

      toast.success("Заказ отправлен в Uzum Tezkor");
    } catch (error) {
      console.error("Error sending order to Uzum:", error);
      toast.error("Не удалось отправить заказ в Uzum Tezkor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleSendToUzum}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <IconSend className="h-4 w-4 mr-2" />
      )}
      Отправить в Uzum
    </Button>
  );
}
```

- [ ] **Step 3: Create `new_admin/components/orders/cancel-uzum-order.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/eden-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

interface CancelUzumOrderProps {
  orderId: string;
}

export function CancelUzumOrder({ orderId }: CancelUzumOrderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const orderEndpoint = apiClient.api.orders as any;
      const response = await orderEndpoint({ id: orderId }).cancel_uzum.post();

      if (response.data?.success) {
        toast.success("Uzum Tezkor доставка отменена");
      } else {
        toast.error(response.data?.message || "Не удалось отменить Uzum Tezkor доставку");
      }
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (error) {
      console.error("Error cancelling Uzum order:", error);
      toast.error("Не удалось отменить Uzum Tezkor доставку");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <X className="h-4 w-4 mr-1" />
          Отменить Uzum
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md z-[1500]">
        <AlertDialogHeader>
          <AlertDialogTitle>Отмена Uzum Tezkor доставки</AlertDialogTitle>
          <AlertDialogDescription>
            Вы уверены, что хотите отменить Uzum Tezkor доставку для этого заказа?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Отмена...
                </>
              ) : (
                "Отменить доставку"
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 4: Create `new_admin/components/orders/recreate-uzum-order.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/eden-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";

interface RecreateUzumOrderProps {
  orderId: string;
  hasUzumId: boolean;
}

const TAXI_CLASSES = [
  { value: "courier", label: "Курьер" },
  { value: "express", label: "Экспресс" },
];

export function RecreateUzumOrder({ orderId, hasUzumId }: RecreateUzumOrderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("courier");
  const queryClient = useQueryClient();

  const handleRecreate = async () => {
    if (!selectedClass) {
      toast.error("Выберите тип доставки");
      return;
    }

    setIsLoading(true);
    try {
      const orderEndpoint = apiClient.api.orders as any;
      const response = await orderEndpoint({ id: orderId }).recreate_uzum.post({
        taxi_class: selectedClass,
      });

      if (response.data?.success) {
        toast.success(hasUzumId
          ? "Заказ пересоздан в Uzum Tezkor"
          : "Заказ отправлен в Uzum Tezkor"
        );
      } else {
        toast.error(response.data?.message || "Не удалось пересоздать заказ");
      }
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (error) {
      console.error("Error recreating Uzum order:", error);
      toast.error("Не удалось пересоздать заказ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) {
        setSelectedClass("courier");
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          {hasUzumId ? "Пересоздать Uzum" : "Отправить Uzum-ом"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md z-[1400]">
        <DialogHeader>
          <DialogTitle>
            {hasUzumId ? "Пересоздать заказ в Uzum Tezkor" : "Отправить в Uzum Tezkor"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Тип доставки</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип доставки" />
              </SelectTrigger>
              <SelectContent className="z-[1500]">
                {TAXI_CLASSES.map((tc) => (
                  <SelectItem key={tc.value} value={tc.value}>
                    {tc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleRecreate}
              disabled={isLoading || !selectedClass}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : hasUzumId ? (
                "Пересоздать"
              ) : (
                "Отправить"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Note: Uzum `taxi_class` options are `courier` and `express` only (no `cargo`) per their spec.

- [ ] **Step 5: Wire missed orders page**

In `new_admin/app/dashboard/missed_orders/page.tsx`:

After line 28 (`import { SendOrderToNoor } ...`) add:

```tsx
import { SendOrderToUzum } from "@/components/orders/send-to-uzum";
```

After the `noor` column block (ends ~line 159), add:

```tsx
  {
    id: "uzum",
    header: "Uzum",
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <SendOrderToUzum order={row.original} />
      </div>
    ),
    size: 150,
  },
```

- [ ] **Step 6: Wire order detail page**

In `new_admin/app/dashboard/orders/[id]/page.client.tsx`:

After line 27 (`import { RecreateNoorOrder } ...`) add:

```tsx
import { CancelUzumOrder } from "@/components/orders/cancel-uzum-order";
import { RecreateUzumOrder } from "@/components/orders/recreate-uzum-order";
```

In the `Order` interface (~line 107, after `noor_id?: string | null;`) add:

```tsx
  uzum_id?: string | null;
```

In the `fields` array of `fetchOrderDetails` (~line 222, after `"noor_id"`) add:

```tsx
            "uzum_id"
```

(mind the comma after `"noor_id"`).

After the Noor provider `</div>` block (ends ~line 680), add a sibling section:

```tsx
                  <div>
                    <h3 className="font-semibold mb-2 text-lg">Uzum Tezkor</h3>
                    <div className="space-y-2">
                      {orderData.uzum_id ? (
                        <>
                          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                            Активная доставка
                          </Badge>
                          <div className="flex items-center gap-2 mt-2">
                            <CancelUzumOrder orderId={orderId} />
                            <RecreateUzumOrder orderId={orderId} hasUzumId={true} />
                          </div>
                        </>
                      ) : (
                        <RecreateUzumOrder orderId={orderId} hasUzumId={false} />
                      )}
                    </div>
                  </div>
```

- [ ] **Step 7: Verify order detail API returns `uzum_id`**

The order detail endpoint builds its select from the `fields` query param against the orders table columns (same mechanism that already serves `yandex_id`/`noor_id` — no whitelist edit was needed for Noor). Confirm by grepping:

Run: `grep -n "noor_id" api/src/modules/orders/controller.ts | head -3`
If `noor_id` appears ONLY in cancel/recreate handlers (no fields whitelist), `uzum_id` needs no controller change either. If a whitelist exists, add `uzum_id` next to `noor_id` there.

- [ ] **Step 8: Verify typecheck + lint**

Run: `cd new_admin && bun x tsc --noEmit 2>&1 | tail -1`
Expected: error count ≤ Step 1 baseline.
Run: `cd new_admin && bun run lint 2>&1 | tail -5`
Expected: no new errors in the touched files.

- [ ] **Step 9: Commit**

```bash
git add new_admin/components/orders/send-to-uzum.tsx new_admin/components/orders/cancel-uzum-order.tsx new_admin/components/orders/recreate-uzum-order.tsx new_admin/app/dashboard/missed_orders/page.tsx "new_admin/app/dashboard/orders/[id]/page.client.tsx"
git commit -m "feat(admin): add Uzum Tezkor send/cancel/recreate controls"
```

---

### Task 9: Delivery-sources dashboard — Uzum counts

**Files:**
- Modify: `api/src/modules/dashboard/controller.ts:296-345` (`/delivery-sources` handler)
- Modify: `new_admin/components/dashboard/delivery-sources.tsx`

**Interfaces:**
- Consumes: `getUzumCourierId` (Task 2).
- Produces: `/delivery-sources` response rows gain `uzum_count: number`; `own_count` excludes the Uzum courier.

- [ ] **Step 1: Add uzum count to the API**

In `api/src/modules/dashboard/controller.ts`, add the import at the top:

```ts
import { getUzumCourierId } from "@api/src/utils/uzum";
```

(Match the file's existing import path style.)

In the `/delivery-sources` handler, after line 311 (`const yandexCourierId = ...`), add:

```ts
        const uzumCourierId = (await getUzumCourierId(cacheControl)) ?? '00000000-0000-0000-0000-000000000000';
```

Replace the select fields (lines 314-319):

```ts
                date: sql<string>`DATE(${orders.created_at})`.as('date'),
                yandex_count: sql<number>`COUNT(*) FILTER (WHERE ${orders.courier_id} = ${yandexCourierId})`.as('yandex_count'),
                noor_count: sql<number>`COUNT(*) FILTER (WHERE ${orders.courier_id} = ${noorCourierId})`.as('noor_count'),
                uzum_count: sql<number>`COUNT(*) FILTER (WHERE ${orders.courier_id} = ${uzumCourierId})`.as('uzum_count'),
                own_count: sql<number>`COUNT(*) FILTER (WHERE ${orders.courier_id} != ${yandexCourierId} AND ${orders.courier_id} != ${noorCourierId} AND ${orders.courier_id} != ${uzumCourierId})`.as('own_count'),
                total: count(),
```

- [ ] **Step 2: Add Uzum to the admin component**

In `new_admin/components/dashboard/delivery-sources.tsx`, apply mechanically — every place Noor appears gets an Uzum sibling:

1. Interface (line 30): after `noor_count: number` add `uzum_count: number`.
2. `totals` and `prevTotals` reducers (lines 104-122): add `uzum: acc.uzum + Number(row.uzum_count),` to both accumulator objects and `uzum: 0,` to both initial values.
3. Fullscreen count table: `<TableHead ...>Noor</TableHead>` (line 156) → add after it `<TableHead className="py-1.5 text-sm text-center">Uzum</TableHead>`; body row (line 169) → add after it `<TableCell className="py-1.5 text-sm text-center">{Number(row.uzum_count)}{prev && <Diff current={Number(row.uzum_count)} prev={Number(prev.uzum_count)} />}</TableCell>`; footer «Итого» (line 180) → add `<TableCell className="py-1.5 text-sm text-center font-bold">{totals.uzum}<Diff current={totals.uzum} prev={prevTotals.uzum} /></TableCell>`; footer «Среднее» (line 187) → add `<TableCell className="py-1.5 text-sm text-center font-bold">{avg(totals.uzum)}<Diff current={avg(totals.uzum)} prev={prevAvg(prevTotals.uzum)} /></TableCell>`.
4. Fullscreen % table: header (line 207) → add `<TableHead className="py-1.5 text-sm text-center">Uzum</TableHead>`; body (line 218) → add `<TableCell className="py-1.5 text-sm text-center">{pct(Number(row.uzum_count), total)}</TableCell>`; footer (line 228) → add `<TableCell className="py-1.5 text-sm text-center font-bold">{avgPct(totals.uzum, totals.total)}</TableCell>`.
5. Inline count table (`<th>`/`<td>` markup, lines 264-299): change all `w-[20%]` to `w-[17%]` in that table (6 columns now), add after the Noor `<th>` (line 267): `<th className="py-1.5 px-3 text-sm text-center text-muted-foreground font-medium w-[17%]">Uzum</th>`; after Noor `<td>` in body (line 280): `<td className="py-1.5 px-3 text-sm text-center w-[17%]">{Number(row.uzum_count)}{prev && <Diff current={Number(row.uzum_count)} prev={Number(prev.uzum_count)} />}</td>`; after Noor in «Итого» (line 291): `<td className="py-1.5 px-3 text-sm text-center font-bold w-[17%]">{totals.uzum}<Diff current={totals.uzum} prev={prevTotals.uzum} /></td>`; after Noor in «Среднее» (line 298): `<td className="py-1.5 px-3 text-sm text-center font-bold w-[17%]">{avg(totals.uzum)}<Diff current={avg(totals.uzum)} prev={prevAvg(prevTotals.uzum)} /></td>`.
6. Inline % table (lines 336-360): change `w-[25%]` to `w-[20%]` in that table (5 columns now), add after Noor `<th>` (line 339): `<th className="py-1.5 px-3 text-sm text-center text-muted-foreground font-medium w-[20%]">Uzum</th>`; after Noor `<td>` in body (line 350): `<td className="py-1.5 px-3 text-sm text-center w-[20%]">{pct(Number(row.uzum_count), total)}</td>`; after Noor in footer (line 360): `<td className="py-1.5 px-3 text-sm text-center font-bold w-[20%]">{avgPct(totals.uzum, totals.total)}</td>`.

- [ ] **Step 3: Verify typecheck both services**

Run: `cd api && bun x tsc --noEmit 2>&1 | tail -1` — ≤ baseline.
Run: `cd new_admin && bun x tsc --noEmit 2>&1 | tail -1` — ≤ baseline.

- [ ] **Step 4: Commit**

```bash
git add api/src/modules/dashboard/controller.ts new_admin/components/dashboard/delivery-sources.tsx
git commit -m "feat: add Uzum Tezkor column to delivery sources dashboard"
```

---

### Task 10: Setup + manual E2E against Uzum test bench

**Files:** none (operational checklist)

- [ ] **Step 1: Create the service courier user**

In the admin dashboard create a courier user "Uzum Tezkor" (any unused phone, e.g. `+998900000002`). Copy its UUID.

- [ ] **Step 2: Set the system config**

In admin → system configs, add key `uzum_courier_id` with value `{"value":"<UUID from step 1>"}` (same JSON-string format as `yandex_courier_id`).

- [ ] **Step 3: Verify env + restart services**

Confirm `UZUM_DELIVERY_TOKEN` and `UZUM_DELIVERY_BASE_URL` are present in `api/.env` (and in the queue service env on the target machine). Restart `api` and `queue`.

- [ ] **Step 4: E2E — send**

Pick a missed order → click «Отправить в Uzum». Verify: `[UZUM]` log line in queue output, claim created (no ABORT), `orders.uzum_id` populated, order courier = Uzum service courier, status advanced to sort=2.

- [ ] **Step 5: E2E — webhook**

Ask the Uzum team (Telegram chat) to assign a test courier to the claim. Verify: `[UZUM-WEBHOOK]` log in API, `[UC]` log in queue, order status changes per `yandex_delivery_statuses` mapping.

- [ ] **Step 6: E2E — cancel and recreate**

On the order page click «Отменить Uzum»: verify cancel-info→cancel calls succeed (queue/API logs), `uzum_id` cleared, courier detached, no status bounce from the trailing webhook (operator-cancel flag honored). Then «Отправить Uzum-ом» (recreate with `hasUzumId=false`) → new claim id stored.

- [ ] **Step 7: Regression — Yandex untouched**

Send a different missed order to Yandex; verify the flow works exactly as before.

- [ ] **Step 8: Record results**

Note any deviations from the Uzum spec (field rejections, unexpected statuses) in the Telegram chat with their team and in the spec doc if behavior differs.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arryt is a multi-service food delivery platform. All backend services use **Bun** as the runtime.

| Service | Framework | Port | Purpose |
|---------|-----------|------|---------|
| **api** | Elysia | 3000 | Main backend API (PostgreSQL + Drizzle ORM) |
| **new_admin** | Next.js 15 | 8889 | Admin dashboard (React 19 + Tailwind CSS) |
| **queue** | BullMQ | — | 21 async job workers (notifications, courier assignment, aggregator dispatch) |
| **crons** | Croner | — | Scheduled tasks (reports, cleanup) |
| **duck_api** | Hono | — | DuckDB analytics API with PostgreSQL logical replication |
| **mcp_server** | MCP | 3001 | Terminal operations tool for Claude |
| **mob** | Flutter | — | Courier mobile app — see `mob/CLAUDE.md` |

> **Legacy:** `admin/` (package `took_admin`) is the old dashboard — Refine + Ant Design + GraphQL/Apollo, Yandex Maps. It is superseded by `new_admin/`. Do all new admin work in `new_admin/` unless explicitly asked to touch the legacy app.

## Development Commands

```bash
# API
cd api && bun run dev            # bun --watch src/index.ts
bun run drizzle-kit generate     # Generate migrations (uses api/drizzle.config.ts)
bun run drizzle-kit push         # Apply migrations

# Admin Dashboard
cd new_admin && bun run dev      # Port 8889
bun run build
bun run build:nolint             # Build skipping ESLint dev errors
bun run lint / bun run lint:fix

# Queue
cd queue && bun run index.ts

# Crons
cd crons && bun run index.ts

# Duck API
cd duck_api && bun run dev

# MCP Server
cd mcp_server && bun run dev

# Mobile
cd mob && flutter pub get && flutter run
```

> **Tests:** No JS/TS test suite exists in any backend service (`bun test` finds nothing app-level; `package.json` `test` scripts are stubs). Verify changes by running the service and exercising endpoints, not by running tests.

## Architecture

### Monorepo wiring (important)

The root `tsconfig.json` defines cross-service path aliases:

```
@api/*  @admin/*  @queue/*  @crons/*  @protos/*
```

Services are **not** independent packages — they import each other's source directly. `queue/index.ts` imports `@api/src/lib/db`, `@api/src/modules/cache/service`, and `@api/src/services/search/service`; `new_admin/lib/eden-client.ts` imports `BackendApp` from `../../api/src/app`. **Changing an API service class or the Elysia app type can break queue, crons, and the admin build.** Check the other services when editing anything under `api/src/lib`, `api/src/services`, or `api/src/modules/cache`.

### Service Communication

```
Admin Dashboard (:8889) --[Eden Client]--> API (:3000) --[BullMQ]--> Queue Workers
                                              |                          |
                                         PostgreSQL <--------------------+
                                           + Redis (sessions, cache, queues)

Parallel: Crons (scheduled), Duck API (analytics via DuckDB), MCP Server (:3001)
```

The **Eden Client** (`new_admin/lib/eden-client.ts`) provides end-to-end type safety — types flow from the `BackendApp` type exported by `api/src/app.ts`.

### API Structure

- **Entry**: `api/src/index.ts` — `ENV=development` runs a single process; otherwise forks a 4-worker cluster
- **App setup**: `api/src/app.ts` — CORS, static `/uploads` (served from `../uploads`), module registration, exports `BackendApp`
- **Context injection**: `api/src/context/index.ts` — decorates Elysia with `drizzle`, `redis`, `cacheControl`, `searchService`, and **all BullMQ producer `Queue` instances**
- **Module groups** (`api/src/modules/controllers.ts`):
  - **userGroup**: user, couriers, users/assets, customers, roles, permissions
  - **systemGroup**: organizations, work_schedules, terminals, delivery_pricing, api_tokens, brands, daily_garant, manager_withdraw, external, constructed_bonus_pricing, system_configs, chart, dashboard, order_bonus_pricing
  - **ordersGroup**: order_status, orders, missed_orders, order_actions, order_transactions
- Each module has `controller.ts` with Elysia endpoints using `contextWithUser` for auth + DI; a module may also carry `*.dto.ts` and `service.ts`
- **`external/`** holds unauthenticated/token-auth endpoints for partner integrations — treat it as a public surface
- **Schema**: `api/drizzle/schema.ts` (+ `relations.ts`) — 30+ tables, introspected from the DB with `casing: "preserve"`. Key: `users`, `orders`, `terminals`, `organizations`, `order_status`, `delivery_pricing`, `work_schedules`, `api_tokens`
- **Auth**: JWT Bearer tokens in the `api_tokens` table; user records cached in the Redis hash `${PROJECT_PREFIX}_user`. Permission gating via `checkRestPermission` (`api/src/utils/check_rest_permissions.ts`) — pass a `permission` string per endpoint

### Queues (BullMQ)

Queue names are **runtime-prefixed**: `${process.env.TASKS_PREFIX}_<name>`. Producers and consumers live in two separate files that must stay in sync:

- **Producers** — `Queue` instances exported from `api/src/context/index.ts` and injected into Elysia context
- **Consumers** — `Worker` instances in `queue/index.ts`, each delegating to a file in `queue/processors/`

Adding a queue means touching all three: producer, worker registration, processor.

Notable queues: `new_order_notify`, `order_complete`, `order_change_status`, `order_change_courier`, `order_clear_courier`, `try_assign_courier`, `courier_store_location`, `send_notification` (FCM), `update_user_cache`, `push_courier_to_queue`, `set_queue_last_courier`, `try_set_daily_garant`, `process_order_index`, `order_ecommerce_webhook`.

**Third-party delivery aggregators** follow a dispatch/callback pair per provider — Yandex Delivery, Noor, and Uzum Tezkor:

```
check_and_send_yandex → yandex_callback
check_and_send_noor   → noor_callback
check_and_send_uzum   → uzum_callback
```

Provider helpers live in `api/src/utils/` (`noor.ts`, `uzum.ts`).

### Cron Jobs

`crons/index.ts` schedules Croner jobs: balance report to Telegram (10:30 AM daily), close unclosed work schedules (5:00 AM daily), courier balance reports (every 10 min), courier performance calculation, financial withdrawal reports.

### Admin Dashboard Patterns

`.cursorrules` and `.cursor/rules/newadmin.mdc` contain **full working code templates** for list/create/edit/show pages, Zustand stores, cva components, and sidebar entries. Read them before writing new admin pages — do not reinvent the pattern.

- **CRUD pages**: `list.tsx`, `create.tsx`, `edit.tsx`, `show.tsx` with `[id]` dynamic routes under `app/dashboard/`
- **API calls**: `apiClient` from `lib/eden-client.ts` with the `useGetAuthHeaders()` hook
- **Auth**: `middleware.ts` gates every route on the `session` cookie and verifies it against `/api/users/me`; token state in `lib/auth-store.ts`
- **State**: Zustand stores (`*-store.ts` in `/lib`), React Query for server state
- **Forms**: react-hook-form + Zod validation
- **UI**: shadcn/ui + Radix UI, icons from `@tabler/icons-react`; user-facing strings are **Russian**
- **Tables**: TanStack React Table with the `DataTable` component
- **Maps**: Leaflet + React Leaflet (heat, markercluster) for terminal/delivery visualization
- **Sidebar nav**: update the `data.navMain` array in `components/app-sidebar.tsx`
- **Code style**: double quotes, trailing commas, named exports, `"use client"` directive

### Multi-Tenancy

All data is partitioned by `organization_id`. Queries must respect org scoping.

## Deployment

Production runs under **pm2** on a Linux host:

- `queue/pm2.config.js` — `arryt_queues`, bun interpreter, cluster mode, `instances: "max"` (every worker file runs on every CPU — processors must be idempotent)
- `new_admin/pm2.config.js` — Next.js under node, `env_production` points `NEXT_PUBLIC_API_URL` at `https://api.arryt.uz`
- The **API runs as a compiled Bun binary** (`app`), not from source — `git pull` alone does not update it; the binary must be rebuilt and the process restarted.

## Docs

- `docs/superpowers/specs/` — design specs, `docs/superpowers/plans/` — implementation plans, both `YYYY-MM-DD-<feature>.md`
- `docs/mcp_server/` — MCP server tool list and integration notes

## Environment Variables

- **API**: `DATABASE_URL`, `API_PORT`, `REDIS_URL`, `ENV`, `TASKS_PREFIX`, `PROJECT_PREFIX`
- **Admin**: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3000/api`)
- **Queue/Crons**: Redis + database connections, plus `TASKS_PREFIX` (must match the API's, or jobs are never consumed)
- Check respective `.env` files for full list

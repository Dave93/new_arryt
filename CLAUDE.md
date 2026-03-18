# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arryt is a multi-service food delivery platform. All backend services use **Bun** as the runtime.

| Service | Framework | Port | Purpose |
|---------|-----------|------|---------|
| **api** | Elysia | 3000 | Main backend API (PostgreSQL + Drizzle ORM) |
| **new_admin** | Next.js 15 | 8889 | Admin dashboard (React 19 + Tailwind CSS) |
| **queue** | BullMQ | — | 16 async job processors (notifications, courier assignment, tracking) |
| **crons** | Croner | — | Scheduled tasks (reports, cleanup) |
| **duck_api** | Hono | — | DuckDB analytics API with PostgreSQL logical replication |
| **mcp_server** | MCP | 3001 | Terminal operations tool for Claude |
| **mob** | Flutter | — | Courier mobile app |

## Development Commands

```bash
# API
cd api && bun run dev
bun run drizzle-kit generate   # Generate migrations
bun run drizzle-kit push       # Apply migrations

# Admin Dashboard
cd new_admin && bun run dev    # Port 8889
bun run build
bun run lint / bun run lint:fix

# Queue
cd queue && bun run index.ts

# Crons
cd crons && bun run index.ts

# Duck API
cd duck_api && bun run dev

# Mobile
cd mob && flutter pub get && flutter run
```

## Architecture

### Service Communication

```
Admin Dashboard (:8889) --[Eden Client]--> API (:3000) --[BullMQ]--> Queue Workers
                                              |                          |
                                         PostgreSQL <--------------------+
                                           + Redis (sessions, cache, queues)

Parallel: Crons (scheduled), Duck API (analytics via DuckDB), MCP Server (:3001)
```

The **Eden Client** (`new_admin/lib/eden-client.ts`) provides end-to-end type safety between the Elysia API and the Next.js admin — types flow from the `BackendApp` type exported by the API.

### API Structure

- **Entry**: `api/src/index.ts` — Uses clustering (4 workers in prod, single in dev)
- **App setup**: `api/src/app.ts` — CORS, static files, module registration
- **Context injection**: `api/src/context/index.ts` — Decorates Elysia with `drizzle`, `redis`, `cacheControl`, BullMQ queues
- **Module groups** (`api/src/modules/controllers.ts`):
  - **User group**: users, couriers, customers, roles, permissions, assets
  - **System group**: organizations, terminals, delivery_pricing, brands, work_schedules, system_configs, dashboard, charts
  - **Orders group**: orders, order_status, order_actions, order_transactions, missed_orders
- Each module has a `controller.ts` with Elysia endpoints using `contextWithUser` for auth + DI
- **Schema**: `api/drizzle/schema.ts` — 30+ tables. Key: `users`, `orders`, `terminals`, `organizations`, `order_status`, `delivery_pricing`, `work_schedules`, `api_tokens`
- **Auth**: JWT Bearer tokens stored in `api_tokens` table, Redis session caching via `CacheControlService`

### Queue Processors (16 queues)

Key queues: `new_order_notify`, `order_complete`, `order_change_status`, `try_assign_courier`, `courier_store_location`, `send_notification` (FCM), `yandex_callback`, `update_user_cache`

### Cron Jobs

- Balance report to Telegram (10:30 AM daily)
- Close unclosed work schedules (5:00 AM daily)
- Courier balance reports via Telegram bot (every 10 min)
- Courier performance calculation
- Financial withdrawal reports

### Admin Dashboard Patterns

- **CRUD pages**: `list.tsx`, `create.tsx`, `edit.tsx`, `show.tsx` with `[id]` dynamic routes
- **API calls**: `apiClient` from `lib/eden-client.ts` with `useGetAuthHeaders()` hook
- **State**: Zustand stores (`*-store.ts` in `/lib`), React Query for server state
- **Forms**: react-hook-form + Zod validation
- **UI**: shadcn/ui + Radix UI, icons from `@tabler/icons-react`
- **Tables**: TanStack React Table with `DataTable` component
- **Maps**: Leaflet + React Leaflet for terminal/delivery visualization
- **Sidebar nav**: Update `data.navMain` array in `components/app-sidebar.tsx`
- **Code style**: double quotes, trailing commas, named exports, `"use client"` directive

### Multi-Tenancy

All data is partitioned by `organization_id`. Queries must respect org scoping.

## Environment Variables

- **API**: `DATABASE_URL`, `API_PORT`, `REDIS_URL`
- **Admin**: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3000/api`)
- **Queue/Crons**: Redis + database connections
- Check respective `.env` files for full list

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a multi-service food delivery platform called Arryt, consisting of:
- **API** - Elysia-based backend API with PostgreSQL database using Drizzle ORM
- **Queue** - Bull/BullMQ queue processing system for order management and notifications
- **New Admin** - Next.js 15 admin dashboard with React 19 and Tailwind CSS
- **Duck API** - DuckDB-based analytics API using Hono framework
- **Mob** - Flutter mobile application for couriers
- **Crons** - Scheduled tasks and background jobs

## Common Development Commands

### API Service
```bash
cd api
bun run dev                    # Start development server (port 3000 or API_PORT)
bun run drizzle-kit generate   # Generate Drizzle migrations
bun run drizzle-kit push       # Apply database migrations
```

### Admin Dashboard
```bash
cd new_admin
bun run dev        # Start development server on port 8889
bun run build      # Build for production
bun run lint       # Run linting
bun run lint:fix   # Fix linting issues
```

### Queue Service
```bash
cd queue
bun run index.ts   # Start queue processors
```

### Duck API
```bash
cd duck_api
bun run dev        # Start development server with watch mode
```

### Mobile App
```bash
cd mob
flutter pub get    # Install dependencies
flutter run        # Run on connected device/emulator
flutter build apk  # Build Android APK
flutter build ios  # Build iOS app
```

## Architecture & Key Patterns

### API Architecture
- **Framework**: Elysia (Bun-based web framework)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens stored in api_tokens table
- **File Structure**:
  - `/api/src/modules/` - Feature modules with controllers
  - `/api/src/context/` - Shared context (DB, Redis)
  - `/api/drizzle/` - Database schema and migrations
  - Controllers follow pattern: `controller.ts` with list/create/update/delete endpoints

### Admin Dashboard Architecture
- **Framework**: Next.js 15 with App Router
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: Zustand for global state, React Query for server state
- **API Client**: Eden client for type-safe API calls
- **Authentication**: JWT-based with AuthGuard wrapper
- **CRUD Pattern**: Standardized list/create/edit/show pages
- **File Structure**:
  - `/new_admin/app/` - Next.js app router pages
  - `/new_admin/components/` - Reusable UI components
  - `/new_admin/lib/` - Utilities, API client, stores
  - `/new_admin/hooks/` - Custom React hooks

### Queue System
- **Framework**: Bull/BullMQ with Redis
- **Processors**: Located in `/queue/processors/`
- **Key Queues**:
  - `change_status` - Order status updates
  - `order_complete` - Order completion processing
  - `new_order_notify` - New order notifications
  - `store_location` - Courier location tracking
  - `yandex_callback` - External delivery integration

### Database Schema
- **ORM**: Drizzle ORM with PostgreSQL
- **Key Tables**:
  - `users` - System users (admins, couriers, managers)
  - `orders` - Order data with status tracking
  - `terminals` - Restaurant/pickup locations
  - `organizations` - Multi-tenant organizations
  - `api_tokens` - API authentication tokens
  - `work_schedules` - Courier work schedules

## Important Development Notes

### API Development
- All controllers use Elysia's type-safe routing
- Authentication via Bearer token in headers
- Use transaction pattern for complex operations
- Redis for caching and real-time features

### Admin Dashboard Development
- Follow the established CRUD patterns in `.cursorrules`
- Use existing UI components from `/components/ui/`
- API calls through `apiClient` with `useGetAuthHeaders()`
- Form validation with Zod schemas
- Toast notifications for user feedback
- Responsive design with Tailwind utilities

### Queue Processing
- Each processor handles specific business logic
- Use Redis for job coordination
- Implement proper error handling and retries
- Log important events for debugging

### Mobile App Development
- Flutter 2.17.5+ with Dart
- Auto-route for navigation
- Firebase for analytics and crash reporting
- WebSocket connections for real-time updates
- Background service for location tracking

## Environment Variables
- API requires `DATABASE_URL`, `API_PORT`, `REDIS_URL`
- Admin requires API endpoint configuration
- Queue requires Redis and database connections
- Check respective `.env` files for required variables

## Testing Approach
Currently, the project does not have automated tests configured. Manual testing is performed during development. Consider implementing:
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
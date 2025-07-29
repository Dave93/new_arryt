# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-service delivery management system called Arryt, consisting of:

1. **API Service** (`/api`) - Elysia.js backend API with PostgreSQL
2. **Admin Dashboard** (`/new_admin`) - Next.js 15 admin panel with Shadcn UI
3. **Mobile App** (`/mob`) - Flutter mobile application for couriers
4. **Queue Service** (`/queue`) - Task queue processing with BullMQ
5. **Cron Jobs** (`/crons`) - Scheduled tasks for reporting and calculations
6. **Duck API** (`/duck_api`) - DuckDB analytics service

## Development Commands

### API Service (`/api`)
```bash
bun run dev  # Start development server
```

### Admin Dashboard (`/new_admin`)
```bash
bun dev         # Start development server on port 8889
bun build       # Build for production
bun lint        # Run linting
bun lint:fix    # Fix linting issues
```

### Mobile App (`/mob`)
```bash
flutter pub get      # Install dependencies
flutter run          # Run on connected device/emulator
flutter build apk    # Build Android APK
flutter build ios    # Build iOS app
```

## Architecture & Key Components

### API Service Architecture
- **Framework**: Elysia.js with Bun runtime
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based with bearer tokens
- **Queue**: BullMQ with Redis for task processing
- **Observability**: OpenTelemetry integration
- **Key Modules**: Users, Orders, Terminals, Brands, Delivery Pricing, Permissions/Roles

### Admin Dashboard Architecture
- **Framework**: Next.js 15 App Router
- **UI Library**: Shadcn UI with Radix UI primitives
- **Styling**: Tailwind CSS 4 with class-variance-authority (cva)
- **State Management**: 
  - Zustand for global state (auth, sidebar)
  - React Query for server state
- **API Client**: Elysiajs/Eden for type-safe API communication
- **Forms**: React Hook Form with Zod validation
- **Tables**: Tanstack Table for data tables

### Mobile App Architecture
- **Framework**: Flutter with Dart
- **State Management**: Flutter Bloc, Riverpod
- **Local Storage**: ObjectBox, Hive
- **Services**: Firebase (Analytics, Crashlytics, Messaging)
- **Navigation**: Auto Route
- **Permissions**: Location services, notifications

## Important Patterns & Guidelines

### Admin Dashboard Patterns
1. **CRUD Operations Structure**:
   - `list.tsx` - Listing with pagination/filtering
   - `create.tsx` - Creation forms
   - `edit.tsx` - Update forms
   - `show.tsx` - Detail views
   - Use dynamic routes with `[id]` folders

2. **Component Organization**:
   - `/components/ui` - Reusable UI components
   - `/components/layout` - Layout components
   - Feature-specific components in feature folders

3. **API Integration**:
   - Use `apiClient` from `/lib/eden-client.ts`
   - Auth headers via `useGetAuthHeaders()` hook
   - React Query for data fetching

4. **Form Handling**:
   - Zod schemas for validation
   - React Hook Form for state
   - Toast notifications for feedback

### API Service Patterns
1. **Controller Structure**:
   - REST endpoints in module controllers
   - DTO classes for request/response validation
   - Service layer for business logic

2. **Database Operations**:
   - Drizzle ORM for queries
   - Migrations in `/drizzle` folder
   - Redis for caching

### Mobile App Patterns
1. **Navigation**: Persistent bottom navigation bar
2. **State**: Bloc pattern for complex state, Riverpod for simple state
3. **Offline Support**: ObjectBox for local data persistence

## Key Integrations

1. **Authentication Flow**:
   - Phone number + OTP authentication
   - JWT tokens stored in Zustand (admin) and Hive (mobile)
   - Role-based permissions system

2. **Real-time Updates**:
   - Queue system for order processing
   - Push notifications via Firebase

3. **Maps & Location**:
   - Leaflet for admin dashboard maps
   - Google Maps integration for route building
   - Geolocation for courier tracking

## Development Tips

1. **When adding new features to admin**:
   - Follow existing CRUD patterns
   - Update sidebar navigation in `/components/app-sidebar.tsx`
   - Use existing UI components from `/components/ui`

2. **When modifying API**:
   - Update DTOs for type safety
   - Add appropriate permissions checks
   - Consider caching strategy

3. **Mobile development**:
   - Test on both iOS and Android
   - Handle offline scenarios
   - Follow Material Design guidelines

4. **Database changes**:
   - Create migrations for schema changes
   - Update Prisma schema if applicable
   - Consider impact on existing data
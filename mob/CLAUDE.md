# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Flutter mobile application for couriers in the Arryt food delivery platform. Supports two user roles: **Courier** (delivery drivers) and **Manager** (supervisors who manage couriers).

## Common Development Commands
```bash
# Dependencies
flutter pub get              # Install dependencies

# Running
flutter emulators            # List available emulators
flutter emulators --launch Pixel7  # Launch emulator
flutter devices              # List connected devices
flutter run                  # Run on default device
flutter run -d emulator-5554 # Run on specific device

# Building
flutter build apk            # Build Android APK
flutter build apk --release  # Build release APK
flutter build ios            # Build iOS app

# Code Quality
flutter analyze              # Run static analysis

# Code Generation (required after model/route changes)
dart run build_runner build              # Generate code once
dart run build_runner build --delete-conflicting-outputs  # Force regenerate
dart run build_runner watch              # Watch and regenerate on changes
```

## Architecture & Key Patterns

### State Management
- **BLoC Pattern**: Primary state management using `flutter_bloc` with `HydratedBloc` for persistence
- **Riverpod**: Secondary state management via `riverpod_annotation` with code generation
- **Provider**: Used for locale management (`LocaleProvider`)

### Local Storage
- **Hive**: User authentication data (`UserData`) and API client configuration (`ApiClient`) in `lib/helpers/hive_helper.dart`
- **ObjectBox**: Order data, terminals, organizations, customers in `lib/helpers/objectbox.dart` - models use `@Entity` annotations

### Navigation
- **Auto-route**: Declarative routing with code generation in `lib/router.dart`
- Routes defined in `AppRouter` class, generated file is `router.gr.dart`
- Pages use `@RoutePage()` annotation

### API Communication
- **GraphQL**: Primary API via `graphql_flutter` - see `lib/helpers/api_graphql_provider.dart` for client setup with auto token refresh
- **REST/Dio**: Secondary API in `lib/helpers/api_server.dart` with HTTP2 adapter and auto token refresh interceptor
- Base URL: `https://api.arryt.uz` (configurable per brand)

### Background Services
- **Location Tracking**: `lib/location_service.dart` uses `flutter_background_service` to continuously track and send courier location to server
- Location data validated for accuracy (<20m) and speed (<180km/h) before sending
- Sends to `/api/couriers/store-location` endpoint

### File Structure
```
lib/
├── bloc/                  # BLoC state management
│   ├── api_clients/       # API client selection state
│   ├── otp_phone_number/  # Phone input state
│   ├── otp_token/         # OTP verification state
│   └── user_data/         # User session state (HydratedBloc)
├── helpers/               # Core utilities
│   ├── api_graphql_provider.dart  # GraphQL client with auth
│   ├── api_server.dart    # REST client with Dio
│   ├── hive_helper.dart   # Hive storage helpers
│   └── objectbox.dart     # ObjectBox database wrapper
├── l10n/                  # Localization (en, ru, uz)
├── models/                # Data models
│   ├── order.dart         # OrderModel with ObjectBox entity
│   ├── user_data.dart     # UserData with Hive adapter
│   └── api_client.dart    # ApiClient with Hive adapter
├── pages/                 # UI pages by feature
│   ├── home/              # Main tabbed interface
│   ├── login/             # Phone + OTP login
│   ├── orders/            # Current orders list
│   ├── orders_history/    # Past orders
│   ├── orders_management/ # Manager: order assignment
│   ├── manager/           # Manager: courier management
│   ├── profile/           # User profile
│   ├── settings/          # App settings
│   └── notifications/     # Push notifications
├── riverpods/             # Riverpod providers
├── widgets/               # Reusable UI components
├── app.dart               # MaterialApp with theme (Material 3, Google Fonts Nunito)
├── main.dart              # App initialization
├── router.dart            # Auto-route config
└── location_service.dart  # Background location tracking
```

### Key Dependencies
- **Firebase**: Analytics, Crashlytics, Messaging, Remote Config, Performance
- **Geolocator**: Location services with background tracking
- **Persistent Bottom Nav Bar**: Tab navigation
- **Upgrader**: In-app update prompts
- **ObjectBox**: Fast local database for orders
- **Hive**: Key-value storage for auth/config

## Important Development Notes

### Code Generation
After modifying models, routes, or Riverpod providers, run `dart run build_runner build` to regenerate:
- `*.g.dart` - Hive adapters, JSON serialization, Riverpod providers
- `router.gr.dart` - Auto-route generated routes
- `objectbox.g.dart` - ObjectBox entity bindings

### Authentication Flow
1. `LoginTypePhonePage` → Enter phone number
2. `LoginTypeOtpPage` → Enter OTP code
3. JWT tokens stored in Hive via `HiveHelper.setUserData()`
4. Tokens auto-refresh when expired (handled in `ApiGraphqlProvider` and `ApiServer`)

### Role-Based UI
`HomePage` renders different screens based on `userRole.code`:
- **courier**: Profile, Orders, Order History, Notifications, Settings
- **manager**: Profile, Couriers List, Order History, Orders Management, Settings

### Adding New Pages
1. Create page in `lib/pages/<feature>/`
2. Add `@RoutePage()` annotation to page class
3. Add route to `AppRouter.routes` in `lib/router.dart`
4. Run `dart run build_runner build`

### API Client Configuration
- Supports multiple API endpoints (brands) via `ApiClient` model
- Default client set via `HiveHelper.setDefaultApiClient()`
- GraphQL endpoint: `https://{apiClient.apiUrl}/graphql`
- REST endpoint: `https://{apiClient.apiUrl}/api/...`

### Localization
- Supported: English (`en`), Russian (`ru`), Uzbek (`uz`)
- Strings in `lib/l10n/app_localizations*.dart`
- Use `AppLocalizations.of(context)!.keyName` to access strings

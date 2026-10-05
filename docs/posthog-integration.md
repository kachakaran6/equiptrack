# 📊 PostHog Production Integration — EquipTrack

Comprehensive guide to the telemetry, product analytics, error tracking, and privacy architecture implemented in EquipTrack using PostHog.

---

## 🏗️ 1. Architecture Overview

All telemetry in EquipTrack is centralized behind a singleton facade (`AnalyticsService.instance`) located in `lib/core/analytics/`. Direct calls to the third-party PostHog SDK are strictly forbidden across UI widgets and feature controllers.

```text
┌──────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  (Auth, Machines, Sections, Records, Reports, Updates)   │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│           AnalyticsService (Central Facade)              │
│  ├── AnalyticsConsentManager (Opt-In / Opt-Out)          │
│  ├── AnalyticsProperties (Strict Privacy Sanitizer)      │
│  ├── AnalyticsEvent (Standardized Taxonomy)              │
│  └── AnalyticsScreen (Stable Screen Identifiers)         │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                PostHog Flutter SDK (5.x)                 │
│  ├── Non-Blocking Event Batching & Queue                 │
│  ├── Session Replay (Mask All Text Inputs Enabled)       │
│  └── Offline Resilience (Zero UI Thread Blocking)        │
└──────────────────────────────────────────────────────────┘
```

---

## ⚙️ 2. Configuration & Environment Variables

EquipTrack uses client project tokens exclusively. **No personal API keys (`phx_...`) are ever placed in client source code.**

### `.env` / `.env.example`
```env
# EquipTrack API Base URL
API_BASE_URL=https://api.yourdomain.com/api

# PostHog Analytics & Observability (Client Project Token Only)
POSTHOG_PROJECT_TOKEN=phc_zmTxSBA9eBG8XNy53n3B4SbwU9dWQEiL9eKxoqjWjGVL
POSTHOG_HOST=https://us.i.posthog.com
```

### Android Gradle Injection
In `android/app/build.gradle.kts`, environment variables are read and injected into `manifestPlaceholders` without committing keys to Android XML files:
```kotlin
manifestPlaceholders["POSTHOG_PROJECT_TOKEN"] = posthogToken
manifestPlaceholders["POSTHOG_HOST"] = posthogHost
```

### Android Manifest Meta-Data (`android/app/src/main/AndroidManifest.xml`)
```xml
<meta-data
    android:name="com.posthog.posthog.API_KEY"
    android:value="${POSTHOG_PROJECT_TOKEN}" />
<meta-data
    android:name="com.posthog.posthog.POSTHOG_HOST"
    android:value="${POSTHOG_HOST}" />
<meta-data
    android:name="com.posthog.posthog.TRACK_APPLICATION_LIFECYCLE_EVENTS"
    android:value="false" />
<meta-data
    android:name="com.posthog.posthog.SESSION_REPLAY"
    android:value="true" />
<meta-data
    android:name="com.posthog.posthog.SESSION_REPLAY_MASK_ALL_TEXT_INPUTS"
    android:value="true" />
```

---

## 🏷️ 3. Standardized Event Taxonomy

All events use snake_case naming and are typed in `AnalyticsEvent`:

| Category | Event Name | Properties Included |
| :--- | :--- | :--- |
| **Lifecycle** | `app_opened` | `app_platform`, `is_debug` |
| | `app_backgrounded` | — |
| | `app_resumed` | — |
| **Auth** | `login_started` | — |
| | `login_completed` | `distinct_id = user.id` |
| | `login_failed` | `reason`, `error_code` |
| | `logout_completed` | — (triggers `AnalyticsService.reset()`) |
| **Machines** | `machine_viewed` | `machine_id` |
| | `machine_created` | `machine_id`, `is_duplicate` (optional) |
| | `machine_updated` | `machine_id` |
| | `machine_deleted` | `machine_id` |
| **Components** | `section_viewed` | `machine_id`, `section_id` |
| | `section_created` | `machine_id`, `section_id`, `has_category` |
| | `section_updated` | `machine_id`, `section_id` |
| | `section_deleted` | `machine_id`, `section_id` |
| **Categories** | `category_created` | `machine_id`, `category_id` |
| | `category_updated` | `machine_id`, `category_id` |
| | `category_deleted` | `machine_id`, `category_id` |
| **Usage Records**| `usage_record_created` | `section_id`, `record_id`, `is_duplicate` |
| | `usage_record_updated` | `section_id`, `record_id` |
| | `usage_record_deleted` | `section_id`, `record_id` |
| **Reports** | `report_export_started` | `format` (`pdf`/`excel`), `export_type`, `machine_id` |
| | `report_export_completed` | `format`, `export_type`, `records_count`/`components_count` |
| | `report_export_failed` | `format`, `export_type`, `machine_id` |
| **Updates** | `app_update_available` | `is_immediate_allowed`, `is_flexible_allowed`, `available_version_code` |
| | `app_update_started` | `update_type` (`flexible` / `immediate`) |
| | `app_update_completed` | `update_type` |
| | `app_update_failed` | `update_type` |
| **Privacy** | `analytics_preference_changed`| `consent` (`granted` / `denied`) |
| **Errors** | `app_error` | `error_type`, `error_message`, `feature`, `operation` |

---

## 🔒 4. User Identification & Session Lifecycle

- **Stable Identifier**: PostHog `distinct_id` is set strictly to the backend UUID (`user.id`).
- **Never Used as Distinct ID**: Email, phone numbers, device IDs, or temporary tokens are strictly forbidden.
- **Logout Reset**: Calling `signOut()` triggers `AnalyticsService.instance.reset()`, clearing cached credentials and preventing cross-user event contamination.

---

## 🛡️ 5. Privacy & Sanitization Guardrails

`AnalyticsProperties.sanitize(...)` inspects every event payload:
1. **Blacklist Filtering**: Automatically drops keys containing `password`, `token`, `jwt`, `authorization`, `auth`, `secret`, `key`, `credential`, `database`, `postgres`, `telegram`, `private`, `connection_string`, `dsn`, or `cookie`.
2. **String Truncation**: Strings longer than 256 characters are capped to prevent payload bloat.
3. **Session Replay Text Masking**: `SESSION_REPLAY_MASK_ALL_TEXT_INPUTS=true` ensures text fields, numbers, and inputs are rendered as masked placeholders in session replay recordings.

---

## 🚩 6. Feature Flags Foundation

Feature flags can be checked with safe fallback values:
```dart
final isNewUIEnabled = await AnalyticsService.instance.isFeatureEnabled('new_dashboard_v2', defaultValue: false);
```
If PostHog is offline or unreachable, the provided `defaultValue` is returned without throwing errors.

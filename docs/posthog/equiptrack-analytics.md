# EquipTrack — PostHog Production Analytics Blueprint & Architecture

> **Document Version**: 2.0.0 (Production-Grade Audit & Telemetry Architecture)  
> **Status**: Verified in Production  
> **Application**: EquipTrack Mobile (Flutter / Android / iOS)  
> **PostHog SDK**: `posthog_flutter: ^4.12.0`  
> **Host**: `https://us.i.posthog.com`  

---

## 1. Executive Summary & Design Principles

EquipTrack's analytics architecture follows a **high-signal, zero-noise, privacy-first** design. Rather than blindly tracking every tap, frame, or rebuild, telemetry is purposefully instrumented at domain and service boundaries to answer core business questions:
- How often do users return to track equipment?
- Where is the drop-off in the core value journey (Machine $\to$ Component $\to$ Usage Record $\to$ Report)?
- Are export or backup processes degrading in reliability or performance?
- What API errors degrade user experience before users report them?

### Core Principles
1. **Single Source of Truth**: Exactly one component owns each event type. CRUD events originate strictly from controllers after verified backend persistence.
2. **Deduplication by Default**: Cooldown gates protect against Flutter widget rebuilds (10s on entity views, 1.5s on screen views, 500ms on rapid taps).
3. **Zero PII & Data Minimization**: No customer names, equipment names, search strings, notes, tokens, or raw error bodies ever leave the device.
4. **Non-Blocking Architecture**: Analytics dispatches are asynchronous, fire-and-forget, and wrapped in local try/catches. Network drops or PostHog unavailability never compromise app operations.
5. **Deterministic Feature Flags**: Offline fallbacks ensure 100% app stability even when disconnected.

---

## 2. Event Ownership & Deduplication Architecture

```mermaid
graph TD
    UI[Flutter Widgets / UI Layer] -->|User Interaction| Ctl[Domain Controllers]
    UI -->|Route Transitions| NavObs[AnalyticsObserver]
    
    NavObs -->|Screen View Dedup (1500ms)| Svc[AnalyticsService]
    Ctl -->|After Backend 200 OK| Svc
    Ctl -->|Search Lifecycle (Context only)| Svc
    Network[ApiClient] -->|HTTP >= 400 (10s window)| Svc
    
    subgraph "Deduplication & Sanitization Engine"
        Svc --> Sanitize[Sanitize Keys & Values]
        Svc --> GlobalCtx[Inject App & Platform Metadata]
        Svc --> Cooldown[Rate Limit & Cooldown Check]
    end
    
    Cooldown -->|Allowed| PH[PostHog Flutter SDK]
    Cooldown -->|Suppressed Duplicate| Drop[Drop Event (No Spam)]
```

### Problem Solved: Duplicate Events Audit
During the audit, three sources of duplicate events were identified and resolved:
1. **Native Android Screen Views (`Screen`)**: PostHog Android native SDK auto-captured `MainActivity` via `ActivityLifecycleCallbacks`.  
   *Fix*: Explicitly disabled in `AndroidManifest.xml` via `<meta-data android:name="com.posthog.posthog.CAPTURE_SCREEN_VIEWS" android:value="false" />`.
2. **NavigatorObserver Dialog Transitions**: Modal bottom sheets and dialog dismissals fired `didPop` and re-emitted the underlying route.  
   *Fix*: Guarded in `AnalyticsObserver` to only record transitions when `route is PageRoute && previousRoute is PageRoute`.
3. **Widget Rebuilds on Detail Screens**: Rebuilding `MachineDetailScreen` or `SectionUsageScreen` on state updates caused repeated `machine_viewed` / `section_viewed` events.  
   *Fix*: Implemented 10-second deduplication cache in `AnalyticsService.viewMachine` and `AnalyticsService.viewSection`.

---

## 3. Complete Event Taxonomy Catalog

All events are standardized in lowercase `snake_case`.

| Event Name | Domain | Emitted By | Trigger / Condition | Properties | Privacy / Safety |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `app_opened` | Lifecycle | `AppLifecycleObserver` | App process starts or boots from cold | `app_version`, `build_number`, `platform`, `environment` | Public metadata only |
| `app_resumed` | Lifecycle | `AppLifecycleObserver` | Flutter lifecycle changes to `AppLifecycleState.resumed` | `app_version`, `build_number`, `platform` | Zero user context |
| `app_backgrounded`| Lifecycle | `AppLifecycleObserver` | Flutter lifecycle changes to `paused` | `app_version`, `build_number`, `platform` | Zero user context |
| `login_started` | Auth | `AuthController` | User submits login form | `app_version`, `platform` | Never contains email/password |
| `login_completed` | Auth | `AuthController` | Backend returns 200 OK with valid JWT | `duration_ms`, `role`, `account_status` | No tokens or user names |
| `login_failed` | Auth | `AuthController` | Backend returns 4xx/5xx on login | `duration_ms`, `error_type`, `status_code` | Raw passwords excluded |
| `logout_completed`| Auth | `AuthController` | User logs out and session clears | `app_version`, `platform` | Identity reset immediately |
| `machine_viewed` | Machine | `MachineDetailScreen` | User opens machine detail screen | `machine_id` (UUID), `has_sections` | Machine name excluded |
| `machine_created` | Machine | `MachinesController` | Machine successfully created on API | `machine_id`, `is_duplicate` | Machine name excluded |
| `machine_updated` | Machine | `MachinesController` | Machine details updated on API | `machine_id` | Field values excluded |
| `machine_deleted` | Machine | `MachinesController` | Machine deleted on API | `machine_id` | Machine name excluded |
| `section_viewed` | Section | `SectionUsageScreen` | User opens component/section usage | `machine_id`, `section_id` | Component name excluded |
| `section_created` | Section | `SectionsController` | Component/Section created on API | `machine_id`, `section_id`, `has_category`| Component name excluded |
| `section_updated` | Section | `SectionsController` | Component/Section updated on API | `machine_id`, `section_id` | Field values excluded |
| `section_deleted` | Section | `SectionsController` | Component/Section deleted on API | `machine_id`, `section_id` | Component name excluded |
| `category_created`| Category | `CategoriesController`| Category created on API | `machine_id`, `category_id` | Category name excluded |
| `category_updated`| Category | `CategoriesController`| Category updated on API | `category_id` | Category name excluded |
| `category_deleted`| Category | `CategoriesController`| Category deleted on API | `category_id` | Category name excluded |
| `usage_record_created`| Usage | `UsageRecordsController`| Usage entry saved to API | `machine_id`, `section_id`, `record_id` | Hours/Notes excluded |
| `usage_record_updated`| Usage | `UsageRecordsController`| Usage entry modified on API | `machine_id`, `section_id`, `record_id` | Hours/Notes excluded |
| `usage_record_deleted`| Usage | `UsageRecordsController`| Usage entry deleted on API | `machine_id`, `section_id`, `record_id` | Hours/Notes excluded |
| `report_export_started`| Report | `ReportsController` | User initiates PDF or Excel export | `format` ('pdf' \| 'xlsx'), `target` | Document content excluded |
| `report_export_completed`| Report | `ReportsController`| Report generated and shared | `format`, `duration_ms`, `row_count` | Document content excluded |
| `report_export_failed`| Report | `ReportsController` | Report generation throws error | `format`, `duration_ms`, `error_type` | Zero document contents |
| `backup_started` | Backup | `BackupController` | Automated or manual backup starts | `backup_type` ('json' \| 'telegram') | Credentials excluded |
| `backup_completed`| Backup | `BackupController` | Backup successfully created/dispatched | `backup_type`, `duration_ms`, `size_bytes` | Payload contents excluded |
| `backup_failed` | Backup | `BackupController` | Backup creation or dispatch failed | `backup_type`, `duration_ms`, `error_type`| Credentials excluded |
| `telegram_backup_tested`| Backup | `BackupController`| Telegram connection verification test | `success`, `duration_ms` | Bot tokens masked/excluded |
| `search_started` | Search | `SearchDelegate` / List | User focuses search field | `search_context` ('machines' \| 'inventory')| Zero query text |
| `search_used` | Search | Debounced Search Listener| User performs search returning results | `search_context`, `result_count`, `query_length`| Zero query text |
| `search_no_results`| Search | Debounced Search Listener| User query yields 0 matching records | `search_context`, `query_length` | Zero query text |
| `screen_viewed` | Navigation| `AnalyticsObserver` | User navigates to a new page route | `screen_name` | Deduplicated (1.5s window)|
| `settings_opened` | Settings | `AnalyticsObserver` | User visits settings screen | `app_version`, `platform` | No user preferences leaked |
| `analytics_preference_changed`| Settings | `SettingsScreen`| User enables or disables analytics | `enabled` (boolean) | Tracked before opt-out |
| `app_update_available`| Updates | `AppUpdateService` | New version detected on Play Store | `current_version`, `available_version` | Public version data |
| `app_update_started`| Updates | `AppUpdateService` | Flexible / immediate update started | `update_type` | Zero PII |
| `app_update_completed`| Updates | `AppUpdateService` | In-app update completed | `new_version` | Zero PII |
| `app_update_failed`| Updates | `AppUpdateService` | Play Store update failed | `error_type` | Zero PII |
| `api_error` | Observability| `ApiClient` | Network request returns status >= 400 | `endpoint_name`, `operation`, `status_code`, `error_type`| Throttled (10s per error) |
| `app_error` | Observability| `FlutterError.onError` | Uncaught exception or assertion error | `error_type`, `error_message_sanitized`, `module` | Stack trace sanitized |

---

## 4. Standardized Property Definitions

Every event is passed through `AnalyticsProperties.withGlobalContext()`, guaranteeing universal baseline telemetry without code duplication:

```json
{
  "app_version": "1.0.0",
  "build_number": "1",
  "platform": "android",
  "os_version": "Android 13 (API 33)",
  "device_type": "mobile",
  "environment": "production"
}
```

### Sensitive Data Scrubbing Engine
Before sending any map to PostHog, keys and values are recursively scrubbed against the security blacklist:
- **Disallowed Keys**: `password`, `token`, `access_token`, `refresh_token`, `jwt`, `authorization`, `auth_header`, `secret`, `private_key`, `bot_token`, `chat_id`, `pin`, `otp`, `passcode`, `cookie`, `session_id`, `database_url`, `db_pass`.
- **Freeform User Input Protection**: Component names, machine serials, custom operator notes, and raw search strings are omitted. Only surrogate identifiers (UUIDs), integer counters, and enum types are captured.

---

## 5. User Identity Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as EquipTrack Flutter
    participant PH as PostHog SDK
    participant API as EquipTrack Server

    Note over User,PH: App Launch (Anonymous State)
    App->>PH: identify(distinct_id: anonymous_uuid)
    
    User->>App: Submits Login (username, password)
    App->>API: POST /auth/login
    API-->>App: 200 OK { user: { id: "usr_94a7e", role: "operator" }, token: "..." }
    
    Note over App,PH: Stable Identity Binding
    App->>PH: identify("usr_94a7e", { "role": "operator", "account_status": "active" })
    App->>PH: capture("login_completed", { duration_ms: 342 })
    
    Note over User,PH: Authenticated Usage Session
    User->>App: Views Machine, Adds Record, Exports PDF
    App->>PH: capture("usage_record_created", { machine_id: "m_1" })
    
    User->>App: Taps Sign Out
    App->>API: POST /auth/logout (or token revocation)
    App->>PH: capture("logout_completed")
    
    Note over App,PH: Identity Reset Guard
    App->>PH: reset()
    Note over PH: All session tokens purged; new anonymous ID generated.
```

- **Distinct ID**: The database user UUID (`user.id`) is strictly used as the distinct ID. Emails and phone numbers are never used as distinct IDs.
- **Cross-Device Persistence**: When a user logs into a second device, identifying with the same `user.id` merges their activity into one coherent PostHog Person.
- **Logout Isolation**: Calling `posthog.reset()` upon logout guarantees that subsequent users of a shared workshop tablet never inherit the previous operator's identity.

---

## 6. Screen Tracking Catalog

Screens are mapped to canonical, low-cardinality titles:

| Canonical Screen Name | Source Widget Route | Trigger |
| :--- | :--- | :--- |
| `Machines` | `MachineListScreen` (`/`) | Main navigation list |
| `MachineDetails` | `MachineDetailScreen` (`/machine/:id`) | Viewing machine components |
| `SectionUsage` | `SectionUsageScreen` (`/section/:id`) | Viewing component usage history |
| `Inventory` | `InventoryHomeScreen` (`/inventory`) | Spare parts & inventory stock |
| `Reports` | `ReportsScreen` (`/reports`) | Export generation screen |
| `Backup` | `BackupScreen` (`/backup`) | Data backup & cloud export |
| `Settings` | `SettingsScreen` (`/settings`) | Application settings |
| `Profile` | `ProfileScreen` (`/profile`) | Account profile |
| `Login` | `LoginScreen` (`/login`) | Authentication portal |

*Anti-Pattern Prevented*: Screen names like `MachineDetails_9f3b2` have been replaced with `screen_name: "MachineDetails"` accompanied by a separate safe property `machine_id: "9f3b2"`.

---

## 7. Search Analytics Architecture

EquipTrack features debounced, in-memory filtering across machine lists and inventory. Telemetry is structured without capturing private search strings:

1. **`search_started`**: Emitted when the search textfield gains focus.
   ```json
   { "search_context": "machines" }
   ```
2. **`search_used`**: Emitted 600ms after the user finishes typing and results update.
   ```json
   {
     "search_context": "machines",
     "query_length": 5,
     "result_count": 3
   }
   ```
3. **`search_no_results`**: Emitted when a query produces zero matches (helps identify missing spare parts or unlisted machines).
   ```json
   {
     "search_context": "inventory",
     "query_length": 12,
     "result_count": 0
   }
   ```

---

## 8. CRUD & Transactional Business Analytics

All CRUD telemetry follows the **Backend-First Verification Pattern**:
- User action $\to$ API network request dispatched.
- Only when the API returns an HTTP `200` or `201` status code is the `_created`, `_updated`, or `_deleted` event fired.
- If the network fails or the server returns `4xx`/`5xx`, `api_error` is emitted instead.

```
[User Taps Save] 
   │
   ▼
[API Request Dispatched]
   ├─── Status 200/201 ──► [AnalyticsService.trackUsageRecordCreated] ──► PostHog Event
   │
   └─── Status 4xx/5xx ──► [AnalyticsService.trackApiError]           ──► PostHog Error
```

---

## 9. Error Observability & Rate-Throttling

To prevent PostHog quota exhaustion and network congestion during cascade failures:
1. **Error Fingerprinting**: Errors are hashed by `endpoint_name + operation + status_code + error_type`.
2. **10-Second Cooldown Window**: If an identical error occurs within 10 seconds, it is silently suppressed on the client.
3. **Sensitive Error Sanitization**: All error messages are sanitized using `sanitizeErrorMessage()`:
   - IPs and hostnames replaced with generic tokens.
   - Bearer tokens, query string secrets, and passwords stripped.

---

## 10. Performance Instrumentation

Operations that impact perceived application speed are instrumented with high-precision `Stopwatch` timers:

```dart
final stopwatch = Stopwatch()..start();
try {
  await performHeavyOperation();
  stopwatch.stop();
  analytics.trackOperationCompleted(durationMs: stopwatch.elapsedMilliseconds);
} catch (e) {
  stopwatch.stop();
  analytics.trackOperationFailed(durationMs: stopwatch.elapsedMilliseconds);
}
```

Instrumented Durations:
- `login_completed` $\to$ `duration_ms`
- `report_export_completed` $\to$ `duration_ms`
- `backup_completed` $\to$ `duration_ms`
- `telegram_backup_tested` $\to$ `duration_ms`

---

## 11. Core User Funnels & Product Journeys

### Journey 1: Core Daily Value Loop
```
app_opened ──► login_completed ──► machine_viewed ──► section_viewed ──► usage_record_created
```
- **Goal**: Measure conversion from opening the application to logging machine operational hours.
- **Benchmark Target**: $\ge 68\%$ completion rate for authenticated sessions.

### Journey 2: Reporting & Compliance Export
```
machine_viewed ──► section_viewed ──► usage_record_created ──► report_export_completed
```
- **Goal**: Track how operators convert usage logging into audit reports (PDF/Excel) for management.

### Journey 3: Data Safety & Backup Reliability
```
app_opened ──► backup_started ──► backup_completed
```
- **Goal**: Measure regular data preservation behavior.

### Journey 4: Authentication Friction
```
login_started ──► login_failed
```
- **Goal**: Detect credential failures, server outages, or bad login UX.

---

## 12. Retention & Stickiness Metrics

### Retention
- **Cohort Criteria**: First `app_opened` or `login_completed`.
- **Return Event**: `usage_record_created` (proves the user logged real operational data, not just opened the app).
- **Time Window**: Weekly cohorts (W1, W2, W4, W8).

### Stickiness
- Formula: $\text{Stickiness} = \frac{\text{DAU}}{\text{MAU}} \times 100$
- Actions measured: `usage_record_created`, `machine_viewed`, `report_export_completed`.
- Target: $\ge 40\%$ for active industrial operations.

---

## 13. Session Replay & Masking Audit

Session Replay is active with client-side security controls:
- **Form Inputs Masking**: All `TextFormField` password, username, token, and note inputs have replay text masking enabled.
- **Telegram Token Screen**: The Telegram Bot Token and Chat ID fields in `BackupScreen` are flagged with sensitive privacy masks.
- **Replay Sample Rate**: Set to `1.0` in debug and `0.2` (20%) in production to conserve mobile bandwidth.

---

## 14. Feature Flag Strategy (`FeatureFlagService`)

EquipTrack provides a resilient `FeatureFlagService` ensuring offline availability:

```dart
class FeatureFlagService {
  static const Map<String, bool> _defaultFlags = {
    'new_export_modal': true,
    'multi_component_pdf': true,
    'enable_telegram_backup': true,
    'enable_in_app_updates': true,
  };

  Future<bool> isEnabled(String flagKey) async {
    try {
      final remoteVal = await _posthog.isFeatureEnabled(flagKey);
      return remoteVal ?? _defaultFlags[flagKey] ?? false;
    } catch (_) {
      return _defaultFlags[flagKey] ?? false;
    }
  }
}
```

---

## 15. The 20 PostHog Insight Configurations

| # | Insight Name | Type | Event Series | Aggregation | Filters / Breakdowns |
|---|---|---|---|---|---|
| 1 | **Daily Active Users (DAU)** | Trends | `app_opened`, `screen_viewed` | Unique Users | Interval: Day |
| 2 | **Weekly Active Users (WAU)** | Trends | `app_opened`, `screen_viewed` | Unique Users | Interval: Week |
| 3 | **Monthly Active Users (MAU)** | Trends | `app_opened`, `screen_viewed` | Unique Users | Interval: Month |
| 4 | **Total App Opens** | Trends | `app_opened` | Total Count | Breakdown: `platform` |
| 5 | **Machines Created** | Trends | `machine_created` | Total Count | Breakdown: `is_duplicate` |
| 6 | **Usage Records Created** | Trends | `usage_record_created` | Total Count | Breakdown: `platform` |
| 7 | **Reports Exported by Format** | Trends | `report_export_completed` | Total Count | Breakdown: `format` |
| 8 | **Backup Success Rate** | Trends | A: `backup_completed`<br>B: `backup_failed` | Formula: `A / (A + B) * 100` | Breakdown: `backup_type` |
| 9 | **Overall Error Rate** | Trends | A: `api_error`<br>B: `app_error` | Total Count | Grouped by Day |
| 10| **Login Success Rate** | Trends | A: `login_completed`<br>B: `login_failed` | Formula: `A / (A + B) * 100` | Grouped by Week |
| 11| **Login Failure Trend** | Trends | `login_failed` | Total Count | Breakdown: `error_type` |
| 12| **Machine to Usage Record Funnel**| Funnels | 1. `machine_viewed`<br>2. `section_viewed`<br>3. `usage_record_created`| Conversion % | Window: 1 hour |
| 13| **Usage Record to Export Funnel**| Funnels | 1. `usage_record_created`<br>2. `report_export_started`<br>3. `report_export_completed`| Conversion % | Window: 1 day |
| 14| **Weekly User Retention** | Retention | Cohort: `login_completed`<br>Return: `usage_record_created` | Cohort Size % | Retention across 8 weeks |
| 15| **Feature Stickiness** | Stickiness | `usage_record_created`, `report_export_completed` | Active Days / Month | Target $\ge 12$ days |
| 16| **Top User Paths** | Paths | Step 1: `screen_viewed`<br>Step 2: `screen_viewed` | Path Flow | Start: `Machines` |
| 17| **Most Used Screens** | Trends | `screen_viewed` | Total Count | Breakdown: `screen_name` |
| 18| **Export Performance (Latency)** | Trends | `report_export_completed` | 95th Percentile `duration_ms`| Breakdown: `format` |
| 19| **Backup Performance (Latency)** | Trends | `backup_completed` | 90th Percentile `duration_ms`| Breakdown: `backup_type` |
| 20| **API Error Distribution** | Trends | `api_error` | Total Count | Breakdown: `endpoint_name` |

---

## 16. The 6 Production Dashboards

### Dashboard 1: EquipTrack — Executive Overview
- **Purpose**: High-level health and activity snapshot for executive stakeholders.
- **Insights**:
  - Insight 1: DAU / WAU / MAU Ratio.
  - Insight 4: App Opens Trend (Weekly).
  - Insight 6: Total Usage Records Created.
  - Insight 7: Reports Exported.
  - Insight 8: Backup Health & Success Rate.
  - Insight 10: Authentication Success Rate.

### Dashboard 2: EquipTrack — Product Usage & Adoption
- **Purpose**: Understand how shop-floor personnel interact with features.
- **Insights**:
  - Insight 5: Machine creation velocity.
  - Insight 6: Usage record creation velocity.
  - Insight 17: Screen distribution (`Machines` vs `SectionUsage` vs `Inventory`).
  - Insight 15: Stickiness curve.
  - Search Analytics: `search_used` vs `search_no_results`.

### Dashboard 3: EquipTrack — Reliability & Error Monitoring
- **Purpose**: SRE / Developer observability into network, API, and app stability.
- **Insights**:
  - Insight 9: Daily Error Volume (`api_error` + `app_error`).
  - Insight 20: Top 10 Failing API Endpoints.
  - Insight 11: Login failure causes.
  - Insight 8: Backup failure trends.

### Dashboard 4: EquipTrack — Performance & Latency
- **Purpose**: Track regressions in report generation and data synchronization.
- **Insights**:
  - Insight 18: PDF vs Excel export generation time ($p_{50}$, $p_{90}$, $p_{99}$).
  - Insight 19: Backup creation time by payload size.
  - Login latency ($p_{90}$ `duration_ms`).

### Dashboard 5: EquipTrack — User Journeys & Conversion Funnels
- **Purpose**: Pinpoint where users drop off in standard workflows.
- **Insights**:
  - Insight 12: Machine $\to$ Component $\to$ Usage Entry Funnel.
  - Insight 13: Usage Logging $\to$ Report Generation Funnel.
  - Insight 16: User Paths diagram starting from `Machines` screen.

### Dashboard 6: EquipTrack — Cohort Retention
- **Purpose**: Evaluate long-term recurring usage across customer organizations.
- **Insights**:
  - Insight 14: Weekly recurring retention heatmap.
  - New vs Returning Users ratio over time.

---

## 17. Alert Readiness & Monitoring Thresholds

Configure PostHog Alert Actions for automated alerting via Webhook/Email:

1. **API Error Spike**:
   - Condition: `api_error` count > 50 in 10 minutes.
   - Action: PagerDuty / Slack Webhook.
2. **Report Export Failure Regression**:
   - Condition: `report_export_failed` > 5 events within 1 hour.
   - Action: High Priority Bug notification.
3. **Backup Failure Alert**:
   - Condition: `backup_failed` count > 2 in 24 hours.
   - Action: Operational Alert to Infrastructure Admin.
4. **Login Outage Alert**:
   - Condition: `login_failed` rate > 40% of all login attempts over 15 minutes.
   - Action: Critical Auth Service Alert.

---

## 18. PostHog AI Readiness & Semantic Taxonomy

All event names and parameters use explicit, human-readable semantic naming so PostHog AI queries can accurately parse natural language requests:
- **Example Natural Query**: *"How many PDF reports were exported after a usage record was created this week?"*  
  PostHog AI translates this directly to a Funnel between `usage_record_created` and `report_export_completed` filtered by `format == "pdf"`.
- **Example Natural Query**: *"What is the 95th percentile duration of Excel report generation?"*  
  PostHog AI directly queries `report_export_completed.duration_ms` with `p95` aggregation and `format == "xlsx"`.

---

## 19. Privacy Audit & Google Play Compliance

- **Google Play Data Safety Declaration**:
  - Data Type Collected: App Info and Performance (Crash logs, Diagnostics, App interactions).
  - Data Type NOT Collected: Personal Info (Name, Email, Phone), Financial info, Location, Photos, Contacts.
  - Ephemeral Processing: Telemetry is anonymized and transmitted via TLS 1.3 to US-based SOC2-compliant PostHog infrastructure.
- **Android Permissions Verified**:
  - Only `INTERNET` and `ACCESS_NETWORK_STATE` are used for telemetry transmission.
  - Zero sensitive permissions (`READ_EXTERNAL_STORAGE`, `ACCESS_FINE_LOCATION`, `CAMERA`, `READ_CONTACTS`) are declared for analytics.
- **User Consent / Opt-Out**:
  - Equipped with user preference toggle in Settings: `analytics_preference_changed`. If toggled off, `Posthog().disable()` immediately freezes all telemetry.

# Machine Usage Tracking & Reporting Application

Production-ready Flutter / Android application for tracking machine usage history, calculating operational component durations, generating PDF/Excel reports, and synchronizing data across team members in real-time.

---

## 🏗 Technology Stack & Architecture

- **Framework:** Flutter 3.44.8+ / Dart 3.12.2+
- **Architecture:** Clean Feature-First Architecture + Repository Pattern
- **State Management:** Riverpod (modern `Notifier` & `AsyncNotifier` providers)
- **Navigation:** GoRouter with named routes, auth redirects, and system back guards
- **Backend / Database:** Supabase PostgreSQL + Row Level Security (RLS) + Supabase Realtime
- **Design System:** Material 3 foundation with FlexColorScheme
- **Reporting:** Vector PDF (A4 multi-page, repeating headers) & Excel (.xlsx formatted workbooks)
- **App Updates:** Native Google Play In-App Updates (`in_app_update`) — no custom update server

---

## 📂 Project Structure

```text
machine_usage_app/
├── android/                          # Android native project configuration
├── assets/
│   ├── icons/
│   └── images/
├── lib/
│   ├── app/
│   │   ├── app.dart                  # Root MaterialApp with theme & router
│   │   └── app_bootstrap.dart        # Initialization lifecycle & orientations
│   ├── core/
│   │   ├── constants/                # App constants, keys, table names
│   │   ├── errors/                   # Typed AppFailure hierarchy
│   │   ├── extensions/               # Date, context, and theme extensions
│   │   ├── router/                   # GoRouter configuration & route paths
│   │   ├── services/
│   │   │   ├── usage_calculation_service.dart # Single Source of Truth for durations
│   │   │   ├── app_update_service.dart        # Native Google Play update handling
│   │   │   ├── report_service.dart            # Report coordinator
│   │   │   ├── pdf_service.dart               # A4 multi-page PDF generator
│   │   │   └── excel_service.dart             # Formatted .xlsx generator
│   │   ├── theme/                    # Color tokens, typography, light/dark themes
│   │   ├── utils/                    # Structured logger, form validators
│   │   └── widgets/                  # Reusable component design system
│   ├── data/
│   │   ├── datasources/              # Supabase client provider & bootstrap
│   │   └── repositories/             # Auth, Machine, Section, Usage Record repos
│   ├── models/                       # Machine, Section, UsageRecord, CalculatedUsageRow
│   ├── features/
│   │   ├── auth/                     # Login screen & auth controller
│   │   ├── machines/                 # Machine list, search, add/edit dialogs
│   │   ├── sections/                 # Machine details, section management
│   │   ├── usage_records/            # 3-column table, date picker, duplicate warning
│   │   ├── reports/                  # PDF & Excel export actions sheet
│   │   └── app_update/               # App update listener & bottom sheet
│   └── main.dart                     # Main entry point
├── supabase/
│   └── migrations/
│       ├── 001_create_machines.sql
│       ├── 002_create_sections.sql
│       ├── 003_create_usage_records.sql
│       ├── 004_create_indexes.sql
│       ├── 005_enable_rls.sql
│       ├── 006_create_rls_policies.sql
│       └── 007_enable_realtime.sql
├── test/
│   ├── unit/                         # Unit tests (calculations, models, services)
│   └── widget/                       # Widget tests (components, login, tables)
├── .env.example
├── analysis_options.yaml
└── pubspec.yaml
```

---

## 🧮 Core Business Logic: Dynamic Usage Calculation

1. Usage records are **sorted chronologically** by `usage_date` ascending.
2. For each record:
   - If a subsequent chronological record exists:
     $$\text{usageDays} = \text{nextDate} - \text{currentDate}$$
   - For the latest chronological record:
     $$\text{isRunning} = \text{true}, \quad \text{usageDays} = \text{null}$$
3. Equal/duplicate dates result in `0 days`.
4. Deleting or editing a record triggers automatic instantaneous recalculation.
5. **CRITICAL:** `usage_days` is dynamically calculated and **NEVER stored** in the database.
6. The exact same calculation result powers:
   - Mobile UI Usage Table (`UsageTableView`)
   - PDF Reports (`PdfService`)
   - Excel Workbooks (`ExcelService`)

---

## 🔒 Security & Shared Workspace Data Model

- **Shared Dataset:** All authenticated users share the same machines and records.
- **Row Level Security (RLS):** Enabled on all tables with `(auth.uid() IS NOT NULL)` policy check.
- **Audit Logging:** `created_by` and `updated_by` track user actions without restricting access.
- **Service Role Credentials:** **Never** shipped in Dart source, APK, or repository.

---

## 🔄 Google Play In-App Updates

The application integrates with Google Play's In-App Update API directly:
- **Flexible Update:** Background download for standard releases, with completion prompt.
- **Immediate Update:** Full-screen blocking flow for critical releases.
- **Session Guard:** Updates are surfaced in a polished bottom sheet at most once per active session to avoid user fatigue.
- **Platform Resilience:** Silently falls back on non-Android platforms or dev environments without crashing.

---

## 🧪 Quality Gates & Testing

Run all unit & widget tests:
```bash
flutter test
```

Run static analysis:
```bash
flutter analyze
```

---

## 🚀 Getting Started

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Supabase project URL and publishable key:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
3. Run migrations on your Supabase project:
   Execute files in `supabase/migrations/001_...` through `007_...` in sequential order.
4. Launch the application:
   ```bash
   flutter run
   ```

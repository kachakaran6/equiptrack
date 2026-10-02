# Machine Usage Tracking & Reporting Application
## Production-Ready Flutter PRD + Technical Implementation Specification

**Document Status:** Production Development Specification  
**Version:** 2.0  
**Platform:** Flutter / Android-first  
**Backend:** Supabase PostgreSQL + Supabase Auth  
**Architecture:** Clean, feature-first, Riverpod, GoRouter  
**Primary Users:** Small trusted team (approximately 1–3 authenticated users)  
**Data Model:** Shared/global workspace  
**Update Delivery:** Google Play In-App Updates — no custom update backend

---

# 1. Executive Summary

Build a polished, production-ready Flutter mobile application for tracking machine usage history.

The core hierarchy is:

```text
Machine
  └── Section / Side / Component
        └── Usage Records
```

Each usage record contains:

- Name
- Date

The application automatically calculates the number of days between each record and the next chronological record. The newest record is always displayed as:

```text
Running
```

The same calculation result must power:

- Mobile UI
- PDF reports
- Excel reports

The application uses a shared dataset. Every authenticated user can view and manage the same machines, sections, and usage records.

The product should feel like a small professional business application rather than a prototype: consistent navigation, excellent empty/loading/error states, polished forms, responsive tables, reliable exports, secure Supabase access, realtime synchronization, and robust update handling.

---

# 2. Existing Product Scope

The existing product requirements define the shared machine-usage workflow, automatic usage-day calculation, reporting, Supabase RLS, and Flutter architecture. This specification preserves those requirements while expanding them to production level. fileciteturn0file0L5-L16

The original hierarchy is intentionally simple:

```text
Machine → Section / Side / Component → Usage Record
```

A section name is intentionally free-form and may represent a side, component, area, assembly, or business-defined category. fileciteturn0file0L27-L40

---

# 3. Product Goals

## Primary Goals

1. Track machine usage history accurately.
2. Make record entry extremely simple.
3. Automatically calculate usage duration.
4. Keep the latest record marked as `Running`.
5. Make historical data easy to understand.
6. Provide reliable PDF and Excel exports.
7. Allow all authenticated users to collaborate on one shared dataset.
8. Synchronize changes between users with Supabase Realtime.
9. Provide professional mobile navigation and back-navigation behavior.
10. Automatically surface new Play Store versions without requiring a custom update server.
11. Keep the application maintainable and production-ready.

## Non-Goals

Do not introduce unnecessary complexity such as:

- Multi-tenant workspaces
- Complex role management
- Billing
- Custom version-management backend
- Offline-first synchronization
- Enterprise analytics
- Automated email reports
- Custom OTA update infrastructure

The original MVP also excludes per-user data isolation, advanced analytics, and offline-first synchronization. fileciteturn0file0L18-L22

---

# 4. Product Principles

The implementation must follow these principles:

### Simple

A user should understand the application without training.

### Accurate

Usage-day calculations must have one source of truth.

### Consistent

UI, PDF, and Excel must display identical calculated values.

### Native

Use Flutter platform conventions and native Android capabilities where appropriate.

### Secure

Never expose Supabase service-role credentials inside the Flutter application.

### Maintainable

Business logic must not be duplicated across screens.

### Small-Team Optimized

Because only approximately 1–3 users are expected, do not build unnecessary infrastructure.

---

# 5. Technology Stack

## Required

```text
Flutter
Dart
Supabase
PostgreSQL
Supabase Auth
Riverpod
GoRouter
```

## UI Libraries

Evaluate the following libraries and use them selectively:

```text
https://forui.dev/
https://playground.flexcolorscheme.com/
https://pub.dev/packages/shadcn_ui
https://pub.dev/packages/shadcn_flutter
```

Do not blindly combine multiple UI systems.

Choose one primary visual/component foundation and keep the application visually consistent.

### Recommended approach

Use:

- Flutter Material 3 foundation
- FlexColorScheme for theme/color-system management
- Forui OR shadcn_ui/shadcn_flutter for selected polished components where they provide clear value

Do not mix component styles in a way that makes the application look assembled from different design systems.

---

# 6. Recommended Flutter Packages

Package choices must be reviewed against the latest stable versions before implementation.

Recommended categories:

```yaml
dependencies:
  flutter:
    sdk: flutter

  supabase_flutter:
  flutter_riverpod:
  go_router:

  flex_color_scheme:

  intl:
  uuid:

  pdf:
  printing:
  excel:
  share_plus:

  in_app_update:
```

Optional packages may be added only when they solve a real requirement.

Avoid unnecessary dependencies.

---

# 7. Google Play In-App Update Strategy

## Critical Requirement

Do NOT build a separate update backend.

Do NOT create a Supabase table just to store the current app version.

Do NOT build a custom version-check API.

The application should use Google Play's native In-App Updates API directly.

The official Flutter `in_app_update` package exposes:

- `checkForUpdate()`
- `performImmediateUpdate()`
- `startFlexibleUpdate()`
- `completeFlexibleUpdate()`

and integrates with Google's Android In-App Updates APIs. citeturn0search2turn0search7

Google Play itself determines whether an update is available based on the installed version and the Play-distributed version. The official API supports flexible and immediate update flows. citeturn0search0turn0search5

---

# 8. Update UX Requirement

## Desired User Experience

Whenever a new version is available on Google Play:

```text
App opens / resumes
       ↓
Check Google Play
       ↓
Update available?
       ↓
YES
       ↓
Open polished in-app bottom sheet
       ↓
"Update available"
       ↓
Update now
       ↓
Google Play native update flow
```

The bottom sheet should be an application-owned presentation layer.

The actual update operation must remain controlled by Google Play's official In-App Updates API.

## Important Platform Constraint

Google Play's official update UX is not itself guaranteed to be a customizable Flutter bottom sheet.

- Flexible update = background download while the user continues using the app.
- Immediate update = full-screen blocking Google Play flow.

Therefore the correct production architecture is:

```text
Flutter custom bottom sheet
        +
Google Play official in-app update API
```

Do not attempt to fake Google's native installation UI.

For critical updates, use the official immediate flow. For normal updates, use the flexible flow. Google's documentation explicitly distinguishes these two behaviors. citeturn0search4turn0search5

---

# 9. Update Behavior

## On App Startup

After authentication/session restoration:

1. Initialize application.
2. Render the main screen.
3. Check for an available Play Store update without blocking the application startup.
4. If available and allowed, present the update bottom sheet.
5. Never show the sheet multiple times during the same active session.

## On App Resume

When the application returns from background:

1. Re-check update availability where appropriate.
2. Do not repeatedly interrupt the user.
3. If a new update has not already been presented during the current session, present the sheet.

## Update Available

Bottom sheet:

```text
┌─────────────────────────────────┐
│  Update available               │
│                                 │
│  A newer version of the app     │
│  is available. Update now to    │
│  get the latest improvements.   │
│                                 │
│  [ Later ]     [ Update now ]   │
└─────────────────────────────────┘
```

Use polished motion, safe-area handling, accessible buttons, and platform-consistent spacing.

## Flexible Update

Recommended default for ordinary releases:

```text
Check
 ↓
Bottom sheet
 ↓
Update now
 ↓
startFlexibleUpdate()
 ↓
Download in background
 ↓
Show progress/status
 ↓
Downloaded
 ↓
Complete update
 ↓
Application restarts
```

Google Play's flexible flow allows the user to continue using the app while the update downloads. citeturn0search4

## Immediate Update

Use only when a release is critical enough to require blocking the application.

```text
Check
 ↓
Immediate update allowed?
 ↓
Google Play full-screen update
 ↓
Install
 ↓
Restart
```

Immediate updates are designed as full-screen blocking flows. citeturn0search5

---

# 10. Update Service Architecture

Create:

```text
lib/core/services/app_update_service.dart
```

Responsibilities:

- Check update availability
- Read available version information
- Determine flexible/immediate capability
- Prevent duplicate prompts
- Start flexible update
- Complete flexible update
- Start immediate update
- Observe installation state
- Handle errors gracefully
- Never crash the application if Play services are unavailable

The service must not contain UI code.

UI presentation belongs to:

```text
lib/core/widgets/update_bottom_sheet.dart
```

The application shell/root coordinator should orchestrate the service and sheet.

---

# 11. Update Error Handling

If Play Store update APIs fail:

- Do not show a raw exception.
- Do not block the application.
- Log the technical error in debug/release diagnostics as appropriate.
- Continue normal application operation.

Examples:

```text
Play Store unavailable
Update API unavailable
User cancelled
Flexible update failed
Installation failed
Update not allowed
```

All should degrade gracefully.

In-app updates require a Play-distributed installation for realistic testing; local debug builds should not be treated as proof that the production update flow works. citeturn0search2turn0search7

---

# 12. Authentication

Authentication is required.

Recommended:

```text
Supabase Auth
```

Initial flow:

```text
Splash
 ↓
Session check
 ↓
Authenticated? ── No ──> Login
       │
      Yes
       ↓
Machine List
```

The application should support persistent sessions using Supabase Flutter session handling.

No user should access application data without authentication.

---

# 13. Shared Data Model

All authenticated users access the same global dataset.

Example:

```text
User A ─┐
User B ─┼──> Shared Machines
User C ─┘
```

There is no ownership restriction.

All authenticated users can:

- View machines
- Create machines
- Edit machines
- Delete machines
- View sections
- Create/edit/delete sections
- View usage records
- Create/edit/delete usage records

This matches the original shared-data requirement. fileciteturn0file0L42-L44

---

# 14. Database Architecture

## Tables

```text
machines
sections
usage_records
```

Relationship:

```text
machines
   │
   ├── sections
   │      │
   │      └── usage_records
   │
   └── ...
```

---

# 15. Machines Table

Recommended structure:

```sql
machines
---------
id              uuid primary key
name            text not null
description     text null
created_at      timestamptz not null
updated_at      timestamptz not null
created_by      uuid null
updated_by      uuid null
```

`created_by` and `updated_by` are audit metadata only.

They must never be used to restrict access.

---

# 16. Sections Table

```sql
sections
--------
id              uuid primary key
machine_id      uuid not null references machines(id) on delete cascade
name            text not null
created_at      timestamptz not null
updated_at      timestamptz not null
created_by      uuid null
updated_by      uuid null
```

Index:

```sql
create index idx_sections_machine_id
on sections(machine_id);
```

---

# 17. Usage Records Table

```sql
usage_records
-------------
id              uuid primary key
section_id      uuid not null references sections(id) on delete cascade
name            text not null
usage_date      date not null
created_at      timestamptz not null
updated_at      timestamptz not null
created_by      uuid null
updated_by      uuid null
```

Indexes:

```sql
create index idx_usage_records_section_id
on usage_records(section_id);

create index idx_usage_records_section_date
on usage_records(section_id, usage_date);
```

---

# 18. Usage Days Must NOT Be Stored

Do not create:

```text
usage_days
```

as an authoritative database field.

Usage days are derived from adjacent dates.

The original PRD explicitly requires dynamic calculation and states that `usage_days` must not be the source of truth. fileciteturn0file0L77-L84

---

# 19. RLS Security

Enable Row Level Security on all application tables.

Policy model:

```text
Authenticated user
      ↓
Can CRUD shared data
```

Conceptual condition:

```sql
auth.uid() IS NOT NULL
```

Do NOT use:

```sql
user_id = auth.uid()
```

for data isolation.

The original specification explicitly requires authentication-based access rather than ownership-based access. fileciteturn0file0L149-L153

---

# 20. Credential Security

The Flutter application may contain:

```text
Supabase URL
Supabase anon/publishable key
```

Never ship:

```text
Supabase service_role key
```

Never put service-role credentials in:

- Dart source
- `.env` shipped to production
- APK
- Git repository
- client-side configuration

Supabase RLS must remain the database security boundary. fileciteturn0file0L228-L233

---

# 21. Realtime Collaboration

Because the dataset is shared, enable Supabase Realtime where useful.

Example:

```text
User A adds usage record
        ↓
Supabase
        ↓
Realtime event
        ↓
User B receives change
        ↓
UI refreshes affected section
```

Do not blindly refresh the entire application after every event.

Refresh only the affected resource.

The original PRD recommends realtime synchronization so users can see changes made by others without manually refreshing. fileciteturn0file0L182-L186

---

# 22. Core Business Logic

Create:

```text
lib/core/services/usage_calculation_service.dart
```

Input:

```text
List<UsageRecord>
```

Algorithm:

```text
1. Sort records by usage_date ascending.
2. For each record:
   - if another record exists after it:
       usageDays = nextDate - currentDate
   - otherwise:
       usageDays = Running
3. Return presentation/report models.
```

This calculation must be implemented exactly once.

The result must be reused by:

```text
Usage Table
PDF Generator
Excel Generator
```

The original requirements explicitly require one reusable calculation service to avoid discrepancies. fileciteturn0file0L220-L225

---

# 23. Date Ordering

Records must always be sorted chronologically.

Example input:

```text
20/10/2026
02/10/2026
12/10/2026
```

Display:

```text
02/10/2026
12/10/2026
20/10/2026
```

Usage:

```text
02 → 12 = 10 days
12 → 20 = 8 days
20 = Running
```

The original PRD explicitly requires calculation based on date order rather than insertion order. fileciteturn0file0L89-L90

---

# 24. Duplicate Dates

MVP behavior:

- Allow duplicate dates.
- Detect duplicates before save.
- Show a warning.
- Let the user confirm.

Example:

```text
A record already exists for 12 Oct 2026.

Do you want to add another record for this date?

[Cancel] [Add anyway]
```

If duplicate dates are allowed, the difference between equal dates is:

```text
0 days
```

This matches the existing requirement. fileciteturn0file0L93-L94

---

# 25. Application Navigation

Use GoRouter.

Primary route hierarchy:

```text
/login

/machines

/machines/:machineId

/machines/:machineId/sections/:sectionId

/machines/:machineId/sections/:sectionId/records
```

Reports can be actions/routes depending on UX.

---

# 26. Professional Back Navigation

Back navigation must be implemented deliberately across the entire application.

## Required Behavior

### Machine List

Back:

```text
Exit application / system back behavior
```

Use Android back handling appropriately.

### Machine Details

Back:

```text
Machine Details
      ↓
Machine List
```

### Section Details

Back:

```text
Section Details
      ↓
Machine Details
```

### Report Preview

Back:

```text
Report
 ↓
Section
```

### Modal / Bottom Sheet

System back must:

```text
Close current sheet
```

before navigating away.

### Unsaved Form

If a form contains unsaved changes:

```text
Discard changes?

[Keep Editing] [Discard]
```

Do not silently lose input.

---

# 27. Navigation Architecture

Use:

```text
GoRouter
```

with:

- Named routes
- Route guards
- Auth redirect
- Deep-link-safe route handling
- Central route definitions
- Nested navigation where useful

Avoid scattered:

```dart
Navigator.push(...)
```

throughout business code.

Navigation decisions should remain predictable and testable.

---

# 28. System Back Handling

Use Flutter's modern back-navigation APIs where appropriate.

Requirements:

- Android back button works.
- Gesture back works where supported.
- Modal closes before page navigation.
- Keyboard closes naturally before destructive navigation.
- Unsaved forms are protected.
- Nested routes pop correctly.
- No accidental double-pop.
- No navigation stack duplication.

Test:

```text
Login → Machines → Machine → Section → Record Form
```

by pressing back repeatedly.

---

# 29. Main Screens

## Screen 1 — Splash / Session Restore

Responsibilities:

- Initialize Supabase
- Restore session
- Initialize app services
- Initialize update service
- Navigate to correct destination

Do not display a long blocking splash.

---

# 30. Screen 2 — Login

Requirements:

- Clean professional design
- Email
- Password
- Sign in
- Loading state
- Invalid credentials state
- Network error state
- Password visibility control
- Keyboard-safe layout

Optional:

```text
Forgot password
```

if enabled in Supabase.

---

# 31. Screen 3 — Machine List

Features:

- Search
- Add machine
- Open machine
- Edit machine
- Delete machine
- Pull-to-refresh
- Realtime updates
- Loading state
- Empty state
- Error state

Card:

```text
Machine 01

3 Sections

ABC • Side A • Side B

                        >
```

The original specification defines the machine list and its CRUD/search responsibilities. fileciteturn0file0L46-L57

---

# 32. Machine List UX

Search should:

- Be fast
- Be case-insensitive
- Avoid unnecessary network requests
- Preserve search state when practical

Empty state:

```text
No machines yet

Add your first machine to start
tracking usage history.

[ Add Machine ]
```

---

# 33. Add/Edit Machine

Fields:

```text
Machine Name *
Description
```

Validation:

```text
Machine name is required.
```

Actions:

```text
Cancel
Save
```

Disable Save while submitting.

Prevent duplicate submissions.

---

# 34. Screen 4 — Machine Details / Sections

Display:

```text
Machine Name
Description

Sections

ABC
Side A
Side B
```

Actions:

- Add section
- Edit section
- Delete section
- Open section

The section model is intentionally flexible and can represent sides, components, areas, or other categories. fileciteturn0file0L61-L67

---

# 35. Add/Edit Section

Field:

```text
Section Name *
```

Validation:

```text
Section name is required.
```

Use a polished modal or dedicated form page depending on screen width.

---

# 36. Screen 5 — Section Usage Records

This is the primary operational screen.

Header:

```text
Machine 01
/
Side A
```

Primary action:

```text
+ Add Record
```

Table:

| Name | Date | Usage Days |
|---|---|---:|
| Record A | 02/10/2026 | 10 |
| Record B | 12/10/2026 | 8 |
| Record C | 20/10/2026 | Running |

The three-column structure is part of the original product definition. fileciteturn0file0L71-L74

---

# 37. Mobile Table UX

The table must remain readable on small screens.

Preferred behavior:

- Use a compact responsive table.
- Allow horizontal scrolling when necessary.
- Keep the Name column readable.
- Keep Date visually consistent.
- Keep Usage Days aligned.
- Use a subtle visual treatment for `Running`.
- Avoid excessive card nesting.

Do not turn every row into a giant card.

---

# 38. Usage Record Form

Fields:

```text
Record Name *
Usage Date *
```

Use:

- Date picker
- Clear validation
- Loading state
- Duplicate-date warning
- Save confirmation only when necessary

The original form contains Name and Date as the required record inputs. fileciteturn0file0L74-L75

---

# 39. Edit/Delete Usage Records

Editing:

```text
Name
Date
```

must immediately recalculate affected durations after successful save.

Deleting a record must recalculate the surrounding records.

Example:

Before:

```text
A  → 10 days
B  → 8 days
C  → Running
```

Delete B:

```text
A  → 18 days
C  → Running
```

This behavior is explicitly required by the existing specification. fileciteturn0file0L96-L99

---

# 40. Reports

Every section should expose:

```text
Generate Report
```

Report metadata:

```text
Machine
Section
Generation date/time
```

Table:

```text
Name | Date | Usage Days
```

The report must be identical in business meaning to the on-screen table. fileciteturn0file0L101-L107

---

# 41. PDF Export

Requirements:

- A4
- Professional title
- Machine name
- Section name
- Generated date/time
- Three-column table
- Chronological ordering
- Multi-page support
- Consistent typography
- Repeat table headers on additional pages
- Share/open generated file

Title:

```text
Machine Usage Report
```

Columns:

```text
Name
Date
Usage Days
```

The original requirements define these PDF constraints. fileciteturn0file0L109-L118

---

# 42. Excel Export

Generate:

```text
.xlsx
```

Requirements:

- Machine/section metadata
- Three-column table
- Real Excel date values where practical
- Numeric usage days
- `Running` as text
- Styled header
- Auto-sized columns
- Frozen header row
- Share/open capability

The original Excel requirements specify the same three columns and calculated values. fileciteturn0file0L121-L130

---

# 43. Export Architecture

Create:

```text
lib/core/services/report_service.dart
lib/core/services/pdf_service.dart
lib/core/services/excel_service.dart
```

The report service receives:

```text
Machine
Section
CalculatedUsageRows
```

PDF and Excel services must not independently calculate durations.

---

# 44. UI Design Direction

The interface must be:

- Professional
- Minimal
- Calm
- Modern
- Business-oriented
- Mobile-first
- Accessible
- Consistent

Avoid:

- AI-generated-looking gradients
- Excessive glassmorphism
- Neon colors
- Giant rounded cards
- Excessive shadows
- Decorative animations
- Random icon styles
- Overly playful visuals

Use a restrained visual language.

---

# 45. Color System

Use a neutral foundation.

Recommended:

```text
Background:        neutral / near-white
Surface:           white
Primary:           restrained professional blue
Primary dark:      deeper blue
Text:              dark neutral
Muted text:        medium neutral
Border:            subtle neutral
Success:           restrained green
Warning:           restrained amber
Error:             restrained red
```

Exact values should be defined through the selected theme system rather than scattered through widgets.

---

# 46. Typography

Use a clean modern type hierarchy:

```text
Display
Headline
Title
Body
Label
Caption
```

Avoid too many font sizes.

All typography must be defined centrally.

---

# 47. Iconography

Use one professional icon family.

Recommended:

```text
Material Symbols / Material Icons
```

or another single consistent icon library.

Do not mix:

- random SVG icons
- emoji
- inconsistent icon packs
- outlined + filled icons without a deliberate system

---

# 48. Component System

Create reusable components:

```text
AppButton
AppIconButton
AppTextField
AppDateField
AppCard
AppDialog
AppBottomSheet
AppLoading
AppErrorState
AppEmptyState
AppSectionHeader
AppSearchField
AppConfirmDialog
AppSnackbar
```

Do not duplicate common UI implementation across features.

---

# 49. Bottom Sheet Design

Use bottom sheets for:

- Add/edit actions where appropriate
- Duplicate-date warning
- Update notification
- Secondary actions

Bottom sheets must:

- Respect safe areas
- Support keyboard
- Have proper drag/close behavior
- Have clear action hierarchy
- Avoid excessive rounded corners
- Use consistent spacing
- Work with system back

---

# 50. Loading States

Never leave the user staring at an empty screen.

Use:

```text
Skeleton
Progress indicator
Inline loading
Button loading state
```

Examples:

```text
Loading machines...
Loading sections...
Loading usage history...
Generating report...
Preparing Excel file...
```

---

# 51. Error States

Every network/database operation needs a user-readable error.

Example:

```text
Unable to load machines

Please check your connection and try again.

[ Retry ]
```

Do not expose raw Supabase/Postgres exceptions directly.

Log technical details separately.

---

# 52. Empty States

Machines:

```text
No machines added yet.
Add your first machine to start tracking usage.
```

Sections:

```text
No sections added.
Add a section to start tracking records.
```

Usage:

```text
No usage records available.
Add a record to begin the history.
```

These states are based on the original product requirements. fileciteturn0file0L411-L415

---

# 53. Confirmation Patterns

Require confirmation for destructive actions:

```text
Delete machine?
```

Explain cascade impact:

```text
Deleting this machine will also delete
its sections and usage records.
```

Buttons:

```text
Cancel
Delete
```

Destructive actions must never happen from an accidental tap.

---

# 54. State Management

Use Riverpod.

Recommended layers:

```text
UI
 ↓
Riverpod Provider / Notifier
 ↓
Repository
 ↓
Service
 ↓
Supabase
```

Do not place database calls directly inside widgets.

---

# 55. Repository Architecture

Create:

```text
lib/core/repositories/

machine_repository.dart
section_repository.dart
usage_record_repository.dart
```

Responsibilities:

- CRUD
- Queries
- Realtime stream setup
- Error mapping
- Data transformation

---

# 56. Models

Create:

```text
lib/models/

machine.dart
section.dart
usage_record.dart
calculated_usage_row.dart
```

`CalculatedUsageRow` should represent the presentation/report result.

Example:

```dart
class CalculatedUsageRow {
  final String name;
  final DateTime date;
  final int? usageDays;
  final bool isRunning;
}
```

---

# 57. Feature Structure

Recommended:

```text
lib/
├── app/
│   ├── app.dart
│   └── app_bootstrap.dart
│
├── core/
│   ├── constants/
│   ├── errors/
│   ├── extensions/
│   ├── router/
│   ├── services/
│   ├── theme/
│   ├── utils/
│   └── widgets/
│
├── models/
│
├── data/
│   ├── repositories/
│   └── datasources/
│
├── features/
│   ├── auth/
│   ├── machines/
│   ├── sections/
│   ├── usage_records/
│   ├── reports/
│   └── app_update/
│
└── main.dart
```

This expands the original feature-first structure while preserving its core organization. fileciteturn0file0L191-L217

---

# 58. Data Flow

Example: Add Record

```text
User
 ↓
Record Form
 ↓
Riverpod Notifier
 ↓
Validation
 ↓
UsageRecordRepository
 ↓
Supabase INSERT
 ↓
Realtime event
 ↓
Repository refresh
 ↓
UsageCalculationService
 ↓
Usage Table
```

---

# 59. Delete Flow

```text
User taps Delete
 ↓
Confirmation dialog
 ↓
Repository DELETE
 ↓
Supabase
 ↓
Realtime / refresh
 ↓
Fetch records
 ↓
Sort
 ↓
Recalculate
 ↓
Render updated table
```

---

# 60. Performance Requirements

The application is small, but it must still be efficient.

Requirements:

- Avoid unnecessary rebuilds.
- Use Riverpod selectors where useful.
- Fetch only required columns.
- Use indexed queries.
- Avoid repeatedly fetching parent entities.
- Dispose realtime subscriptions correctly.
- Avoid duplicate update checks.
- Avoid generating PDF/Excel on the UI thread if workloads grow.

---

# 61. Realtime Subscription Rules

Subscribe at the smallest practical scope.

Example:

```text
Usage screen open
    ↓
Subscribe to usage_records for section X
```

Do not subscribe globally to every table on every screen.

Cancel subscriptions when leaving the feature.

---

# 62. Validation

Machine:

```text
Name required
Name cannot be blank
```

Section:

```text
Name required
Name cannot be blank
```

Usage record:

```text
Name required
Date required
Date valid
```

These baseline validations are part of the existing PRD. fileciteturn0file0L419-L423

---

# 63. Error Mapping

Create application-level failures:

```text
AppFailure
 ├── NetworkFailure
 ├── AuthenticationFailure
 ├── DatabaseFailure
 ├── ValidationFailure
 ├── ExportFailure
 ├── UpdateFailure
 └── UnknownFailure
```

UI should map these to human-readable messages.

---

# 64. Logging

Use structured logging in development.

Never log:

- Passwords
- Access tokens
- Refresh tokens
- Service-role credentials
- Sensitive session data

Production logs should remain minimal.

---

# 65. Offline / Network Behavior

MVP is not offline-first.

If there is no network:

```text
Read operation
→ Show connection error / retry
```

Write operation:

```text
Fail clearly
→ Preserve form input
→ Allow retry
```

Do not silently discard unsaved data.

The original product explicitly excludes offline-first synchronization from MVP. fileciteturn0file0L18-L22

---

# 66. Accessibility

Requirements:

- Minimum practical touch target sizes
- Semantic labels
- Screen-reader-friendly buttons
- Sufficient contrast
- Text scaling support
- Do not rely only on color
- Clear error messages
- Keyboard navigation where relevant

---

# 67. Responsive Design

Although mobile-first, support:

```text
Small Android phones
Large Android phones
Android tablets
```

Avoid hard-coded dimensions.

Use:

```text
LayoutBuilder
MediaQuery
SafeArea
Flexible
Expanded
Slivers
```

where appropriate.

---

# 68. App Lifecycle

Handle:

```text
resumed
inactive
paused
detached
```

especially for:

- Update checks
- Realtime connections
- Dialog/bottom-sheet state
- Session state
- Resource cleanup

Do not trigger duplicate update sheets when lifecycle events fire repeatedly.

---

# 69. App Update Session Guard

Maintain an in-memory/session guard:

```text
updatePromptShown = true
```

after the update bottom sheet has been presented.

Reset only when appropriate, such as:

```text
New app session
```

or when a genuinely newer version becomes available.

Do not repeatedly annoy users with the same update.

---

# 70. Play Store Release Strategy

For normal releases:

```text
Build
 ↓
Upload to Play Console
 ↓
Release
 ↓
Play Store processes release
 ↓
Existing app detects update
 ↓
Bottom sheet
 ↓
Flexible update
```

For critical releases:

```text
Release with high update priority
 ↓
Application checks priority/capability
 ↓
Immediate update when appropriate
```

Google Play supports update priority from 0–5, which can be used as part of a release strategy. citeturn0search0

Do not create a custom Supabase version table for this purpose.

---

# 71. Testing the Update System

Test through Google Play distribution.

Test cases:

1. Old version installed.
2. New version published.
3. Open application.
4. Update available.
5. Bottom sheet appears.
6. Tap Later.
7. Continue using app.
8. Reopen/resume.
9. Update can be surfaced again according to session policy.
10. Tap Update Now.
11. Flexible download starts.
12. Progress state is handled.
13. Installation completes.
14. App restarts.
15. New version is running.

Also test:

- No update available
- User cancels
- Play Store unavailable
- API unavailable
- Update already downloaded
- Immediate update unavailable
- Flexible update unavailable

---

# 72. Testing Strategy

## Unit Tests

Test:

```text
UsageCalculationService
Date sorting
Duplicate dates
Running state
Edit recalculation
Delete recalculation
Validation
```

## Widget Tests

Test:

```text
Machine list
Empty states
Forms
Usage table
Dialogs
Bottom sheets
Navigation
```

## Integration Tests

Test:

```text
Login
Create machine
Create section
Create record
Edit record
Delete record
Generate PDF
Generate Excel
Back navigation
Realtime update
```

## Security Tests

Verify:

```text
Unauthenticated user → denied
Authenticated user → CRUD allowed
```

---

# 73. Acceptance Criteria — Core Product

- [ ] User can authenticate.
- [ ] User can view all machines.
- [ ] User can create machines.
- [ ] User can edit machines.
- [ ] User can delete machines.
- [ ] User can create sections.
- [ ] User can edit sections.
- [ ] User can delete sections.
- [ ] User can create usage records.
- [ ] User can edit usage records.
- [ ] User can delete usage records.
- [ ] Records are sorted by date.
- [ ] Latest record displays `Running`.
- [ ] Previous records display numeric day differences.
- [ ] Out-of-order records recalculate correctly.
- [ ] Edited dates recalculate correctly.
- [ ] Deleted records recalculate correctly.
- [ ] Usage days are never authoritative database data.
- [ ] PDF matches UI calculation.
- [ ] Excel matches UI calculation.
- [ ] All authenticated users access shared data.
- [ ] RLS blocks unauthenticated access.
- [ ] Service-role credentials are not shipped.

These criteria extend the original acceptance criteria. fileciteturn0file0L238-L258

---

# 74. Acceptance Criteria — Navigation

- [ ] Login → Machine List works.
- [ ] Machine List → Machine Details works.
- [ ] Machine Details → Section works.
- [ ] Section → Record form works.
- [ ] Android system back works.
- [ ] Gesture back works where supported.
- [ ] Bottom sheet closes before page navigation.
- [ ] Unsaved form changes are protected.
- [ ] No duplicate routes are pushed.
- [ ] Back navigation never unexpectedly exits the app from a nested page.

---

# 75. Acceptance Criteria — Update System

- [ ] No custom update backend exists.
- [ ] No Supabase version table is required.
- [ ] Google Play In-App Updates API is used.
- [ ] App checks for updates after startup/session restoration.
- [ ] App can check again after resume.
- [ ] New update surfaces a polished bottom sheet.
- [ ] Same update is not repeatedly shown in one session.
- [ ] Flexible updates work for ordinary releases.
- [ ] Immediate update can be used for critical releases.
- [ ] Update failures never crash the app.
- [ ] Local/debug builds do not pretend to validate Play Store update behavior.
- [ ] Production update flow is tested using Google Play distribution.

---

# 76. Acceptance Criteria — UX

- [ ] UI is professional and restrained.
- [ ] One coherent component system is used.
- [ ] No excessive gradients.
- [ ] No excessive glassmorphism.
- [ ] No random icon styles.
- [ ] Loading states exist.
- [ ] Empty states exist.
- [ ] Error states exist.
- [ ] Retry actions exist.
- [ ] Destructive actions require confirmation.
- [ ] Forms preserve input after failed requests.
- [ ] Tables remain usable on small screens.
- [ ] Typography is consistent.
- [ ] Theme values are centralized.

---

# 77. Production Project Structure

```text
machine_usage_app/
│
├── android/
├── ios/
├── assets/
│   ├── icons/
│   └── images/
│
├── lib/
│   ├── app/
│   │   ├── app.dart
│   │   └── app_bootstrap.dart
│   │
│   ├── core/
│   │   ├── constants/
│   │   ├── errors/
│   │   ├── extensions/
│   │   ├── router/
│   │   ├── services/
│   │   ├── theme/
│   │   ├── utils/
│   │   └── widgets/
│   │
│   ├── data/
│   │   ├── datasources/
│   │   └── repositories/
│   │
│   ├── models/
│   │   ├── machine.dart
│   │   ├── section.dart
│   │   ├── usage_record.dart
│   │   └── calculated_usage_row.dart
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── machines/
│   │   ├── sections/
│   │   ├── usage_records/
│   │   ├── reports/
│   │   └── app_update/
│   │
│   └── main.dart
│
├── test/
│   ├── unit/
│   ├── widget/
│   └── integration/
│
├── supabase/
│   └── migrations/
│
├── .env.example
├── analysis_options.yaml
├── pubspec.yaml
└── README.md
```

---

# 78. Supabase Migration Plan

Create migrations in order:

```text
001_create_machines.sql
002_create_sections.sql
003_create_usage_records.sql
004_create_indexes.sql
005_enable_rls.sql
006_create_rls_policies.sql
007_enable_realtime.sql
```

Do not manually modify production schema without migration history.

---

# 79. Environment Configuration

Use environment configuration for:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

Production secrets must never be committed.

`.env.example` should contain placeholders only.

---

# 80. CI/CD Quality Gates

Before production release:

```text
flutter format --set-exit-if-changed .
flutter analyze
flutter test
flutter test integration_test
```

Also perform:

```text
Release build
APK/AAB verification
Play Console upload validation
```

No release should be considered production-ready if static analysis or tests fail.

---

# 81. Release Checklist

## Backend

- [ ] Supabase project configured
- [ ] Database migrations applied
- [ ] RLS enabled
- [ ] RLS policies tested
- [ ] Realtime configured
- [ ] Auth configured

## Flutter

- [ ] Production theme finalized
- [ ] Navigation finalized
- [ ] Error handling finalized
- [ ] Loading states finalized
- [ ] Empty states finalized
- [ ] PDF export tested
- [ ] Excel export tested
- [ ] Share functionality tested
- [ ] Update service tested

## Android

- [ ] Application ID finalized
- [ ] Signing configured
- [ ] Release keystore secured
- [ ] Version name configured
- [ ] Version code incremented
- [ ] AAB generated
- [ ] Play Console upload completed

## QA

- [ ] Fresh install tested
- [ ] Upgrade tested
- [ ] Back navigation tested
- [ ] Rotation/configuration behavior reviewed
- [ ] Realtime behavior tested
- [ ] Network failure tested
- [ ] Export tested
- [ ] Update flow tested through Play Store

---

# 82. Development Phases

## Phase 1 — Backend

```text
Supabase project
Database schema
Relationships
Indexes
RLS
Authentication
Realtime
```

## Phase 2 — Flutter Foundation

```text
Flutter project
Theme
Routing
Supabase integration
Riverpod
Error system
Reusable components
```

## Phase 3 — Authentication

```text
Login
Session restoration
Logout
Auth route guard
```

## Phase 4 — Machines

```text
Machine list
Search
CRUD
Realtime
Empty/loading/error states
```

## Phase 5 — Sections

```text
Section list
CRUD
Navigation
Realtime
```

## Phase 6 — Usage

```text
Record CRUD
Date picker
Sorting
Duplicate warning
Usage calculation
Realtime
```

## Phase 7 — Reports

```text
PDF
Excel
Preview/share
Error handling
```

## Phase 8 — Update System

```text
Play In-App Updates
Update service
Bottom sheet
Flexible flow
Immediate flow
Lifecycle handling
```

## Phase 9 — QA

```text
Unit tests
Widget tests
Integration tests
Security tests
Play Store testing
```

## Phase 10 — Production

```text
Release build
Play Console
Production rollout
Monitoring
Post-release verification
```

---

# 83. Definition of Done

The application is production-ready only when:

```text
Functional requirements
        +
Security
        +
Navigation
        +
UX
        +
Realtime
        +
Exports
        +
Testing
        +
Play Store update flow
        +
Release validation
```

are all complete.

A feature is not complete merely because it works on a developer's device.

---

# 84. Final Architecture

```text
                    ┌─────────────────────┐
                    │     Flutter App     │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
     Riverpod             GoRouter             Theme/UI
          │                    │                    │
          ▼                    ▼                    ▼
     Repositories        Navigation          Components
          │
          ▼
     Supabase SDK
          │
     ┌────┴───────────────┐
     │                    │
     ▼                    ▼
 PostgreSQL             Auth
     │
     ├── machines
     ├── sections
     └── usage_records
     │
     └── Realtime
```

Update system:

```text
Flutter App
     │
     ▼
AppUpdateService
     │
     ▼
Google Play In-App Updates
     │
     ├── Flexible Update
     └── Immediate Update
```

No custom update backend is required.

---

# 85. Final Product Flow

```text
App Launch
   ↓
Session Restore
   ↓
Update Check ──────────────┐
   ↓                      │
Authentication             │
   ↓                      │
Machine List               │
   ↓                      │
Select Machine             │
   ↓                      │
Machine Sections           │
   ↓                      │
Select Section             │
   ↓                      │
Usage Table                │
   ↓                      │
Add / Edit / Delete        │
   ↓                      │
Automatic Calculation      │
   ↓                      │
Generate Report            │
   ├── PDF                 │
   └── Excel               │
                          │
New Play Store Version ───┘
   ↓
Update Bottom Sheet
   ↓
Google Play Native Update
```

---

# 86. Final Implementation Directive

Build this application from scratch as a production-grade Flutter application.

Do not treat this document as a loose feature list.

Treat every section as an implementation requirement.

The implementation must:

1. Preserve the original Machine → Section → Usage Record business model.
2. Preserve shared authenticated access.
3. Preserve automatic chronological usage-day calculation.
4. Preserve PDF and Excel reporting.
5. Add professional GoRouter-based navigation.
6. Add reliable Android system/gesture back behavior.
7. Add unsaved-form protection.
8. Add polished reusable UI components.
9. Use one coherent UI design system from the provided library options.
10. Add Google Play native in-app update support.
11. Show an application-owned bottom sheet whenever a new Play Store version is detected, subject to Play API availability and session throttling.
12. Use flexible updates for normal releases.
13. Support immediate updates for critical releases.
14. Never build a separate version/update backend.
15. Never expose Supabase service-role credentials.
16. Use Supabase RLS as the database security boundary.
17. Keep usage-day calculation centralized.
18. Ensure UI/PDF/Excel use the same calculated result.
19. Handle loading, empty, error, retry, and destructive states professionally.
20. Test the application end-to-end before declaring it production-ready.

The final result should feel like a reliable professional business application built for real daily use, not a prototype or a generated demo.

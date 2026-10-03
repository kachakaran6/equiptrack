# EquipTrack — Machine Lifecycle & Usage Tracking Application

Production-ready Flutter mobile application backed by a dedicated, lightweight **Fastify + TypeScript + PostgreSQL** REST API backend with strict user data isolation.

---

## 🏗 Architecture Overview

```text
Flutter Mobile App (Android / iOS / Web)
       │
       │ HTTPS REST API + Bearer JWT
       ▼
Fastify + TypeScript API Gateway (Port 3000)
       │
       │ Native PostgreSQL Driver (pg with Connection Pool)
       ▼
PostgreSQL Database
```

- **Client:** Flutter 3.44.8+ / Dart 3.12.2+ with Riverpod state management & GoRouter navigation.
- **Backend:** Node.js + Fastify + TypeScript + Zod validation.
- **Database:** PostgreSQL directly via `pg` connection pool with granular foreign keys, indexes, and parameterized queries.
- **Security:** 100% strict user data isolation. Ownership (`user_id = $1`) is verified on every query using the cryptographically verified JWT token.

---

## 📂 Project Structure

```text
EquipTrack/
├── backend/                          # Fastify + TypeScript + PostgreSQL API
│   ├── migrations/                   # SQL schema migrations (001 to 006)
│   ├── src/
│   │   ├── config/                   # Environment & runtime config
│   │   ├── db/                       # Database connection pool & migrator
│   │   ├── middleware/               # JWT authentication guard
│   │   ├── modules/                  # Auth, Machines, Sections, Usage-Records, Reports
│   │   └── server.ts                 # Fastify server entry
│   ├── tests/                        # Data isolation & IDOR automated tests
│   └── package.json
├── lib/                              # Flutter Application
│   ├── app/                          # App root & bootstrap lifecycle
│   ├── core/
│   │   ├── constants/                # App spacing, keys, constants
│   │   ├── errors/                   # Typed AppFailure hierarchy
│   │   ├── network/                  # ApiClient with secure token storage
│   │   ├── router/                   # GoRouter configuration
│   │   ├── services/                 # Calculations, PDF, Excel, In-App Update
│   │   ├── theme/                    # App colors, typography, themes
│   │   └── widgets/                  # Reusable UI components
│   ├── data/
│   │   └── repositories/             # REST API repositories (Auth, Machine, Section, Records)
│   ├── features/                     # Feature modules (Auth, Machines, Sections, Usage, Reports)
│   ├── models/                       # Domain entities
│   └── main.dart                     # Flutter entrypoint
├── test/
│   ├── unit/                         # Unit tests (calculations, models, services)
│   └── widget/                       # Widget tests (components, login, tables)
├── .env.example
├── analysis_options.yaml
└── pubspec.yaml
```

---

## 🔒 Strict User Data Isolation & Ownership

- **Client ID Agnostic:** Flutter never passes client-claimed `user_id` to authorization queries. The backend extracts `req.user.id` solely from the verified JWT.
- **Enforced at Database Layer:** Every single `SELECT`, `INSERT`, `UPDATE`, and `DELETE` explicitly filters by `user_id = $1`.
- **IDOR Protection:** Accessing, updating, or deleting any machine, component, or record that belongs to another user returns `404 Not Found`.

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

## 🚀 Getting Started

### 1. Start the Backend & PostgreSQL

```bash
cd backend
npm install
cp .env.example .env
# Configure DATABASE_URL and JWT_SECRET in .env
npm run migrate
npm run dev
```

Run backend tests:
```bash
npm test
```

### 2. Configure & Run Flutter

```bash
# In the root directory:
cp .env.example .env
# Set API_BASE_URL=http://10.0.2.2:3000 (Android Emulator) or http://localhost:3000 (Web/Desktop)
flutter pub get
flutter run
```

Run Flutter tests and analysis:
```bash
flutter analyze
flutter test
```

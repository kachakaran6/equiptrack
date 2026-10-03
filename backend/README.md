# EquipTrack Private Backend

Lightweight, high-performance Fastify + TypeScript + PostgreSQL REST API backend with strict user-level data isolation.

## 🏗 Technology Stack

- **Runtime:** Node.js (v20+)
- **Framework:** Fastify v5
- **Language:** TypeScript
- **Database:** PostgreSQL (accessed via native `pg` connection pooling)
- **Authentication:** JWT with Bearer tokens (`@fastify/jwt`)
- **Password Security:** Salted BCrypt hashing (Argon2id compatible)
- **Validation:** Zod request schema validation & parameterized SQL queries
- **Security:** `@fastify/cors`, `@fastify/rate-limit`, IDOR prevention on all entities

---

## 🔒 User Data Isolation & Security Model

- **Zero Trust Client Identity:** Client-provided user IDs are never trusted. All database queries extract the user ID exclusively from the cryptographically verified JWT payload (`req.user.id`).
- **Explicit Ownership:** Every SQL query explicitly enforces `WHERE user_id = $1`.
- **IDOR Protection:** Attempting to view, update, or delete another user's machine, section, or record returns `404 Not Found` without leaking data or entity existence.
- **Cascading Integrity:** Foreign keys with `ON DELETE CASCADE` ensure that deleting a machine or section cleans up child records while respecting ownership boundaries.

---

## 📂 Project Structure

```text
backend/
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_machines.sql
│   ├── 003_create_sections.sql
│   ├── 004_create_usage_records.sql
│   ├── 005_create_indexes.sql
│   └── 006_create_constraints.sql
├── src/
│   ├── config/
│   │   └── env.ts
│   ├── db/
│   │   ├── pool.ts
│   │   └── migrate.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.service.ts
│   │   ├── machines/
│   │   │   ├── machines.routes.ts
│   │   │   └── machines.service.ts
│   │   ├── sections/
│   │   │   ├── sections.routes.ts
│   │   │   └── sections.service.ts
│   │   ├── usage-records/
│   │   │   ├── usage-records.routes.ts
│   │   │   └── usage-records.service.ts
│   │   └── reports/
│   │       └── reports.routes.ts
│   ├── utils/
│   │   └── crypto.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   └── data-isolation.test.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Setup & Execution

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Create `.env` based on `.env.example`:
```env
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgres://equiptrack_user:password@localhost:5432/equiptrack
JWT_SECRET=your_ultra_secure_jwt_secret_at_least_32_characters_long
NODE_ENV=development
```

### 3. Run Database Migrations
```bash
npm run migrate
```

### 4. Run Automated Data Isolation & Security Tests
```bash
npm test
```

### 5. Start Development Server
```bash
npm run dev
```

### 6. Build & Run in Production
```bash
npm run build
npm start
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` — Register new user account
- `POST /api/auth/login` — Authenticate and receive JWT access token
- `GET /api/auth/me` — Retrieve current authenticated user profile
- `POST /api/auth/logout` — Logout user session

### Machines
- `GET /api/machines` — List all machines owned by authenticated user
- `POST /api/machines` — Create machine
- `GET /api/machines/:id` — Get machine details (enforces ownership)
- `PATCH /api/machines/:id` — Update machine details (enforces ownership)
- `DELETE /api/machines/:id` — Delete machine and cascade children

### Sections / Components
- `GET /api/machines/:machineId/sections` — List sections for owned machine
- `POST /api/machines/:machineId/sections` — Create section under owned machine
- `GET /api/sections/:id` — Get section details (enforces ownership)
- `PATCH /api/sections/:id` — Update section (enforces ownership)
- `DELETE /api/sections/:id` — Delete section and cascade usage records

### Usage Records
- `GET /api/sections/:sectionId/usage-records` — List usage records for owned section
- `POST /api/sections/:sectionId/usage-records` — Create usage record
- `GET /api/usage-records/:id` — Get usage record (enforces ownership)
- `PATCH /api/usage-records/:id` — Update usage record (enforces ownership)
- `DELETE /api/usage-records/:id` — Delete usage record (enforces ownership)

### Reports & Health
- `GET /api/reports/summary` — Aggregate summary stats for authenticated user
- `GET /health` — Health check probe

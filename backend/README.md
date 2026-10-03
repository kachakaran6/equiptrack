# EquipTrack Private Backend

Lightweight, high-performance Fastify + TypeScript + PostgreSQL REST API backend with strict user-level data isolation, containerized for one-click **Coolify** deployment.

## 🏗 Technology Stack

- **Runtime:** Node.js (v22 LTS Alpine Container)
- **Framework:** Fastify v5
- **Language:** TypeScript
- **Database:** PostgreSQL (accessed via native `pg` connection pooling)
- **Authentication:** JWT with Bearer tokens (`@fastify/jwt`)
- **Password Security:** Salted BCrypt hashing (Argon2id compatible)
- **Deployment Platform:** Coolify (Multi-stage Dockerfile / Docker Compose)
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
├── Dockerfile                        # Production multi-stage Docker build
├── docker-compose.yml                # Coolify / local stack orchestration
├── .dockerignore                     # Build context exclusions
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
├── scripts/
│   ├── backup.sh                     # Automated PostgreSQL backup
│   ├── restore.sh                    # Automated PostgreSQL restore
│   └── migrate-from-supabase/        # Supabase data migration tooling
├── tests/
│   ├── data-isolation.test.ts        # IDOR & cross-user isolation suite
│   └── migration-integrity.test.ts   # Relational & ownership test suite
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 🚀 Coolify & Docker Deployment

For complete, step-by-step Coolify deployment instructions, see [docs/COOLIFY_DEPLOYMENT.md](file:///d:/Machine/docs/COOLIFY_DEPLOYMENT.md).

### Quick Local Docker Start
```bash
docker compose up -d --build
```

### Manual Development Setup
```bash
npm install
npm run migrate
npm run dev
```

### Run Tests
```bash
npm test
```

---

## 📡 API Endpoints

### Health & Monitoring
- `GET /health` — Coolify health check & uptime probe (returns 200 OK + database status)

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

### Reports
- `GET /api/reports/summary` — Aggregate summary stats for authenticated user

# EquipTrack — Administrative Control Panel

Professional, minimal, high-performance web control console for the EquipTrack platform. Built with **React 19**, **TypeScript**, **Vite**, and **shadcn/ui** with a strict monochrome developer-console design system.

---

## 🛠️ Architecture & Security Principles

- **Zero Direct Database Connections**: The admin panel communicates exclusively through authorized backend REST APIs (`/api/admin/*`, `/api/auth/*`). No database credentials or connection strings exist on the frontend.
- **Strict Role Enforcement**: Enforces `ADMIN` role JWTs on all operational routes with automatic session revocation and audit logging on the backend.
- **Controlled Metadata & Safe CRUD**: Database browsing and CRUD operations execute through allowlisted schema endpoints without arbitrary SQL execution.
- **Redacted Diagnostics**: Server stack traces, bot tokens, and sensitive headers are sanitized before client rendering.

---

## 🚀 Local Development

### 1. Prerequisites
- Node.js 20+
- Running EquipTrack Backend API (`http://localhost:3000`)

### 2. Installation & Startup
```bash
cd admin-panel
npm install
npm run dev
```

The admin panel will be accessible at: `http://localhost:5173`

Vite proxies `/api/*` calls automatically to `http://localhost:3000`.

---

## 🐳 Docker & Coolify Deployment

### 1. Build and Run via Docker Locally
```bash
docker build -t equiptrack-admin-panel .
docker run -p 8080:80 equiptrack-admin-panel
```

### 2. Coolify Production Deployment
1. In Coolify dashboard, select **Add Resource** &rarr; **Application** &rarr; **Git Repository**.
2. Configure:
   - **Repository**: Your GitHub repository.
   - **Branch**: `master`
   - **Base Directory**: `/admin-panel`
   - **Build Pack**: `Dockerfile`
   - **Port**: `80`
3. Environment Variables:
   ```env
   VITE_API_BASE_URL=https://rnienon3ddqefpnpr3easjfk.kachakaran.me
   ```
4. Click **Deploy**.
5. Once deployed, assign your production custom domain (e.g. `admin.equiptrack.internal` or `https://admin.kachakaran.me`).

---

## 📋 Feature Directory

| Route | Feature Scope |
|---|---|
| `/login` | Secure administrator authentication & role check |
| `/` | System overview, entity counts, health indicators & activity trail |
| `/users` | User management, roles (`ADMIN`/`USER`), status, password resets |
| `/users/:id` | Detailed user account profile, activity, and audit logs |
| `/machines` | Equipment catalog, serial codes, locations, and descriptions |
| `/sections` | Sub-assemblies and machine component hierarchies |
| `/usage-records` | Operating run logs, date range calculations, and operator tags |
| `/errors` | System exception logs, sanitized stack traces, and severity filters |
| `/audit-logs` | Immutable audit trail of all administrative actions |
| `/database` | Dynamic database table explorer with row & column counts |
| `/database/:table` | Real-time table browser with schema metadata & safe CRUD |
| `/backups` | On-demand snapshots (SQL, JSON, CSV, ZIP) & Telegram sync |
| `/backups/telegram` | Telegram bot token & chat delivery configuration |
| `/backups/schedule` | Automated cron schedule and retention policy configuration |
| `/backups/history` | Historical archive of all backups, checksums, and sizes |
| `/system` | Live server telemetry, Node.js process heap, and DB diagnostics |
| `/settings` | Session state, security parameters, and API configuration |

# 🚀 Coolify Production Deployment Guide for EquipTrack

This guide provides end-to-end instructions for deploying the **EquipTrack Fastify + TypeScript + PostgreSQL** backend on **Coolify**.

---

## 🏛️ Deployment Architecture Overview

```text
                        Public Internet
                               │
                               │ HTTPS / TLS (Managed by Coolify Proxy)
                               ▼
               ┌───────────────────────────────┐
               │     Coolify Traefik Proxy     │
               │   (e.g., api.yourdomain.com)  │
               └───────────────┬───────────────┘
                               │
                               │ Container Network
                               ▼
               ┌───────────────────────────────┐
               │    Fastify Backend (Docker)   │
               │         Port: 3000            │
               │     Health: GET /health       │
               └───────────────┬───────────────┘
                               │
                               │ Private Internal Docker Network
                               ▼
               ┌───────────────────────────────┐
               │     PostgreSQL 17 Database    │
               │     (Port 5432 - Internal)    │
               │     Persistent Volume: data   │
               └───────────────────────────────┘
```

---

## 🛠️ Step-by-Step Deployment Instructions

### Step 1: Provision PostgreSQL in Coolify

1. Log into your **Coolify Dashboard**.
2. Navigate to your **Project** ➔ **Environment** (e.g., `Production`).
3. Click **+ New Resource** ➔ Select **Databases** ➔ **PostgreSQL**.
4. Configure database settings:
   - **Database Name:** `equiptrack`
   - **User:** `postgres` (or a custom username)
   - **Password:** Generate a strong 32+ character password.
5. Click **Deploy**.
6. Once deployed, copy the **Internal Connection String** (e.g., `postgres://postgres:password@<container_name>:5432/equiptrack`).

---

### Step 2: Deploy the Fastify API Service

1. In the same Coolify project environment, click **+ New Resource** ➔ **Public Repository** or **GitHub App**.
2. Select your repository: `https://github.com/kachakaran6/equiptrack.git`.
3. Set the deployment configuration:
   - **Branch:** `master` (or `main`)
   - **Build Pack:** `Dockerfile`
   - **Base Directory:** `/backend`
   - **Dockerfile Location:** `/Dockerfile`
   - **Exposed Port:** `3000`
4. In **Domains**, configure your custom API domain:
   - Example: `https://api.yourdomain.com`
   - Coolify will automatically provision and renew a free Let's Encrypt SSL/TLS certificate.

---

### Step 3: Configure Environment Variables in Coolify

Navigate to the **Environment Variables** tab of the API service in Coolify and configure:

| Variable Name | Value / Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | `production` |
| `PORT` | `3000` | `3000` |
| `HOST` | `0.0.0.0` | `0.0.0.0` |
| `DATABASE_URL` | Coolify Internal PostgreSQL URL | `postgres://postgres:password@equiptrack-postgres:5432/equiptrack` |
| `JWT_SECRET` | Strong 64-character random string | `e1f0c2a...` |
| `JWT_EXPIRES_IN` | Token lifespan | `7d` |
| `CORS_ORIGINS` | Permitted origins or `*` | `*` or `https://app.yourdomain.com` |

> 🔒 **Security Notice:** Never commit actual production secrets to Git. Coolify encrypts and injects these variables securely at container runtime.

---

### Step 4: Configure Health Checks

In the Coolify service settings:
- **Health Check Path:** `/health`
- **Port:** `3000`
- **Initial Delay:** `10 seconds`
- **Interval:** `30 seconds`
- **Timeout:** `5 seconds`

---

### Step 5: Run Database Migrations & Initial Setup

The Fastify application automatically executes any pending SQL migrations on startup safely (`CREATE TABLE IF NOT EXISTS` + `schema_migrations` tracker).

To run migrations manually or execute data imports from the Coolify Terminal/Console:

1. Click the **Execute Command** / **Terminal** tab for the API container in Coolify.
2. Run migrations:
   ```bash
   node dist/src/db/migrate.js
   ```
3. (Optional) Run live Supabase migration if migrating initial production dataset:
   ```bash
   node dist/scripts/migrate-from-supabase/migrate.js
   ```

---

### Step 6: Verify Deployment

1. **Test Health Endpoint:**
   ```bash
   curl -i https://api.yourdomain.com/health
   ```
   *Expected Response (`200 OK`):*
   ```json
   {
     "status": "ok",
     "service": "equiptrack-api",
     "version": "1.0.0",
     "uptime": 45,
     "database": "connected",
     "timestamp": "2026-10-03T17:30:00.000Z"
   }
   ```

2. **Test User Authentication:**
   ```bash
   curl -X POST https://api.yourdomain.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"karan@gmail.com","password":"EquipTrack@2026!"}'
   ```

---

### Step 7: Update Flutter Client

In your Flutter app configuration ([.env](file:///d:/Machine/.env)):

```env
API_BASE_URL=https://api.yourdomain.com
```

Rebuild the Flutter APK / Web bundle:
```bash
flutter build apk --release
```

---

## 💾 Backup & Disaster Recovery Strategy

### Automated Coolify Backups (Recommended)
1. Go to your **PostgreSQL Database resource** in Coolify.
2. Select the **Backups** tab.
3. Enable **Automated Daily Backups** (e.g., at `02:00 UTC`).
4. Set retention to **14 days**.
5. Specify target storage: Local directory or S3-compatible bucket (AWS, Cloudflare R2, MinIO).

### Manual CLI Backup
Run from a machine with access or container terminal:
```bash
./backend/scripts/backup.sh ./backups
```

### Restore Database from Backup
```bash
DATABASE_URL="postgres://postgres:password@localhost:5432/equiptrack" ./backend/scripts/restore.sh ./backups/equiptrack_backup_20261003_120000.sql.gz
```

---

## 🔄 Rollback & Maintenance Procedures

1. **Zero-Downtime Updates:**
   - Coolify uses rolling deployment: it builds the new container, verifies the `/health` endpoint is passing, and only then terminates the old container.
2. **Graceful Shutdown:**
   - When updating or stopping, the API intercepts `SIGTERM` and `SIGINT`, finishes pending HTTP requests, closes the PostgreSQL connection pool, and shuts down cleanly without dropping transactions.
3. **Rollback to Previous Commit:**
   - In Coolify, navigate to **Deployments** ➔ Click on any previously successful deployment ➔ Select **Redeploy**.

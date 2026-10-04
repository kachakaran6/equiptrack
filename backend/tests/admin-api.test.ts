import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { buildApp } from '../src/app.js';
import * as db from '../src/db/index.js';
import { stopBackupScheduler } from '../src/modules/backup/backup.scheduler.js';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory harness for admin/backup tests (extended from base harness)
// ─────────────────────────────────────────────────────────────────────────────

class AdminTestHarness {
  users: Array<{
    id: string; email: string; password_hash: string;
    role: string; status: string; created_at: string; updated_at: string;
  }> = [];
  auditLogs: Array<{ id: string; action: string; user_id: string | null; created_at: string }> = [];
  backupHistory: Array<{ id: string; status: string; format: string; created_at: string }> = [];
  backupConfig: Array<{
    id: number; enabled: boolean; cron_expression: string; timezone: string;
    format: string; compression: string; retention_days: number;
    telegram_chat_id: string | null; telegram_enabled: boolean; updated_at: string;
  }> = [];

  reset() {
    this.users = [];
    this.auditLogs = [];
    this.backupHistory = [];
    this.backupConfig = [
      {
        id: 1, enabled: true, cron_expression: '0 2 * * *', timezone: 'Asia/Kolkata',
        format: 'sql', compression: 'gzip', retention_days: 30,
        telegram_chat_id: null, telegram_enabled: false,
        updated_at: new Date().toISOString(),
      },
    ];
  }

  async mockQuery(text: string, params: any[] = []): Promise<any> {
    const sql = text.trim().replace(/\s+/g, ' ');

    // Auth: check duplicate email
    if (sql.includes('SELECT id FROM users WHERE email = $1')) {
      const found = this.users.filter((u) => u.email === params[0]);
      return { rows: found, rowCount: found.length };
    }

    // Auth: insert user
    if (sql.includes('INSERT INTO users (email, password_hash)')) {
      const role = 'user';
      const newUser = {
        id: `user-${Date.now()}-${this.users.length}`,
        email: params[0], password_hash: params[1],
        role, status: 'active',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      this.users.push(newUser);
      return { rows: [newUser], rowCount: 1 };
    }

    // Auth: login check
    if (sql.includes('SELECT id, email, password_hash, role, status FROM users WHERE email = $1')) {
      const found = this.users.filter((u) => u.email === params[0]);
      return { rows: found, rowCount: found.length };
    }

    // Auth: /me
    if (sql.includes('SELECT id, email, role, created_at FROM users WHERE id = $1')) {
      const found = this.users.filter((u) => u.id === params[0]);
      return { rows: found, rowCount: found.length };
    }

    // Admin middleware: check role from DB
    if (sql.includes('SELECT role, status FROM users WHERE id = $1')) {
      const found = this.users.filter((u) => u.id === params[0]);
      return { rows: found, rowCount: found.length };
    }

    // Admin: count users
    if (sql.includes('SELECT COUNT(*) FROM users')) {
      if (sql.includes("role = 'admin'")) {
        const count = this.users.filter(u => u.role === 'admin').length;
        return { rows: [{ count: String(count) }], rowCount: 1 };
      }
      return { rows: [{ count: String(this.users.length) }], rowCount: 1 };
    }

    // Admin: get single user
    if (sql.includes('FROM users WHERE id = $1')) {
      const found = this.users.filter((u) => u.id === params[0]);
      return { rows: found.map(u => ({ id: u.id, email: u.email, role: u.role, status: u.status, created_at: u.created_at, updated_at: u.updated_at })), rowCount: found.length };
    }

    // Admin: list users
    if (sql.includes('SELECT id, email, role, status, created_at, updated_at') && sql.includes('FROM users')) {
      const page_users = this.users.map(u => ({
        id: u.id, email: u.email, role: u.role, status: u.status,
        created_at: u.created_at, updated_at: u.updated_at,
      }));
      return { rows: page_users, rowCount: page_users.length };
    }

    // Admin: update role
    if (sql.includes('UPDATE users SET role = $1')) {
      const idx = this.users.findIndex(u => u.id === params[1]);
      if (idx === -1) return { rows: [], rowCount: 0 };
      this.users[idx].role = params[0];
      return { rows: [this.users[idx]], rowCount: 1 };
    }

    // Admin: update status
    if (sql.includes('UPDATE users SET status = $1')) {
      const idx = this.users.findIndex(u => u.id === params[1]);
      if (idx === -1) return { rows: [], rowCount: 0 };
      this.users[idx].status = params[0];
      return { rows: [this.users[idx]], rowCount: 1 };
    }

    // Admin: delete user
    if (sql.includes('DELETE FROM users WHERE id = $1')) {
      const idx = this.users.findIndex(u => u.id === params[0]);
      if (idx === -1) return { rows: [], rowCount: 0 };
      const deleted = this.users.splice(idx, 1);
      return { rows: deleted, rowCount: 1 };
    }

    // Audit log insert
    if (sql.includes('INSERT INTO audit_logs')) {
      const log = {
        id: `audit-${Date.now()}-${this.auditLogs.length}`,
        action: params[2] ?? 'unknown',
        user_id: params[0] ?? null,
        created_at: new Date().toISOString(),
      };
      this.auditLogs.push(log);
      return { rows: [log], rowCount: 1 };
    }

    // Audit log list count
    if (sql.includes('COUNT(*) as count FROM audit_logs')) {
      return { rows: [{ count: String(this.auditLogs.length) }], rowCount: 1 };
    }

    // Audit log list rows
    if (sql.includes('FROM audit_logs')) {
      return { rows: this.auditLogs, rowCount: this.auditLogs.length };
    }

    // Backup config select
    if (sql.includes('SELECT * FROM backup_config WHERE id = 1')) {
      const conf = this.backupConfig.find(c => c.id === 1);
      return { rows: conf ? [conf] : [], rowCount: conf ? 1 : 0 };
    }

    // Backup config update
    if (sql.includes('UPDATE backup_config SET') && sql.includes('WHERE id =')) {
      const conf = this.backupConfig.find(c => c.id === 1);
      if (conf) conf.updated_at = new Date().toISOString();
      return { rows: conf ? [conf] : [], rowCount: conf ? 1 : 0 };
    }

    // Backup history insert
    if (sql.includes('INSERT INTO backup_history')) {
      const entry = {
        id: `backup-${Date.now()}`,
        status: 'started',
        format: params[0] ?? 'sql',
        created_at: new Date().toISOString(),
      };
      this.backupHistory.push(entry);
      return { rows: [{ id: entry.id }], rowCount: 1 };
    }

    // Backup history update (complete/fail)
    if (sql.includes('UPDATE backup_history SET status')) {
      const id = params[params.length - 1];
      const entry = this.backupHistory.find(b => b.id === id);
      if (entry) entry.status = params[0];
      return { rows: [], rowCount: 1 };
    }

    // Backup history select
    if (sql.includes('FROM backup_history')) {
      if (sql.includes('COUNT(*)')) {
        return { rows: [{ count: String(this.backupHistory.length) }], rowCount: 1 };
      }
      return { rows: this.backupHistory, rowCount: this.backupHistory.length };
    }

    // System/health
    if (sql.includes('SELECT 1')) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }

    // Error logs
    if (sql.includes('INSERT INTO error_logs') || sql.includes('SELECT') && sql.includes('error_logs')) {
      return { rows: [], rowCount: 0 };
    }

    // Default fallback
    return { rows: [], rowCount: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe('Admin API & Security Tests', () => {
  const harness = new AdminTestHarness();
  let app: any;
  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let regularUserId: string;

  before(async () => {
    harness.reset();
    db.setCustomQueryHandler(harness.mockQuery.bind(harness));
    app = buildApp();
    await app.ready();

    // Register admin user (we'll manually promote below)
    const adminReg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'admin@equiptrack.test', password: 'Admin123!@#' },
    });
    assert.strictEqual(adminReg.statusCode, 201);
    const adminData = JSON.parse(adminReg.payload);
    adminId = adminData.data.user.id;

    // Manually set admin role in harness
    const adminUser = harness.users.find(u => u.id === adminId);
    if (adminUser) adminUser.role = 'admin';

    // Login as admin to get token with admin role
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@equiptrack.test', password: 'Admin123!@#' },
    });
    assert.strictEqual(adminLogin.statusCode, 200);
    adminToken = JSON.parse(adminLogin.payload).data.token;

    // Register regular user
    const userReg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'user@equiptrack.test', password: 'User123!@#' },
    });
    assert.strictEqual(userReg.statusCode, 201);
    regularUserId = JSON.parse(userReg.payload).data.user.id;

    const userLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'user@equiptrack.test', password: 'User123!@#' },
    });
    userToken = JSON.parse(userLogin.payload).data.token;
  });

  after(async () => {
    await stopBackupScheduler();
    db.setCustomQueryHandler(null);
    await app.close();
  });

  // ── Security Tests ─────────────────────────────────────────────────────────

  test('1. SECURITY: Normal user cannot access /api/admin/* (403 Forbidden)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/system',
      headers: { authorization: `Bearer ${userToken}` },
    });
    assert.strictEqual(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, false);
  });

  test('2. SECURITY: Unauthenticated request to admin returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
    });
    assert.strictEqual(res.statusCode, 401);
  });

  test('3. SECURITY: Invalid token to admin endpoint returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/system',
      headers: { authorization: 'Bearer invalid.token.here' },
    });
    assert.strictEqual(res.statusCode, 401);
  });

  // ── Admin Access Tests ──────────────────────────────────────────────────────

  test('4. ADMIN: Admin can access /api/admin/system', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/system',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.application);
    assert.ok(body.data.nodeVersion);
    assert.ok(body.data.uptimeSeconds !== undefined);
    // Must NOT expose JWT_SECRET or DATABASE_URL
    assert.strictEqual(JSON.stringify(body).includes('JWT_SECRET'), false);
    assert.strictEqual(JSON.stringify(body).includes('password'), false);
  });

  test('5. ADMIN: Admin can list users with pagination', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users?page=1&limit=10',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    // Must never return password hashes
    for (const user of body.data) {
      assert.ok(!user.password_hash, 'password_hash must not be returned');
    }
    assert.ok(body.pagination);
  });

  test('6. ADMIN: Admin can get single user by ID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/admin/users/${regularUserId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.data.id, regularUserId);
    assert.ok(!body.data.password_hash);
  });

  test('7. ADMIN: Admin can update user role', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${regularUserId}/role`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'admin' },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.data.role, 'admin');
  });

  test('8. ADMIN: Cannot demote last remaining admin (safety guard)', async () => {
    // Ensure only one admin
    const adminUser = harness.users.find(u => u.id === adminId)!;
    const prevRole = harness.users.find(u => u.id === regularUserId)!.role;
    harness.users.find(u => u.id === regularUserId)!.role = 'user';

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${adminId}/role`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'user' },
    });
    assert.strictEqual(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.error?.message?.includes('last remaining admin'));

    // Keep regular user role as 'user' for subsequent tests
    harness.users.find(u => u.id === regularUserId)!.role = 'user';
  });

  test('9. ADMIN: Admin can suspend a user', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${regularUserId}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'suspended' },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(JSON.parse(res.payload).data.status, 'suspended');
    // Restore
    harness.users.find(u => u.id === regularUserId)!.status = 'active';
  });

  test('10. ADMIN: Cannot suspend own account', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${adminId}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'suspended' },
    });
    assert.strictEqual(res.statusCode, 400);
  });

  test('11. ADMIN: Invalid role value returns 400 validation error', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${regularUserId}/role`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'superadmin' },
    });
    assert.strictEqual(res.statusCode, 400);
  });

  // ── Health Endpoints ────────────────────────────────────────────────────────

  test('12. HEALTH: /health returns 200 with db status', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(['ok', 'degraded'].includes(body.status));
    assert.ok(body.database);
  });

  test('13. HEALTH: /health/ready returns 200 when DB connected', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(JSON.parse(res.payload).status, 'ready');
  });

  test('14. HEALTH: /health/live returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/live' });
    assert.strictEqual(res.statusCode, 200);
  });

  // ── Backup Config ────────────────────────────────────────────────────────────

  test('15. BACKUP: Admin can read backup config (masked credentials)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/backup/config',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    // Must never return actual bot token
    assert.ok(!JSON.stringify(body).includes('TELEGRAM_BOT_TOKEN'));
    assert.ok(body.data.cron !== undefined);
  });

  test('16. BACKUP: Invalid cron expression is rejected', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/admin/backup/config',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { cron_expression: 'not-a-cron' },
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(JSON.parse(res.payload).error.code, 'INVALID_CRON');
  });

  test('17. BACKUP: Valid cron expression is accepted', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/admin/backup/config',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { cron_expression: '0 3 * * *', retention_days: 14 },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(JSON.parse(res.payload).success, true);
  });

  test('18. BACKUP: Backup history returns paginated results', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/backup/history?page=1&limit=10',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
  });

  test('19. BACKUP: Backup status returns in-progress flag and latest backup', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/backup/status',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(typeof body.data.backupInProgress === 'boolean');
  });

  // ── Audit Logs ──────────────────────────────────────────────────────────────

  test('20. AUDIT: Admin can view audit logs (never contains secrets)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-logs',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(Array.isArray(body.data));
    // Audit logs must not contain secrets
    const bodyStr = JSON.stringify(body);
    assert.ok(!bodyStr.includes('password_hash'));
    assert.ok(!bodyStr.includes('JWT_SECRET'));
  });

  test('21. SECURITY: Normal user cannot access audit logs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-logs',
      headers: { authorization: `Bearer ${userToken}` },
    });
    assert.strictEqual(res.statusCode, 403);
  });
});

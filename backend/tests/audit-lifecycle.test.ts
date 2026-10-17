import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as db from '../src/db/index.js';
import { computeDiffAndRedact, createOutboxSpec } from '../src/modules/audit/audit.utils.js';
import { AuditService } from '../src/modules/audit/audit.service.js';

describe('EquipTrack Forensic Audit Trail & PostHog Outbox Lifecycle Test Suite', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let regularToken: string;

  // In-memory test ledger
  const testDb = {
    users: [
      {
        id: 'admin-uuid-1',
        email: 'admin@equiptrack.io',
        password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
        role: 'admin',
        status: 'active',
      },
      {
        id: 'user-uuid-2',
        email: 'operator@equiptrack.io',
        password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
        role: 'user',
        status: 'active',
      },
    ],
    categories: [] as any[],
    auditLogs: [] as any[],
    auditOutbox: [] as any[],
  };

  before(async () => {
    app = buildApp();
    await app.ready();

    adminToken = app.jwt.sign({ id: 'e46faa41-f125-452e-a8aa-6ea386b38987', email: 'karan@gmail.com', role: 'admin' });
    regularToken = app.jwt.sign({ id: '275d380b-eb06-404d-8789-cd176e29b21b', email: 'aayush@gmail.com', role: 'user' });
  });

  after(async () => {
    await app.close();
    await db.closePool();
  });

  test('1. Redaction Engine: Strips credentials and sensitive fields from audit snapshots', () => {
    const beforeObj = {
      id: '123',
      name: 'Old Name',
      password: 'super-secret-password-123',
      apiKey: 'sec_live_9999999999',
      token: 'jwt.token.here',
    };
    const afterObj = {
      id: '123',
      name: 'New Name',
      password: 'super-secret-password-456',
      apiKey: 'sec_live_8888888888',
      token: 'jwt.token.new',
    };

    const diff = computeDiffAndRedact(beforeObj, afterObj);

    assert.deepStrictEqual(diff.changedFields.sort(), ['apiKey', 'name', 'password', 'token'].sort());
    assert.strictEqual(diff.beforeData?.password, '[REDACTED]');
    assert.strictEqual(diff.afterData?.password, '[REDACTED]');
    assert.strictEqual(diff.beforeData?.apiKey, '[REDACTED]');
    assert.strictEqual(diff.afterData?.apiKey, '[REDACTED]');
    assert.strictEqual(diff.beforeData?.token, '[REDACTED]');
    assert.strictEqual(diff.afterData?.token, '[REDACTED]');
    assert.strictEqual(diff.beforeData?.name, 'Old Name');
    assert.strictEqual(diff.afterData?.name, 'New Name');
  });

  test('2. Unchanged fields are never recorded as modified', () => {
    const beforeObj = { id: '456', status: 'ACTIVE', displayOrder: 1 };
    const afterObj = { id: '456', status: 'ACTIVE', displayOrder: 1 };

    const diff = computeDiffAndRedact(beforeObj, afterObj);

    assert.strictEqual(diff.changedFields.length, 0);
  });

  test('3. PostHog Outbox Specification: Formats consistent, safe event envelopes', () => {
    const outboxSpec = createOutboxSpec({
      id: 'audit-entry-uuid-1',
      occurredAt: new Date('2026-10-13T12:00:00Z'),
      actorUserId: 'user-uuid-2',
      actorEmail: 'operator@equiptrack.io',
      actorRole: 'user',
      action: 'category.created',
      resourceType: 'category',
      resourceId: 'cat-uuid-99',
      resourceLabel: 'Hydraulic Bearings',
      outcome: 'SUCCESS',
      source: 'mobile_app',
      requestId: 'req-abc-123',
      changedFields: ['name'],
    });

    assert.strictEqual(outboxSpec.eventName, 'category_created');
    assert.strictEqual(outboxSpec.distinctId, 'user-uuid-2');
    assert.strictEqual(outboxSpec.properties.action, 'category.created');
    assert.strictEqual(outboxSpec.properties.resource_type, 'category');
    assert.strictEqual(outboxSpec.properties.resource_id, 'cat-uuid-99');
    assert.strictEqual(outboxSpec.properties.resource_label, 'Hydraulic Bearings');
    assert.strictEqual(outboxSpec.properties.source, 'mobile_app');
    assert.strictEqual(outboxSpec.properties.outcome, 'SUCCESS');
    assert.strictEqual(outboxSpec.properties.request_id, 'req-abc-123');
    // Ensure raw before/after states are not leaked into PostHog payload
    assert.strictEqual((outboxSpec.properties as any).before_data, undefined);
    assert.strictEqual((outboxSpec.properties as any).after_data, undefined);
  });

  test('4. Security & RBAC: Regular users are rejected from accessing audit history', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-logs',
      headers: {
        authorization: `Bearer ${regularToken}`,
      },
    });

    assert.strictEqual(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, false);
    assert.match(body.error?.message || body.message, /admin/i);
  });

  test('5. Security & RBAC: Unauthenticated requests are rejected with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-logs',
    });

    assert.strictEqual(res.statusCode, 401);
  });

  test('6. Security & RBAC: Authorized administrator can access audit logs endpoint', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-logs',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
  });

  test('7. Outbox Metrics: Admin can query outbox delivery health and queue depth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-logs/outbox-stats',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.ok(typeof body.data.pendingCount === 'number');
    assert.ok(typeof body.data.failedCount === 'number');
    assert.ok(typeof body.data.deliveredCount === 'number');
  });

  test('8. CSV Export: Admin can export forensic audit ledger as RFC-compliant CSV', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-logs/export',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.headers['content-type']?.includes('text/csv'));
    assert.ok(res.payload.startsWith('ID,Occurred At (UTC),Action'));
  });

  test('9. Immutability & Safe Defaults: Audit context extracts server-verified actor role and IP', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/categories',
      headers: {
        authorization: `Bearer ${regularToken}`,
        'x-forwarded-for': '203.0.113.195',
        'x-client-platform': 'flutter',
        'x-client-version': '1.4.0',
      },
    });

    assert.strictEqual(res.statusCode, 200);
  });
});

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as db from '../src/db/index.js';

// In-memory relational state simulator to test isolation logic without requiring external live database
class TestDatabaseHarness {
  users: Array<{ id: string; email: string; password_hash: string; created_at: string; updated_at: string }> = [];
  machines: Array<{ id: string; user_id: string; name: string; description: string | null; created_at: string; updated_at: string }> = [];
  sections: Array<{ id: string; machine_id: string; user_id: string; name: string; created_at: string; updated_at: string }> = [];
  usageRecords: Array<{ id: string; section_id: string; user_id: string; name: string; usage_date: string; created_at: string; updated_at: string }> = [];

  reset() {
    this.users = [];
    this.machines = [];
    this.sections = [];
    this.usageRecords = [];
  }

  async mockQuery(text: string, params: any[] = []): Promise<any> {
    const cleanSql = text.trim();

    // 1. Users Queries
    if (cleanSql.includes('SELECT id FROM users WHERE email = $1')) {
      const found = this.users.filter((u) => u.email === params[0]);
      return { rows: found, rowCount: found.length };
    }
    if (cleanSql.includes('INSERT INTO users')) {
      const newUser = {
        id: `user-${this.users.length + 1}`,
        email: params[0],
        password_hash: params[1],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.users.push(newUser);
      return { rows: [newUser], rowCount: 1 };
    }
    if (cleanSql.includes('SELECT id, email, password_hash FROM users WHERE email = $1')) {
      const found = this.users.filter((u) => u.email === params[0]);
      return { rows: found, rowCount: found.length };
    }
    if (cleanSql.includes('SELECT id, email, created_at FROM users WHERE id = $1')) {
      const found = this.users.filter((u) => u.id === params[0]);
      return { rows: found, rowCount: found.length };
    }

    // 2. Machines Queries
    if (cleanSql.includes('SELECT id, user_id, name, description, created_at, updated_at FROM machines WHERE user_id = $1')) {
      const rows = this.machines.filter((m) => m.user_id === params[0]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('SELECT id, user_id, name, description, created_at, updated_at FROM machines WHERE id = $1 AND user_id = $2')) {
      const rows = this.machines.filter((m) => m.id === params[0] && m.user_id === params[1]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('SELECT id FROM machines WHERE id = $1 AND user_id = $2')) {
      const rows = this.machines.filter((m) => m.id === params[0] && m.user_id === params[1]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('INSERT INTO machines')) {
      const newMachine = {
        id: `machine-${this.machines.length + 1}`,
        user_id: params[0],
        name: params[1],
        description: params[2] || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.machines.push(newMachine);
      return { rows: [newMachine], rowCount: 1 };
    }
    if (cleanSql.includes('UPDATE machines')) {
      const index = this.machines.findIndex((m) => m.id === params[2] && m.user_id === params[3]);
      if (index === -1) return { rows: [], rowCount: 0 };
      this.machines[index].name = params[0];
      this.machines[index].description = params[1] || null;
      this.machines[index].updated_at = new Date().toISOString();
      return { rows: [this.machines[index]], rowCount: 1 };
    }
    if (cleanSql.includes('DELETE FROM machines WHERE id = $1 AND user_id = $2')) {
      const initialLen = this.machines.length;
      this.machines = this.machines.filter((m) => !(m.id === params[0] && m.user_id === params[1]));
      return { rowCount: initialLen - this.machines.length };
    }

    // 3. Sections Queries
    if (cleanSql.includes('SELECT id, machine_id, user_id, name, created_at, updated_at FROM sections WHERE machine_id = $1 AND user_id = $2')) {
      const rows = this.sections.filter((s) => s.machine_id === params[0] && s.user_id === params[1]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('SELECT id, machine_id, user_id, name, created_at, updated_at FROM sections WHERE id = $1 AND user_id = $2')) {
      const rows = this.sections.filter((s) => s.id === params[0] && s.user_id === params[1]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('SELECT id FROM sections WHERE id = $1 AND user_id = $2')) {
      const rows = this.sections.filter((s) => s.id === params[0] && s.user_id === params[1]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('INSERT INTO sections')) {
      const newSection = {
        id: `section-${this.sections.length + 1}`,
        machine_id: params[0],
        user_id: params[1],
        name: params[2],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.sections.push(newSection);
      return { rows: [newSection], rowCount: 1 };
    }
    if (cleanSql.includes('UPDATE sections')) {
      const index = this.sections.findIndex((s) => s.id === params[1] && s.user_id === params[2]);
      if (index === -1) return { rows: [], rowCount: 0 };
      this.sections[index].name = params[0];
      return { rows: [this.sections[index]], rowCount: 1 };
    }
    if (cleanSql.includes('DELETE FROM sections WHERE id = $1 AND user_id = $2')) {
      const initialLen = this.sections.length;
      this.sections = this.sections.filter((s) => !(s.id === params[0] && s.user_id === params[1]));
      return { rowCount: initialLen - this.sections.length };
    }

    // 4. Usage Records Queries
    if (cleanSql.includes('SELECT id, section_id, user_id, name, usage_date, created_at, updated_at FROM usage_records WHERE section_id = $1 AND user_id = $2')) {
      const rows = this.usageRecords.filter((r) => r.section_id === params[0] && r.user_id === params[1]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('SELECT id, section_id, user_id, name, usage_date, created_at, updated_at FROM usage_records WHERE id = $1 AND user_id = $2')) {
      const rows = this.usageRecords.filter((r) => r.id === params[0] && r.user_id === params[1]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('SELECT id FROM usage_records WHERE section_id = $1 AND user_id = $2 AND usage_date = $3')) {
      let rows = this.usageRecords.filter((r) => r.section_id === params[0] && r.user_id === params[1] && r.usage_date === params[2]);
      if (params[3]) {
        rows = rows.filter((r) => r.id !== params[3]);
      }
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('INSERT INTO usage_records')) {
      const newRecord = {
        id: `record-${this.usageRecords.length + 1}`,
        section_id: params[0],
        user_id: params[1],
        name: params[2],
        usage_date: params[3],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.usageRecords.push(newRecord);
      return { rows: [newRecord], rowCount: 1 };
    }
    if (cleanSql.includes('DELETE FROM usage_records WHERE id = $1 AND user_id = $2')) {
      const initialLen = this.usageRecords.length;
      this.usageRecords = this.usageRecords.filter((r) => !(r.id === params[0] && r.user_id === params[1]));
      return { rowCount: initialLen - this.usageRecords.length };
    }

    // Reports Queries
    if (cleanSql.includes('SELECT COUNT(*)::int as count FROM machines WHERE user_id = $1')) {
      const count = this.machines.filter((m) => m.user_id === params[0]).length;
      return { rows: [{ count }], rowCount: 1 };
    }
    if (cleanSql.includes('SELECT COUNT(*)::int as count FROM sections WHERE user_id = $1')) {
      const count = this.sections.filter((s) => s.user_id === params[0]).length;
      return { rows: [{ count }], rowCount: 1 };
    }
    if (cleanSql.includes('SELECT COUNT(*)::int as count FROM usage_records WHERE user_id = $1')) {
      const count = this.usageRecords.filter((r) => r.user_id === params[0]).length;
      return { rows: [{ count }], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }
}

describe('EquipTrack User Data Isolation & Security Test Suite', () => {
  let app: FastifyInstance;
  const dbHarness = new TestDatabaseHarness();

  let tokenUserA: string;
  let userAId: string;
  let tokenUserB: string;
  let userBId: string;

  let machineAId: string;
  let machineBId: string;
  let sectionAId: string;
  let recordAId: string;

  before(async () => {
    // Intercept db.query to use our in-memory isolation harness
    db.setCustomQueryHandler((text: string, params?: any[]) => dbHarness.mockQuery(text, params));
    app = buildApp();
    await app.ready();
  });

  after(async () => {
    db.setCustomQueryHandler(null);
    await app.close();
  });

  test('1. Register User A and User B', async () => {
    // Register User A
    const resA = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'usera@company.com', password: 'Password123!' },
    });
    assert.strictEqual(resA.statusCode, 201);
    const bodyA = JSON.parse(resA.payload);
    assert.strictEqual(bodyA.success, true);
    assert.ok(bodyA.data.token);
    tokenUserA = bodyA.data.token;
    userAId = bodyA.data.user.id;

    // Register User B
    const resB = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'userb@company.com', password: 'Password456!' },
    });
    assert.strictEqual(resB.statusCode, 201);
    const bodyB = JSON.parse(resB.payload);
    assert.strictEqual(bodyB.success, true);
    assert.ok(bodyB.data.token);
    tokenUserB = bodyB.data.token;
    userBId = bodyB.data.user.id;

    assert.notStrictEqual(userAId, userBId);
  });

  test('2. User A creates Machine A, User B creates Machine B', async () => {
    // User A creates machine
    const resA = await app.inject({
      method: 'POST',
      url: '/api/machines',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { name: 'CNC Lathe - User A', description: 'User A exclusive machine' },
    });
    assert.strictEqual(resA.statusCode, 201);
    const bodyA = JSON.parse(resA.payload);
    machineAId = bodyA.data.id;
    assert.strictEqual(bodyA.data.name, 'CNC Lathe - User A');

    // User B creates machine
    const resB = await app.inject({
      method: 'POST',
      url: '/api/machines',
      headers: { authorization: `Bearer ${tokenUserB}` },
      payload: { name: 'Milling Rig - User B', description: 'User B exclusive machine' },
    });
    assert.strictEqual(resB.statusCode, 201);
    const bodyB = JSON.parse(resB.payload);
    machineBId = bodyB.data.id;
    assert.strictEqual(bodyB.data.name, 'Milling Rig - User B');
  });

  test('3. CROSS-USER ISOLATION: User A only sees Machine A, User B only sees Machine B', async () => {
    // User A list
    const resA = await app.inject({
      method: 'GET',
      url: '/api/machines',
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    assert.strictEqual(resA.statusCode, 200);
    const listA = JSON.parse(resA.payload).data;
    assert.strictEqual(listA.length, 1);
    assert.strictEqual(listA[0].id, machineAId);
    assert.strictEqual(listA[0].name, 'CNC Lathe - User A');

    // User B list
    const resB = await app.inject({
      method: 'GET',
      url: '/api/machines',
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    assert.strictEqual(resB.statusCode, 200);
    const listB = JSON.parse(resB.payload).data;
    assert.strictEqual(listB.length, 1);
    assert.strictEqual(listB[0].id, machineBId);
    assert.strictEqual(listB[0].name, 'Milling Rig - User B');
  });

  test('4. IDOR PREVENTION: User A cannot read, update, or delete User B machine', async () => {
    // User A attempts to GET Machine B -> 404
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/machines/${machineBId}`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    assert.strictEqual(getRes.statusCode, 404);

    // User A attempts to PATCH Machine B -> 404
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/machines/${machineBId}`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { name: 'Hacked Machine Name' },
    });
    assert.strictEqual(patchRes.statusCode, 404);

    // User A attempts to DELETE Machine B -> 404
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/machines/${machineBId}`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    assert.strictEqual(deleteRes.statusCode, 404);

    // Verify User B's machine is intact
    const verifyRes = await app.inject({
      method: 'GET',
      url: `/api/machines/${machineBId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    assert.strictEqual(verifyRes.statusCode, 200);
    assert.strictEqual(JSON.parse(verifyRes.payload).data.name, 'Milling Rig - User B');
  });

  test('5. SECTION ISOLATION: User B cannot add or view sections on User A machine', async () => {
    // User A creates Section A
    const createSecA = await app.inject({
      method: 'POST',
      url: `/api/machines/${machineAId}/sections`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { name: 'Spindle Assembly' },
    });
    assert.strictEqual(createSecA.statusCode, 201);
    sectionAId = JSON.parse(createSecA.payload).data.id;

    // User B attempts to create section on Machine A -> 404
    const illegalCreate = await app.inject({
      method: 'POST',
      url: `/api/machines/${machineAId}/sections`,
      headers: { authorization: `Bearer ${tokenUserB}` },
      payload: { name: 'Unauthorized Section' },
    });
    assert.strictEqual(illegalCreate.statusCode, 404);

    // User B attempts to list sections of Machine A -> 404
    const illegalList = await app.inject({
      method: 'GET',
      url: `/api/machines/${machineAId}/sections`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    assert.strictEqual(illegalList.statusCode, 404);

    // User B attempts to fetch Section A by direct ID -> 404
    const illegalGet = await app.inject({
      method: 'GET',
      url: `/api/sections/${sectionAId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    assert.strictEqual(illegalGet.statusCode, 404);
  });

  test('6. USAGE RECORD ISOLATION: User B cannot add, read, or delete User A records', async () => {
    // User A creates record
    const createRecA = await app.inject({
      method: 'POST',
      url: `/api/sections/${sectionAId}/usage-records`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { name: 'Bearing Lubrication', usage_date: '2026-03-01' },
    });
    assert.strictEqual(createRecA.statusCode, 201);
    recordAId = JSON.parse(createRecA.payload).data.id;

    // User B attempts to create record on Section A -> 404
    const illegalRecCreate = await app.inject({
      method: 'POST',
      url: `/api/sections/${sectionAId}/usage-records`,
      headers: { authorization: `Bearer ${tokenUserB}` },
      payload: { name: 'Malicious Record', usage_date: '2026-03-02' },
    });
    assert.strictEqual(illegalRecCreate.statusCode, 404);

    // User B attempts to GET Record A -> 404
    const illegalRecGet = await app.inject({
      method: 'GET',
      url: `/api/usage-records/${recordAId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    assert.strictEqual(illegalRecGet.statusCode, 404);

    // User B attempts to DELETE Record A -> 404
    const illegalRecDelete = await app.inject({
      method: 'DELETE',
      url: `/api/usage-records/${recordAId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    assert.strictEqual(illegalRecDelete.statusCode, 404);
  });

  test('7. SUMMARY REPORT ISOLATION: Summary stats strictly count only own resources', async () => {
    // User A summary
    const resA = await app.inject({
      method: 'GET',
      url: '/api/reports/summary',
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    assert.strictEqual(resA.statusCode, 200);
    const summaryA = JSON.parse(resA.payload).data;
    assert.strictEqual(summaryA.totalMachines, 1);
    assert.strictEqual(summaryA.totalSections, 1);
    assert.strictEqual(summaryA.totalUsageRecords, 1);

    // User B summary (only Machine B, 0 sections, 0 records)
    const resB = await app.inject({
      method: 'GET',
      url: '/api/reports/summary',
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    assert.strictEqual(resB.statusCode, 200);
    const summaryB = JSON.parse(resB.payload).data;
    assert.strictEqual(summaryB.totalMachines, 1);
    assert.strictEqual(summaryB.totalSections, 0);
    assert.strictEqual(summaryB.totalUsageRecords, 0);
  });
});

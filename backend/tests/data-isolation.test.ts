import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as db from '../src/db/index.js';

// In-memory relational state simulator to test global shared workspace logic
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
    if (cleanSql.includes('SELECT id, user_id, name, description, created_at, updated_at FROM machines ORDER BY name ASC')) {
      return { rows: [...this.machines], rowCount: this.machines.length };
    }
    if (cleanSql.includes('SELECT id, user_id, name, description, created_at, updated_at FROM machines WHERE id = $1')) {
      const rows = this.machines.filter((m) => m.id === params[0]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('SELECT id FROM machines WHERE id = $1')) {
      const rows = this.machines.filter((m) => m.id === params[0]);
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
      const index = this.machines.findIndex((m) => m.id === params[2]);
      if (index === -1) return { rows: [], rowCount: 0 };
      this.machines[index].name = params[0];
      this.machines[index].description = params[1] || null;
      this.machines[index].updated_at = new Date().toISOString();
      return { rows: [this.machines[index]], rowCount: 1 };
    }
    if (cleanSql.includes('DELETE FROM machines WHERE id = $1')) {
      const initialLen = this.machines.length;
      this.machines = this.machines.filter((m) => m.id !== params[0]);
      return { rowCount: initialLen - this.machines.length };
    }

    // 3. Sections Queries
    if (cleanSql.includes('SELECT id, machine_id, user_id, name, created_at, updated_at FROM sections WHERE machine_id = $1 ORDER BY name ASC') || cleanSql.includes('SELECT name FROM sections WHERE machine_id = $1')) {
      const rows = this.sections.filter((s) => s.machine_id === params[0]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('SELECT id, machine_id, user_id, name, created_at, updated_at FROM sections WHERE id = $1')) {
      const rows = this.sections.filter((s) => s.id === params[0]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('SELECT id FROM sections WHERE id = $1')) {
      const rows = this.sections.filter((s) => s.id === params[0]);
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
      const index = this.sections.findIndex((s) => s.id === params[1]);
      if (index === -1) return { rows: [], rowCount: 0 };
      this.sections[index].name = params[0];
      return { rows: [this.sections[index]], rowCount: 1 };
    }
    if (cleanSql.includes('DELETE FROM sections WHERE id = $1')) {
      const initialLen = this.sections.length;
      this.sections = this.sections.filter((s) => s.id !== params[0]);
      return { rowCount: initialLen - this.sections.length };
    }

    // 4. Usage Records Queries
    if (cleanSql.includes('SELECT id, section_id, user_id, name, usage_date, created_at, updated_at FROM usage_records WHERE section_id = $1 ORDER BY usage_date ASC, created_at ASC')) {
      const rows = this.usageRecords.filter((r) => r.section_id === params[0]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('SELECT id, section_id, user_id, name, usage_date, created_at, updated_at FROM usage_records WHERE id = $1')) {
      const rows = this.usageRecords.filter((r) => r.id === params[0]);
      return { rows, rowCount: rows.length };
    }
    if (cleanSql.includes('SELECT id FROM usage_records WHERE section_id = $1 AND usage_date = $2')) {
      let rows = this.usageRecords.filter((r) => r.section_id === params[0] && r.usage_date === params[1]);
      if (params[2]) {
        rows = rows.filter((r) => r.id !== params[2]);
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
    if (cleanSql.includes('UPDATE usage_records')) {
      const index = this.usageRecords.findIndex((r) => r.id === params[2]);
      if (index === -1) return { rows: [], rowCount: 0 };
      this.usageRecords[index].name = params[0];
      this.usageRecords[index].usage_date = params[1];
      return { rows: [this.usageRecords[index]], rowCount: 1 };
    }
    if (cleanSql.includes('DELETE FROM usage_records WHERE id = $1')) {
      const initialLen = this.usageRecords.length;
      this.usageRecords = this.usageRecords.filter((r) => r.id !== params[0]);
      return { rowCount: initialLen - this.usageRecords.length };
    }

    // Reports Queries
    if (cleanSql.includes('SELECT COUNT(*)::int as count FROM machines')) {
      return { rows: [{ count: this.machines.length }], rowCount: 1 };
    }
    if (cleanSql.includes('SELECT COUNT(*)::int as count FROM sections')) {
      return { rows: [{ count: this.sections.length }], rowCount: 1 };
    }
    if (cleanSql.includes('SELECT COUNT(*)::int as count FROM usage_records')) {
      return { rows: [{ count: this.usageRecords.length }], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }
}

describe('EquipTrack Global Shared Workspace Test Suite', () => {
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
    db.setCustomQueryHandler((text: string, params?: any[]) => dbHarness.mockQuery(text, params));
    app = buildApp();
    await app.ready();
  });

  after(async () => {
    db.setCustomQueryHandler(null);
    await app.close();
  });

  test('1. Register User A and User B', async () => {
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
    const resA = await app.inject({
      method: 'POST',
      url: '/api/machines',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { name: 'CNC Lathe - User A', description: 'User A created machine' },
    });
    assert.strictEqual(resA.statusCode, 201);
    const bodyA = JSON.parse(resA.payload);
    machineAId = bodyA.data.id;
    assert.strictEqual(bodyA.data.name, 'CNC Lathe - User A');

    const resB = await app.inject({
      method: 'POST',
      url: '/api/machines',
      headers: { authorization: `Bearer ${tokenUserB}` },
      payload: { name: 'Milling Rig - User B', description: 'User B created machine' },
    });
    assert.strictEqual(resB.statusCode, 201);
    const bodyB = JSON.parse(resB.payload);
    machineBId = bodyB.data.id;
    assert.strictEqual(bodyB.data.name, 'Milling Rig - User B');
  });

  test('3. GLOBAL VISIBILITY: Both User A and User B see all machines', async () => {
    const resA = await app.inject({
      method: 'GET',
      url: '/api/machines',
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    assert.strictEqual(resA.statusCode, 200);
    const listA = JSON.parse(resA.payload).data;
    assert.strictEqual(listA.length, 2);

    const resB = await app.inject({
      method: 'GET',
      url: '/api/machines',
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    assert.strictEqual(resB.statusCode, 200);
    const listB = JSON.parse(resB.payload).data;
    assert.strictEqual(listB.length, 2);
  });

  test('4. COLLABORATION: User B can read and update Machine A', async () => {
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/machines/${machineAId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    assert.strictEqual(getRes.statusCode, 200);
    assert.strictEqual(JSON.parse(getRes.payload).data.name, 'CNC Lathe - User A');

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/machines/${machineAId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
      payload: { name: 'CNC Lathe - Updated by User B' },
    });
    assert.strictEqual(patchRes.statusCode, 200);
    assert.strictEqual(JSON.parse(patchRes.payload).data.name, 'CNC Lathe - Updated by User B');
  });

  test('5. SECTION COLLABORATION: User B can create and view sections on Machine A', async () => {
    const createSecB = await app.inject({
      method: 'POST',
      url: `/api/machines/${machineAId}/sections`,
      headers: { authorization: `Bearer ${tokenUserB}` },
      payload: { name: 'Spindle Assembly' },
    });
    assert.strictEqual(createSecB.statusCode, 201);
    sectionAId = JSON.parse(createSecB.payload).data.id;

    const listSecA = await app.inject({
      method: 'GET',
      url: `/api/machines/${machineAId}/sections`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    assert.strictEqual(listSecA.statusCode, 200);
    const sections = JSON.parse(listSecA.payload).data;
    assert.strictEqual(sections.length, 1);
    assert.strictEqual(sections[0].name, 'Spindle Assembly');
  });

  test('6. USAGE RECORD COLLABORATION: User A and User B share usage records', async () => {
    const createRecA = await app.inject({
      method: 'POST',
      url: `/api/sections/${sectionAId}/usage-records`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { name: 'Bearing Lubrication', usage_date: '2026-03-01' },
    });
    assert.strictEqual(createRecA.statusCode, 201);
    recordAId = JSON.parse(createRecA.payload).data.id;

    const getRecB = await app.inject({
      method: 'GET',
      url: `/api/usage-records/${recordAId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    assert.strictEqual(getRecB.statusCode, 200);
    assert.strictEqual(JSON.parse(getRecB.payload).data.name, 'Bearing Lubrication');
  });

  test('7. SUMMARY REPORT: Summary metrics show company-wide totals', async () => {
    const resA = await app.inject({
      method: 'GET',
      url: '/api/reports/summary',
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    assert.strictEqual(resA.statusCode, 200);
    const summaryA = JSON.parse(resA.payload).data;
    assert.strictEqual(summaryA.totalMachines, 2);
    assert.strictEqual(summaryA.totalSections, 1);
    assert.strictEqual(summaryA.totalUsageRecords, 1);

    const resB = await app.inject({
      method: 'GET',
      url: '/api/reports/summary',
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    const summaryB = JSON.parse(resB.payload).data;
    assert.strictEqual(summaryB.totalMachines, 2);
    assert.strictEqual(summaryB.totalSections, 1);
    assert.strictEqual(summaryB.totalUsageRecords, 1);
  });

  test('8. MACHINE DUPLICATION: Machine duplicate duplicates all components without usage records', async () => {
    const dupRes = await app.inject({
      method: 'POST',
      url: `/api/machines/${machineAId}/duplicate`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { name: 'Machine A (Custom Duplicate)' },
    });
    assert.strictEqual(dupRes.statusCode, 201);
    const duplicatedMachine = JSON.parse(dupRes.payload).data;
    assert.strictEqual(duplicatedMachine.name, 'Machine A (Custom Duplicate)');

    // Verify duplicated components exist on the new machine
    const secRes = await app.inject({
      method: 'GET',
      url: `/api/machines/${duplicatedMachine.id}/sections`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    assert.strictEqual(secRes.statusCode, 200);
    const sections = JSON.parse(secRes.payload).data;
    assert.strictEqual(sections.length, 1);
    assert.strictEqual(sections[0].name, 'Spindle Assembly');

    // Verify usage records are NOT duplicated (should be 0 records)
    const recRes = await app.inject({
      method: 'GET',
      url: `/api/sections/${sections[0].id}/usage-records`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    assert.strictEqual(recRes.statusCode, 200);
    const records = JSON.parse(recRes.payload).data;
    assert.strictEqual(records.length, 0);
  });
});



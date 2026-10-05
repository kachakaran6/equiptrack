import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as db from '../src/db/index.js';

describe('EquipTrack Categories & Component Association Test Suite', () => {
  let app: FastifyInstance;
  let userToken: string;
  let machineId: string;

  // In-memory harness for category tests
  const state = {
    users: [] as any[],
    machines: [] as any[],
    categories: [] as any[],
    sections: [] as any[],
  };

  before(async () => {
    db.setCustomQueryHandler(async (text: string, params: any[] = []) => {
      const clean = text.trim();

      // Users
      if (clean.includes('SELECT id, email, password_hash') || clean.includes('SELECT id FROM users WHERE email = $1')) {
        const found = state.users.filter((u) => u.email === params[0]);
        return { rows: found, rowCount: found.length };
      }
      if (clean.includes('INSERT INTO users')) {
        const u = {
          id: `user-${state.users.length + 1}`,
          email: params[0],
          password_hash: params[1],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.users.push(u);
        return { rows: [u], rowCount: 1 };
      }
      if (clean.includes('SELECT id, email, role, status FROM users WHERE id = $1')) {
        const found = state.users.filter((u) => u.id === params[0]);
        return { rows: found, rowCount: found.length };
      }

      // Machines
      if (clean.includes('SELECT id FROM machines WHERE id = $1')) {
        const rows = state.machines.filter((m) => m.id === params[0]);
        return { rows, rowCount: rows.length };
      }
      if (clean.includes('INSERT INTO machines')) {
        const m = {
          id: `machine-${state.machines.length + 1}`,
          user_id: params[0],
          name: params[1],
          description: params[2] || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.machines.push(m);
        return { rows: [m], rowCount: 1 };
      }

      // Categories
      if (clean.includes('FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3')) {
        const rows = state.categories.filter(
          (c) => (c.user_id === params[0] || c.machine_id === params[0]) && c.name.toLowerCase() === params[1].toLowerCase() && c.id !== params[2]
        );
        return { rows, rowCount: rows.length };
      }
      if (clean.includes('FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2)')) {
        const rows = state.categories.filter(
          (c) => (c.user_id === params[0] || c.machine_id === params[0]) && c.name.toLowerCase() === params[1].toLowerCase()
        );
        return { rows, rowCount: rows.length };
      }
      if (clean.includes('FROM categories WHERE machine_id = $1 AND LOWER(name) = LOWER($2) AND id != $3')) {
        const rows = state.categories.filter(
          (c) => c.machine_id === params[0] && c.name.toLowerCase() === params[1].toLowerCase() && c.id !== params[2]
        );
        return { rows, rowCount: rows.length };
      }
      if (clean.includes('FROM categories WHERE machine_id = $1 AND LOWER(name) = LOWER($2)')) {
        const rows = state.categories.filter(
          (c) => c.machine_id === params[0] && c.name.toLowerCase() === params[1].toLowerCase()
        );
        return { rows, rowCount: rows.length };
      }
      if (clean.includes('SELECT id, machine_id, name FROM categories WHERE id = $1') || clean.includes('SELECT id, machine_id, name, created_at, updated_at FROM categories WHERE id = $1') || clean.includes('SELECT id, user_id, machine_id, name FROM categories WHERE id = $1') || clean.includes('SELECT id, user_id, machine_id, name, created_at, updated_at FROM categories WHERE id = $1')) {
        const rows = state.categories.filter((c) => c.id === params[0]);
        return { rows, rowCount: rows.length };
      }
      if (clean.includes('INNER JOIN sections') && clean.includes('s.machine_id = $1')) {
        const machineSectionCategoryIds = new Set(
          state.sections.filter((s) => s.machine_id === params[0] && s.category_id).map((s) => s.category_id)
        );
        const rows = state.categories
          .filter((c) => machineSectionCategoryIds.has(c.id))
          .sort((a, b) => a.name.localeCompare(b.name));
        return { rows, rowCount: rows.length };
      }
      if (clean.includes('FROM categories WHERE machine_id = $1 OR user_id IS NOT NULL ORDER BY name ASC') || clean.includes('FROM categories WHERE machine_id = $1 ORDER BY name ASC') || clean.includes('FROM categories WHERE user_id = $1 ORDER BY name ASC')) {
        const rows = state.categories
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name));
        return { rows, rowCount: rows.length };
      }
      if (clean.includes('INSERT INTO categories')) {
        const isUserScoped = clean.includes('(user_id, name)');
        const c = {
          id: `category-${state.categories.length + 1}`,
          user_id: isUserScoped ? params[0] : null,
          machine_id: isUserScoped ? null : params[0],
          name: isUserScoped ? params[1] : params[1],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.categories.push(c);
        return { rows: [c], rowCount: 1 };
      }
      if (clean.includes('UPDATE categories')) {
        const idx = state.categories.findIndex((c) => c.id === params[1]);
        if (idx !== -1) {
          state.categories[idx].name = params[0];
          state.categories[idx].updated_at = new Date().toISOString();
          return { rows: [state.categories[idx]], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
      if (clean.includes('UPDATE sections SET category_id = NULL WHERE category_id = $1')) {
        state.sections.forEach((s) => {
          if (s.category_id === params[0]) s.category_id = null;
        });
        return { rowCount: 1 };
      }
      if (clean.includes('DELETE FROM categories WHERE id = $1')) {
        const initial = state.categories.length;
        state.categories = state.categories.filter((c) => c.id !== params[0]);
        return { rowCount: initial - state.categories.length };
      }

      // Sections
      if (clean.includes('FROM sections WHERE machine_id = $1')) {
        const rows = state.sections.filter((s) => s.machine_id === params[0]);
        return { rows, rowCount: rows.length };
      }
      if (clean.includes('FROM sections WHERE id = $1')) {
        const rows = state.sections.filter((s) => s.id === params[0]);
        return { rows, rowCount: rows.length };
      }
      if (clean.includes('INSERT INTO sections')) {
        const s = {
          id: `section-${state.sections.length + 1}`,
          machine_id: params[0],
          user_id: params[1],
          name: params[2],
          category_id: params[3] || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.sections.push(s);
        return { rows: [s], rowCount: 1 };
      }
      if (clean.includes('UPDATE sections')) {
        const idParam = params[params.length - 1];
        const s = state.sections.find((sec) => sec.id === idParam);
        if (s) {
          if (clean.includes('category_id = $')) {
            // Updating category_id
            s.category_id = params[0];
          }
          return { rows: [s], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      return { rows: [], rowCount: 0 };
    });

    app = buildApp();
    await app.ready();

    // Register test user
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'engineer@equiptrack.io', password: 'Password123!' },
    });
    userToken = regRes.json().data.token;

    // Create a test machine
    const mRes = await app.inject({
      method: 'POST',
      url: '/api/machines',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'CNC Milling Unit 01' },
    });
    machineId = mRes.json().data.id;
  });

  after(async () => {
    db.setCustomQueryHandler(null);
    await app.close();
  });

  test('1. Creates categories for machine successfully', async () => {
    const res1 = await app.inject({
      method: 'POST',
      url: `/api/machines/${machineId}/categories`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'Bearings' },
    });
    assert.strictEqual(res1.statusCode, 201);
    assert.strictEqual(res1.json().data.name, 'Bearings');

    const res2 = await app.inject({
      method: 'POST',
      url: `/api/machines/${machineId}/categories`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'Motors' },
    });
    assert.strictEqual(res2.statusCode, 201);
    assert.strictEqual(res2.json().data.name, 'Motors');
  });

  test('2. Prevents duplicate category name within same machine (case-insensitive)', async () => {
    const duplicateRes = await app.inject({
      method: 'POST',
      url: `/api/machines/${machineId}/categories`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'bearings' }, // lower case duplicate
    });
    assert.strictEqual(duplicateRes.statusCode, 409);
    assert.match(duplicateRes.json().message, /already exists/i);
  });

  test('3. Lists all categories for machine ordered by name', async () => {
    // With include_unused=true, all available categories are returned
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/machines/${machineId}/categories?include_unused=true`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    assert.strictEqual(listRes.statusCode, 200);
    const names = listRes.json().data.map((c: any) => c.name);
    assert.deepStrictEqual(names, ['Bearings', 'Motors']);

    // By default, only categories used in the machine are returned (0 assigned so far)
    const usedRes = await app.inject({
      method: 'GET',
      url: `/api/machines/${machineId}/categories`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    assert.strictEqual(usedRes.statusCode, 200);
    assert.deepStrictEqual(usedRes.json().data, []);
  });

  test('4. Updates category name and prevents renaming to an existing name', async () => {
    const categoriesRes = await app.inject({
      method: 'GET',
      url: `/api/categories`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    const bearings = categoriesRes.json().data.find((c: any) => c.name === 'Bearings');

    // Rename Bearings -> High-Speed Bearings
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/categories/${bearings.id}`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'High-Speed Bearings' },
    });
    assert.strictEqual(updateRes.statusCode, 200);
    assert.strictEqual(updateRes.json().data.name, 'High-Speed Bearings');

    // Attempt to rename to 'Motors' (conflict)
    const conflictRes = await app.inject({
      method: 'PATCH',
      url: `/api/categories/${bearings.id}`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'motors' },
    });
    assert.strictEqual(conflictRes.statusCode, 409);
  });

  test('5. Assigns component to category and allows Uncategorized', async () => {
    const categoriesRes = await app.inject({
      method: 'GET',
      url: `/api/categories`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    const motors = categoriesRes.json().data.find((c: any) => c.name === 'Motors');

    // Create component assigned to Motors category
    const sec1 = await app.inject({
      method: 'POST',
      url: `/api/machines/${machineId}/sections`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'Spindle Motor', category_id: motors.id },
    });
    assert.strictEqual(sec1.statusCode, 201);
    assert.strictEqual(sec1.json().data.category_id, motors.id);

    // Verify machine categories now returns Motors because it is actively used!
    const usedRes = await app.inject({
      method: 'GET',
      url: `/api/machines/${machineId}/categories`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    assert.strictEqual(usedRes.statusCode, 200);
    const usedNames = usedRes.json().data.map((c: any) => c.name);
    assert.deepStrictEqual(usedNames, ['Motors']);

    // Create component with no category (Uncategorized)
    const sec2 = await app.inject({
      method: 'POST',
      url: `/api/machines/${machineId}/sections`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: { name: 'Coolant Hose' },
    });
    assert.strictEqual(sec2.statusCode, 201);
    assert.strictEqual(sec2.json().data.category_id, null);
  });

  test('6. Deleting category resets component category to Uncategorized without deleting component', async () => {
    const categoriesRes = await app.inject({
      method: 'GET',
      url: `/api/categories`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    const motors = categoriesRes.json().data.find((c: any) => c.name === 'Motors');

    // Delete Motors category
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/categories/${motors.id}`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    assert.strictEqual(delRes.statusCode, 200);

    // Spindle Motor must still exist and now have category_id = null
    const sectionsRes = await app.inject({
      method: 'GET',
      url: `/api/machines/${machineId}/sections`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    const spindle = sectionsRes.json().data.find((s: any) => s.name === 'Spindle Motor');
    assert.ok(spindle, 'Spindle Motor must still exist');
    assert.strictEqual(spindle.category_id, null, 'Spindle Motor must become uncategorized');
  });
});

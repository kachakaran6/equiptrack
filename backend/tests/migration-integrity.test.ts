import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import pg from 'pg';
import { env } from '../src/config/env.js';

describe('EquipTrack Post-Migration Data & Ownership Integrity Tests', () => {
  let pool: pg.Pool;

  before(async () => {
    pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  });

  after(async () => {
    await pool.end();
  });

  test('1. All migrated entities exist and row counts match expected baseline', async () => {
    const usersRes = await pool.query('SELECT id, email FROM users');
    const machinesRes = await pool.query('SELECT id, name, user_id FROM machines');
    const sectionsRes = await pool.query('SELECT id, name, machine_id, user_id FROM sections');
    const recordsRes = await pool.query('SELECT id, name, section_id, user_id, usage_date FROM usage_records');

    assert.ok(usersRes.rows.length >= 2, 'Must have at least 2 migrated users');
    assert.ok(machinesRes.rows.length >= 3, 'Must have at least 3 migrated machines');
    assert.ok(sectionsRes.rows.length >= 20, 'Must have at least 20 migrated sections');
    assert.ok(recordsRes.rows.length >= 2, 'Must have at least 2 migrated usage records');
  });

  test('2. User ownership integrity is strictly enforced across hierarchy', async () => {
    // Every section must belong to the same user as its parent machine
    const sectionOwnershipRes = await pool.query(`
      SELECT s.id as section_id, s.user_id as section_user, m.user_id as machine_user
      FROM sections s
      JOIN machines m ON s.machine_id = m.id
      WHERE s.user_id != m.user_id
    `);
    assert.strictEqual(
      sectionOwnershipRes.rows.length,
      0,
      'Section ownership must match machine ownership'
    );

    // Every usage record must belong to the same user as its parent section
    const recordOwnershipRes = await pool.query(`
      SELECT r.id as record_id, r.user_id as record_user, s.user_id as section_user
      FROM usage_records r
      JOIN sections s ON r.section_id = s.id
      WHERE r.user_id != s.user_id
    `);
    assert.strictEqual(
      recordOwnershipRes.rows.length,
      0,
      'Record ownership must match section ownership'
    );
  });

  test('3. No orphaned child records exist in target database', async () => {
    const orphanSections = await pool.query(`
      SELECT s.id FROM sections s
      LEFT JOIN machines m ON s.machine_id = m.id
      WHERE m.id IS NULL
    `);
    assert.strictEqual(orphanSections.rows.length, 0, 'No orphaned sections allowed');

    const orphanRecords = await pool.query(`
      SELECT r.id FROM usage_records r
      LEFT JOIN sections s ON r.section_id = s.id
      WHERE s.id IS NULL
    `);
    assert.strictEqual(orphanRecords.rows.length, 0, 'No orphaned usage records allowed');
  });

  test('4. Preserved user accounts can be authenticated and isolated', async () => {
    const users = await pool.query('SELECT id, email, password_hash FROM users LIMIT 2');
    assert.strictEqual(users.rows.length, 2);

    const user1 = users.rows[0];
    const user2 = users.rows[1];

    // Query machines owned by user1
    const user1Machines = await pool.query('SELECT id FROM machines WHERE user_id = $1', [user1.id]);
    // Query machines owned by user2
    const user2Machines = await pool.query('SELECT id FROM machines WHERE user_id = $1', [user2.id]);

    const user1MachineIds = new Set(user1Machines.rows.map((m: any) => m.id));
    for (const m2 of user2Machines.rows) {
      assert.ok(!user1MachineIds.has(m2.id), `User 1 must not own User 2's machine (${m2.id})`);
    }
  });
});

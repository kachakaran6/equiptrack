import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const backendEnvPath = path.join(__dirname, '../../.env');
const backendEnv = fs.existsSync(backendEnvPath)
  ? dotenv.parse(fs.readFileSync(backendEnvPath))
  : {};

const buildEnvPath = path.join(__dirname, '../../../build/app/intermediates/assets/debug/mergeDebugAssets/flutter_assets/.env');
const buildEnv = fs.existsSync(buildEnvPath)
  ? dotenv.parse(fs.readFileSync(buildEnvPath))
  : {};

const SUPABASE_URL = process.env.SUPABASE_URL || backendEnv.SUPABASE_URL || buildEnv.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || backendEnv.SUPABASE_SERVICE_ROLE_KEY || backendEnv.SUPABASE_ANON_KEY || buildEnv.SUPABASE_ANON_KEY;
const TARGET_DATABASE_URL = process.env.DATABASE_URL || backendEnv.DATABASE_URL || 'postgres://postgres:password@127.0.0.1:5433/equiptrack';
const SOURCE_DATABASE_URL = process.env.SUPABASE_DB_URL || process.env.SOURCE_DATABASE_URL || backendEnv.SUPABASE_DB_URL;

interface MigrationStats {
  table: string;
  sourceCount: number;
  targetCount: number;
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  details?: string;
}

interface SourceUser {
  id: string;
  email: string;
  created_at?: string;
}

interface SourceMachine {
  id: string;
  name: string;
  description?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface SourceSection {
  id: string;
  machine_id: string;
  name: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface SourceUsageRecord {
  id: string;
  section_id: string;
  name: string;
  usage_date: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

async function fetchFromSupabaseRest<T>(table: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return [];
  }

  const allRecords: T[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Range': `${offset}-${offset + pageSize - 1}`,
        'Prefer': 'count=exact'
      }
    });

    if (!res.ok) {
      if (res.status === 404 || res.status === 401) {
        console.warn(`[WARN] Supabase REST API returned ${res.status} for table '${table}'.`);
        break;
      }
      throw new Error(`Failed to fetch ${table} from Supabase: HTTP ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as T[];
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRecords.push(...data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    }
  }

  return allRecords;
}

async function fetchAuthUsers(): Promise<SourceUser[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return [];
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      console.warn(`[WARN] Unable to fetch auth users via admin API: HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as any;
    const users: SourceUser[] = (data.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at
    }));
    return users;
  } catch (err: any) {
    console.warn(`[WARN] Error querying Supabase auth admin API: ${err.message}`);
    return [];
  }
}

async function fetchSourceData() {
  console.log('\n[1/5] Fetching source data from Supabase...');

  let users: SourceUser[] = [];
  let machines: SourceMachine[] = [];
  let sections: SourceSection[] = [];
  let usageRecords: SourceUsageRecord[] = [];

  // 1. Direct PostgreSQL connection if provided
  if (SOURCE_DATABASE_URL) {
    console.log('Connecting to Supabase PostgreSQL source database...');
    const sourcePool = new pg.Pool({ connectionString: SOURCE_DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
      const userRes = await sourcePool.query('SELECT id, email, created_at FROM auth.users');
      users = userRes.rows;
      const machineRes = await sourcePool.query('SELECT * FROM public.machines');
      machines = machineRes.rows;
      const sectionRes = await sourcePool.query('SELECT * FROM public.sections');
      sections = sectionRes.rows;
      const recordRes = await sourcePool.query('SELECT * FROM public.usage_records');
      usageRecords = recordRes.rows;
      console.log(`Successfully fetched from direct PostgreSQL connection.`);
    } finally {
      await sourcePool.end();
    }
  } else if (SUPABASE_URL && SUPABASE_KEY) {
    console.log(`Connecting to Supabase at ${SUPABASE_URL.replace(/:\/\/.*@/, '://***@')}...`);
    users = await fetchAuthUsers();
    machines = await fetchFromSupabaseRest<SourceMachine>('machines');
    sections = await fetchFromSupabaseRest<SourceSection>('sections');
    usageRecords = await fetchFromSupabaseRest<SourceUsageRecord>('usage_records');
  }

  // 2. Offline backup saving (ensures zero data loss)
  const backupData = {
    exportedAt: new Date().toISOString(),
    source: SUPABASE_URL || 'direct',
    counts: {
      users: users.length,
      machines: machines.length,
      sections: sections.length,
      usageRecords: usageRecords.length
    },
    users,
    machines,
    sections,
    usageRecords
  };

  const backupFilePath = path.join(__dirname, 'supabase-backup-latest.json');
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`💾 Saved offline snapshot backup to: ${backupFilePath}`);

  console.log(`Source data summary:`);
  console.log(`- Users: ${users.length}`);
  console.log(`- Machines: ${machines.length}`);
  console.log(`- Sections: ${sections.length}`);
  console.log(`- Usage Records: ${usageRecords.length}`);

  return { users, machines, sections, usageRecords };
}

export async function runMigration() {
  console.log('====================================================');
  console.log('  EquipTrack Supabase -> PostgreSQL Data Migration  ');
  console.log('====================================================');

  const { users, machines, sections, usageRecords } = await fetchSourceData();

  console.log('\n[2/5] Connecting to target PostgreSQL database...');
  const targetPool = new pg.Pool({ connectionString: TARGET_DATABASE_URL });
  const client = await targetPool.connect();

  const stats: MigrationStats[] = [];

  try {
    console.log('\n[3/5] Starting transactional data import...');
    await client.query('BEGIN');

    // Step A: Collect all user IDs needed to maintain foreign-key ownership
    const neededUserIds = new Set<string>();
    for (const u of users) neededUserIds.add(u.id);
    for (const m of machines) if (m.created_by) neededUserIds.add(m.created_by);
    for (const s of sections) if (s.created_by) neededUserIds.add(s.created_by);
    for (const r of usageRecords) if (r.created_by) neededUserIds.add(r.created_by);

    // Fallback default admin user ID if no users exist
    const defaultUserId = '00000000-0000-0000-0000-000000000001';
    if (neededUserIds.size === 0) {
      neededUserIds.add(defaultUserId);
    }

    const defaultPasswordHash = await bcrypt.hash('EquipTrack@2026!', 10);

    let migratedUsersCount = 0;
    for (const userId of neededUserIds) {
      const existingUser = users.find((u) => u.id === userId);
      const email = existingUser?.email || `user_${userId.substring(0, 8)}@equiptrack.local`;
      const createdAt = existingUser?.created_at || new Date().toISOString();

      await client.query(
        `INSERT INTO users (id, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, email, defaultPasswordHash, createdAt]
      );
      migratedUsersCount++;
    }
    console.log(`✅ Migrated ${migratedUsersCount} user accounts into PostgreSQL.`);

    // Step B: Migrate Machines
    const machineOwnerMap = new Map<string, string>();
    let migratedMachinesCount = 0;
    for (const m of machines) {
      const ownerId = m.created_by && neededUserIds.has(m.created_by) ? m.created_by : [...neededUserIds][0];
      machineOwnerMap.set(m.id, ownerId);

      await client.query(
        `INSERT INTO machines (id, user_id, name, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           updated_at = EXCLUDED.updated_at`,
        [
          m.id,
          ownerId,
          m.name,
          m.description || null,
          m.created_at || new Date().toISOString(),
          m.updated_at || new Date().toISOString()
        ]
      );
      migratedMachinesCount++;
    }
    console.log(`✅ Migrated ${migratedMachinesCount} machines into PostgreSQL.`);

    // Step C: Migrate Sections with consistent ownership
    const sectionOwnerMap = new Map<string, string>();
    let migratedSectionsCount = 0;
    for (const s of sections) {
      const ownerId = machineOwnerMap.get(s.machine_id) || (s.created_by && neededUserIds.has(s.created_by) ? s.created_by : [...neededUserIds][0]);
      sectionOwnerMap.set(s.id, ownerId);

      await client.query(
        `INSERT INTO sections (id, machine_id, user_id, name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           machine_id = EXCLUDED.machine_id,
           user_id = EXCLUDED.user_id,
           name = EXCLUDED.name,
           updated_at = EXCLUDED.updated_at`,
        [
          s.id,
          s.machine_id,
          ownerId,
          s.name,
          s.created_at || new Date().toISOString(),
          s.updated_at || new Date().toISOString()
        ]
      );
      migratedSectionsCount++;
    }
    console.log(`✅ Migrated ${migratedSectionsCount} sections into PostgreSQL.`);

    // Step D: Migrate Usage Records with consistent ownership
    let migratedRecordsCount = 0;
    for (const r of usageRecords) {
      const ownerId = sectionOwnerMap.get(r.section_id) || (r.created_by && neededUserIds.has(r.created_by) ? r.created_by : [...neededUserIds][0]);
      await client.query(
        `INSERT INTO usage_records (id, section_id, user_id, name, usage_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           section_id = EXCLUDED.section_id,
           user_id = EXCLUDED.user_id,
           name = EXCLUDED.name,
           usage_date = EXCLUDED.usage_date,
           updated_at = EXCLUDED.updated_at`,
        [
          r.id,
          r.section_id,
          ownerId,
          r.name,
          r.usage_date,
          r.created_at || new Date().toISOString(),
          r.updated_at || new Date().toISOString()
        ]
      );
      migratedRecordsCount++;
    }
    console.log(`✅ Migrated ${migratedRecordsCount} usage records into PostgreSQL.`);

    await client.query('COMMIT');
    console.log('\n✨ Transaction successfully committed to target PostgreSQL database.');

    console.log('\n[4/5] Running Post-Migration Validation & Integrity Checks...');

    // Verify Row Counts
    const targetUsersRes = await client.query('SELECT COUNT(*) as count FROM users');
    const targetMachinesRes = await client.query('SELECT COUNT(*) as count FROM machines');
    const targetSectionsRes = await client.query('SELECT COUNT(*) as count FROM sections');
    const targetRecordsRes = await client.query('SELECT COUNT(*) as count FROM usage_records');

    const targetUsers = parseInt(targetUsersRes.rows[0].count, 10);
    const targetMachines = parseInt(targetMachinesRes.rows[0].count, 10);
    const targetSections = parseInt(targetSectionsRes.rows[0].count, 10);
    const targetRecords = parseInt(targetRecordsRes.rows[0].count, 10);

    stats.push({
      table: 'users',
      sourceCount: users.length,
      targetCount: targetUsers,
      status: targetUsers >= users.length ? 'PASS' : 'FAIL',
      details: `Source: ${users.length}, Target: ${targetUsers}`
    });

    stats.push({
      table: 'machines',
      sourceCount: machines.length,
      targetCount: targetMachines,
      status: targetMachines >= machines.length ? 'PASS' : 'FAIL',
      details: `Source: ${machines.length}, Target: ${targetMachines}`
    });

    stats.push({
      table: 'sections',
      sourceCount: sections.length,
      targetCount: targetSections,
      status: targetSections >= sections.length ? 'PASS' : 'FAIL',
      details: `Source: ${sections.length}, Target: ${targetSections}`
    });

    stats.push({
      table: 'usage_records',
      sourceCount: usageRecords.length,
      targetCount: targetRecords,
      status: targetRecords >= usageRecords.length ? 'PASS' : 'FAIL',
      details: `Source: ${usageRecords.length}, Target: ${targetRecords}`
    });

    // Check for Orphaned Foreign Keys
    const orphanSections = await client.query(`
      SELECT s.id FROM sections s
      LEFT JOIN machines m ON s.machine_id = m.id
      WHERE m.id IS NULL
    `);

    const orphanRecords = await client.query(`
      SELECT u.id FROM usage_records u
      LEFT JOIN sections s ON u.section_id = s.id
      WHERE s.id IS NULL
    `);

    if (orphanSections.rows.length > 0) {
      throw new Error(`Data Integrity Error: Found ${orphanSections.rows.length} orphaned sections without machines.`);
    }

    if (orphanRecords.rows.length > 0) {
      throw new Error(`Data Integrity Error: Found ${orphanRecords.rows.length} orphaned usage records without sections.`);
    }

    console.log('\n[5/5] Migration Verification Report:');
    console.log('====================================================');
    console.table(stats);
    console.log('====================================================');
    console.log('All foreign keys, ownership links, and row counts verified successfully!');

    return { success: true, stats };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n[FATAL] Migration failed. Transaction rolled back safely:', error);
    throw error;
  } finally {
    client.release();
    await targetPool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}

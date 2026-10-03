import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';
import pg from 'pg';
import bcrypt from 'bcryptjs';

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
  const supabaseUrl = process.env.SUPABASE_URL || 'https://hpwgqrcftjqmklxxcnap.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    return [];
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${table} from Supabase: HTTP ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as T[];
}

async function fetchAuthUsers(): Promise<SourceUser[]> {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://hpwgqrcftjqmklxxcnap.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseKey) return [];

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    return (data.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at
    }));
  } catch {
    return [];
  }
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Admin Guard: Requires x-admin-key header matching JWT_SECRET
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const adminKey = request.headers['x-admin-key'];
    if (!adminKey || adminKey !== env.JWT_SECRET) {
      return reply.status(403).send({
        success: false,
        message: 'Unauthorized: Invalid or missing administrative key'
      });
    }
  });

  // POST /api/admin/migrate-supabase — Trigger live Supabase to PostgreSQL data migration
  fastify.post('/migrate-supabase', async (request: FastifyRequest, reply: FastifyReply) => {
    const users = await fetchAuthUsers();
    const machines = await fetchFromSupabaseRest<SourceMachine>('machines');
    const sections = await fetchFromSupabaseRest<SourceSection>('sections');
    const usageRecords = await fetchFromSupabaseRest<SourceUsageRecord>('usage_records');

    const targetPool = new pg.Pool({ connectionString: env.DATABASE_URL });
    const client = await targetPool.connect();

    try {
      await client.query('BEGIN');

      const neededUserIds = new Set<string>();
      for (const u of users) neededUserIds.add(u.id);
      for (const m of machines) if (m.created_by) neededUserIds.add(m.created_by);
      for (const s of sections) if (s.created_by) neededUserIds.add(s.created_by);
      for (const r of usageRecords) if (r.created_by) neededUserIds.add(r.created_by);

      if (neededUserIds.size === 0) {
        neededUserIds.add('00000000-0000-0000-0000-000000000001');
      }

      const defaultPasswordHash = await bcrypt.hash('EquipTrack@2026!', 10);

      // 1. Users
      let migratedUsers = 0;
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
        migratedUsers++;
      }

      // 2. Machines
      const machineOwnerMap = new Map<string, string>();
      let migratedMachines = 0;
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
        migratedMachines++;
      }

      // 3. Sections
      const sectionOwnerMap = new Map<string, string>();
      let migratedSections = 0;
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
        migratedSections++;
      }

      // 4. Usage Records
      let migratedRecords = 0;
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
        migratedRecords++;
      }

      await client.query('COMMIT');

      // Verify
      const uRes = await client.query('SELECT COUNT(*) as count FROM users');
      const mRes = await client.query('SELECT COUNT(*) as count FROM machines');
      const sRes = await client.query('SELECT COUNT(*) as count FROM sections');
      const rRes = await client.query('SELECT COUNT(*) as count FROM usage_records');

      return reply.send({
        success: true,
        message: 'Production database migration from Supabase completed successfully.',
        counts: {
          users: { source: users.length, target: parseInt(uRes.rows[0].count, 10) },
          machines: { source: machines.length, target: parseInt(mRes.rows[0].count, 10) },
          sections: { source: sections.length, target: parseInt(sRes.rows[0].count, 10) },
          usageRecords: { source: usageRecords.length, target: parseInt(rRes.rows[0].count, 10) }
        }
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      return reply.status(500).send({
        success: false,
        message: `Migration failed: ${err.message}`
      });
    } finally {
      client.release();
      await targetPool.end();
    }
  });
}

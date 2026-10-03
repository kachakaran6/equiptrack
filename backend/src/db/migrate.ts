import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDatabaseExists(): Promise<void> {
  try {
    const dbUrl = new URL(env.DATABASE_URL);
    const targetDbName = dbUrl.pathname.replace('/', '') || 'equiptrack';
    
    // Connect to standard maintenance database to verify/create target database
    const adminUrl = new URL(env.DATABASE_URL);
    adminUrl.pathname = '/postgres';

    const adminPool = new pg.Pool({ connectionString: adminUrl.toString() });
    const client = await adminPool.connect();
    try {
      const checkRes = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [targetDbName]
      );
      if (checkRes.rows.length === 0) {
        console.log(`📦 Creating target database '${targetDbName}'...`);
        await client.query(`CREATE DATABASE "${targetDbName}"`);
        console.log(`✅ Target database '${targetDbName}' created.`);
      }
    } finally {
      client.release();
      await adminPool.end();
    }
  } catch (err: any) {
    console.warn(`[INFO] Ensure database check note: ${err.message}`);
  }
}

export async function runMigrations(): Promise<void> {
  await ensureDatabaseExists();
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log('🔄 Checking database migrations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.resolve(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️ Migrations directory not found:', migrationsDir);
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const appliedRes = await client.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(appliedRes.rows.map((r: { version: string }) => r.version));

    for (const file of files) {
      if (appliedVersions.has(file)) {
        continue;
      }

      console.log(`➡️ Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Applied migration: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed on ${file}:`, err);
        throw err;
      }
    }

    console.log('✨ All migrations are up to date.');
  } finally {
    client.release();
  }
}

// If run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal migration error:', err);
      process.exit(1);
    });
}
